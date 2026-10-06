use anchor_lang::prelude::*;

// =============================================================================
// FUNDED JOBS STATE (v1.3, docs/09-milestone-lock/funded-jobs-plan.md section 4.2, decision D25)
// Field order is fixed: the app filters with memcmp at `state` (9), `business` (10), `category` (42) and `fund`
// (508) of JobListing, and at `job` (9) and `freelancer` (41) of JobApplication. Never reorder; add fields only by
// taking bytes from `_reserved`.
// =============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default, InitSpace)]
pub enum JobState {
    /// Budget in the job vault; applications open until `apply_by`
    #[default]
    Open,
    /// A contract was created for one applicant (`fund`); waiting for accept + lock_from_job
    Selected,
    /// The budget moved into the contract
    Filled,
    /// The budget went back to the business
    Withdrawn,
}

/// One milestone of the job template (24 bytes). The contract's absolute deadlines are set at select time.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default, InitSpace)]
pub struct JobMilestone {
    pub amount: u64,
    /// The submission deadline is this long after select
    pub work_secs: i64,
    /// review_by − submit_by of the contract milestone
    pub review_secs: i64,
}

/// `post_job` argument (24 bytes)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub struct JobMilestoneInput {
    pub amount: u64,
    pub work_secs: i64,
    pub review_secs: i64,
}

/// PDA [JOB_SEED, business, job_id.to_le_bytes()]; 576 bytes with the discriminator
#[account]
#[derive(InitSpace)]
pub struct JobListing {
    pub version: u8,
    /// memcmp "open jobs" (offset 9)
    pub state: JobState,
    /// memcmp "my listings" (offset 10)
    pub business: Pubkey,
    /// Index into the @ned/core taxonomy (< JOB_CATEGORY_COUNT); memcmp "jobs in this category" (offset 42)
    pub category: u8,
    /// Bitmask of up to 64 skills from the same taxonomy (filtered in the browser)
    pub skills: u64,
    pub mint: Pubkey,
    pub job_id: u64,
    pub created_at: i64,
    /// Last time to apply
    pub apply_by: i64,
    /// Last time to select; withdraw opens after it
    pub select_by: i64,
    /// Sum of the template amounts; the job vault holds exactly this (plus any donation)
    pub total: u64,
    pub milestone_count: u8,
    /// MAX_MILESTONES slots (literal so the IDL gets a plain array length); slots >= milestone_count stay zeroed
    pub milestones: [JobMilestone; 5],
    /// UTF-8, zero-padded; searched
    pub title: [u8; 32],
    /// UTF-8, zero-padded; the card text; not part of the brief hash
    pub summary: [u8; 160],
    /// SHA-256 of the canonical brief JSON (same canonicalBrief as contracts); never all zero
    pub brief_hash: [u8; 32],
    /// Default until select_job
    pub selected: Pubkey,
    pub selected_at: i64,
    /// The contract created at select; memcmp "job of this contract" (offset 508)
    pub fund: Pubkey,
    pub application_count: u16,
    pub bump: u8,
    pub vault_bump: u8,
    pub _reserved: [u8; 32],
}

impl JobListing {
    pub const SPACE: usize = 8 + Self::INIT_SPACE;

    pub fn used(&self) -> &[JobMilestone] {
        &self.milestones[..self.milestone_count as usize]
    }
}

/// PDA [JOB_APP_SEED, job, freelancer]; 364 bytes with the discriminator. One per person per job.
#[account]
#[derive(InitSpace)]
pub struct JobApplication {
    pub version: u8,
    /// memcmp "applicants of a job" (offset 9)
    pub job: Pubkey,
    /// memcmp "my applications" (offset 41)
    pub freelancer: Pubkey,
    pub created_at: i64,
    pub pitch_len: u16,
    /// UTF-8, zero-padded; public
    pub pitch: [u8; 280],
    pub bump: u8,
}

impl JobApplication {
    pub const SPACE: usize = 8 + Self::INIT_SPACE;
}

const _: () = assert!(JobListing::SPACE == 576, "JobListing layout must stay 576 bytes");
const _: () = assert!(JobApplication::SPACE == 364, "JobApplication layout must stay 364 bytes");
const _: () = assert!(crate::constants::JOB_PITCH_MAX_LEN == 280, "pitch array length must equal JOB_PITCH_MAX_LEN");
const _: () = assert!(crate::constants::JOB_SUMMARY_MAX_LEN == 160, "summary array length must equal JOB_SUMMARY_MAX_LEN");
