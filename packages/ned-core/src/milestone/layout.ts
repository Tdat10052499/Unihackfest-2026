// SharedFund byte layout and program constants (docs/09-milestone-lock/program-spec.md sections 2–3).
// Mirrors ned_program; change both together.

/** v1.1 (ACCOUNT_VERSION 2); v1 funds were 708 bytes */
export const FUND_SIZE = 740;
export const OFFSET_CLIENT = 12;
export const OFFSET_FREELANCER = 44;
export const MILESTONE_SIZE = 65;
export const OFFSET_MILESTONES = 245;
/** SHA-256 of the canonical brief JSON (v1.1) */
export const OFFSET_BRIEF_HASH = 676;

export const FUND_SEED = 'fund';
export const VAULT_SEED = 'vault';

export const MAX_MILESTONES = 5;
/** 1,000 USDC in base units */
export const MAX_CONTRACT_AMOUNT = 1_000_000_000n;
/** Devnet values; launch 24 h / 72 h [Assumption] */
export const MIN_WORK_WINDOW_SECS = 60;
export const MIN_REVIEW_WINDOW_SECS = 60;
export const TITLE_MAX_LEN = 32;
/** post_note: data bytes per transaction part, and parts per note (v1.1) */
export const NOTE_MAX_LEN = 900;
export const NOTE_MAX_PARTS = 8;
/** SPL token account size (ATA rent) */
export const TOKEN_ACCOUNT_SIZE = 165;

export const FUND_STATES = ['Created', 'Accepted', 'Funded', 'Settled'] as const;
export const PAYOUT_KINDS = ['Unset', 'OwnWallet', 'PayoutPartner'] as const;
export const MILESTONE_STATUSES = ['Pending', 'Submitted', 'Disputed', 'Released', 'Refunded', 'Cancelled'] as const;

export type FundStateName = (typeof FUND_STATES)[number];
export type PayoutKindName = (typeof PAYOUT_KINDS)[number];
export type MilestoneStatusName = (typeof MILESTONE_STATUSES)[number];

export const isTerminal = (s: MilestoneStatusName) => s === 'Released' || s === 'Refunded' || s === 'Cancelled';
