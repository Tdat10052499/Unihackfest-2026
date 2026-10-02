use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::MilestoneRefunded;
use crate::state::*;

/// Anyone may refund a milestone that was not submitted by its submission deadline
pub fn refund_handler(ctx: Context<Refund>, index: u8) -> Result<()> {
    let fund = &mut ctx.accounts.fund;
    let now = Clock::get()?.unix_timestamp;

    // Validate
    require_state(fund, FundState::Funded)?;
    let i = index_ok(fund, index)?;
    require!(fund.milestones[i].status == MilestoneStatus::Pending, NedError::InvalidMilestoneStatus);
    require!(now > fund.milestones[i].submit_by, NedError::DeadlineNotReached);

    // State
    let amount = fund.milestones[i].amount;
    fund.refunded = fund.refunded.checked_add(amount).ok_or(NedError::MathOverflow)?;
    set_status(fund, i, MilestoneStatus::Refunded);

    // CPI: vault -> client ATA
    pay_from_vault(
        &ctx.accounts.fund,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.client_token,
        &ctx.accounts.token_program,
        amount,
    )?;

    emit!(MilestoneRefunded {
        fund: ctx.accounts.fund.key(),
        index,
        amount,
        caller: ctx.accounts.caller.key(),
        conceded: false,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(
        mut,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump,
        has_one = mint @ NedError::InvalidMint
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    pub caller: Signer<'info>,

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
