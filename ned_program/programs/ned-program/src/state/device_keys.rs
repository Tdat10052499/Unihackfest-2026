use anchor_lang::prelude::*;

use crate::constants::MAX_DEVICE_KEYS;

/// [b"device_keys", wallet] → X25519 public keys of the wallet's devices (v1.2, key-sync Plan C).
/// A contract's key is wrapped for each of these keys in a `post_note` of kind 2; the private keys never leave
/// the devices. `keys[..count]` are in use; the rest are zero.
#[account]
#[derive(InitSpace)]
pub struct DeviceKeys {
    pub wallet: Pubkey,
    pub count: u8,
    pub keys: [[u8; 32]; MAX_DEVICE_KEYS],
    pub bump: u8,
}

impl DeviceKeys {
    pub const SPACE: usize = 8 + Self::INIT_SPACE;

    pub fn in_use(&self) -> &[[u8; 32]] {
        &self.keys[..self.count as usize]
    }
}
