use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::MilestoneReleased;
use crate::state::*;

pub fn approve_handler(ctx: Context<Approve>, index: u8) -> Result<()> {
    let fund = &mut ctx.accounts.fund;

    // Validate
    require_state(fund, FundState::Funded)?;
    let i = index_ok(fund, index)?;
    require!(
        matches!(fund.milestones[i].status, MilestoneStatus::Submitted | MilestoneStatus::Disputed),
        NedError::InvalidMilestoneStatus
    );

    // State
    let amount = fund.milestones[i].amount;
    fund.released = fund.released.checked_add(amount).ok_or(NedError::MathOverflow)?;
    set_status(fund, i, MilestoneStatus::Released);

    // CPI: vault -> destination ATA
    pay_from_vault(
        &ctx.accounts.fund,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.destination_token,
        &ctx.accounts.token_program,
        amount,
    )?;

    emit!(MilestoneReleased {
        fund: ctx.accounts.fund.key(),
        index,
        amount,
        destination: ctx.accounts.destination.key(),
        payout_reference: ctx.accounts.fund.payout_reference,
        by_timeout: false,
        caller: ctx.accounts.client.key(),
    });
    Ok(())
}

#[derive(Accounts)]
pub struct Approve<'info> {
    #[account(
        mut,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump,
        has_one = client,
        has_one = mint @ NedError::InvalidMint
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    pub client: Signer<'info>,

    /// CHECK: only its address is used: it must be the destination fixed in `accept`
    #[account(address = fund.payout_destination @ NedError::InvalidPayoutDestination)]
    pub destination: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = destination,
        associated_token::token_program = token_program
    )]
    pub destination_token: Box<InterfaceAccount<'info, TokenAccount>>,

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
