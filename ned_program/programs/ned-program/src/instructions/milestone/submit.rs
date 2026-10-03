use anchor_lang::prelude::*;

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::MilestoneSubmitted;
use crate::state::*;

pub fn submit_handler(ctx: Context<Submit>, index: u8, evidence: [u8; 32]) -> Result<()> {
    let fund = &mut ctx.accounts.fund;
    let now = Clock::get()?.unix_timestamp;

    // Validate
    require_state(fund, FundState::Funded)?;
    let i = index_ok(fund, index)?;
    require!(fund.milestones[i].status == MilestoneStatus::Pending, NedError::InvalidMilestoneStatus);
    require!(now <= fund.milestones[i].submit_by, NedError::DeadlinePassed);
    require!(evidence.iter().any(|b| *b != 0), NedError::InvalidEvidence);

    // State
    fund.milestones[i].submitted_at = now;
    fund.milestones[i].evidence = evidence;
    set_status(fund, i, MilestoneStatus::Submitted);

    emit!(MilestoneSubmitted { fund: fund.key(), index, evidence });
    Ok(())
}

#[derive(Accounts)]
pub struct Submit<'info> {
    #[account(
        mut,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump,
        has_one = freelancer
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    pub freelancer: Signer<'info>,
}
