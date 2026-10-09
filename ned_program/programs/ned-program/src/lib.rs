use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

// Crate-root re-exports: Anchor's #[program] and the tests use these paths
// (NameRecord, PhoneRecord, ReverseRecord, NAME_SEED, ...).
pub use constants::*;
pub use errors::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh");

#[program]
pub mod ned_program {
    use super::*;

    // =========================================================================
    // 1. IDENTITY: public username + optional phone number (only phone_key = scrypt(phone) is stored)
    // =========================================================================

    /// Create profile: NameRecord [b"name", username] + ReverseRecord [b"reverse", wallet]
    pub fn create_profile(ctx: Context<CreateProfile>, username: String) -> Result<()> {
        create_profile_handler(ctx, username)
    }

    /// Link phone: PhoneRecord [b"phone_v1", phone_key]. phone_key = scrypt(phone in E.164), computed in the app —
    /// the program never receives or stores the phone number in clear.
    pub fn link_phone(ctx: Context<LinkPhone>, phone_key: [u8; 32]) -> Result<()> {
        link_phone_handler(ctx, phone_key)
    }

    /// Unlink phone: closes the signer's own PhoneRecord (rent refunded to the signer)
    pub fn unlink_phone(ctx: Context<UnlinkPhone>) -> Result<()> {
        unlink_phone_handler(ctx)
    }

    /// Change username: closes the old NameRecord (rent refunded), creates the new NameRecord, updates the ReverseRecord
    pub fn update_username(ctx: Context<UpdateUsername>, new_username: String) -> Result<()> {
        update_username_handler(ctx, new_username)
    }

    // =========================================================================
    // 2. STABLECOIN TRANSFERS
    // =========================================================================

    /// Transfers a stablecoin (SPL Token / Token 2022) safely through a TransferChecked CPI
    pub fn transfer_stablecoin(ctx: Context<TransferStablecoin>, amount: u64) -> Result<()> {
        transfer_stablecoin_handler(ctx, amount)
    }

    // =========================================================================
    // 3. MILESTONE LOCK (docs/09-milestone-lock/program-spec.md section 4)
    // =========================================================================

    /// Client creates a contract: 1–5 milestones, each with an amount, a submission deadline and a review deadline
    pub fn create_fund(
        ctx: Context<CreateFund>,
        fund_id: u64,
        freelancer: Pubkey,
        title: String,
        milestones: Vec<MilestoneInput>,
        brief_hash: [u8; 32],
    ) -> Result<()> {
        create_fund_handler(ctx, fund_id, freelancer, title, milestones, brief_hash)
    }

    /// Freelancer accepts the brief (by its hash) and fixes where the earnings go: own wallet, or an allowlisted payout partner + reference
    pub fn accept(
        ctx: Context<Accept>,
        payout_kind: PayoutKind,
        payout_destination: Pubkey,
        payout_reference: [u8; 32],
        expected_brief_hash: [u8; 32],
    ) -> Result<()> {
        accept_handler(ctx, payout_kind, payout_destination, payout_reference, expected_brief_hash)
    }

    /// Client locks the full contract amount in the vault
    pub fn lock(ctx: Context<Lock>) -> Result<()> {
        lock_handler(ctx)
    }

    /// Freelancer marks a milestone delivered; `evidence` = SHA-256 of the canonical delivery JSON (never all zero)
    pub fn submit(ctx: Context<Submit>, index: u8, evidence: [u8; 32]) -> Result<()> {
        submit_handler(ctx, index, evidence)
    }

    /// Client approves a submitted (or disputed) milestone: release to the destination
    pub fn approve(ctx: Context<Approve>, index: u8) -> Result<()> {
        approve_handler(ctx, index)
    }

    /// Anyone releases a submitted milestone after its review deadline
    pub fn release_after_review(ctx: Context<ReleaseAfterReview>, index: u8) -> Result<()> {
        release_after_review_handler(ctx, index)
    }

    /// Anyone refunds a milestone not submitted by its submission deadline
    pub fn refund(ctx: Context<Refund>, index: u8) -> Result<()> {
        refund_handler(ctx, index)
    }

    /// Creator closes a never-funded or settled contract; leftover → client, rent → rent_payer
    pub fn close(ctx: Context<Close>) -> Result<()> {
        close_handler(ctx)
    }

    /// Posts one part of an encrypted brief (client, while Created), delivery (freelancer, Submitted milestone) or,
    /// from v1.2, key note (either party, wraps of the contract key for registered devices).
    /// No state change; the app reads it back from the transaction (v1.1)
    pub fn post_note(ctx: Context<PostNote>, kind: u8, milestone: u8, part: u8, parts: u8, data: Vec<u8>) -> Result<()> {
        post_note_handler(ctx, kind, milestone, part, parts, data)
    }

    // Device keys (v1.2, key-sync Plan C): X25519 public keys of the wallet's devices

    /// Creates the wallet's empty device-key list (sent with the first add_device_key)
    pub fn init_device_keys(ctx: Context<InitDeviceKeys>) -> Result<()> {
        init_device_keys_handler(ctx)
    }

    /// Registers one device key (no change if it is already registered)
    pub fn add_device_key(ctx: Context<UpdateDeviceKeys>, key: [u8; 32]) -> Result<()> {
        add_device_key_handler(ctx, key)
    }

    /// Removes one device key
    pub fn remove_device_key(ctx: Context<UpdateDeviceKeys>, key: [u8; 32]) -> Result<()> {
        remove_device_key_handler(ctx, key)
    }

    // P1 group (ships together or not at all): dispute, concede, propose_cancel, accept_cancel

    /// Client disputes a submitted milestone before its review deadline (blocks auto-release)
    pub fn dispute(ctx: Context<Dispute>, index: u8) -> Result<()> {
        dispute_handler(ctx, index)
    }

    /// Freelancer concedes a disputed milestone: refund to the client
    pub fn concede(ctx: Context<Concede>, index: u8) -> Result<()> {
        concede_handler(ctx, index)
    }

    /// Client or freelancer proposes a split of what is still locked
    pub fn propose_cancel(ctx: Context<ProposeCancel>, freelancer_amount: u64) -> Result<()> {
        propose_cancel_handler(ctx, freelancer_amount)
    }

    /// The other party accepts the split; the expected values must match the current proposal
    pub fn accept_cancel(
        ctx: Context<AcceptCancel>,
        expected_freelancer_amount: u64,
        expected_unsettled: u64,
    ) -> Result<()> {
        accept_cancel_handler(ctx, expected_freelancer_amount, expected_unsettled)
    }

    // =========================================================================
    // 4. FUNDED JOBS (v1.3, funded-jobs-plan.md section 4, decision D25)
    // =========================================================================

    /// Publishes a job and locks its whole budget in the job vault
    #[allow(clippy::too_many_arguments)]
    pub fn post_job(
        ctx: Context<PostJob>,
        job_id: u64,
        title: String,
        summary: String,
        category: u8,
        skills: u64,
        milestones: Vec<JobMilestoneInput>,
        brief_hash: [u8; 32],
        apply_by: i64,
        select_by: i64,
    ) -> Result<()> {
        post_job_handler(ctx, job_id, title, summary, category, skills, milestones, brief_hash, apply_by, select_by, true)
    }

    /// v1.4 (D29): publishes a job that locks its budget when the business selects someone (nothing locked now)
    #[allow(clippy::too_many_arguments)]
    pub fn post_job_open(
        ctx: Context<PostJob>,
        job_id: u64,
        title: String,
        summary: String,
        category: u8,
        skills: u64,
        milestones: Vec<JobMilestoneInput>,
        brief_hash: [u8; 32],
        apply_by: i64,
        select_by: i64,
    ) -> Result<()> {
        post_job_handler(ctx, job_id, title, summary, category, skills, milestones, brief_hash, apply_by, select_by, false)
    }

    /// v1.4 (D29): locks the budget of a "locks when hired" job (same transaction as create_fund + select_job)
    pub fn fund_job(ctx: Context<FundJob>) -> Result<()> {
        fund_job_handler(ctx)
    }

    /// One part of the job's plain-text brief (no state change), while the job is Open
    pub fn post_job_brief(ctx: Context<PostJobBrief>, part: u8, parts: u8, data: Vec<u8>) -> Result<()> {
        post_job_brief_handler(ctx, part, parts, data)
    }

    /// Applies to an open job with a public pitch (one application per person)
    pub fn apply_job(ctx: Context<ApplyJob>, pitch: String) -> Result<()> {
        apply_job_handler(ctx, pitch)
    }

    /// Binds the job to the contract just created for one applicant (same transaction, after create_fund)
    pub fn select_job(ctx: Context<SelectJob>) -> Result<()> {
        select_job_handler(ctx)
    }

    /// Moves the job budget into the accepted contract (same transaction, after accept)
    pub fn lock_from_job(ctx: Context<LockFromJob>) -> Result<()> {
        lock_from_job_handler(ctx)
    }

    /// Returns the budget to the business when no one was hired
    pub fn withdraw_job(ctx: Context<WithdrawJob>) -> Result<()> {
        withdraw_job_handler(ctx)
    }
}
