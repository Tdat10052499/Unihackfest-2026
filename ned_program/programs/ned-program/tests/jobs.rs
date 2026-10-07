//! Funded Jobs tests (docs/09-milestone-lock/funded-jobs-plan.md section 4.5) and the D27 note rules
//! (review-decision-plan.md section 2). Same LiteSVM harness as tests/milestone.rs.
//! Cần build trước: `anchor build` (đọc target/deploy/ned_program.so).

mod common;

use anchor_lang::__private::base64::{engine::general_purpose::STANDARD, Engine};
use anchor_lang::prelude::Pubkey;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::{AnchorDeserialize, Discriminator, InstructionData, ToAccountMetas};
use common::*;
use litesvm::LiteSVM;
use ned_program::{
    FundLocked, FundState, JobApplication, JobApplied, JobBriefPosted, JobFilled, JobFunded, JobListing, JobMilestoneInput,
    JobPosted, JobPostedOpen, JobSelected, JobState, JobWithdrawn, MilestoneInput, MilestoneStatus, NotePosted, PayoutKind, SharedFund, FUND_SEED,
    JOB_ACCEPT_WINDOW_SECS, JOB_APP_SEED, JOB_SEED, JOB_VAULT_SEED, PAYOUT_PARTNERS, VAULT_SEED,
};
use solana_keypair::Keypair;
use solana_signer::Signer;

const T0: i64 = 1_759_400_000;
const USDC: u64 = 1_000_000;
const BRIEF: [u8; 32] = [7; 32];
const WORK: i64 = 600;
const REVIEW: i64 = 120;
const APPLY_BY: i64 = T0 + 300;
const SELECT_BY: i64 = T0 + 900;
const PARTNER_REF: [u8; 32] = [9; 32];

// -----------------------------------------------------------------------------
// Environment and instruction builders
// -----------------------------------------------------------------------------

struct Env {
    svm: LiteSVM,
    business: Keypair,
    a: Keypair,
    b: Keypair,
    mint: Pubkey,
}

fn env() -> Env {
    let mut svm = setup();
    set_clock(&mut svm, T0);
    let mint = put_usdc_mint(&mut svm);
    let business = new_user(&mut svm);
    let a = new_user(&mut svm);
    let b = new_user(&mut svm);
    put_token_account(&mut svm, &business.pubkey(), &mint, 1_000 * USDC);
    put_token_account(&mut svm, &a.pubkey(), &mint, 0);
    put_token_account(&mut svm, &b.pubkey(), &mint, 0);
    put_token_account(&mut svm, &PAYOUT_PARTNERS[0], &mint, 0);
    Env { svm, business, a, b, mint }
}

fn job_pda(business: &Pubkey, job_id: u64) -> Pubkey {
    Pubkey::find_program_address(&[JOB_SEED, business.as_ref(), &job_id.to_le_bytes()], &ned_program::ID).0
}
fn job_vault_pda(job: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[JOB_VAULT_SEED, job.as_ref()], &ned_program::ID).0
}
fn app_pda(job: &Pubkey, freelancer: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[JOB_APP_SEED, job.as_ref(), freelancer.as_ref()], &ned_program::ID).0
}
fn fund_pda(creator: &Pubkey, fund_id: u64) -> Pubkey {
    Pubkey::find_program_address(&[FUND_SEED, creator.as_ref(), &fund_id.to_le_bytes()], &ned_program::ID).0
}
fn vault_pda(fund: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[VAULT_SEED, fund.as_ref()], &ned_program::ID).0
}

/// `n` template milestones of `amount`, work 600 s, review 120 s
fn template(n: usize, amount: u64) -> Vec<JobMilestoneInput> {
    (0..n).map(|_| JobMilestoneInput { amount, work_secs: WORK, review_secs: REVIEW }).collect()
}

struct Post {
    job_id: u64,
    title: String,
    summary: String,
    category: u8,
    skills: u64,
    milestones: Vec<JobMilestoneInput>,
    brief_hash: [u8; 32],
    apply_by: i64,
    select_by: i64,
}

fn post(n: usize, amount: u64) -> Post {
    Post {
        job_id: 1,
        title: "Landing page design".to_string(),
        summary: "A one-page landing site for a budgeting app, desktop and mobile.".to_string(),
        category: 2,
        skills: 0b1011,
        milestones: template(n, amount),
        brief_hash: BRIEF,
        apply_by: APPLY_BY,
        select_by: SELECT_BY,
    }
}

fn post_ix(business: &Pubkey, mint: Pubkey, p: Post) -> Instruction {
    let job = job_pda(business, p.job_id);
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::PostJob {
            business: *business,
            payer: *business,
            job,
            job_vault: job_vault_pda(&job),
            business_token: ata(business, &mint),
            mint,
            token_program: TOKEN_PROGRAM_ID,
            system_program: SYSTEM_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::PostJob {
            job_id: p.job_id,
            title: p.title,
            summary: p.summary,
            category: p.category,
            skills: p.skills,
            milestones: p.milestones,
            brief_hash: p.brief_hash,
            apply_by: p.apply_by,
            select_by: p.select_by,
        }
        .data(),
    }
}

/// v1.4 (D29): the same listing with nothing locked (post_job_open; same accounts as post_job)
fn post_open_ix(business: &Pubkey, mint: Pubkey, p: Post) -> Instruction {
    let job = job_pda(business, p.job_id);
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::PostJob {
            business: *business,
            payer: *business,
            job,
            job_vault: job_vault_pda(&job),
            business_token: ata(business, &mint),
            mint,
            token_program: TOKEN_PROGRAM_ID,
            system_program: SYSTEM_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::PostJobOpen {
            job_id: p.job_id,
            title: p.title,
            summary: p.summary,
            category: p.category,
            skills: p.skills,
            milestones: p.milestones,
            brief_hash: p.brief_hash,
            apply_by: p.apply_by,
            select_by: p.select_by,
        }
        .data(),
    }
}

/// v1.4 (D29): the business locks the budget of a "locks when hired" listing
fn fund_ix(job: Pubkey, business: &Pubkey, mint: Pubkey) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::FundJob {
            job,
            business: *business,
            job_vault: job_vault_pda(&job),
            business_token: ata(business, &mint),
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::FundJob {}.data(),
    }
}

fn close_fund_ix(fund: Pubkey, creator: &Pubkey, mint: Pubkey) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Close {
            fund,
            creator: *creator,
            rent_payer: *creator,
            client: *creator,
            client_token: ata(creator, &mint),
            vault: vault_pda(&fund),
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::Close {}.data(),
    }
}

fn brief_ix(job: Pubkey, business: &Pubkey, part: u8, parts: u8, data: Vec<u8>) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::PostJobBrief { job, business: *business }.to_account_metas(None),
        data: ned_program::instruction::PostJobBrief { part, parts, data }.data(),
    }
}

fn apply_ix(job: Pubkey, freelancer: &Pubkey, pitch: &str) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::ApplyJob {
            job,
            application: app_pda(&job, freelancer),
            freelancer: *freelancer,
            system_program: SYSTEM_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::ApplyJob { pitch: pitch.to_string() }.data(),
    }
}

/// `application` is derived from the job and `applicant` (normally the contract's freelancer)
fn select_ix(job: Pubkey, business: &Pubkey, fund: Pubkey, applicant: &Pubkey) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::SelectJob { job, business: *business, fund, application: app_pda(&job, applicant) }
            .to_account_metas(None),
        data: ned_program::instruction::SelectJob {}.data(),
    }
}

fn lock_from_ix(job: Pubkey, fund: Pubkey, business: &Pubkey, caller: &Pubkey, mint: Pubkey) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::LockFromJob {
            job,
            fund,
            job_vault: job_vault_pda(&job),
            vault: vault_pda(&fund),
            business: *business,
            business_token: ata(business, &mint),
            caller: *caller,
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::LockFromJob {}.data(),
    }
}

fn withdraw_ix(job: Pubkey, business: &Pubkey, mint: Pubkey) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::WithdrawJob {
            job,
            business: *business,
            job_vault: job_vault_pda(&job),
            business_token: ata(business, &mint),
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::WithdrawJob {}.data(),
    }
}

/// create_fund for `freelancer` matching the job template at chain time `now` (deadlines = now + work_secs)
fn create_for(business: &Pubkey, mint: Pubkey, fund_id: u64, freelancer: Pubkey, tmpl: &[JobMilestoneInput], now: i64, brief: [u8; 32]) -> Instruction {
    let fund = fund_pda(business, fund_id);
    let milestones = tmpl
        .iter()
        .map(|t| MilestoneInput { amount: t.amount, submit_by: now + t.work_secs, review_by: now + t.work_secs + t.review_secs })
        .collect();
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::CreateFund {
            client: *business,
            payer: *business,
            fund,
            vault: vault_pda(&fund),
            mint,
            token_program: TOKEN_PROGRAM_ID,
            system_program: SYSTEM_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::CreateFund {
            fund_id,
            freelancer,
            title: "Landing page design".to_string(),
            milestones,
            brief_hash: brief,
        }
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
            expected_brief_hash: BRIEF,
        }
        .data(),
    }
}

fn accept_partner(fund: Pubkey, freelancer: &Pubkey) -> Instruction {
    accept_ix(fund, freelancer, PayoutKind::PayoutPartner, PAYOUT_PARTNERS[0], PARTNER_REF)
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

fn approve_ix(fund: Pubkey, client: &Pubkey, destination: Pubkey, mint: Pubkey, index: u8) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Approve {
            fund,
            client: *client,
            destination,
            destination_token: ata(&destination, &mint),
            vault: vault_pda(&fund),
            mint,
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::Approve { index }.data(),
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

fn dispute_ix(fund: Pubkey, client: &Pubkey, index: u8) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::Dispute { fund, client: *client }.to_account_metas(None),
        data: ned_program::instruction::Dispute { index }.data(),
    }
}

fn note_ix(fund: Pubkey, author: &Pubkey, kind: u8, milestone: u8) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::PostNote { fund, author: *author }.to_account_metas(None),
        data: ned_program::instruction::PostNote { kind, milestone, part: 0, parts: 1, data: vec![5; 64] }.data(),
    }
}

/// The one event of type `T` in the logs of a transaction
fn event<T: AnchorDeserialize + Discriminator>(meta: &litesvm::types::TransactionMetadata) -> T {
    let mut found = meta
        .logs
        .iter()
        .filter_map(|l| l.strip_prefix("Program data: "))
        .filter_map(|b64| STANDARD.decode(b64).ok())
        .filter(|d| d.starts_with(T::DISCRIMINATOR))
        .map(|d| T::deserialize(&mut &d[8..]).unwrap());
    let first = found.next().expect("event in the logs");
    assert!(found.next().is_none(), "exactly one event");
    first
}

fn closed(svm: &LiteSVM, address: &Pubkey) -> bool {
    svm.get_account(address).map_or(true, |a| a.lamports == 0)
}

impl Env {
    fn biz(&self) -> Pubkey {
        self.business.pubkey()
    }
    fn send(&mut self, who: &Keypair, ixs: &[Instruction]) -> Result<litesvm::types::TransactionMetadata, String> {
        send_signed(&mut self.svm, ixs, who, &[])
    }
    fn as_business(&mut self, ixs: &[Instruction]) -> Result<litesvm::types::TransactionMetadata, String> {
        let k = self.business.insecure_clone();
        self.send(&k, ixs)
    }
    fn as_a(&mut self, ixs: &[Instruction]) -> Result<litesvm::types::TransactionMetadata, String> {
        let k = self.a.insecure_clone();
        self.send(&k, ixs)
    }
    fn as_b(&mut self, ixs: &[Instruction]) -> Result<litesvm::types::TransactionMetadata, String> {
        let k = self.b.insecure_clone();
        self.send(&k, ixs)
    }
    fn job(&self, job_id: u64) -> JobListing {
        read(&self.svm, &job_pda(&self.biz(), job_id)).expect("job exists")
    }
    fn fund(&self, fund: &Pubkey) -> SharedFund {
        read(&self.svm, fund).expect("fund exists")
    }
    fn balance(&self, owner: &Pubkey) -> u64 {
        token_amount(&self.svm, &ata(owner, &self.mint))
    }
    /// Posts job 1 (n × amount) and has A and B apply; returns the job address
    fn open_with_two(&mut self, n: usize, amount: u64) -> Pubkey {
        let (biz, mint) = (self.biz(), self.mint);
        self.as_business(&[post_ix(&biz, mint, post(n, amount))]).unwrap();
        let job = job_pda(&biz, 1);
        let (a, b) = (self.a.pubkey(), self.b.pubkey());
        self.as_a(&[apply_ix(job, &a, "I build landing pages")]).unwrap();
        self.as_b(&[apply_ix(job, &b, "Designer and front-end developer")]).unwrap();
        job
    }
    /// create_fund for `freelancer` + select_job in one transaction at the current clock; returns the fund
    fn select(&mut self, job: Pubkey, fund_id: u64, freelancer: Pubkey, now: i64) -> Result<Pubkey, String> {
        let (biz, mint) = (self.biz(), self.mint);
        let tmpl: Vec<JobMilestoneInput> = self.job(1).used().iter().map(|m| JobMilestoneInput { amount: m.amount, work_secs: m.work_secs, review_secs: m.review_secs }).collect();
        let fund = fund_pda(&biz, fund_id);
        self.as_business(&[create_for(&biz, mint, fund_id, freelancer, &tmpl, now, BRIEF), select_ix(job, &biz, fund, &freelancer)])
            .map(|_| fund)
    }
}

// -----------------------------------------------------------------------------
// Layout (section 4.2)
// -----------------------------------------------------------------------------

#[test]
fn layout_every_offset_of_job_listing_and_application() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let mut p = post(2, 3 * USDC);
    p.job_id = 0x0102_0304_0506_0708;
    p.category = 5;
    p.skills = 0x00F0_0000_0000_000F;
    p.milestones = vec![
        JobMilestoneInput { amount: 3 * USDC, work_secs: 700, review_secs: 130 },
        JobMilestoneInput { amount: 4 * USDC, work_secs: 800, review_secs: 140 },
    ];
    p.title = "Logo".to_string();
    p.summary = "Short card text".to_string();
    p.brief_hash = [0xAB; 32];
    e.as_business(&[post_ix(&biz, mint, p)]).unwrap();
    let job = job_pda(&biz, 0x0102_0304_0506_0708);
    let a = e.a.pubkey();
    e.as_a(&[apply_ix(job, &a, "Hello")]).unwrap();

    let d = e.svm.get_account(&job).unwrap().data;
    assert_eq!(d.len(), 576);
    let u64_at = |o: usize| u64::from_le_bytes(d[o..o + 8].try_into().unwrap());
    let i64_at = |o: usize| i64::from_le_bytes(d[o..o + 8].try_into().unwrap());
    assert_eq!(d[8], 1, "version @8");
    assert_eq!(d[9], 0, "state Open @9");
    assert_eq!(&d[10..42], biz.as_ref(), "business @10");
    assert_eq!(d[42], 5, "category @42");
    assert_eq!(u64_at(43), 0x00F0_0000_0000_000F, "skills @43");
    assert_eq!(&d[51..83], mint.as_ref(), "mint @51");
    assert_eq!(u64_at(83), 0x0102_0304_0506_0708, "job_id @83");
    assert_eq!(i64_at(91), T0, "created_at @91");
    assert_eq!(i64_at(99), APPLY_BY, "apply_by @99");
    assert_eq!(i64_at(107), SELECT_BY, "select_by @107");
    assert_eq!(u64_at(115), 7 * USDC, "total @115");
    assert_eq!(d[123], 2, "milestone_count @123");
    assert_eq!((u64_at(124), i64_at(132), i64_at(140)), (3 * USDC, 700, 130), "milestones[0] @124");
    assert_eq!((u64_at(148), i64_at(156), i64_at(164)), (4 * USDC, 800, 140), "milestones[1] @148");
    assert!(d[172..244].iter().all(|b| *b == 0), "unused milestone slots zero");
    assert_eq!(&d[244..248], b"Logo", "title @244");
    assert!(d[248..276].iter().all(|b| *b == 0));
    assert_eq!(&d[276..291], b"Short card text", "summary @276");
    assert!(d[291..436].iter().all(|b| *b == 0));
    assert_eq!(&d[436..468], &[0xAB; 32], "brief_hash @436");
    assert!(d[468..540].iter().all(|b| *b == 0), "selected @468, selected_at @500, fund @508 empty before select");
    assert_eq!(u16::from_le_bytes(d[540..542].try_into().unwrap()), 1, "application_count @540");
    let listing: JobListing = read(&e.svm, &job).unwrap();
    assert_eq!((d[542], d[543]), (listing.bump, listing.vault_bump), "bump @542, vault_bump @543");
    assert!(d[544..576].iter().all(|b| *b == 0), "_reserved @544..576");

    let app = app_pda(&job, &a);
    let d = e.svm.get_account(&app).unwrap().data;
    assert_eq!(d.len(), 364);
    assert_eq!(d[8], 1, "version @8");
    assert_eq!(&d[9..41], job.as_ref(), "job @9");
    assert_eq!(&d[41..73], a.as_ref(), "freelancer @41");
    assert_eq!(i64::from_le_bytes(d[73..81].try_into().unwrap()), T0, "created_at @73");
    assert_eq!(u16::from_le_bytes(d[81..83].try_into().unwrap()), 5, "pitch_len @81");
    assert_eq!(&d[83..88], b"Hello", "pitch @83");
    assert!(d[88..363].iter().all(|b| *b == 0));
    let application: JobApplication = read(&e.svm, &app).unwrap();
    assert_eq!(d[363], application.bump, "bump @363");

    // After select: selected @468, selected_at @500, fund @508
    set_clock(&mut e.svm, T0 + 400);
    let tmpl = [JobMilestoneInput { amount: 3 * USDC, work_secs: 700, review_secs: 130 }, JobMilestoneInput { amount: 4 * USDC, work_secs: 800, review_secs: 140 }];
    let fund = fund_pda(&biz, 9);
    e.as_business(&[
        create_for(&biz, mint, 9, a, &tmpl, T0 + 400, [0xAB; 32]),
        select_ix(job, &biz, fund, &a),
    ])
    .unwrap();
    let d = e.svm.get_account(&job).unwrap().data;
    assert_eq!(d[9], 1, "state Selected");
    assert_eq!(&d[468..500], a.as_ref(), "selected @468");
    assert_eq!(i64::from_le_bytes(d[500..508].try_into().unwrap()), T0 + 400, "selected_at @500");
    assert_eq!(&d[508..540], fund.as_ref(), "fund @508");
}

// -----------------------------------------------------------------------------
// 1. Happy path
// -----------------------------------------------------------------------------

#[test]
fn t1_happy_path_post_brief_apply_select_accept_lock_submit_approve() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let before = e.balance(&biz);

    let meta = e.as_business(&[post_ix(&biz, mint, post(2, 10 * USDC))]).unwrap();
    cu("post_job (2 milestones)", &meta);
    let posted: JobPosted = event(&meta);
    let job = job_pda(&biz, 1);
    assert_eq!((posted.job, posted.business, posted.total, posted.category), (job, biz, 20 * USDC, 2));
    assert_eq!(token_amount(&e.svm, &job_vault_pda(&job)), 20 * USDC, "budget locked at publish");
    assert_eq!(e.balance(&biz), before - 20 * USDC);

    let meta = e.as_business(&[brief_ix(job, &biz, 0, 2, vec![b'{'; 900])]).unwrap();
    cu("post_job_brief (900 bytes)", &meta);
    let brief: JobBriefPosted = event(&meta);
    assert_eq!((brief.part, brief.parts, brief.len), (0, 2, 900));
    e.as_business(&[brief_ix(job, &biz, 1, 2, vec![b'}'; 10])]).unwrap();

    let (a, b) = (e.a.pubkey(), e.b.pubkey());
    let meta = e.as_a(&[apply_ix(job, &a, "I build landing pages")]).unwrap();
    cu("apply_job", &meta);
    let applied: JobApplied = event(&meta);
    assert_eq!((applied.freelancer, applied.application_count), (a, 1));
    e.as_b(&[apply_ix(job, &b, "Designer and front-end developer")]).unwrap();
    assert_eq!(e.job(1).application_count, 2);

    // Select B: create_fund + select_job in one transaction
    set_clock(&mut e.svm, T0 + 400);
    let fund = fund_pda(&biz, 77);
    let tmpl = template(2, 10 * USDC);
    let meta = e
        .as_business(&[create_for(&biz, mint, 77, b, &tmpl, T0 + 400, BRIEF), select_ix(job, &biz, fund, &b)])
        .unwrap();
    cu("create_fund + select_job", &meta);
    let selected: JobSelected = event(&meta);
    assert_eq!((selected.job, selected.fund, selected.freelancer), (job, fund, b));
    let listing = e.job(1);
    assert_eq!((listing.state, listing.selected, listing.fund, listing.selected_at), (JobState::Selected, b, fund, T0 + 400));

    // Accept (VND path) + lock_from_job in one transaction
    let meta = e.as_b(&[accept_partner(fund, &b), lock_from_ix(job, fund, &biz, &b, mint)]).unwrap();
    cu("accept + lock_from_job", &meta);
    let locked: FundLocked = event(&meta);
    let filled: JobFilled = event(&meta);
    assert_eq!((locked.fund, locked.amount), (fund, 20 * USDC));
    assert_eq!((filled.job, filled.fund, filled.amount), (job, fund, 20 * USDC));
    assert_eq!(e.fund(&fund).state, FundState::Funded);
    assert_eq!(e.job(1).state, JobState::Filled);
    assert_eq!(token_amount(&e.svm, &vault_pda(&fund)), 20 * USDC);
    assert!(closed(&e.svm, &job_vault_pda(&job)), "job vault closed");

    // Existing flow, unchanged
    e.as_b(&[submit_ix(fund, &b, 0)]).unwrap();
    e.as_business(&[approve_ix(fund, &biz, PAYOUT_PARTNERS[0], mint, 0)]).unwrap();
    assert_eq!(e.balance(&PAYOUT_PARTNERS[0]), 10 * USDC, "the partner receives the amount");
    assert_eq!(e.fund(&fund).milestones[0].status, MilestoneStatus::Released);
}

// -----------------------------------------------------------------------------
// 2. post_job refuses
// -----------------------------------------------------------------------------

#[test]
fn t2_post_job_refuses_bad_input() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let mut try_post = |f: &dyn Fn(&mut Post), expected: &str| {
        let mut p = post(2, 10 * USDC);
        f(&mut p);
        assert_err(e.as_business(&[post_ix(&biz, mint, p)]), expected);
    };
    try_post(&|p| p.category = 8, "InvalidCategory");
    try_post(&|p| p.summary = String::new(), "SummaryTooLong");
    try_post(&|p| p.summary = "s".repeat(161), "SummaryTooLong");
    try_post(&|p| p.brief_hash = [0; 32], "InvalidBriefHash");
    try_post(&|p| p.milestones = vec![], "InvalidMilestoneCount");
    try_post(&|p| p.milestones = template(6, USDC), "InvalidMilestoneCount");
    try_post(&|p| p.milestones = template(2, 501 * USDC), "AmountTooLarge");
    try_post(&|p| { p.apply_by = SELECT_BY + 1; }, "InvalidJobDeadlines");
    try_post(&|p| p.apply_by = T0, "InvalidJobDeadlines");
    try_post(&|p| p.milestones = vec![JobMilestoneInput { amount: USDC, work_secs: 59, review_secs: REVIEW }], "WorkWindowTooShort");
    try_post(&|p| p.milestones = vec![JobMilestoneInput { amount: USDC, work_secs: WORK, review_secs: 59 }], "ReviewWindowTooShort");
    try_post(&|p| p.title = "t".repeat(33), "TitleTooLong");
    // The limits themselves are allowed: 160-byte summary, category 7, 5 milestones
    let mut ok = post(5, USDC);
    ok.summary = "s".repeat(160);
    ok.category = 7;
    e.as_business(&[post_ix(&biz, mint, ok)]).unwrap();
}

// -----------------------------------------------------------------------------
// 3. apply_job refuses
// -----------------------------------------------------------------------------

#[test]
fn t3_apply_job_refuses() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    e.as_business(&[post_ix(&biz, mint, post(1, USDC))]).unwrap();
    let job = job_pda(&biz, 1);
    let (a, b) = (e.a.pubkey(), e.b.pubkey());

    assert_err(e.as_business(&[apply_ix(job, &biz, "me")]), "SameParty");
    assert_err(e.as_a(&[apply_ix(job, &a, &"p".repeat(281))]), "PitchTooLong");
    e.as_a(&[apply_ix(job, &a, &"p".repeat(280))]).unwrap();
    assert!(e.as_a(&[apply_ix(job, &a, "again")]).is_err(), "a second application fails at init");
    assert_eq!(e.job(1).application_count, 1);
    set_clock(&mut e.svm, APPLY_BY + 1);
    assert_err(e.as_b(&[apply_ix(job, &b, "late")]), "ApplyClosed");
}

// -----------------------------------------------------------------------------
// 4. select_job refuses; re-select after the accept window
// -----------------------------------------------------------------------------

#[test]
fn t4_select_job_checks_and_reselect_after_the_accept_window() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let job = e.open_with_two(2, 10 * USDC);
    let (a, b) = (e.a.pubkey(), e.b.pubkey());
    let stranger = new_user(&mut e.svm).pubkey();
    let now = T0 + 400;
    set_clock(&mut e.svm, now);
    let tmpl = template(2, 10 * USDC);

    // A non-applicant: the application account does not exist
    assert!(e.select(job, 10, stranger, now).is_err());
    // Another amount
    let other = template(2, 11 * USDC);
    assert_err(e.as_business(&[create_for(&biz, mint, 11, a, &other, now, BRIEF), select_ix(job, &biz, fund_pda(&biz, 11), &a)]), "JobFundMismatch");
    // Another brief hash
    assert_err(e.as_business(&[create_for(&biz, mint, 12, a, &tmpl, now, [8; 32]), select_ix(job, &biz, fund_pda(&biz, 12), &a)]), "JobFundMismatch");
    // A shorter review window
    let shorter = vec![JobMilestoneInput { amount: 10 * USDC, work_secs: WORK, review_secs: 60 }; 2];
    assert_err(e.as_business(&[create_for(&biz, mint, 13, a, &shorter, now, BRIEF), select_ix(job, &biz, fund_pda(&biz, 13), &a)]), "JobFundMismatch");
    // Deadlines earlier than the template's work window minus the slack
    let early = vec![JobMilestoneInput { amount: 10 * USDC, work_secs: WORK - 301, review_secs: REVIEW }; 2];
    assert_err(e.as_business(&[create_for(&biz, mint, 14, a, &early, now, BRIEF), select_ix(job, &biz, fund_pda(&biz, 14), &a)]), "JobFundMismatch");
    // Nothing above changed the listing (each transaction rolled back)
    assert_eq!(e.job(1).state, JobState::Open);

    // Select A, then a re-select inside the accept window is refused
    let fund_a = e.select(job, 20, a, now).unwrap();
    set_clock(&mut e.svm, now + JOB_ACCEPT_WINDOW_SECS);
    assert_err(e.select(job, 21, b, now + JOB_ACCEPT_WINDOW_SECS), "AcceptWindowOpen");
    // After it: allowed (the app also closes A's contract in the same transaction)
    let later = now + JOB_ACCEPT_WINDOW_SECS + 1;
    set_clock(&mut e.svm, later);
    let fund_b = e.select(job, 22, b, later).unwrap();
    let listing = e.job(1);
    assert_eq!((listing.selected, listing.fund, listing.selected_at), (b, fund_b, later));
    assert_ne!(fund_a, fund_b);
    // After select_by nothing can be selected
    set_clock(&mut e.svm, SELECT_BY + JOB_ACCEPT_WINDOW_SECS + 10);
    assert_err(e.select(job, 23, a, SELECT_BY + JOB_ACCEPT_WINDOW_SECS + 10), "SelectClosed");
}

// -----------------------------------------------------------------------------
// 5. lock_from_job refuses; atomic with accept
// -----------------------------------------------------------------------------

#[test]
fn t5_lock_from_job_refuses_and_is_atomic_with_accept() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let job = e.open_with_two(1, 10 * USDC);
    let (a, b) = (e.a.pubkey(), e.b.pubkey());
    let now = T0 + 400;
    set_clock(&mut e.svm, now);
    let selected = e.select(job, 30, b, now).unwrap();

    // A fund that is not listing.fund (an ordinary contract for A): the whole accept + lock transaction fails
    let tmpl = template(1, 10 * USDC);
    let other = fund_pda(&biz, 31);
    e.as_business(&[create_for(&biz, mint, 31, a, &tmpl, now, BRIEF)]).unwrap();
    assert_err(e.as_a(&[accept_partner(other, &a), lock_from_ix(job, other, &biz, &a, mint)]), "NotSelected");
    assert_eq!(e.fund(&other).state, FundState::Created, "accept rolled back with the failed lock");

    // The selected fund still Created (no accept first)
    assert_err(e.as_b(&[lock_from_ix(job, selected, &biz, &b, mint)]), "InvalidFundState");

    // Accept alone (an old build without lock_from_job), then anyone may move the budget
    e.as_b(&[accept_partner(selected, &b)]).unwrap();
    assert_eq!(e.fund(&selected).state, FundState::Accepted);
    let stranger = new_user(&mut e.svm);
    send_signed(&mut e.svm, &[lock_from_ix(job, selected, &biz, &stranger.pubkey(), mint)], &stranger, &[]).unwrap();
    assert_eq!(e.fund(&selected).state, FundState::Funded);
    assert_eq!(e.job(1).state, JobState::Filled);
    // Never twice
    assert!(e.as_b(&[lock_from_ix(job, selected, &biz, &b, mint)]).is_err());
}

#[test]
fn t5_lock_from_job_returns_a_donation_and_still_closes_the_job_vault() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let job = e.open_with_two(1, 10 * USDC);
    let b = e.b.pubkey();
    // Someone sends 1 USDC to the job vault: it must not block the lock
    let vault = job_vault_pda(&job);
    let raw = e.svm.get_account(&vault).unwrap();
    let mut data = raw.data.clone();
    let amount = u64::from_le_bytes(data[64..72].try_into().unwrap()) + USDC;
    data[64..72].copy_from_slice(&amount.to_le_bytes());
    put_token_program_account(&mut e.svm, vault, data);
    let before = e.balance(&biz);

    let now = T0 + 400;
    set_clock(&mut e.svm, now);
    let fund = e.select(job, 40, b, now).unwrap();
    e.as_b(&[accept_partner(fund, &b), lock_from_ix(job, fund, &biz, &b, mint)]).unwrap();
    assert_eq!(token_amount(&e.svm, &vault_pda(&fund)), 10 * USDC, "only the stored total moves");
    assert_eq!(e.balance(&biz), before + USDC, "the donation goes back to the business");
    assert!(closed(&e.svm, &vault));
}

// -----------------------------------------------------------------------------
// 6. withdraw_job
// -----------------------------------------------------------------------------

#[test]
fn t6_withdraw_rules_and_full_refund() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);

    // No applicants: allowed at once
    let before = e.balance(&biz);
    e.as_business(&[post_ix(&biz, mint, post(2, 10 * USDC))]).unwrap();
    let job = job_pda(&biz, 1);
    let meta = e.as_business(&[withdraw_ix(job, &biz, mint)]).unwrap();
    cu("withdraw_job", &meta);
    let w: JobWithdrawn = event(&meta);
    assert_eq!((w.job, w.amount), (job, 20 * USDC));
    assert_eq!(e.balance(&biz), before, "the full total back");
    assert_eq!(e.job(1).state, JobState::Withdrawn);
    assert!(closed(&e.svm, &job_vault_pda(&job)));
    assert_err(e.as_business(&[withdraw_ix(job, &biz, mint)]), "Error");

    // With applicants: refused before select_by
    let mut p = post(1, 10 * USDC);
    p.job_id = 2;
    e.as_business(&[post_ix(&biz, mint, p)]).unwrap();
    let job2 = job_pda(&biz, 2);
    let a = e.a.pubkey();
    e.as_a(&[apply_ix(job2, &a, "hi")]).unwrap();
    assert_err(e.as_business(&[withdraw_ix(job2, &biz, mint)]), "WithdrawTooEarly");

    // Selected, after select_by but inside the accept window: refused; after it: allowed
    let at = SELECT_BY - 10;
    set_clock(&mut e.svm, at);
    let tmpl = template(1, 10 * USDC);
    e.as_business(&[create_for(&biz, mint, 50, a, &tmpl, at, BRIEF), select_ix(job2, &biz, fund_pda(&biz, 50), &a)]).unwrap();
    set_clock(&mut e.svm, SELECT_BY + 1);
    assert_err(e.as_business(&[withdraw_ix(job2, &biz, mint)]), "WithdrawTooEarly");
    set_clock(&mut e.svm, at + JOB_ACCEPT_WINDOW_SECS + 1);
    let before = e.balance(&biz);
    e.as_business(&[withdraw_ix(job2, &biz, mint)]).unwrap();
    assert_eq!(e.balance(&biz), before + 10 * USDC);
    assert_eq!(e.job(2).state, JobState::Withdrawn);

    // Open with applicants after select_by: allowed
    let mut p = post(1, 5 * USDC);
    p.job_id = 3;
    p.apply_by = at + JOB_ACCEPT_WINDOW_SECS + 100;
    p.select_by = at + JOB_ACCEPT_WINDOW_SECS + 200;
    e.as_business(&[post_ix(&biz, mint, p)]).unwrap();
    let job3 = job_pda(&biz, 3);
    e.as_a(&[apply_ix(job3, &a, "hi")]).unwrap();
    set_clock(&mut e.svm, at + JOB_ACCEPT_WINDOW_SECS + 201);
    e.as_business(&[withdraw_ix(job3, &biz, mint)]).unwrap();
    // Only the business can withdraw
    let mut p = post(1, USDC);
    p.job_id = 4;
    p.apply_by = at + JOB_ACCEPT_WINDOW_SECS + 300;
    p.select_by = at + JOB_ACCEPT_WINDOW_SECS + 400;
    e.as_business(&[post_ix(&biz, mint, p)]).unwrap();
    let job4 = job_pda(&biz, 4);
    let ix = Instruction { accounts: ned_program::accounts::WithdrawJob { job: job4, business: a, job_vault: job_vault_pda(&job4), business_token: ata(&a, &mint), mint, token_program: TOKEN_PROGRAM_ID }.to_account_metas(None), ..withdraw_ix(job4, &biz, mint) };
    assert!(e.as_a(&[ix]).is_err());
    // A filled job cannot be withdrawn
    let mut p = post(1, USDC);
    p.job_id = 5;
    let start = at + JOB_ACCEPT_WINDOW_SECS + 500;
    p.apply_by = start + 300;
    p.select_by = start + 900;
    set_clock(&mut e.svm, start);
    e.as_business(&[post_ix(&biz, mint, p)]).unwrap();
    let job5 = job_pda(&biz, 5);
    e.as_a(&[apply_ix(job5, &a, "hi")]).unwrap();
    let fund = fund_pda(&biz, 60);
    e.as_business(&[create_for(&biz, mint, 60, a, &template(1, USDC), start, BRIEF), select_ix(job5, &biz, fund, &a)]).unwrap();
    e.as_a(&[accept_partner(fund, &a), lock_from_ix(job5, fund, &biz, &a, mint)]).unwrap();
    set_clock(&mut e.svm, start + 10_000);
    assert_err(e.as_business(&[withdraw_ix(job5, &biz, mint)]), "Error");
}

// -----------------------------------------------------------------------------
// D27 note rules (review-decision-plan.md section 2)
// -----------------------------------------------------------------------------

/// An ordinary contract business → A (2 milestones), accepted with the own wallet and locked
fn funded_contract(e: &mut Env) -> Pubkey {
    let (biz, mint, a) = (e.biz(), e.mint, e.a.pubkey());
    let fund = fund_pda(&biz, 90);
    e.as_business(&[create_for(&biz, mint, 90, a, &template(2, USDC), T0, BRIEF)]).unwrap();
    e.as_a(&[accept_ix(fund, &a, PayoutKind::OwnWallet, a, [0; 32])]).unwrap();
    e.as_business(&[lock_ix(fund, &biz, mint)]).unwrap();
    fund
}

#[test]
fn d27_review_notes_client_only_on_submitted_or_disputed() {
    let mut e = env();
    let fund = funded_contract(&mut e);
    let (biz, a) = (e.biz(), e.a.pubkey());
    // Pending: refused for a review
    assert_err(e.as_business(&[note_ix(fund, &biz, 3, 0)]), "NoteNotAllowed");
    e.as_a(&[submit_ix(fund, &a, 0)]).unwrap();
    // Submitted: the client may post a review, the freelancer may not
    let meta = e.as_business(&[note_ix(fund, &biz, 3, 0)]).unwrap();
    let n: NotePosted = event(&meta);
    assert_eq!((n.author, n.kind, n.milestone), (biz, 3, 0));
    assert_err(e.as_a(&[note_ix(fund, &a, 3, 0)]), "NoteNotAllowed");
    // Disputed: still allowed
    e.as_business(&[dispute_ix(fund, &biz, 0)]).unwrap();
    e.as_business(&[note_ix(fund, &biz, 3, 0)]).unwrap();
    // Released: refused
    e.as_a(&[submit_ix(fund, &a, 1)]).unwrap();
    e.as_business(&[approve_ix(fund, &biz, a, e.mint, 1)]).unwrap();
    assert_err(e.as_business(&[note_ix(fund, &biz, 3, 1)]), "NoteNotAllowed");
    // Out of range
    assert_err(e.as_business(&[note_ix(fund, &biz, 3, 2)]), "NoteNotAllowed");
}

#[test]
fn d27_delivery_notes_on_submitted_disputed_and_released_only() {
    let mut e = env();
    let fund = funded_contract(&mut e);
    let (biz, a, mint) = (e.biz(), e.a.pubkey(), e.mint);
    // Pending: refused
    assert_err(e.as_a(&[note_ix(fund, &a, 1, 0)]), "NoteNotAllowed");
    e.as_a(&[submit_ix(fund, &a, 0)]).unwrap();
    e.as_a(&[note_ix(fund, &a, 1, 0)]).unwrap();
    // Disputed: accepted (a revised version)
    e.as_business(&[dispute_ix(fund, &biz, 0)]).unwrap();
    e.as_a(&[note_ix(fund, &a, 1, 0)]).unwrap();
    // Released: accepted (handover of the final files)
    e.as_business(&[approve_ix(fund, &biz, a, mint, 0)]).unwrap();
    assert_eq!(e.fund(&fund).milestones[0].status, MilestoneStatus::Released);
    e.as_a(&[note_ix(fund, &a, 1, 0)]).unwrap();
    // The client still cannot post a delivery note
    assert_err(e.as_business(&[note_ix(fund, &biz, 1, 0)]), "NoteNotAllowed");
    // Refunded: refused
    set_clock(&mut e.svm, T0 + WORK + 1);
    e.as_business(&[refund_ix(fund, &biz, &biz, mint, 1)]).unwrap();
    assert_eq!(e.fund(&fund).milestones[1].status, MilestoneStatus::Refunded);
    assert_err(e.as_a(&[note_ix(fund, &a, 1, 1)]), "NoteNotAllowed");
}

// -----------------------------------------------------------------------------
// v1.4 Lock at hire (lock-at-hire-plan.md, D29) and the G1 check
// -----------------------------------------------------------------------------

impl Env {
    /// post_job_open for job 1 (n × amount) and A and B apply; returns the job address
    fn open_unfunded_with_two(&mut self, n: usize, amount: u64) -> Pubkey {
        let (biz, mint) = (self.biz(), self.mint);
        self.as_business(&[post_open_ix(&biz, mint, post(n, amount))]).unwrap();
        let job = job_pda(&biz, 1);
        let (a, b) = (self.a.pubkey(), self.b.pubkey());
        self.as_a(&[apply_ix(job, &a, "I build landing pages")]).unwrap();
        self.as_b(&[apply_ix(job, &b, "Designer and front-end developer")]).unwrap();
        job
    }
    /// fund_job + create_fund + select_job in one transaction; returns the fund
    fn fund_and_select(&mut self, job: Pubkey, fund_id: u64, freelancer: Pubkey, now: i64) -> Result<(Pubkey, litesvm::types::TransactionMetadata), String> {
        let (biz, mint) = (self.biz(), self.mint);
        let tmpl: Vec<JobMilestoneInput> = self.job(1).used().iter().map(|m| JobMilestoneInput { amount: m.amount, work_secs: m.work_secs, review_secs: m.review_secs }).collect();
        let fund = fund_pda(&biz, fund_id);
        self.as_business(&[fund_ix(job, &biz, mint), create_for(&biz, mint, fund_id, freelancer, &tmpl, now, BRIEF), select_ix(job, &biz, fund, &freelancer)])
            .map(|meta| (fund, meta))
    }
}

#[test]
fn v14_post_job_open_locks_nothing_and_sets_unfunded() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let before = e.balance(&biz);
    let meta = e.as_business(&[post_open_ix(&biz, mint, post(2, 10 * USDC))]).unwrap();
    cu("post_job_open", &meta);
    let job = job_pda(&biz, 1);
    let ev: JobPostedOpen = event(&meta);
    assert_eq!((ev.job, ev.business, ev.total), (job, biz, 20 * USDC));
    assert_eq!(e.balance(&biz), before, "nothing leaves the business");
    assert_eq!(token_amount(&e.svm, &job_vault_pda(&job)), 0, "empty job vault");
    let listing = e.job(1);
    assert_eq!((listing.state, listing.unfunded, listing.total), (JobState::Open, 1, 20 * USDC));
    let d = e.svm.get_account(&job).unwrap().data;
    assert_eq!(d.len(), 576, "layout unchanged");
    assert_eq!(d[544], 1, "unfunded @544");
    assert!(d[545..576].iter().all(|b| *b == 0), "_reserved @545..576");
    // Freelancers can apply as to any open listing
    let a = e.a.pubkey();
    e.as_a(&[apply_ix(job, &a, "hi")]).unwrap();
    assert_eq!(e.job(1).application_count, 1);
}

#[test]
fn v14_post_job_keeps_v13_behaviour() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let before = e.balance(&biz);
    let meta = e.as_business(&[post_ix(&biz, mint, post(1, 10 * USDC))]).unwrap();
    let _: JobPosted = event(&meta);
    let job = job_pda(&biz, 1);
    assert_eq!(e.job(1).unfunded, 0);
    assert_eq!(e.balance(&biz), before - 10 * USDC);
    assert_eq!(token_amount(&e.svm, &job_vault_pda(&job)), 10 * USDC);
    // fund_job on a funded listing is refused
    assert_err(e.as_business(&[fund_ix(job, &biz, mint)]), "JobAlreadyFunded");
}

#[test]
fn v14_select_needs_the_budget_locked_in_the_same_transaction() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let job = e.open_unfunded_with_two(2, 10 * USDC);
    let b = e.b.pubkey();
    let now = T0 + 400;
    set_clock(&mut e.svm, now);

    // create_fund + select_job without fund_job: refused, nothing changes
    assert_err(e.select(job, 70, b, now), "JobNotFunded");
    assert_eq!((e.job(1).state, e.job(1).unfunded), (JobState::Open, 1));

    // fund_job + create_fund + select_job: the budget moves at the moment of selection
    let before = e.balance(&biz);
    let (fund, meta) = e.fund_and_select(job, 71, b, now).unwrap();
    cu("fund_job + create_fund + select_job", &meta);
    let ev: JobFunded = event(&meta);
    assert_eq!((ev.job, ev.total), (job, 20 * USDC));
    assert_eq!(e.balance(&biz), before - 20 * USDC);
    assert_eq!(token_amount(&e.svm, &job_vault_pda(&job)), 20 * USDC);
    let listing = e.job(1);
    assert_eq!((listing.state, listing.unfunded, listing.selected, listing.fund), (JobState::Selected, 0, b, fund));

    // The freelancer accepts with the budget already locked: accept + lock_from_job as in v1.3
    e.as_b(&[accept_partner(fund, &b), lock_from_ix(job, fund, &biz, &b, mint)]).unwrap();
    assert_eq!(e.fund(&fund).state, FundState::Funded);
    assert_eq!(token_amount(&e.svm, &vault_pda(&fund)), 20 * USDC);
    assert_eq!(e.job(1).state, JobState::Filled);
}

#[test]
fn v14_fund_job_rules() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    e.as_business(&[post_open_ix(&biz, mint, post(1, 10 * USDC))]).unwrap();
    let job = job_pda(&biz, 1);
    let a = e.a.pubkey();

    // Only the business
    let ix = Instruction {
        accounts: ned_program::accounts::FundJob { job, business: a, job_vault: job_vault_pda(&job), business_token: ata(&a, &mint), mint, token_program: TOKEN_PROGRAM_ID }
            .to_account_metas(None),
        ..fund_ix(job, &biz, mint)
    };
    assert!(e.as_a(&[ix]).is_err());

    // Exactly the stored total, only once (the business starts with 1,000 USDC)
    let before = e.balance(&biz);
    e.as_business(&[fund_ix(job, &biz, mint)]).unwrap();
    assert_eq!(e.balance(&biz), before - 10 * USDC);
    assert_eq!(e.job(1).unfunded, 0);
    assert_err(e.as_business(&[fund_ix(job, &biz, mint)]), "JobAlreadyFunded");

    // Not enough USDC: refused, the listing stays unfunded (990 left: 900 fits once, not twice)
    let mut p = post(1, 900 * USDC);
    p.job_id = 2;
    e.as_business(&[post_open_ix(&biz, mint, p)]).unwrap();
    let mut p = post(1, 900 * USDC);
    p.job_id = 3;
    e.as_business(&[post_open_ix(&biz, mint, p)]).unwrap();
    e.as_business(&[fund_ix(job_pda(&biz, 2), &biz, mint)]).unwrap();
    assert!(e.as_business(&[fund_ix(job_pda(&biz, 3), &biz, mint)]).is_err(), "balance too low");
    assert_eq!(e.job(3).unfunded, 1);

    // After select_by: refused
    let mut p = post(1, USDC);
    p.job_id = 4;
    e.as_business(&[post_open_ix(&biz, mint, p)]).unwrap();
    set_clock(&mut e.svm, SELECT_BY + 1);
    assert_err(e.as_business(&[fund_ix(job_pda(&biz, 4), &biz, mint)]), "SelectClosed");
}

#[test]
fn v14_reselect_does_not_lock_again() {
    let mut e = env();
    let biz = e.biz();
    let job = e.open_unfunded_with_two(1, 10 * USDC);
    let (a, b) = (e.a.pubkey(), e.b.pubkey());
    let now = T0 + 400;
    set_clock(&mut e.svm, now);
    e.fund_and_select(job, 80, a, now).unwrap();
    let after_first = e.balance(&biz);
    // A does not accept; after the accept window the business selects B without a second fund_job
    let later = now + JOB_ACCEPT_WINDOW_SECS + 1;
    set_clock(&mut e.svm, later);
    let fund_b = e.select(job, 81, b, later).unwrap();
    assert_eq!(e.balance(&biz), after_first, "no second lock");
    assert_eq!(token_amount(&e.svm, &job_vault_pda(&job)), 10 * USDC);
    assert_eq!(e.job(1).fund, fund_b);
    // fund_job is refused on a Selected listing
    let mint = e.mint;
    assert_err(e.as_business(&[fund_ix(job, &biz, mint)]), "JobNotOpen");
}

#[test]
fn v14_withdraw_an_unfunded_listing_moves_nothing() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let before = e.balance(&biz);
    e.as_business(&[post_open_ix(&biz, mint, post(2, 10 * USDC))]).unwrap();
    let job = job_pda(&biz, 1);
    let meta = e.as_business(&[withdraw_ix(job, &biz, mint)]).unwrap();
    let w: JobWithdrawn = event(&meta);
    assert_eq!((w.job, w.amount), (job, 0));
    assert_eq!(e.balance(&biz), before);
    assert_eq!(e.job(1).state, JobState::Withdrawn);
    assert!(closed(&e.svm, &job_vault_pda(&job)));
}

#[test]
fn v14_g1_a_recreated_contract_for_someone_else_cannot_take_the_budget() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let job = e.open_with_two(1, 10 * USDC);
    let a = e.a.pubkey();
    let now = T0 + 400;
    set_clock(&mut e.svm, now);
    let fund = e.select(job, 90, a, now).unwrap();

    // The business closes A's contract (still Created) and recreates the same address for a stranger
    e.as_business(&[close_fund_ix(fund, &biz, mint)]).unwrap();
    let stranger = new_user(&mut e.svm);
    put_token_account(&mut e.svm, &stranger.pubkey(), &mint, 0);
    let tmpl = template(1, 10 * USDC);
    e.as_business(&[create_for(&biz, mint, 90, stranger.pubkey(), &tmpl, now, BRIEF)]).unwrap();
    assert_eq!(fund_pda(&biz, 90), fund, "same address");
    assert_eq!(e.job(1).fund, fund);

    // The stranger accepts and tries to move the job budget: refused (G1)
    let s = stranger.insecure_clone();
    let result = send_signed(&mut e.svm, &[accept_partner(fund, &s.pubkey()), lock_from_ix(job, fund, &biz, &s.pubkey(), mint)], &s, &[]);
    assert_err(result, "JobFundMismatch");
    assert_eq!(token_amount(&e.svm, &job_vault_pda(&job)), 10 * USDC, "the budget stays in the job vault");
    assert_eq!(e.job(1).state, JobState::Selected);
}

// v1.4 self-review (V2): cases the first draft did not cover

#[test]
fn v14_fund_job_refused_on_filled_and_withdrawn_listings() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let mut p = post(1, 10 * USDC);
    p.job_id = 2;
    e.as_business(&[post_open_ix(&biz, mint, p)]).unwrap();
    // Filled: funded at selection, then accepted and locked
    let job = e.open_unfunded_with_two(1, 10 * USDC);
    let b = e.b.pubkey();
    let now = T0 + 400;
    set_clock(&mut e.svm, now);
    let (fund, _) = e.fund_and_select(job, 60, b, now).unwrap();
    e.as_b(&[accept_partner(fund, &b), lock_from_ix(job, fund, &biz, &b, mint)]).unwrap();
    assert_eq!(e.job(1).state, JobState::Filled);
    let before = e.balance(&biz);
    assert!(e.as_business(&[fund_ix(job, &biz, mint)]).is_err(), "fund_job on a Filled listing");
    assert_eq!(e.balance(&biz), before);

    // Withdrawn: an unfunded listing (job 2, posted first) withdrawn before anyone applied
    let job2 = job_pda(&biz, 2);
    e.as_business(&[withdraw_ix(job2, &biz, mint)]).unwrap();
    assert_eq!(e.job(2).state, JobState::Withdrawn);
    assert!(e.as_business(&[fund_ix(job2, &biz, mint)]).is_err(), "fund_job on a Withdrawn listing");
    assert_eq!(e.balance(&biz), before);
    assert_eq!(e.job(2).unfunded, 1, "nothing changed");
}

#[test]
fn v14_withdraw_an_unfunded_listing_returns_a_donation_and_closes_the_vault() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let before = e.balance(&biz);
    e.as_business(&[post_open_ix(&biz, mint, post(1, 10 * USDC))]).unwrap();
    let job = job_pda(&biz, 1);
    // Someone sends 1 USDC to the empty job vault
    let vault = job_vault_pda(&job);
    let mut data = e.svm.get_account(&vault).unwrap().data;
    data[64..72].copy_from_slice(&USDC.to_le_bytes());
    put_token_program_account(&mut e.svm, vault, data);
    // A donation does not count as funding
    assert_eq!(e.job(1).unfunded, 1);

    let meta = e.as_business(&[withdraw_ix(job, &biz, mint)]).unwrap();
    let w: JobWithdrawn = event(&meta);
    assert_eq!(w.amount, 0, "the stored budget was never locked");
    assert_eq!(e.balance(&biz), before + USDC, "the donation goes to the business");
    assert!(closed(&e.svm, &vault));
}

#[test]
fn v14_select_on_an_unfunded_listing_checks_state_and_select_by_first() {
    let mut e = env();
    let job = e.open_unfunded_with_two(1, 10 * USDC);
    let b = e.b.pubkey();
    // After select_by the error is SelectClosed, not JobNotFunded
    let late = SELECT_BY + 1;
    set_clock(&mut e.svm, late);
    assert_err(e.select(job, 50, b, late), "SelectClosed");
    // A withdrawn listing reports JobNotOpen
    let (biz, mint) = (e.biz(), e.mint);
    e.as_business(&[withdraw_ix(job, &biz, mint)]).unwrap();
    assert_err(e.select(job, 51, b, late), "JobNotOpen");
}

#[test]
fn v14_g1_a_recreated_contract_with_another_brief_cannot_take_the_budget() {
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let job = e.open_with_two(1, 10 * USDC);
    let a = e.a.pubkey();
    let now = T0 + 400;
    set_clock(&mut e.svm, now);
    let fund = e.select(job, 91, a, now).unwrap();

    // Same address, same freelancer and amounts, another brief
    e.as_business(&[close_fund_ix(fund, &biz, mint)]).unwrap();
    let other = [8u8; 32];
    assert_ne!(other, BRIEF);
    e.as_business(&[create_for(&biz, mint, 91, a, &template(1, 10 * USDC), now, other)]).unwrap();
    let accept = Instruction {
        data: ned_program::instruction::Accept {
            payout_kind: PayoutKind::PayoutPartner,
            payout_destination: PAYOUT_PARTNERS[0],
            payout_reference: PARTNER_REF,
            expected_brief_hash: other,
        }
        .data(),
        ..accept_partner(fund, &a)
    };
    assert_err(e.as_a(&[accept, lock_from_ix(job, fund, &biz, &a, mint)]), "JobFundMismatch");
    assert_eq!(token_amount(&e.svm, &job_vault_pda(&job)), 10 * USDC);
}

/// CL R-2: the select transaction of a "locks when hired" listing with the longest title and 5 milestones, plus the
/// two compute-budget instructions a wallet may add, must fit Solana's 1,232-byte limit.
#[test]
fn v14_fund_create_select_transaction_fits_1232_bytes() {
    use solana_message::Message;
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let title = "W".repeat(32);
    let mut p = post(5, 10 * USDC);
    p.title = title.clone();
    e.as_business(&[post_open_ix(&biz, mint, p)]).unwrap();
    let job = job_pda(&biz, 1);
    let b = e.b.pubkey();
    e.as_b(&[apply_ix(job, &b, "Designer")]).unwrap();
    let now = T0 + 400;
    set_clock(&mut e.svm, now);

    // create_fund as the app builds it: the job's title, the template with absolute deadlines
    let fund_id = u64::MAX; // the app uses Date.now(); the u64 size is fixed either way
    let mut create = create_for(&biz, mint, fund_id, b, &template(5, 10 * USDC), now, BRIEF);
    let milestones = template(5, 10 * USDC)
        .iter()
        .map(|t| MilestoneInput { amount: t.amount, submit_by: now + t.work_secs, review_by: now + t.work_secs + t.review_secs })
        .collect();
    create.data = ned_program::instruction::CreateFund { fund_id, freelancer: b, title, milestones, brief_hash: BRIEF }.data();
    let fund = fund_pda(&biz, fund_id);
    let core = vec![fund_ix(job, &biz, mint), create, select_ix(job, &biz, fund, &b)];

    // ComputeBudget: SetComputeUnitLimit (2, u32) and SetComputeUnitPrice (3, u64)
    let budget: Pubkey = "ComputeBudget111111111111111111111111111111".parse().unwrap();
    let mut limit = vec![2u8];
    limit.extend_from_slice(&200_000u32.to_le_bytes());
    let mut price = vec![3u8];
    price.extend_from_slice(&1_000u64.to_le_bytes());
    let mut with_budget = vec![Instruction { program_id: budget, accounts: vec![], data: limit }, Instruction { program_id: budget, accounts: vec![], data: price }];
    with_budget.extend(core.iter().cloned());

    let size = |ixs: &[Instruction]| {
        let msg = Message::new(ixs, Some(&biz));
        1 + 64 * msg.header.num_required_signatures as usize + msg.serialize().len()
    };
    let (plain, budgeted) = (size(&core), size(&with_budget));
    println!("TX fund_job + create_fund + select_job: {plain} bytes; with compute budget: {budgeted} bytes (limit 1232)");
    assert!(plain <= 1232 && budgeted <= 1232, "{plain} / {budgeted} bytes");

    // And it runs as one transaction
    let meta = e.as_business(&with_budget).unwrap();
    cu("fund_job + create_fund + select_job (5 milestones)", &meta);
    assert_eq!((e.job(1).state, e.job(1).unfunded), (JobState::Selected, 0));
}

/// Compute units of each top-level N.E.D instruction in a transaction, from the program logs
fn cu_each(meta: &litesvm::types::TransactionMetadata) -> Vec<(String, u64)> {
    let id = ned_program::ID.to_string();
    let mut names = Vec::new();
    let mut out = Vec::new();
    for line in &meta.logs {
        if let Some(name) = line.strip_prefix("Program log: Instruction: ") {
            if !matches!(name, "Transfer" | "TransferChecked" | "InitializeAccount3" | "CloseAccount") {
                names.push(name.to_string());
            }
        } else if let Some(rest) = line.strip_prefix(&format!("Program {id} consumed ")) {
            let units: u64 = rest.split(' ').next().unwrap().parse().unwrap();
            out.push((names.get(out.len()).cloned().unwrap_or_default(), units));
        }
    }
    out
}

/// V2 (pre-pitch-check §5, CL R-3): compute units of every job instruction on v1.4, one row per instruction
#[test]
fn v14_compute_units_per_job_instruction() {
    let mut rows: Vec<(String, u64)> = Vec::new();
    let mut push = |label: &str, meta: &litesvm::types::TransactionMetadata| {
        let each = cu_each(meta);
        let parts: Vec<String> = each.iter().map(|(n, u)| format!("{n} {u}")).collect();
        println!("CU {label}: total {} = {}", meta.compute_units_consumed, parts.join(" + "));
        rows.extend(each);
    };

    // Funded listing (v1.3 path), 2 milestones
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let meta = e.as_business(&[post_ix(&biz, mint, post(2, 10 * USDC))]).unwrap();
    push("post_job (2 milestones)", &meta);
    let job = job_pda(&biz, 1);
    let (a, b) = (e.a.pubkey(), e.b.pubkey());
    let meta = e.as_a(&[apply_ix(job, &a, "I build landing pages")]).unwrap();
    push("apply_job", &meta);
    let now = T0 + 400;
    set_clock(&mut e.svm, now);
    let tmpl = template(2, 10 * USDC);
    let fund = fund_pda(&biz, 10);
    let meta = e.as_business(&[create_for(&biz, mint, 10, a, &tmpl, now, BRIEF), select_ix(job, &biz, fund, &a)]).unwrap();
    push("create_fund + select_job", &meta);
    let meta = e.as_a(&[accept_partner(fund, &a), lock_from_ix(job, fund, &biz, &a, mint)]).unwrap();
    push("accept + lock_from_job", &meta);

    // Locks when hired, 2 milestones
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    let meta = e.as_business(&[post_open_ix(&biz, mint, post(2, 10 * USDC))]).unwrap();
    push("post_job_open (2 milestones)", &meta);
    let job = job_pda(&biz, 1);
    let b2 = e.b.pubkey();
    e.as_b(&[apply_ix(job, &b2, "Designer")]).unwrap();
    set_clock(&mut e.svm, now);
    let (fund, meta) = e.fund_and_select(job, 11, b2, now).unwrap();
    push("fund_job + create_fund + select_job", &meta);
    let meta = e.as_b(&[accept_partner(fund, &b2), lock_from_ix(job, fund, &biz, &b2, mint)]).unwrap();
    push("accept + lock_from_job (after fund_job)", &meta);

    // Withdraw: funded and unfunded
    let mut e = env();
    let (biz, mint) = (e.biz(), e.mint);
    e.as_business(&[post_ix(&biz, mint, post(2, 10 * USDC))]).unwrap();
    let meta = e.as_business(&[withdraw_ix(job_pda(&biz, 1), &biz, mint)]).unwrap();
    push("withdraw_job (funded)", &meta);
    let mut p = post(2, 10 * USDC);
    p.job_id = 2;
    e.as_business(&[post_open_ix(&biz, mint, p)]).unwrap();
    let meta = e.as_business(&[withdraw_ix(job_pda(&biz, 2), &biz, mint)]).unwrap();
    push("withdraw_job (unfunded)", &meta);
    let _ = b;

    println!("\n| Instruction | Compute units |\n| --- | ---: |");
    for (name, units) in &rows {
        println!("| `{name}` | {units} |");
        assert!(*units < 200_000, "{name} uses {units} CU");
    }
}
