use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::NedError;
use crate::events::JobBriefPosted;
use crate::state::*;

/// One part of the job's brief, in plain text (public, like the listing). No state change; the app reads it back
/// from the transaction, like post_note. Only while the job is Open.
pub fn post_job_brief_handler(ctx: Context<PostJobBrief>, part: u8, parts: u8, data: Vec<u8>) -> Result<()> {
    let job = &ctx.accounts.job;
    require!(job.state == JobState::Open, NedError::JobNotOpen);
    require!((1..=NOTE_MAX_LEN).contains(&data.len()), NedError::InvalidNote);
    require!(part < parts && parts <= NOTE_MAX_PARTS, NedError::InvalidNote);
    emit!(JobBriefPosted { job: job.key(), part, parts, len: data.len() as u16 });
    Ok(())
}

#[derive(Accounts)]
pub struct PostJobBrief<'info> {
    /// Read-only: listed so the brief can be found with getSignaturesForAddress(job)
    #[account(
        seeds = [JOB_SEED, job.business.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = business
    )]
    pub job: Box<Account<'info, JobListing>>,

    pub business: Signer<'info>,
}
