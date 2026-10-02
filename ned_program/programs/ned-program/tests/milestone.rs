//! Milestone Lock P0 tests (docs/09-milestone-lock/program-spec.md section 8: groups 1–6, 9–15).
//! Cần build trước: `anchor build` (đọc target/deploy/ned_program.so).

mod common;

use anchor_lang::__private::base64::{engine::general_purpose::STANDARD, Engine};
use anchor_lang::prelude::Pubkey;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::{AnchorDeserialize, Discriminator, InstructionData, ToAccountMetas};
use common::*;
use litesvm::LiteSVM;
use ned_program::{
    FundState, MilestoneInput, MilestoneReleased, MilestoneStatus, PayoutKind, SharedFund, FUND_SEED,
    MIN_WORK_WINDOW_SECS, PAYOUT_PARTNERS, VAULT_SEED,
};
use solana_keypair::Keypair;
use solana_signer::Signer;

/// Chain time at the start of every test
const T0: i64 = 1_759_400_000;
const USDC: u64 = 1_000_000;
/// First submission deadline: 10 minutes after T0
const SUBMIT0: i64 = T0 + 600;
const REVIEW_WINDOW: i64 = 120;

// -----------------------------------------------------------------------------
// Environment and instruction builders
// -----------------------------------------------------------------------------

struct Env {
    svm: LiteSVM,
    client: Keypair,
    freelancer: Keypair,
    mint: Pubkey,
}

fn env() -> Env {
    let mut svm = setup();
    set_clock(&mut svm, T0);
    let mint = put_usdc_mint(&mut svm);
    let client = new_user(&mut svm);
    let freelancer = new_user(&mut svm);
    put_token_account(&mut svm, &client.pubkey(), &mint, 1_000 * USDC);
    put_token_account(&mut svm, &freelancer.pubkey(), &mint, 0);
    put_token_account(&mut svm, &PAYOUT_PARTNERS[0], &mint, 0);
    Env { svm, client, freelancer, mint }
}

fn fund_pda(creator: &Pubkey, fund_id: u64) -> Pubkey {
    Pubkey::find_program_address(&[FUND_SEED, creator.as_ref(), &fund_id.to_le_bytes()], &ned_program::ID).0
}
fn vault_pda(fund: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[VAULT_SEED, fund.as_ref()], &ned_program::ID).0
}

/// `n` milestones of `amount`, submission deadlines 100 s apart from SUBMIT0, review window 120 s
fn milestones(n: usize, amount: u64) -> Vec<MilestoneInput> {
    (0..n)
        .map(|i| {
            let submit_by = SUBMIT0 + 100 * i as i64;
            MilestoneInput { amount, submit_by, review_by: submit_by + REVIEW_WINDOW }
        })
        .collect()
}

#[allow(clippy::too_many_arguments)]
fn create_ix_full(
    client: &Pubkey,
    payer: &Pubkey,
    fund_id: u64,
    freelancer: Pubkey,
    title: &str,
    ms: Vec<MilestoneInput>,
    mint: Pubkey,
) -> Instruction {
    let fund = fund_pda(client, fund_id);
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::CreateFund {
            client: *client,
            payer: *payer,
            fund,
            vault: vault_pda(&fund),
            mint,
            token_program: TOKEN_PROGRAM_ID,
            system_program: SYSTEM_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::CreateFund { fund_id, freelancer, title: title.to_string(), milestones: ms }
            .data(),
    }
}

fn accept_ix(fund: Pubkey, freelancer: &Pubkey, kind: PayoutKind, destination: Pubkey, reference: [u8; 32]) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Accept { fund, freelancer: *freelancer }.to_account_metas(None),
        data: ned_program::instruction::Accept {
            payout_kind: kind,
            payout_destination: destination,
            payout_reference: reference,
        }
        .data(),
    }
}

fn lock_ix(fund: Pubkey, client: &Pubkey, mint: Pubkey) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Lock {
            fund,
            client: *client,
            client_token: ata(client, &mint),
            vault: vault_pda(&fund),
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::Lock {}.data(),
    }
}

fn submit_ix(fund: Pubkey, freelancer: &Pubkey, index: u8) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Submit { fund, freelancer: *freelancer }.to_account_metas(None),
        data: ned_program::instruction::Submit { index, evidence: [index + 1; 32] }.data(),
    }
}

/// approve with explicit destination, destination token account, vault and mint (for the attack tests)
fn approve_ix_raw(fund: Pubkey, client: &Pubkey, destination: Pubkey, destination_token: Pubkey, vault: Pubkey, mint: Pubkey, index: u8) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Approve {
            fund,
            client: *client,
            destination,
            destination_token,
            vault,
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::Approve { index }.data(),
    }
}

fn approve_ix(fund: Pubkey, client: &Pubkey, destination: Pubkey, mint: Pubkey, index: u8) -> Instruction {
    approve_ix_raw(fund, client, destination, ata(&destination, &mint), vault_pda(&fund), mint, index)
}

fn release_ix(fund: Pubkey, caller: &Pubkey, destination: Pubkey, mint: Pubkey, index: u8) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::ReleaseAfterReview {
            fund,
            caller: *caller,
            destination,
            destination_token: ata(&destination, &mint),
            vault: vault_pda(&fund),
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::ReleaseAfterReview { index }.data(),
    }
}

fn refund_ix(fund: Pubkey, caller: &Pubkey, client: &Pubkey, mint: Pubkey, index: u8) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Refund {
            fund,
            caller: *caller,
            client: *client,
            client_token: ata(client, &mint),
            vault: vault_pda(&fund),
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::Refund { index }.data(),
    }
}

fn close_ix(fund: Pubkey, creator: &Pubkey, rent_payer: &Pubkey, client: &Pubkey, mint: Pubkey) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Close {
            fund,
            creator: *creator,
            rent_payer: *rent_payer,
            client: *client,
            client_token: ata(client, &mint),
            vault: vault_pda(&fund),
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::Close {}.data(),
    }
}

impl Env {
    fn c(&self) -> Pubkey {
        self.client.pubkey()
    }
    fn f(&self) -> Pubkey {
        self.freelancer.pubkey()
    }
    fn fund(&self, fund_id: u64) -> SharedFund {
        read(&self.svm, &fund_pda(&self.c(), fund_id)).expect("fund exists")
    }
    fn create_ix(&self, fund_id: u64, ms: Vec<MilestoneInput>) -> Instruction {
        create_ix_full(&self.c(), &self.c(), fund_id, self.f(), "Landing page design", ms, self.mint)
    }
    /// Client signs; returns the transaction result
    fn as_client(&mut self, ix: Instruction) -> Result<litesvm::types::TransactionMetadata, String> {
        let client = self.client.insecure_clone();
        send_signed(&mut self.svm, &[ix], &client, &[])
    }
    fn as_freelancer(&mut self, ix: Instruction) -> Result<litesvm::types::TransactionMetadata, String> {
        let freelancer = self.freelancer.insecure_clone();
        send_signed(&mut self.svm, &[ix], &freelancer, &[])
    }
    /// create → accept(OwnWallet) → lock; returns the fund address
    fn funded(&mut self, fund_id: u64, ms: Vec<MilestoneInput>) -> Pubkey {
        let fund = fund_pda(&self.c(), fund_id);
        self.as_client(self.create_ix(fund_id, ms)).unwrap();
        let f = self.f();
        self.as_freelancer(accept_ix(fund, &f, PayoutKind::OwnWallet, f, [0; 32])).unwrap();
        let c = self.c();
        self.as_client(lock_ix(fund, &c, self.mint)).unwrap();
        fund
    }
    fn balance(&self, owner: &Pubkey) -> u64 {
        token_amount(&self.svm, &ata(owner, &self.mint))
    }
}

fn closed(svm: &LiteSVM, address: &Pubkey) -> bool {
    svm.get_account(address).map_or(true, |a| a.lamports == 0)
}

fn assert_invariant(fund: &SharedFund) {
    let unsettled: u64 = fund.milestones[..fund.milestone_count as usize]
        .iter()
        .filter(|m| !matches!(m.status, MilestoneStatus::Released | MilestoneStatus::Refunded | MilestoneStatus::Cancelled))
        .map(|m| m.amount)
        .sum();
    assert_eq!(fund.released + fund.refunded + unsettled, fund.total, "released + refunded + unsettled == total");
}

/// MilestoneReleased events in the logs of a transaction
fn released_events(meta: &litesvm::types::TransactionMetadata) -> Vec<MilestoneReleased> {
    meta.logs
        .iter()
        .filter_map(|l| l.strip_prefix("Program data: "))
        .filter_map(|b64| STANDARD.decode(b64).ok())
        .filter(|d| d.starts_with(MilestoneReleased::DISCRIMINATOR))
        .map(|d| MilestoneReleased::deserialize(&mut &d[8..]).unwrap())
        .collect()
}

// -----------------------------------------------------------------------------
// 1. Happy path, 2 milestones (OwnWallet)
// -----------------------------------------------------------------------------

#[test]
fn g01_happy_path_two_milestones() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let fund = fund_pda(&c, 1);
    let client_before = e.balance(&c);

    e.as_client(e.create_ix(1, milestones(2, 10 * USDC))).unwrap();
    let state = e.fund(1);
    assert_eq!(state.state, FundState::Created);
    assert_eq!(state.total, 20 * USDC);
    assert_eq!(state.rent_payer, c);
    assert_eq!(&state.title[..19], b"Landing page design");

    e.as_freelancer(accept_ix(fund, &f, PayoutKind::OwnWallet, f, [0; 32])).unwrap();
    assert_eq!(e.fund(1).state, FundState::Accepted);
    e.as_client(lock_ix(fund, &c, mint)).unwrap();
    assert_eq!(e.fund(1).state, FundState::Funded);
    assert_eq!(token_amount(&e.svm, &vault_pda(&fund)), 20 * USDC);

    e.as_freelancer(submit_ix(fund, &f, 0)).unwrap();
    assert_eq!(e.fund(1).milestones[0].status, MilestoneStatus::Submitted);
    assert_eq!(e.fund(1).milestones[0].submitted_at, T0);
    assert_eq!(e.fund(1).milestones[0].evidence, [1; 32]);
    e.as_client(approve_ix(fund, &c, f, mint, 0)).unwrap();
    assert_eq!(e.balance(&f), 10 * USDC);
    assert_eq!(e.fund(1).state, FundState::Funded);

    e.as_freelancer(submit_ix(fund, &f, 1)).unwrap();
    e.as_client(approve_ix(fund, &c, f, mint, 1)).unwrap();
    let state = e.fund(1);
    assert_eq!(state.state, FundState::Settled);
    assert_eq!(state.released, 20 * USDC);
    assert_eq!(e.balance(&f), 20 * USDC);
    assert_eq!(e.balance(&c), client_before - 20 * USDC);

    // close: fund + vault rent back to the rent payer (minus the 5,000-lamport fee)
    let rent = e.svm.get_balance(&fund).unwrap() + e.svm.get_balance(&vault_pda(&fund)).unwrap();
    let lamports_before = e.svm.get_balance(&c).unwrap();
    e.as_client(close_ix(fund, &c, &c, &c, mint)).unwrap();
    assert!(closed(&e.svm, &fund));
    assert!(closed(&e.svm, &vault_pda(&fund)));
    assert_eq!(e.svm.get_balance(&c).unwrap(), lamports_before + rent - 5_000);
}

#[test]
fn g01_separate_rent_payer_gets_the_rent() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let payer = new_user(&mut e.svm);
    let fund = fund_pda(&c, 2);
    let client = e.client.insecure_clone();
    send_signed(&mut e.svm, &[create_ix_full(&c, &payer.pubkey(), 2, f, "t", milestones(1, USDC), mint)], &payer, &[&client]).unwrap();
    assert_eq!(e.fund(2).rent_payer, payer.pubkey());
    let rent = e.svm.get_balance(&fund).unwrap() + e.svm.get_balance(&vault_pda(&fund)).unwrap();
    let before = e.svm.get_balance(&payer.pubkey()).unwrap();
    // never funded → closable; rent goes to the payer, not the client
    assert_err(e.as_client(close_ix(fund, &c, &c, &c, mint)), "ConstraintAddress");
    e.as_client(close_ix(fund, &c, &payer.pubkey(), &c, mint)).unwrap();
    assert_eq!(e.svm.get_balance(&payer.pubkey()).unwrap(), before + rent);
}

// -----------------------------------------------------------------------------
// 2. Vietnam path (PayoutPartner)
// -----------------------------------------------------------------------------

#[test]
fn g02_vietnam_path_releases_to_partner_with_reference() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let partner = PAYOUT_PARTNERS[0];
    let reference = [0xAB; 32];
    let fund = fund_pda(&c, 1);
    e.as_client(e.create_ix(1, milestones(1, 10 * USDC))).unwrap();

    // a non-allowlisted address and a zero reference are rejected
    let attacker = Pubkey::new_unique();
    assert_err(e.as_freelancer(accept_ix(fund, &f, PayoutKind::PayoutPartner, attacker, reference)), "PayoutPartnerNotAllowed");
    assert_err(e.as_freelancer(accept_ix(fund, &f, PayoutKind::PayoutPartner, partner, [0; 32])), "InvalidPayoutReference");
    assert_err(e.as_freelancer(accept_ix(fund, &f, PayoutKind::Unset, partner, reference)), "InvalidPayoutKind");

    e.as_freelancer(accept_ix(fund, &f, PayoutKind::PayoutPartner, partner, reference)).unwrap();
    let state = e.fund(1);
    assert_eq!(state.payout_kind, PayoutKind::PayoutPartner);
    assert_eq!(state.payout_destination, partner);
    assert_eq!(state.payout_reference, reference);

    e.as_client(lock_ix(fund, &c, mint)).unwrap();
    // the freelancer (not the partner) signs submit
    e.as_freelancer(submit_ix(fund, &f, 0)).unwrap();
    // releasing to the freelancer's own wallet is impossible now
    assert_err(e.as_client(approve_ix(fund, &c, f, mint, 0)), "InvalidPayoutDestination");
    let meta = e.as_client(approve_ix(fund, &c, partner, mint, 0)).unwrap();
    assert_eq!(e.balance(&partner), 10 * USDC);
    assert_eq!(e.balance(&f), 0);

    let events = released_events(&meta);
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].payout_reference, reference);
    assert_eq!(events[0].destination, partner);
    assert_eq!(events[0].amount, 10 * USDC);
    assert!(!events[0].by_timeout);
}

#[test]
fn g02_own_wallet_rules() {
    let mut e = env();
    let (c, f) = (e.c(), e.f());
    let fund = fund_pda(&c, 1);
    e.as_client(e.create_ix(1, milestones(1, USDC))).unwrap();
    assert_err(e.as_freelancer(accept_ix(fund, &f, PayoutKind::OwnWallet, Pubkey::new_unique(), [0; 32])), "InvalidPayoutDestination");
    assert_err(e.as_freelancer(accept_ix(fund, &f, PayoutKind::OwnWallet, f, [1; 32])), "InvalidPayoutReference");
}

// -----------------------------------------------------------------------------
// 3. Auto-release, 4. refund, 5. submit boundary
// -----------------------------------------------------------------------------

#[test]
fn g03_auto_release_after_review_deadline_by_anyone() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let fund = e.funded(1, milestones(1, 10 * USDC));
    e.as_freelancer(submit_ix(fund, &f, 0)).unwrap();
    let review_by = e.fund(1).milestones[0].review_by;
    let stranger = new_user(&mut e.svm);

    set_clock(&mut e.svm, review_by);
    assert_err(send_signed(&mut e.svm, &[release_ix(fund, &stranger.pubkey(), f, mint, 0)], &stranger, &[]), "DeadlineNotReached");
    set_clock(&mut e.svm, review_by + 1);
    let meta = send_signed(&mut e.svm, &[release_ix(fund, &stranger.pubkey(), f, mint, 0)], &stranger, &[]).unwrap();
    assert_eq!(e.balance(&f), 10 * USDC);
    let state = e.fund(1);
    assert_eq!(state.milestones[0].status, MilestoneStatus::Released);
    assert_eq!(state.state, FundState::Settled);
    let events = released_events(&meta);
    assert!(events[0].by_timeout);
    assert_eq!(events[0].caller, stranger.pubkey());
    // release needs Submitted
    assert_err(e.as_client(release_ix(fund, &c, f, mint, 0)), "InvalidFundState");
}

#[test]
fn g04_refund_after_submission_deadline_goes_to_client() {
    let mut e = env();
    let (c, mint) = (e.c(), e.mint);
    let fund = e.funded(1, milestones(1, 10 * USDC));
    let submit_by = e.fund(1).milestones[0].submit_by;
    let stranger = new_user(&mut e.svm);
    let before = e.balance(&c);

    set_clock(&mut e.svm, submit_by);
    assert_err(send_signed(&mut e.svm, &[refund_ix(fund, &stranger.pubkey(), &c, mint, 0)], &stranger, &[]), "DeadlineNotReached");
    set_clock(&mut e.svm, submit_by + 1);
    send_signed(&mut e.svm, &[refund_ix(fund, &stranger.pubkey(), &c, mint, 0)], &stranger, &[]).unwrap();
    assert_eq!(e.balance(&c), before + 10 * USDC);
    let state = e.fund(1);
    assert_eq!(state.milestones[0].status, MilestoneStatus::Refunded);
    assert_eq!(state.refunded, 10 * USDC);
    assert_eq!(state.state, FundState::Settled);
    // the refund goes to the fund's client only
    let attacker = Pubkey::new_unique();
    put_token_account(&mut e.svm, &attacker, &mint, 0);
    assert_err(e.as_client(refund_ix(fund, &c, &attacker, mint, 0)), "ConstraintAddress");
}

#[test]
fn g05_submit_boundary() {
    let mut e = env();
    let f = e.f();
    let fund = e.funded(1, milestones(2, USDC));
    let [m0, m1] = [e.fund(1).milestones[0], e.fund(1).milestones[1]];
    set_clock(&mut e.svm, m0.submit_by);
    e.as_freelancer(submit_ix(fund, &f, 0)).unwrap();
    set_clock(&mut e.svm, m1.submit_by + 1);
    assert_err(e.as_freelancer(submit_ix(fund, &f, 1)), "DeadlinePassed");
    // already submitted
    assert_err(e.as_freelancer(submit_ix(fund, &f, 0)), "InvalidMilestoneStatus");
}

// -----------------------------------------------------------------------------
// 6. Unused slots
// -----------------------------------------------------------------------------

#[test]
fn g06_unused_slots_are_out_of_range_and_fund_settles_after_two() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let fund = e.funded(1, milestones(2, USDC));
    for index in 2u8..=4 {
        assert_err(e.as_freelancer(submit_ix(fund, &f, index)), "MilestoneIndexOutOfRange");
        assert_err(e.as_client(approve_ix(fund, &c, f, mint, index)), "MilestoneIndexOutOfRange");
        assert_err(e.as_client(release_ix(fund, &c, f, mint, index)), "MilestoneIndexOutOfRange");
        assert_err(e.as_client(refund_ix(fund, &c, &c, mint, index)), "MilestoneIndexOutOfRange");
    }
    // zeroed slots 2..5 look like Pending, but they never block settling
    for index in 0u8..2 {
        e.as_freelancer(submit_ix(fund, &f, index)).unwrap();
        e.as_client(approve_ix(fund, &c, f, mint, index)).unwrap();
    }
    let state = e.fund(1);
    assert_eq!(state.milestones[3].status, MilestoneStatus::Pending);
    assert_eq!(state.state, FundState::Settled);
    assert_eq!(state.milestone_count, 2);
}

// -----------------------------------------------------------------------------
// 9. Order and windows
// -----------------------------------------------------------------------------

#[test]
fn g09_order_and_work_windows() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let fund = fund_pda(&c, 1);
    e.as_client(e.create_ix(1, milestones(1, USDC))).unwrap();

    // lock before accept
    assert_err(e.as_client(lock_ix(fund, &c, mint)), "InvalidFundState");
    // accept by someone other than the freelancer
    let stranger = new_user(&mut e.svm);
    let s = stranger.pubkey();
    assert_err(send_signed(&mut e.svm, &[accept_ix(fund, &s, PayoutKind::OwnWallet, s, [0; 32])], &stranger, &[]), "ConstraintHasOne");
    // accept inside the last MIN_WORK_WINDOW_SECS fails, at the boundary it succeeds
    set_clock(&mut e.svm, SUBMIT0 - MIN_WORK_WINDOW_SECS + 1);
    assert_err(e.as_freelancer(accept_ix(fund, &f, PayoutKind::OwnWallet, f, [0; 32])), "WorkWindowTooShort");
    set_clock(&mut e.svm, SUBMIT0 - MIN_WORK_WINDOW_SECS);
    e.as_freelancer(accept_ix(fund, &f, PayoutKind::OwnWallet, f, [0; 32])).unwrap();
    // accept twice
    assert_err(e.as_freelancer(accept_ix(fund, &f, PayoutKind::OwnWallet, f, [0; 32])), "InvalidFundState");
    // lock inside the last MIN_WORK_WINDOW_SECS fails
    set_clock(&mut e.svm, SUBMIT0 - MIN_WORK_WINDOW_SECS + 1);
    assert_err(e.as_client(lock_ix(fund, &c, mint)), "WorkWindowTooShort");
    // too late: only close is possible
    e.as_client(close_ix(fund, &c, &c, &c, mint)).unwrap();
    assert!(closed(&e.svm, &fund));
}

#[test]
fn g09_lock_at_window_boundary_and_not_closable_when_funded() {
    let mut e = env();
    let (c, mint) = (e.c(), e.mint);
    let fund = fund_pda(&c, 1);
    e.as_client(e.create_ix(1, milestones(1, USDC))).unwrap();
    let f = e.f();
    e.as_freelancer(accept_ix(fund, &f, PayoutKind::OwnWallet, f, [0; 32])).unwrap();
    set_clock(&mut e.svm, SUBMIT0 - MIN_WORK_WINDOW_SECS);
    e.as_client(lock_ix(fund, &c, mint)).unwrap();
    assert_err(e.as_client(close_ix(fund, &c, &c, &c, mint)), "FundNotClosable");
    // only the creator can close
    let stranger = new_user(&mut e.svm);
    let s = stranger.pubkey();
    assert_err(send_signed(&mut e.svm, &[close_ix(fund, &s, &c, &c, mint)], &stranger, &[]), "ConstraintHasOne");
}

// -----------------------------------------------------------------------------
// 10. create_fund validation
// -----------------------------------------------------------------------------

#[test]
fn g10_create_fund_validation() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let mut id = 100;
    let mut create = |e: &mut Env, freelancer: Pubkey, title: &str, ms: Vec<MilestoneInput>, mint: Pubkey| {
        id += 1;
        e.as_client(create_ix_full(&c, &c, id, freelancer, title, ms, mint))
    };

    assert_err(create(&mut e, f, "t", vec![], mint), "InvalidMilestoneCount");
    assert_err(create(&mut e, f, "t", milestones(6, USDC), mint), "InvalidMilestoneCount");
    let mut zero = milestones(2, USDC);
    zero[1].amount = 0;
    assert_err(create(&mut e, f, "t", zero, mint), "InvalidAmount");
    assert_err(create(&mut e, f, "t", milestones(2, 500 * USDC + 1), mint), "AmountTooLarge");
    create(&mut e, f, "t", milestones(2, 500 * USDC), mint).unwrap(); // exactly the cap

    let early = vec![MilestoneInput { amount: USDC, submit_by: T0 + MIN_WORK_WINDOW_SECS - 1, review_by: T0 + 600 }];
    assert_err(create(&mut e, f, "t", early, mint), "WorkWindowTooShort");
    let short_review = vec![MilestoneInput { amount: USDC, submit_by: SUBMIT0, review_by: SUBMIT0 + 59 }];
    assert_err(create(&mut e, f, "t", short_review, mint), "ReviewWindowTooShort");
    let backwards = vec![MilestoneInput { amount: USDC, submit_by: SUBMIT0, review_by: SUBMIT0 - 1 }];
    assert_err(create(&mut e, f, "t", backwards, mint), "ReviewWindowTooShort");

    assert_err(create(&mut e, c, "t", milestones(1, USDC), mint), "SameParty");
    assert_err(create(&mut e, Pubkey::default(), "t", milestones(1, USDC), mint), "InvalidFreelancer");
    assert_err(create(&mut e, f, &"x".repeat(33), milestones(1, USDC), mint), "TitleTooLong");
    create(&mut e, f, &"x".repeat(32), milestones(1, USDC), mint).unwrap();

    let fake_mint = Pubkey::new_unique();
    put_token_program_account(&mut e.svm, fake_mint, mint_data(&c, 0, 6));
    assert_err(create(&mut e, f, "t", milestones(1, USDC), fake_mint), "InvalidMint");
}

// -----------------------------------------------------------------------------
// 11. Attacks
// -----------------------------------------------------------------------------

#[test]
fn g11_attacks() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let fund = e.funded(1, milestones(2, 10 * USDC));
    e.as_freelancer(submit_ix(fund, &f, 0)).unwrap();

    let attacker = new_user(&mut e.svm);
    let a = attacker.pubkey();
    let attacker_token = put_token_account(&mut e.svm, &a, &mint, 0);

    // wrong vault: another token account owned by the attacker
    assert_err(e.as_client(approve_ix_raw(fund, &c, f, ata(&f, &mint), attacker_token, mint, 0)), "ConstraintSeeds");
    // wrong mint
    let fake_mint = Pubkey::new_unique();
    put_token_program_account(&mut e.svm, fake_mint, mint_data(&a, 0, 6));
    assert_err(e.as_client(approve_ix_raw(fund, &c, f, ata(&f, &mint), vault_pda(&fund), fake_mint, 0)), "InvalidMint");
    // attacker as destination, or the right destination with the attacker's token account
    assert_err(e.as_client(approve_ix(fund, &c, a, mint, 0)), "InvalidPayoutDestination");
    // associated_token constraint: Anchor 1.1.2 checks the token owner first
    assert_err(e.as_client(approve_ix_raw(fund, &c, f, attacker_token, vault_pda(&fund), mint, 0)), "ConstraintTokenOwner");
    // attacker as client in approve
    assert_err(send_signed(&mut e.svm, &[approve_ix(fund, &a, f, mint, 0)], &attacker, &[]), "ConstraintHasOne");
    assert_eq!(token_amount(&e.svm, &attacker_token), 0);

    // double release and refund after release
    e.as_client(approve_ix(fund, &c, f, mint, 0)).unwrap();
    assert_err(e.as_client(approve_ix(fund, &c, f, mint, 0)), "InvalidMilestoneStatus");
    let [m0, m1] = [e.fund(1).milestones[0], e.fund(1).milestones[1]];
    set_clock(&mut e.svm, m0.review_by + 1);
    assert_err(e.as_client(release_ix(fund, &c, f, mint, 0)), "InvalidMilestoneStatus");
    set_clock(&mut e.svm, m1.submit_by + 1);
    assert_err(e.as_client(refund_ix(fund, &c, &c, mint, 0)), "InvalidMilestoneStatus");
    assert_eq!(e.balance(&f), 10 * USDC);
    assert_eq!(token_amount(&e.svm, &vault_pda(&fund)), 10 * USDC);
}

// -----------------------------------------------------------------------------
// 12. Donation
// -----------------------------------------------------------------------------

#[test]
fn g12_donation_does_not_change_payouts_and_goes_to_client_on_close() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let fund = e.funded(1, milestones(1, 10 * USDC));
    let vault = vault_pda(&fund);
    // someone sends 7 USDC straight to the vault
    let donated = 7 * USDC;
    let mut account = e.svm.get_account(&vault).unwrap();
    let amount = u64::from_le_bytes(account.data[64..72].try_into().unwrap()) + donated;
    account.data[64..72].copy_from_slice(&amount.to_le_bytes());
    e.svm.set_account(vault, account).unwrap();

    e.as_freelancer(submit_ix(fund, &f, 0)).unwrap();
    e.as_client(approve_ix(fund, &c, f, mint, 0)).unwrap();
    assert_eq!(e.balance(&f), 10 * USDC, "payout uses the stored amount");
    assert_eq!(token_amount(&e.svm, &vault), donated);

    let before = e.balance(&c);
    e.as_client(close_ix(fund, &c, &c, &c, mint)).unwrap();
    assert_eq!(e.balance(&c), before + donated);
    assert!(closed(&e.svm, &vault));
}

// -----------------------------------------------------------------------------
// 13. Invariant (approve + auto-release + refund half) and 15. compute units
// -----------------------------------------------------------------------------

/// 3 milestones: 0 approved, 1 auto-released, 2 refunded; then close. Returns compute units per instruction.
fn three_milestone_cycle(kind: PayoutKind) -> Vec<(&'static str, u64)> {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let (destination, reference) = match kind {
        PayoutKind::PayoutPartner => (PAYOUT_PARTNERS[0], [0xCD; 32]),
        _ => (f, [0; 32]),
    };
    let fund = fund_pda(&c, 7);
    let mut table = vec![];
    let ms = vec![
        MilestoneInput { amount: 3 * USDC, submit_by: SUBMIT0, review_by: SUBMIT0 + REVIEW_WINDOW },
        MilestoneInput { amount: 4 * USDC, submit_by: SUBMIT0 + 100, review_by: SUBMIT0 + 100 + REVIEW_WINDOW },
        MilestoneInput { amount: 5 * USDC, submit_by: SUBMIT0 + 200, review_by: SUBMIT0 + 200 + REVIEW_WINDOW },
    ];
    let mut step = |e: &mut Env, label: &'static str, r: Result<litesvm::types::TransactionMetadata, String>| {
        let meta = r.unwrap_or_else(|logs| panic!("{label} failed:\n{logs}"));
        table.push((label, cu(label, &meta)));
        assert_invariant(&e.fund(7));
    };

    let r = e.as_client(e.create_ix(7, ms));
    step(&mut e, "create_fund (3 milestones)", r);
    let r = e.as_freelancer(accept_ix(fund, &f, kind, destination, reference));
    step(&mut e, if kind == PayoutKind::PayoutPartner { "accept (PayoutPartner)" } else { "accept (OwnWallet)" }, r);
    let r = e.as_client(lock_ix(fund, &c, mint));
    step(&mut e, "lock", r);
    let r = e.as_freelancer(submit_ix(fund, &f, 0));
    step(&mut e, "submit", r);
    let r = e.as_client(approve_ix(fund, &c, destination, mint, 0));
    step(&mut e, "approve", r);
    let r = e.as_freelancer(submit_ix(fund, &f, 1));
    step(&mut e, "submit (2nd)", r);
    set_clock(&mut e.svm, SUBMIT0 + 100 + REVIEW_WINDOW + 1);
    let r = e.as_client(release_ix(fund, &c, destination, mint, 1));
    step(&mut e, "release_after_review", r);
    set_clock(&mut e.svm, SUBMIT0 + 200 + 1);
    let r = e.as_client(refund_ix(fund, &c, &c, mint, 2));
    step(&mut e, "refund", r);

    let state = e.fund(7);
    assert_eq!(state.state, FundState::Settled);
    assert_eq!(state.released, 7 * USDC);
    assert_eq!(state.refunded, 5 * USDC);
    assert_eq!(state.released + state.refunded, state.total);
    assert_eq!(e.balance(&destination), 7 * USDC);

    let meta = e.as_client(close_ix(fund, &c, &c, &c, mint)).unwrap();
    table.push(("close", cu("close", &meta)));
    table
}

#[test]
fn g13_invariant_full_cycle_own_wallet() {
    three_milestone_cycle(PayoutKind::OwnWallet);
}

#[test]
fn g13_invariant_full_cycle_payout_partner() {
    three_milestone_cycle(PayoutKind::PayoutPartner);
}

#[test]
fn g15_compute_units_per_instruction() {
    let mut rows = three_milestone_cycle(PayoutKind::PayoutPartner);
    rows.insert(2, three_milestone_cycle(PayoutKind::OwnWallet)[1]);
    println!("\n| Instruction | Compute units |\n| --- | ---: |");
    for (label, units) in &rows {
        println!("| `{label}` | {units} |");
    }
    for (label, units) in rows {
        assert!(units < 200_000, "{label} uses {units} CU, above the default 200k budget");
    }
}

// -----------------------------------------------------------------------------
// 14. Layout
// -----------------------------------------------------------------------------

#[test]
fn g14_layout_size_and_memcmp_offsets() {
    assert_eq!(8 + <SharedFund as anchor_lang::Space>::INIT_SPACE, 708);
    assert_eq!(SharedFund::SPACE, 708);
    let mut e = env();
    e.as_client(e.create_ix(1, milestones(2, USDC))).unwrap();
    let data = e.svm.get_account(&fund_pda(&e.c(), 1)).unwrap().data;
    assert_eq!(data.len(), 708);
    assert_eq!(&data[0..8], SharedFund::DISCRIMINATOR);
    assert_eq!(&data[12..44], e.c().as_ref(), "client at offset 12");
    assert_eq!(&data[44..76], e.f().as_ref(), "freelancer at offset 44");
    assert_eq!(&data[76..108], e.c().as_ref(), "creator at offset 76");
    assert_eq!(data[244], 2, "milestone_count at offset 244");
    assert_eq!(u64::from_le_bytes(data[245..253].try_into().unwrap()), USDC, "milestones at offset 245");
    assert!(data[245 + 2 * 65..570].iter().all(|b| *b == 0), "unused slots zeroed");
}

// -----------------------------------------------------------------------------
// P1 builders: dispute, concede, propose_cancel, accept_cancel
// -----------------------------------------------------------------------------

fn dispute_ix(fund: Pubkey, client: &Pubkey, index: u8) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Dispute { fund, client: *client }.to_account_metas(None),
        data: ned_program::instruction::Dispute { index }.data(),
    }
}

fn concede_ix(fund: Pubkey, freelancer: &Pubkey, client: &Pubkey, mint: Pubkey, index: u8) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Concede {
            fund,
            freelancer: *freelancer,
            client: *client,
            client_token: ata(client, &mint),
            vault: vault_pda(&fund),
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::Concede { index }.data(),
    }
}

fn propose_ix(fund: Pubkey, signer: &Pubkey, freelancer_amount: u64) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::ProposeCancel { fund, signer: *signer }.to_account_metas(None),
        data: ned_program::instruction::ProposeCancel { freelancer_amount }.data(),
    }
}

#[allow(clippy::too_many_arguments)]
fn accept_cancel_ix(
    fund: Pubkey,
    signer: &Pubkey,
    destination: Pubkey,
    client: &Pubkey,
    mint: Pubkey,
    expected_freelancer_amount: u64,
    expected_unsettled: u64,
) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::AcceptCancel {
            fund,
            signer: *signer,
            destination,
            destination_token: ata(&destination, &mint),
            client: *client,
            client_token: ata(client, &mint),
            vault: vault_pda(&fund),
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::AcceptCancel { expected_freelancer_amount, expected_unsettled }.data(),
    }
}

// -----------------------------------------------------------------------------
// 7. Dispute
// -----------------------------------------------------------------------------

#[test]
fn g07_dispute_blocks_auto_release_approve_and_concede_still_settle() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let fund = e.funded(1, milestones(3, 10 * USDC));
    for index in 0u8..3 {
        e.as_freelancer(submit_ix(fund, &f, index)).unwrap();
    }
    let ms = e.fund(1).milestones;

    // only the client disputes, only a Submitted milestone, only until review_by (inclusive)
    assert_err(e.as_freelancer(dispute_ix(fund, &f, 0)), "ConstraintHasOne");
    set_clock(&mut e.svm, ms[0].review_by);
    let meta = e.as_client(dispute_ix(fund, &c, 0)).unwrap();
    cu("dispute", &meta);
    assert_eq!(e.fund(1).milestones[0].status, MilestoneStatus::Disputed);
    assert_err(e.as_client(dispute_ix(fund, &c, 0)), "InvalidMilestoneStatus");
    e.as_client(dispute_ix(fund, &c, 1)).unwrap();

    // a dispute blocks auto-release even after the review deadline
    set_clock(&mut e.svm, ms[1].review_by + 1);
    assert_err(e.as_client(release_ix(fund, &c, f, mint, 0)), "InvalidMilestoneStatus");
    // dispute after review_by fails
    set_clock(&mut e.svm, ms[2].review_by + 1);
    assert_err(e.as_client(dispute_ix(fund, &c, 2)), "DeadlinePassed");
    // ... so milestone 2 auto-releases
    e.as_client(release_ix(fund, &c, f, mint, 2)).unwrap();

    // approve still works on a disputed milestone
    e.as_client(approve_ix(fund, &c, f, mint, 0)).unwrap();
    assert_eq!(e.balance(&f), 20 * USDC);

    // concede: freelancer only, disputed only; refunds the client
    assert_err(e.as_client(concede_ix(fund, &c, &c, mint, 1)), "ConstraintHasOne");
    assert_err(e.as_freelancer(concede_ix(fund, &f, &c, mint, 0)), "InvalidMilestoneStatus");
    let before = e.balance(&c);
    let meta = e.as_freelancer(concede_ix(fund, &f, &c, mint, 1)).unwrap();
    cu("concede", &meta);
    assert_eq!(e.balance(&c), before + 10 * USDC);

    let state = e.fund(1);
    assert_eq!(state.milestones[1].status, MilestoneStatus::Refunded);
    assert_eq!(state.state, FundState::Settled);
    assert_eq!(state.released, 20 * USDC);
    assert_eq!(state.refunded, 10 * USDC);
    assert_invariant(&state);
}

#[test]
fn g07_dispute_of_pending_and_out_of_range_fails() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let fund = e.funded(1, milestones(2, USDC));
    assert_err(e.as_client(dispute_ix(fund, &c, 0)), "InvalidMilestoneStatus");
    assert_err(e.as_client(dispute_ix(fund, &c, 2)), "MilestoneIndexOutOfRange");
    assert_err(e.as_freelancer(concede_ix(fund, &f, &c, mint, 4)), "MilestoneIndexOutOfRange");
}

// -----------------------------------------------------------------------------
// 8. Cancel
// -----------------------------------------------------------------------------

#[test]
fn g08_cancel_split_client_proposes_freelancer_accepts() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let fund = e.funded(1, milestones(2, 10 * USDC));
    let stranger = new_user(&mut e.svm);
    let s = stranger.pubkey();

    // only a party proposes; the amount is capped by what is still locked
    assert_err(send_signed(&mut e.svm, &[propose_ix(fund, &s, 0)], &stranger, &[]), "NotAParty");
    assert_err(e.as_client(propose_ix(fund, &c, 20 * USDC + 1)), "CancelAmountTooLarge");
    // nothing to accept yet
    assert_err(e.as_freelancer(accept_cancel_ix(fund, &f, f, &c, mint, 0, 20 * USDC)), "NoCancelProposal");

    let meta = e.as_client(propose_ix(fund, &c, 12 * USDC)).unwrap();
    cu("propose_cancel", &meta);
    let state = e.fund(1);
    assert_eq!(state.cancel_proposer, c);
    assert_eq!(state.cancel_freelancer_amount, 12 * USDC);

    // the proposer cannot accept their own proposal; a stranger cannot accept
    assert_err(e.as_client(accept_cancel_ix(fund, &c, f, &c, mint, 12 * USDC, 20 * USDC)), "CannotAcceptOwnProposal");
    assert_err(send_signed(&mut e.svm, &[accept_cancel_ix(fund, &s, f, &c, mint, 12 * USDC, 20 * USDC)], &stranger, &[]), "NotAParty");
    // stale expected values
    assert_err(e.as_freelancer(accept_cancel_ix(fund, &f, f, &c, mint, 11 * USDC, 20 * USDC)), "CancelProposalChanged");
    assert_err(e.as_freelancer(accept_cancel_ix(fund, &f, f, &c, mint, 12 * USDC, 19 * USDC)), "CancelProposalChanged");

    let client_before = e.balance(&c);
    let meta = e.as_freelancer(accept_cancel_ix(fund, &f, f, &c, mint, 12 * USDC, 20 * USDC)).unwrap();
    cu("accept_cancel", &meta);
    assert_eq!(e.balance(&f), 12 * USDC);
    assert_eq!(e.balance(&c), client_before + 8 * USDC);
    let state = e.fund(1);
    assert_eq!(state.state, FundState::Settled);
    assert_eq!(state.released, 12 * USDC);
    assert_eq!(state.refunded, 8 * USDC);
    assert!(state.milestones[..2].iter().all(|m| m.status == MilestoneStatus::Cancelled));
    assert_eq!(state.cancel_proposer, Pubkey::default());
    assert_eq!(state.cancel_freelancer_amount, 0);
    assert_eq!(token_amount(&e.svm, &vault_pda(&fund)), 0);
    e.as_client(close_ix(fund, &c, &c, &c, mint)).unwrap();
}

#[test]
fn g08_changed_proposal_and_proposal_cleared_on_status_change() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let fund = e.funded(1, milestones(2, 10 * USDC));

    // freelancer proposes, then overwrites; the client's view of the first proposal is stale
    e.as_freelancer(propose_ix(fund, &f, 15 * USDC)).unwrap();
    e.as_freelancer(propose_ix(fund, &f, 18 * USDC)).unwrap();
    assert_err(e.as_client(accept_cancel_ix(fund, &c, f, &c, mint, 15 * USDC, 20 * USDC)), "CancelProposalChanged");

    // any milestone status change (submit) clears the proposal
    e.as_freelancer(submit_ix(fund, &f, 0)).unwrap();
    assert_eq!(e.fund(1).cancel_proposer, Pubkey::default());
    assert_err(e.as_client(accept_cancel_ix(fund, &c, f, &c, mint, 18 * USDC, 20 * USDC)), "NoCancelProposal");

    // a new proposal, then a release: cleared again, and unsettled shrinks
    e.as_freelancer(propose_ix(fund, &f, 5 * USDC)).unwrap();
    e.as_client(approve_ix(fund, &c, f, mint, 0)).unwrap();
    assert_eq!(e.fund(1).cancel_proposer, Pubkey::default());
    assert_err(e.as_client(accept_cancel_ix(fund, &c, f, &c, mint, 5 * USDC, 10 * USDC)), "NoCancelProposal");

    // after the release, a proposal above the remaining 10 USDC fails
    assert_err(e.as_freelancer(propose_ix(fund, &f, 10 * USDC + 1)), "CancelAmountTooLarge");

    // client proposes 0 to the freelancer; freelancer accepts → everything left refunds
    e.as_client(propose_ix(fund, &c, 0)).unwrap();
    let before = e.balance(&c);
    e.as_freelancer(accept_cancel_ix(fund, &f, f, &c, mint, 0, 10 * USDC)).unwrap();
    assert_eq!(e.balance(&c), before + 10 * USDC);
    let state = e.fund(1);
    assert_eq!(state.milestones[0].status, MilestoneStatus::Released, "terminal milestones stay as they were");
    assert_eq!(state.milestones[1].status, MilestoneStatus::Cancelled);
    assert_eq!(state.state, FundState::Settled);
    assert_invariant(&state);
}

#[test]
fn g08_cancel_on_the_vietnam_path_pays_the_partner_and_disputed_milestones_count() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let partner = PAYOUT_PARTNERS[0];
    let fund = fund_pda(&c, 1);
    e.as_client(e.create_ix(1, milestones(2, 10 * USDC))).unwrap();
    e.as_freelancer(accept_ix(fund, &f, PayoutKind::PayoutPartner, partner, [9; 32])).unwrap();
    e.as_client(lock_ix(fund, &c, mint)).unwrap();
    e.as_freelancer(submit_ix(fund, &f, 0)).unwrap();
    e.as_client(dispute_ix(fund, &c, 0)).unwrap();

    // the disputed milestone is still unsettled: the split covers both milestones
    e.as_client(propose_ix(fund, &c, 7 * USDC)).unwrap();
    assert_err(e.as_freelancer(accept_cancel_ix(fund, &f, f, &c, mint, 7 * USDC, 20 * USDC)), "InvalidPayoutDestination");
    e.as_freelancer(accept_cancel_ix(fund, &f, partner, &c, mint, 7 * USDC, 20 * USDC)).unwrap();
    assert_eq!(e.balance(&partner), 7 * USDC);
    assert_eq!(e.balance(&f), 0);
    let state = e.fund(1);
    assert_eq!(state.released + state.refunded, state.total);
    assert!(state.milestones[..2].iter().all(|m| m.status == MilestoneStatus::Cancelled));
    // a settled fund rejects every P1 action
    assert_err(e.as_client(propose_ix(fund, &c, 0)), "InvalidFundState");
}

// -----------------------------------------------------------------------------
// 13. Invariant, cancel half: approve + cancel
// -----------------------------------------------------------------------------

#[test]
fn g13_invariant_full_cycle_approve_then_cancel() {
    let mut e = env();
    let (c, f, mint) = (e.c(), e.f(), e.mint);
    let ms = vec![
        MilestoneInput { amount: 3 * USDC, submit_by: SUBMIT0, review_by: SUBMIT0 + REVIEW_WINDOW },
        MilestoneInput { amount: 4 * USDC, submit_by: SUBMIT0 + 100, review_by: SUBMIT0 + 100 + REVIEW_WINDOW },
        MilestoneInput { amount: 5 * USDC, submit_by: SUBMIT0 + 200, review_by: SUBMIT0 + 200 + REVIEW_WINDOW },
    ];
    let fund = e.funded(7, ms);
    assert_invariant(&e.fund(7));
    e.as_freelancer(submit_ix(fund, &f, 0)).unwrap();
    e.as_client(approve_ix(fund, &c, f, mint, 0)).unwrap();
    assert_invariant(&e.fund(7));
    e.as_freelancer(submit_ix(fund, &f, 1)).unwrap();
    assert_invariant(&e.fund(7));
    // 9 USDC still locked (milestones 1 and 2): 6 to the freelancer, 3 back to the client
    e.as_freelancer(propose_ix(fund, &f, 6 * USDC)).unwrap();
    assert_invariant(&e.fund(7));
    e.as_client(accept_cancel_ix(fund, &c, f, &c, mint, 6 * USDC, 9 * USDC)).unwrap();
    let state = e.fund(7);
    assert_invariant(&state);
    assert_eq!(state.state, FundState::Settled);
    assert_eq!(state.released, 9 * USDC);
    assert_eq!(state.refunded, 3 * USDC);
    assert_eq!(state.released + state.refunded, state.total);
    assert_eq!(e.balance(&f), 9 * USDC);
    assert_eq!(token_amount(&e.svm, &vault_pda(&fund)), 0);
}

// -----------------------------------------------------------------------------
// PDA vector shared with the app (ned-wallet/services/milestone/__tests__/pda.test.ts)
// -----------------------------------------------------------------------------

#[test]
fn pda_vector_for_the_app() {
    let creator = Pubkey::from_str_const("FSyUz7Kfy58vDosLPMqtVYzbcsCfCyrPiDWc65kY6QuQ");
    let fund = fund_pda(&creator, 1_759_400_000_123);
    let vault = vault_pda(&fund);
    println!("PDA vector: fund {fund} vault {vault}");
    assert_eq!(fund, Pubkey::from_str_const("2rM8YfeiMG6oXCRxfgFXWgR91sfVxa5ekmrq5TzXWRcM"));
    assert_eq!(vault, Pubkey::from_str_const("CpznorLKcrdrGqi8wtvpXv1oPpgZqE8uNXyzGe7u2PsC"));
}
