use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::constants::*;
use crate::errors::NedError;
use crate::events::{JobPosted, JobPostedOpen};
use crate::state::*;

/// Publishes a job. `lock_now`: post_job locks the whole budget in the job vault at once (funded-jobs-plan.md 4.3);
/// post_job_open (v1.4, D29) creates the listing and an empty job vault and locks nothing until fund_job, which the
/// app sends with create_fund + select_job.
#[allow(clippy::too_many_arguments)]
pub fn post_job_handler(
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
    lock_now: bool,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    // Validate
    require!(brief_hash.iter().any(|b| *b != 0), NedError::InvalidBriefHash);
    require!(category < JOB_CATEGORY_COUNT, NedError::InvalidCategory);
    require!((1..=JOB_SUMMARY_MAX_LEN).contains(&summary.len()), NedError::SummaryTooLong);
    require!(title.len() <= TITLE_MAX_LEN, NedError::TitleTooLong);
    require!((1..=MAX_MILESTONES).contains(&milestones.len()), NedError::InvalidMilestoneCount);
    require!(now < apply_by && apply_by <= select_by, NedError::InvalidJobDeadlines);

    let mut slots = [JobMilestone::default(); MAX_MILESTONES];
    let mut total: u64 = 0;
    for (slot, input) in slots.iter_mut().zip(milestones.iter()) {
        require!(input.amount > 0, NedError::InvalidAmount);
        require!(input.work_secs >= MIN_WORK_WINDOW_SECS, NedError::WorkWindowTooShort);
        require!(input.review_secs >= MIN_REVIEW_WINDOW_SECS, NedError::ReviewWindowTooShort);
        total = total.checked_add(input.amount).ok_or(NedError::MathOverflow)?;
        *slot = JobMilestone { amount: input.amount, work_secs: input.work_secs, review_secs: input.review_secs };
    }
    require!(total <= MAX_CONTRACT_AMOUNT, NedError::AmountTooLarge);

    // State
    let mut title_bytes = [0u8; 32];
    title_bytes[..title.len()].copy_from_slice(title.as_bytes());
    let mut summary_bytes = [0u8; 160];
    summary_bytes[..summary.len()].copy_from_slice(summary.as_bytes());

    let business = ctx.accounts.business.key();
    let job = &mut ctx.accounts.job;
    job.version = JOB_VERSION;
    job.state = JobState::Open;
    job.business = business;
    job.category = category;
    job.skills = skills;
    job.mint = ctx.accounts.mint.key();
    job.job_id = job_id;
    job.created_at = now;
    job.apply_by = apply_by;
    job.select_by = select_by;
    job.total = total;
    job.milestone_count = milestones.len() as u8;
    job.milestones = slots;
    job.title = title_bytes;
    job.summary = summary_bytes;
    job.brief_hash = brief_hash;
    job.selected = Pubkey::default();
    job.selected_at = 0;
    job.fund = Pubkey::default();
    job.application_count = 0;
    job.bump = ctx.bumps.job;
    job.vault_bump = ctx.bumps.job_vault;
    job.unfunded = if lock_now { 0 } else { 1 };
    job._reserved = [0u8; 31];

    if !lock_now {
        emit!(JobPostedOpen { job: job.key(), business, job_id, category, total, apply_by, select_by, brief_hash });
        return Ok(());
    }

    // CPI: business ATA -> job vault, signed by the business
    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.business_token.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.job_vault.to_account_info(),
                authority: ctx.accounts.business.to_account_info(),
            },
        ),
        total,
        ctx.accounts.mint.decimals,
    )?;

    emit!(JobPosted { job: job.key(), business, job_id, category, total, apply_by, select_by, brief_hash });
    Ok(())
}

#[derive(Accounts)]
#[instruction(job_id: u64)]
pub struct PostJob<'info> {
    pub business: Signer<'info>,

    /// Pays the rent of the listing and the job vault (may be the business)
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = JobListing::SPACE,
        seeds = [JOB_SEED, business.key().as_ref(), &job_id.to_le_bytes()],
        bump
    )]
    pub job: Box<Account<'info, JobListing>>,

    #[account(
        init,
        payer = payer,
        seeds = [JOB_VAULT_SEED, job.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = job,
        token::token_program = token_program
    )]
    pub job_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = business,
        associated_token::token_program = token_program
    )]
    pub business_token: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(address = USDC_MINT @ NedError::InvalidMint)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
