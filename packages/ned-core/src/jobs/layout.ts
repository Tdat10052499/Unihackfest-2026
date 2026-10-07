// JobListing and JobApplication byte layout and program constants (program v1.4, funded-jobs-plan.md sections 4.1–4.2,
// program-spec.md sections 10 and 11). Mirrors ned_program/src/state/job.rs; change both together.

/** JobListing account size, discriminator included */
export const JOB_LISTING_SIZE = 576;
/** JobApplication account size, discriminator included */
export const JOB_APPLICATION_SIZE = 364;

// JobListing offsets (memcmp filters and the decoder test)
export const JOB_OFFSET_STATE = 9;
export const JOB_OFFSET_BUSINESS = 10;
export const JOB_OFFSET_CATEGORY = 42;
export const JOB_OFFSET_SKILLS = 43;
export const JOB_OFFSET_MINT = 51;
export const JOB_OFFSET_JOB_ID = 83;
export const JOB_OFFSET_CREATED_AT = 91;
export const JOB_OFFSET_APPLY_BY = 99;
export const JOB_OFFSET_SELECT_BY = 107;
export const JOB_OFFSET_TOTAL = 115;
export const JOB_OFFSET_MILESTONE_COUNT = 123;
export const JOB_OFFSET_MILESTONES = 124;
export const JOB_MILESTONE_SIZE = 24;
export const JOB_OFFSET_TITLE = 244;
export const JOB_OFFSET_SUMMARY = 276;
export const JOB_OFFSET_BRIEF_HASH = 436;
export const JOB_OFFSET_SELECTED = 468;
export const JOB_OFFSET_SELECTED_AT = 500;
export const JOB_OFFSET_FUND = 508;
export const JOB_OFFSET_APPLICATION_COUNT = 540;
/** v1.4 (D29): 1 = "locks when hired" (nothing locked yet), 0 = budget in the job vault; every v1.3 listing reads 0 */
export const JOB_OFFSET_UNFUNDED = 544;

// JobApplication offsets
export const APP_OFFSET_JOB = 9;
export const APP_OFFSET_FREELANCER = 41;
export const APP_OFFSET_CREATED_AT = 73;
export const APP_OFFSET_PITCH_LEN = 81;
export const APP_OFFSET_PITCH = 83;

export const JOB_SEED = 'job';
export const JOB_VAULT_SEED = 'job_vault';
export const JOB_APP_SEED = 'job_app';

/** Bytes of UTF-8, public on-chain */
export const JOB_PITCH_MAX_LEN = 280;
export const JOB_SUMMARY_MAX_LEN = 160;
/** Must equal JOB_CATEGORIES.length in taxonomy.ts */
export const JOB_CATEGORY_COUNT = 8;
/** Devnet values; launch 48 h for the accept window [Assumption] */
export const JOB_ACCEPT_WINDOW_SECS = 120;
export const JOB_DEADLINE_SLACK_SECS = 300;

export const JOB_STATES = ['Open', 'Selected', 'Filled', 'Withdrawn'] as const;
export type JobStateName = (typeof JOB_STATES)[number];
