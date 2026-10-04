use anchor_lang::prelude::*;

// =============================================================================
// ERROR CODES
// =============================================================================

#[error_code]
pub enum NedError {
    #[msg("Username must be 3-20 characters: lowercase letters, digits or underscore.")]
    InvalidUsername,
    #[msg("This username is already taken.")]
    UsernameTaken,
    #[msg("This wallet already has a profile.")]
    ProfileAlreadyExists,
    #[msg("The new username is the same as the current one.")]
    SameUsername,
    #[msg("Only the owner of this username can change it.")]
    NotNameOwner,
    #[msg("This phone number is already linked to another N.E.D account.")]
    PhoneTaken,
    #[msg("This wallet already has a linked phone number. Unlink it first.")]
    PhoneAlreadyLinked,
    #[msg("Only the wallet that linked this phone number can unlink it.")]
    NotPhoneOwner,
    #[msg("Token amount must be greater than 0.")]
    InvalidAmount,
    // ---- Milestone Lock (program-spec section 6); append only, never reorder ----
    #[msg("A contract needs 1 to 5 milestones.")]
    InvalidMilestoneCount,
    #[msg("The contract total is above the maximum amount.")]
    AmountTooLarge,
    #[msg("A deadline is not valid.")]
    InvalidDeadline,
    #[msg("The review deadline must be at least the minimum review window after the submission deadline.")]
    ReviewWindowTooShort,
    #[msg("Too little time is left before the first submission deadline.")]
    WorkWindowTooShort,
    #[msg("The client and the freelancer must be different wallets.")]
    SameParty,
    #[msg("The freelancer address is not valid.")]
    InvalidFreelancer,
    #[msg("The title is longer than 32 bytes.")]
    TitleTooLong,
    #[msg("Only devnet USDC is accepted.")]
    InvalidMint,
    #[msg("The contract is not in the right state for this action.")]
    InvalidFundState,
    #[msg("Choose where the earnings go.")]
    InvalidPayoutKind,
    #[msg("This payout destination is not allowed for this choice.")]
    InvalidPayoutDestination,
    #[msg("This payout partner is not on the allowlist.")]
    PayoutPartnerNotAllowed,
    #[msg("The payout reference is missing or not allowed for this choice.")]
    InvalidPayoutReference,
    #[msg("This milestone does not exist in the contract.")]
    MilestoneIndexOutOfRange,
    #[msg("The milestone is not in the right state for this action.")]
    InvalidMilestoneStatus,
    #[msg("The deadline for this action has passed.")]
    DeadlinePassed,
    #[msg("The deadline has not passed yet.")]
    DeadlineNotReached,
    #[msg("Only the client or the freelancer can do this.")]
    NotAParty,
    #[msg("There is no cancel proposal.")]
    NoCancelProposal,
    #[msg("The other party must accept the proposal.")]
    CannotAcceptOwnProposal,
    #[msg("The proposed amount is larger than what is still locked.")]
    CancelAmountTooLarge,
    #[msg("The cancel proposal changed. Review it again.")]
    CancelProposalChanged,
    #[msg("This contract cannot be closed now.")]
    FundNotClosable,
    #[msg("Arithmetic overflow.")]
    MathOverflow,
    // ---- v1.1 (program-spec section 6); append only, never reorder ----
    #[msg("The brief fingerprint is missing.")]
    InvalidBriefHash,
    #[msg("The brief changed. Read the brief again before accepting.")]
    BriefMismatch,
    #[msg("The delivery fingerprint is missing.")]
    InvalidEvidence,
    #[msg("The note is empty, too long or has wrong part numbers.")]
    InvalidNote,
    #[msg("This note cannot be added now.")]
    NoteNotAllowed,
    // ---- v1.2 (key-sync Plan C); append only, never reorder ----
    #[msg("This wallet already has the maximum number of devices. Remove one first.")]
    DeviceKeysFull,
    #[msg("This device is not registered for this wallet.")]
    DeviceKeyNotFound,
    #[msg("The device key is not valid.")]
    InvalidDeviceKey,
}
