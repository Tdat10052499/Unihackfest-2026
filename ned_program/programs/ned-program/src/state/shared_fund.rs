use anchor_lang::prelude::*;

// =============================================================================
// MILESTONE LOCK STATE (docs/09-milestone-lock/program-spec.md section 3)
// Field order is fixed: the app filters with memcmp at `client` (12) and `freelancer` (44).
// Never reorder; add fields only by taking bytes from `_reserved`.
// =============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default, InitSpace)]
pub enum FundKind {
    #[default]
    Milestone,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default, InitSpace)]
pub enum FundState {
    #[default]
    Created,
    Accepted,
    Funded,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default, InitSpace)]
pub enum PayoutKind {
    #[default]
    Unset,
    /// The freelancer's own wallet (international path)
    OwnWallet,
    /// An allowlisted payout partner that pays VND (Vietnam path)
    PayoutPartner,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default, InitSpace)]
pub enum MilestoneStatus {
    #[default]
    Pending,
    Submitted,
    Disputed,
    Released,
    Refunded,
    Cancelled,
}

impl MilestoneStatus {
    /// Released, Refunded or Cancelled
    pub fn is_terminal(self) -> bool {
        matches!(self, Self::Released | Self::Refunded | Self::Cancelled)
    }
}

/// One milestone slot (65 bytes)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default, InitSpace)]
pub struct Milestone {
    pub amount: u64,
    pub submit_by: i64,
    pub review_by: i64,
    /// 0 until submitted
    pub submitted_at: i64,
    /// SHA-256 of the delivery link or file, computed by the app
    pub evidence: [u8; 32],
    pub status: MilestoneStatus,
}

/// `create_fund` argument (24 bytes)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub struct MilestoneInput {
    pub amount: u64,
    pub submit_by: i64,
    pub review_by: i64,
}

/// PDA [FUND_SEED, creator, fund_id.to_le_bytes()]; 708 bytes with the discriminator
#[account]
#[derive(InitSpace)]
pub struct SharedFund {
    pub version: u8,
    pub kind: FundKind,
    pub state: FundState,
    pub payout_kind: PayoutKind,
    /// memcmp filter "as client" (offset 12)
    pub client: Pubkey,
    /// memcmp filter "as freelancer" (offset 44)
    pub freelancer: Pubkey,
    /// PDA seed; equals `client` in v1
    pub creator: Pubkey,
    /// Receives the rent of the fund and the vault on `close`
    pub rent_payer: Pubkey,
    /// A wallet (ATA owner), never a token account; default until `accept`
    pub payout_destination: Pubkey,
    pub mint: Pubkey,
    pub fund_id: u64,
    pub created_at: i64,
    /// Sum of milestone amounts
    pub total: u64,
    pub released: u64,
    pub refunded: u64,
    pub milestone_count: u8,
    /// MAX_MILESTONES slots (literal so the IDL gets a plain array length); slots >= milestone_count stay zeroed and are ignored
    pub milestones: [Milestone; 5],
    /// default = no proposal
    pub cancel_proposer: Pubkey,
    pub cancel_freelancer_amount: u64,
    /// UTF-8, zero-padded
    pub title: [u8; 32],
    pub bump: u8,
    pub vault_bump: u8,
    /// PayoutPartner only: hash of the partner's recipient ID; zero for OwnWallet
    pub payout_reference: [u8; 32],
    pub _reserved: [u8; 32],
}

impl SharedFund {
    pub const SPACE: usize = 8 + Self::INIT_SPACE;
}

const _: () = assert!(SharedFund::SPACE == 708, "SharedFund layout must stay 708 bytes");
const _: () = assert!(crate::constants::MAX_MILESTONES == 5, "milestones array length must equal MAX_MILESTONES");
