use anchor_lang::prelude::*;

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::MilestoneDisputed;
use crate::state::*;

/// Client disputes a submitted milestone before its review deadline; this blocks auto-release.
/// No neutral arbiter in v1 (decision D11): the milestone settles by approve, concede or a split.
pub fn dispute_handler(ctx: Context<Dispute>, index: u8) -> Result<()> {
    let fund = &mut ctx.accounts.fund;
    let now = Clock::get()?.unix_timestamp;

    // Validate
    require_state(fund, FundState::Funded)?;
    let i = index_ok(fund, index)?;
    require!(fund.milestones[i].status == MilestoneStatus::Submitted, NedError::InvalidMilestoneStatus);
    require!(now <= fund.milestones[i].review_by, NedError::DeadlinePassed);

    // State
    set_status(fund, i, MilestoneStatus::Disputed);

    emit!(MilestoneDisputed { fund: fund.key(), index });
    Ok(())
}

#[derive(Accounts)]
pub struct Dispute<'info> {
    #[account(
        mut,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump,
        has_one = client
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    pub client: Signer<'info>,
}
