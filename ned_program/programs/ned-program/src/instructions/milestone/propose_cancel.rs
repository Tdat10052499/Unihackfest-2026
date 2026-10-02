use anchor_lang::prelude::*;

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::CancelProposed;
use crate::state::*;

/// Client or freelancer proposes to end the contract: `freelancer_amount` of what is still locked goes
/// to the destination, the rest to the client. Overwrites an earlier proposal.
pub fn propose_cancel_handler(ctx: Context<ProposeCancel>, freelancer_amount: u64) -> Result<()> {
    let signer = ctx.accounts.signer.key();
    let fund = &mut ctx.accounts.fund;

    // Validate
    require!(signer == fund.client || signer == fund.freelancer, NedError::NotAParty);
    require_state(fund, FundState::Funded)?;
    require!(freelancer_amount <= unsettled(fund)?, NedError::CancelAmountTooLarge);

    // State
    fund.cancel_proposer = signer;
    fund.cancel_freelancer_amount = freelancer_amount;

    emit!(CancelProposed { fund: fund.key(), proposer: signer, freelancer_amount });
    Ok(())
}

#[derive(Accounts)]
pub struct ProposeCancel<'info> {
    #[account(
        mut,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    /// Must be the fund's client or freelancer (checked in the handler: NotAParty)
    pub signer: Signer<'info>,
}
