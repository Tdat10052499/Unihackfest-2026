// Funded Jobs (v1.3, docs/09-milestone-lock/funded-jobs-plan.md section 4, decision D25). New accounts only; no
// existing instruction changes. Shared helpers for the job vault are below.
pub mod apply_job;
pub mod lock_from_job;
pub mod post_job;
pub mod post_job_brief;
pub mod select_job;
pub mod withdraw_job;

pub use apply_job::*;
pub use lock_from_job::*;
pub use post_job::*;
pub use post_job_brief::*;
pub use select_job::*;
pub use withdraw_job::*;

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, CloseAccount, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::constants::*;
use crate::state::JobListing;

/// Moves `amount` out of the job vault, signed by the job PDA. Callers pass stored amounts (the listing's `total`),
/// or the leftover above it, never the vault balance as the amount owed.
pub fn pay_from_job_vault<'info>(
    job: &Account<'info, JobListing>,
    job_vault: &InterfaceAccount<'info, TokenAccount>,
    mint: &InterfaceAccount<'info, Mint>,
    to: &AccountInfo<'info>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let job_id = job.job_id.to_le_bytes();
    let seeds: &[&[u8]] = &[JOB_SEED, job.business.as_ref(), &job_id, &[job.bump]];
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            token_program.key(),
            TransferChecked { from: job_vault.to_account_info(), mint: mint.to_account_info(), to: to.clone(), authority: job.to_account_info() },
            &[seeds],
        ),
        amount,
        mint.decimals,
    )
}

/// Closes the (now empty) job vault; its rent goes to `rent_to` (the business)
pub fn close_job_vault<'info>(
    job: &Account<'info, JobListing>,
    job_vault: &InterfaceAccount<'info, TokenAccount>,
    rent_to: &AccountInfo<'info>,
    token_program: &Interface<'info, TokenInterface>,
) -> Result<()> {
    let job_id = job.job_id.to_le_bytes();
    let seeds: &[&[u8]] = &[JOB_SEED, job.business.as_ref(), &job_id, &[job.bump]];
    token_interface::close_account(CpiContext::new_with_signer(
        token_program.key(),
        CloseAccount { account: job_vault.to_account_info(), destination: rent_to.clone(), authority: job.to_account_info() },
        &[seeds],
    ))
}

/// `now > selected_at + JOB_ACCEPT_WINDOW_SECS`
pub fn accept_window_over(job: &JobListing, now: i64) -> bool {
    job.selected_at.checked_add(JOB_ACCEPT_WINDOW_SECS).is_some_and(|end| now > end)
}
