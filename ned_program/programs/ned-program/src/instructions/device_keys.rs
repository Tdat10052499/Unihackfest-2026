use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::NedError;
use crate::events::{DeviceKeyAdded, DeviceKeyRemoved};
use crate::state::DeviceKeys;

/// Creates the wallet's empty device-key list (v1.2). The app sends it together with the first `add_device_key`.
pub fn init_device_keys_handler(ctx: Context<InitDeviceKeys>) -> Result<()> {
    let list = &mut ctx.accounts.device_keys;
    list.wallet = ctx.accounts.wallet.key();
    list.count = 0;
    list.keys = [[0; 32]; MAX_DEVICE_KEYS];
    list.bump = ctx.bumps.device_keys;
    Ok(())
}

/// Registers one device's X25519 public key. Adding a key that is already there changes nothing (safe to retry).
pub fn add_device_key_handler(ctx: Context<UpdateDeviceKeys>, key: [u8; 32]) -> Result<()> {
    require!(key != [0; 32], NedError::InvalidDeviceKey);
    let list = &mut ctx.accounts.device_keys;
    if list.in_use().contains(&key) {
        return Ok(());
    }
    require!((list.count as usize) < MAX_DEVICE_KEYS, NedError::DeviceKeysFull);
    let at = list.count as usize;
    list.keys[at] = key;
    list.count += 1;
    emit!(DeviceKeyAdded { wallet: list.wallet, key, count: list.count });
    Ok(())
}

/// Removes one device key (lost or replaced device). The last key moves into the gap.
pub fn remove_device_key_handler(ctx: Context<UpdateDeviceKeys>, key: [u8; 32]) -> Result<()> {
    let list = &mut ctx.accounts.device_keys;
    let at = list.in_use().iter().position(|k| *k == key).ok_or(NedError::DeviceKeyNotFound)?;
    let last = list.count as usize - 1;
    list.keys[at] = list.keys[last];
    list.keys[last] = [0; 32];
    list.count -= 1;
    emit!(DeviceKeyRemoved { wallet: list.wallet, key, count: list.count });
    Ok(())
}

#[derive(Accounts)]
pub struct InitDeviceKeys<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,

    #[account(init, payer = wallet, space = DeviceKeys::SPACE, seeds = [DEVICE_KEYS_SEED, wallet.key().as_ref()], bump)]
    pub device_keys: Account<'info, DeviceKeys>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateDeviceKeys<'info> {
    pub wallet: Signer<'info>,

    #[account(mut, seeds = [DEVICE_KEYS_SEED, wallet.key().as_ref()], bump = device_keys.bump, has_one = wallet)]
    pub device_keys: Account<'info, DeviceKeys>,
}
