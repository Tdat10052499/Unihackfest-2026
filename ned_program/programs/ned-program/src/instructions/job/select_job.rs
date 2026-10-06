use anchor_lang::prelude::*;

use super::accept_window_over;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::JobSelected;
use crate::state::*;

/// Selects one applicant: binds the job to a contract that `create_fund` made for that person, sent in the same
/// transaction right after `create_fund`. The contract must match the job (client, mint, brief, amounts, review
/// windows, deadlines no earlier than the template's work windows minus the slack). The budget stays in the job vault
/// until the freelancer accepts (lock_from_job).
pub fn select_job_handler(ctx: Context<SelectJob>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let job = &ctx.accounts.job;
    let fund = &ctx.accounts.fund;

    // Validate: the listing
    match job.state {
        JobState::Open => {}
        JobState::Selected => require!(accept_window_over(job, now), NedError::AcceptWindowOpen),
        _ => return err!(NedError::JobNotOpen),
    }
    require!(now <= job.select_by, NedError::SelectClosed);

    // Validate: the contract matches the job
    require!(fund.state == FundState::Created, NedError::JobFundMismatch);
    require!(fund.client == job.business, NedError::JobFundMismatch);
    require!(fund.mint == job.mint, NedError::JobFundMismatch);
    require!(fund.brief_hash == job.brief_hash, NedError::JobFundMismatch);
    require!(fund.milestone_count == job.milestone_count, NedError::JobFundMismatch);
    for (m, t) in fund.milestones[..fund.milestone_count as usize].iter().zip(job.used()) {
        require!(m.amount == t.amount, NedError::JobFundMismatch);
        let review = m.review_by.checked_sub(m.submit_by).ok_or(NedError::MathOverflow)?;
        require!(review == t.review_secs, NedError::JobFundMismatch);
        let earliest = now
            .checked_add(t.work_secs)
            .and_then(|v| v.checked_sub(JOB_DEADLINE_SLACK_SECS))
            .ok_or(NedError::MathOverflow)?;
        require!(m.submit_by >= earliest, NedError::JobFundMismatch);
    }
    // `application` is the PDA [JOB_APP_SEED, job, fund.freelancer]: it exists only if that person applied

    // State
    let fund_key = fund.key();
    let freelancer = fund.freelancer;
    let job = &mut ctx.accounts.job;
    job.selected = freelancer;
    job.selected_at = now;
    job.fund = fund_key;
    job.state = JobState::Selected;

    emit!(JobSelected { job: job.key(), fund: fund_key, freelancer });
    Ok(())
}

#[derive(Accounts)]
pub struct SelectJob<'info> {
    #[account(
        mut,
        seeds = [JOB_SEED, job.business.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = business
    )]
    pub job: Box<Account<'info, JobListing>>,

    pub business: Signer<'info>,

    #[account(
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    #[account(
        seeds = [JOB_APP_SEED, job.key().as_ref(), fund.freelancer.as_ref()],
        bump = application.bump
    )]
    pub application: Box<Account<'info, JobApplication>>,
}
