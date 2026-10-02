use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::constants::*;
use crate::errors::NedError;
use crate::state::*;

/// PDA-signed `transfer_checked` of `amount` from the vault (authority = fund PDA) to `to`.
/// Callers pass stored amounts, never `vault.amount` (rule 1.4).
pub fn pay_from_vault<'info>(
    fund: &Account<'info, SharedFund>,
    vault: &InterfaceAccount<'info, TokenAccount>,
    mint: &InterfaceAccount<'info, Mint>,
    to: &InterfaceAccount<'info, TokenAccount>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let fund_id = fund.fund_id.to_le_bytes();
    let seeds: &[&[u8]] = &[FUND_SEED, fund.creator.as_ref(), &fund_id, &[fund.bump]];
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            token_program.key(),
            TransferChecked {
                from: vault.to_account_info(),
                mint: mint.to_account_info(),
                to: to.to_account_info(),
                authority: fund.to_account_info(),
            },
            &[seeds],
        ),
        amount,
        mint.decimals,
    )
}

/// Milestones that exist: slots 0..milestone_count (rule 1.5)
pub fn used(fund: &SharedFund) -> &[Milestone] {
    &fund.milestones[..fund.milestone_count as usize]
}

/// `index < milestone_count`
pub fn index_ok(fund: &SharedFund, index: u8) -> Result<usize> {
    require!(index < fund.milestone_count, NedError::MilestoneIndexOutOfRange);
    Ok(index as usize)
}

/// Sum of the amounts of milestones that are not terminal
pub fn unsettled(fund: &SharedFund) -> Result<u64> {
    used(fund)
        .iter()
        .filter(|m| !m.status.is_terminal())
        .try_fold(0u64, |sum, m| sum.checked_add(m.amount))
        .ok_or_else(|| error!(NedError::MathOverflow))
}

/// `now + MIN_WORK_WINDOW_SECS <= min(submit_by)` over the used milestones (section 3.4)
pub fn check_work_window(milestones: &[Milestone], now: i64) -> Result<()> {
    let first = milestones.iter().map(|m| m.submit_by).min().ok_or(NedError::InvalidMilestoneCount)?;
    let earliest_ok = now.checked_add(MIN_WORK_WINDOW_SECS).ok_or(NedError::MathOverflow)?;
    require!(earliest_ok <= first, NedError::WorkWindowTooShort);
    Ok(())
}

/// Any milestone status change clears a pending cancel proposal (section 3.3)
pub fn clear_cancel(fund: &mut SharedFund) {
    fund.cancel_proposer = Pubkey::default();
    fund.cancel_freelancer_amount = 0;
}

/// Sets the fund to Settled once every used milestone is terminal
pub fn settle_if_done(fund: &mut SharedFund) {
    if used(fund).iter().all(|m| m.status.is_terminal()) {
        fund.state = FundState::Settled;
    }
}

/// Moves one milestone to a terminal or new status and applies the shared bookkeeping
pub fn set_status(fund: &mut SharedFund, index: usize, status: MilestoneStatus) {
    fund.milestones[index].status = status;
    clear_cancel(fund);
    settle_if_done(fund);
}

pub fn require_state(fund: &SharedFund, state: FundState) -> Result<()> {
    require!(fund.state == state, NedError::InvalidFundState);
    Ok(())
}
