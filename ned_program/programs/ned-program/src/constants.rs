use anchor_lang::prelude::*;

/// Seeds của identity on-chain (Phương án C)
pub const NAME_SEED: &[u8] = b"name";
pub const REVERSE_SEED: &[u8] = b"reverse";
pub const PHONE_SEED: &[u8] = b"phone_v1";

pub const USERNAME_MIN_LEN: usize = 3;
pub const USERNAME_MAX_LEN: usize = 20;

// -----------------------------------------------------------------------------
// Milestone Lock (docs/09-milestone-lock/program-spec.md section 2)
// -----------------------------------------------------------------------------

pub const FUND_SEED: &[u8] = b"fund";
pub const VAULT_SEED: &[u8] = b"vault";

/// Circle devnet USDC, 6 decimals. Mainnet USDC only behind the `mainnet` feature, after audit.
#[cfg(not(feature = "mainnet"))]
pub const USDC_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
#[cfg(feature = "mainnet")]
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

/// Payout-partner allowlist for the Vietnam path (decision D13). Devnet: one team-controlled wallet that
/// simulates the partner (keypair ~/.config/solana/ned-demo-partner.json, outside the repo; equals
/// DEMO_PAYOUT_PARTNER in ned-wallet/constants/chain.ts). Mainnet stays empty until a partner signs up.
#[cfg(not(feature = "mainnet"))]
pub const PAYOUT_PARTNERS: &[Pubkey] = &[pubkey!("FA2qzovJShkNNNnMz3nXmYXvBzenRTgU2oko7RBBhbyp")];
#[cfg(feature = "mainnet")]
pub const PAYOUT_PARTNERS: &[Pubkey] = &[];

pub const MAX_MILESTONES: usize = 5;
/// 1,000 USDC demo cap (AML control) [Assumption]
pub const MAX_CONTRACT_AMOUNT: u64 = 1_000_000_000;
/// Time the freelancer has between lock and the first submission deadline. Devnet value; launch 24 h [Assumption]
pub const MIN_WORK_WINDOW_SECS: i64 = 60;
/// Devnet value; launch 72 h [Assumption]
pub const MIN_REVIEW_WINDOW_SECS: i64 = 60;
/// Bytes of UTF-8; no personal data in titles (public on-chain)
pub const TITLE_MAX_LEN: usize = 32;
/// 1 = the 708-byte layout deployed on 2–3 Oct (no `brief_hash`); 2 = v1.1 (740 bytes)
pub const ACCOUNT_VERSION: u8 = 2;
/// `post_note` data bytes per transaction part (v1.1)
pub const NOTE_MAX_LEN: usize = 900;
/// `post_note` parts per note (v1.1)
pub const NOTE_MAX_PARTS: u8 = 8;
/// `post_note` kinds (v1.1)
pub const NOTE_KIND_BRIEF: u8 = 0;
pub const NOTE_KIND_DELIVERY: u8 = 1;
/// v1.2 (key-sync Plan C): wraps of the contract key for the parties' registered devices
pub const NOTE_KIND_KEY: u8 = 2;
/// v1.3 (D27): the client's review of a submitted or disputed milestone (unmet done-when points, reason)
pub const NOTE_KIND_REVIEW: u8 = 3;

// -----------------------------------------------------------------------------
// Device keys (v1.2, docs/09-milestone-lock/key-sync-plan.md Plan C)
// -----------------------------------------------------------------------------

/// PDA [b"device_keys", wallet]: the X25519 public keys of the wallet's devices
pub const DEVICE_KEYS_SEED: &[u8] = b"device_keys";
pub const MAX_DEVICE_KEYS: usize = 5;

// -----------------------------------------------------------------------------
// Funded Jobs (v1.3, docs/09-milestone-lock/funded-jobs-plan.md section 4.1, decision D25)
// -----------------------------------------------------------------------------

/// PDA [JOB_SEED, business, job_id.to_le_bytes()]
pub const JOB_SEED: &[u8] = b"job";
/// Token account [JOB_VAULT_SEED, job], authority = the job PDA
pub const JOB_VAULT_SEED: &[u8] = b"job_vault";
/// PDA [JOB_APP_SEED, job, freelancer]: one application per person
pub const JOB_APP_SEED: &[u8] = b"job_app";
/// Bytes of UTF-8; public on-chain
pub const JOB_PITCH_MAX_LEN: usize = 280;
/// Time the selected freelancer has to accept before the business may select again or withdraw. Devnet value;
/// launch 48 h [Assumption]
pub const JOB_ACCEPT_WINDOW_SECS: i64 = 120;
/// Allowed gap between the template's work window and the contract's absolute deadline at select time
pub const JOB_DEADLINE_SLACK_SECS: i64 = 300;
/// Must equal the category list in @ned/core jobs/taxonomy.ts
pub const JOB_CATEGORY_COUNT: u8 = 8;
/// Bytes of UTF-8; public on-chain (the card text)
pub const JOB_SUMMARY_MAX_LEN: usize = 160;
/// JobListing / JobApplication layout version
pub const JOB_VERSION: u8 = 1;
