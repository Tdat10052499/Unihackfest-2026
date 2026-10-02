use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, CloseAccount, Mint, TokenAccount, TokenInterface};

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::FundClosed;
use crate::state::*;

/// Closes a contract that was never funded (Created / Accepted) or is Settled. Any vault balance left
/// (donations only, since payouts use stored amounts) goes to the client; the vault and the fund
/// rent go to `rent_payer`.
pub fn close_handler(ctx: Context<Close>) -> Result<()> {
    // Validate
    require!(
        matches!(ctx.accounts.fund.state, FundState::Created | FundState::Accepted | FundState::Settled),
        NedError::FundNotClosable
    );

    // CPI 1: leftover -> client ATA
    let leftover = ctx.accounts.vault.amount;
    pay_from_vault(
        &ctx.accounts.fund,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.client_token,
        &ctx.accounts.token_program,
        leftover,
    )?;

    // CPI 2: close the now empty vault, rent -> rent_payer
    let fund = &ctx.accounts.fund;
    let fund_id = fund.fund_id.to_le_bytes();
    let seeds: &[&[u8]] = &[FUND_SEED, fund.creator.as_ref(), &fund_id, &[fund.bump]];
    token_interface::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.rent_payer.to_account_info(),
            authority: fund.to_account_info(),
        },
        &[seeds],
    ))?;

    emit!(FundClosed { fund: fund.key(), leftover_to_client: leftover });
    // The fund account itself is closed to rent_payer by `close = rent_payer`
    Ok(())
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(
        mut,
        close = rent_payer,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump,
        has_one = creator,
        has_one = mint @ NedError::InvalidMint
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    pub creator: Signer<'info>,

    /// CHECK: receives rent only; must be the fund's rent_payer
    #[account(mut, address = fund.rent_payer)]
    pub rent_payer: UncheckedAccount<'info>,

    /// CHECK: only its address is used: it must be the fund's client
    #[account(address = fund.client)]
    pub client: UncheckedAccount<'info>,

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
