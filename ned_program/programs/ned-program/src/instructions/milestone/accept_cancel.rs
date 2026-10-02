use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::FundCancelled;
use crate::state::*;

/// The other party accepts the pending split. `expected_*` must equal the current values, so a proposal
/// that was swapped or went stale cannot be accepted by mistake (review fix R1).
pub fn accept_cancel_handler(
    ctx: Context<AcceptCancel>,
    expected_freelancer_amount: u64,
    expected_unsettled: u64,
) -> Result<()> {
    let signer = ctx.accounts.signer.key();
    let fund = &mut ctx.accounts.fund;

    // Validate
    require!(signer == fund.client || signer == fund.freelancer, NedError::NotAParty);
    require_state(fund, FundState::Funded)?;
    require!(fund.cancel_proposer != Pubkey::default(), NedError::NoCancelProposal);
    require!(signer != fund.cancel_proposer, NedError::CannotAcceptOwnProposal);
    let to_destination = fund.cancel_freelancer_amount;
    let remaining = unsettled(fund)?;
    require!(
        expected_freelancer_amount == to_destination && expected_unsettled == remaining,
        NedError::CancelProposalChanged
    );
    require!(to_destination <= remaining, NedError::CancelAmountTooLarge);

    // State
    let to_client = remaining.checked_sub(to_destination).ok_or(NedError::MathOverflow)?;
    fund.released = fund.released.checked_add(to_destination).ok_or(NedError::MathOverflow)?;
    fund.refunded = fund.refunded.checked_add(to_client).ok_or(NedError::MathOverflow)?;
    let count = fund.milestone_count as usize;
    for m in fund.milestones[..count].iter_mut() {
        if !m.status.is_terminal() {
            m.status = MilestoneStatus::Cancelled;
        }
    }
    clear_cancel(fund);
    settle_if_done(fund);
    require_state(fund, FundState::Settled)?;

    // CPI: split -> destination ATA and client ATA (zero amounts are skipped)
    pay_from_vault(
        &ctx.accounts.fund,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.destination_token,
        &ctx.accounts.token_program,
        to_destination,
    )?;
    pay_from_vault(
        &ctx.accounts.fund,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.client_token,
        &ctx.accounts.token_program,
        to_client,
    )?;

    emit!(FundCancelled { fund: ctx.accounts.fund.key(), to_destination, to_client });
    Ok(())
}

#[derive(Accounts)]
pub struct AcceptCancel<'info> {
    #[account(
        mut,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump,
        has_one = mint @ NedError::InvalidMint
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    /// The party that did not propose (checked in the handler)
    pub signer: Signer<'info>,

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
