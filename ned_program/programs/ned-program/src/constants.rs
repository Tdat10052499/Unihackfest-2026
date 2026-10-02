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
/// simulates the partner. TODO(N12): replace with the public key of ~/.config/solana/ned-demo-partner.json;
/// this placeholder has no saved private key. Mainnet stays empty until a partner signs up.
#[cfg(not(feature = "mainnet"))]
pub const PAYOUT_PARTNERS: &[Pubkey] = &[pubkey!("DwjFswK4mFycQgV2pckFWYj8T2jTWc4RWgBNgDcbZYjt")];
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
pub const ACCOUNT_VERSION: u8 = 1;
