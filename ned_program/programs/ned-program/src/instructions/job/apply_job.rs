use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::NedError;
use crate::events::JobApplied;
use crate::state::*;

/// Applies to an open job with a short public pitch. A second application by the same person fails at init.
pub fn apply_job_handler(ctx: Context<ApplyJob>, pitch: String) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let freelancer = ctx.accounts.freelancer.key();

    // Validate
    let job = &ctx.accounts.job;
    require!(job.state == JobState::Open, NedError::JobNotOpen);
    require!(now <= job.apply_by, NedError::ApplyClosed);
    require!(freelancer != job.business, NedError::SameParty);
    require!(pitch.len() <= JOB_PITCH_MAX_LEN, NedError::PitchTooLong);

    // State
    let mut pitch_bytes = [0u8; 280];
    pitch_bytes[..pitch.len()].copy_from_slice(pitch.as_bytes());
    let application = &mut ctx.accounts.application;
    application.version = JOB_VERSION;
    application.job = ctx.accounts.job.key();
    application.freelancer = freelancer;
    application.created_at = now;
    application.pitch_len = pitch.len() as u16;
    application.pitch = pitch_bytes;
    application.bump = ctx.bumps.application;

    let job = &mut ctx.accounts.job;
    job.application_count = job.application_count.checked_add(1).ok_or(NedError::MathOverflow)?;

    emit!(JobApplied { job: job.key(), freelancer, application_count: job.application_count });
    Ok(())
}

#[derive(Accounts)]
pub struct ApplyJob<'info> {
    #[account(
        mut,
        seeds = [JOB_SEED, job.business.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump
    )]
    pub job: Box<Account<'info, JobListing>>,

    #[account(
        init,
        payer = freelancer,
        space = JobApplication::SPACE,
        seeds = [JOB_APP_SEED, job.key().as_ref(), freelancer.key().as_ref()],
        bump
    )]
    pub application: Box<Account<'info, JobApplication>>,

    /// Pays the rent of the application
    #[account(mut)]
    pub freelancer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
