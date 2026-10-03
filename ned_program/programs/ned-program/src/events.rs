use anchor_lang::prelude::*;

use crate::state::PayoutKind;

// =============================================================================
// EVENTS
// =============================================================================

#[event]
pub struct ProfileCreated {
    pub wallet: Pubkey,
    pub username: String,
}

#[event]
pub struct PhoneLinked {
    pub wallet: Pubkey,
    pub phone_record: Pubkey,
}

#[event]
pub struct PhoneUnlinked {
    pub wallet: Pubkey,
    pub phone_record: Pubkey,
}

#[event]
pub struct UsernameUpdated {
    pub wallet: Pubkey,
    pub old_username: String,
    pub new_username: String,
}

#[event]
pub struct StablecoinTransferred {
    pub from: Pubkey,
    pub from_token_account: Pubkey,
    pub to_token_account: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub decimals: u8,
}

// ---- Milestone Lock (program-spec section 5) ----

#[event]
pub struct FundCreated {
    pub fund: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub total: u64,
    pub milestone_count: u8,
    pub brief_hash: [u8; 32],
}

#[event]
pub struct FundAccepted {
    pub fund: Pubkey,
    pub payout_kind: PayoutKind,
    pub payout_destination: Pubkey,
    pub payout_reference: [u8; 32],
}

#[event]
pub struct FundLocked {
    pub fund: Pubkey,
    pub amount: u64,
}

#[event]
pub struct MilestoneSubmitted {
    pub fund: Pubkey,
    pub index: u8,
    pub evidence: [u8; 32],
}

/// The payout partner matches a deposit to a recipient by this event (`payout_reference`)
#[event]
pub struct MilestoneReleased {
    pub fund: Pubkey,
    pub index: u8,
    pub amount: u64,
    pub destination: Pubkey,
    pub payout_reference: [u8; 32],
    pub by_timeout: bool,
    pub caller: Pubkey,
}

#[event]
pub struct MilestoneRefunded {
    pub fund: Pubkey,
    pub index: u8,
    pub amount: u64,
    pub caller: Pubkey,
    pub conceded: bool,
}

#[event]
pub struct MilestoneDisputed {
    pub fund: Pubkey,
    pub index: u8,
}

#[event]
pub struct CancelProposed {
    pub fund: Pubkey,
    pub proposer: Pubkey,
    pub freelancer_amount: u64,
}

#[event]
pub struct FundCancelled {
    pub fund: Pubkey,
    pub to_destination: u64,
    pub to_client: u64,
}

#[event]
pub struct FundClosed {
    pub fund: Pubkey,
    pub leftover_to_client: u64,
}

/// An encrypted brief or delivery note was posted (v1.1); the ciphertext is in the instruction data only
#[event]
pub struct NotePosted {
    pub fund: Pubkey,
    pub author: Pubkey,
    pub kind: u8,
    pub milestone: u8,
    pub part: u8,
    pub parts: u8,
    pub len: u16,
}
