use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::FundLocked;
use crate::state::*;

pub fn lock_handler(ctx: Context<Lock>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    // Validate
    require_state(&ctx.accounts.fund, FundState::Accepted)?;
    check_work_window(used(&ctx.accounts.fund), now)?;

    // State
    let amount = ctx.accounts.fund.total;
    ctx.accounts.fund.state = FundState::Funded;

    // CPI: client ATA -> vault, signed by the client
    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.client_token.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.client.to_account_info(),
            },
        ),
        amount,
        ctx.accounts.mint.decimals,
    )?;

    emit!(FundLocked { fund: ctx.accounts.fund.key(), amount });
    Ok(())
}

#[derive(Accounts)]
pub struct Lock<'info> {
    #[account(
        mut,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump,
        has_one = client,
        has_one = mint @ NedError::InvalidMint
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    pub client: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = client,
        associated_token::token_program = token_program
    )]
    pub client_token: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [VAULT_SEED, fund.key().as_ref()],
        bump = fund.vault_bump,
        token::mint = mint,
        token::authority = fund,
        token::token_program = token_program
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(address = USDC_MINT @ NedError::InvalidMint)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
}
