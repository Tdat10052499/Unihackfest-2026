use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use super::{close_job_vault, pay_from_job_vault};
use crate::constants::*;
use crate::errors::NedError;
use crate::events::{FundLocked, JobFilled};
use crate::instructions::milestone::common::{check_work_window, used};
use crate::state::*;

/// Moves the job's locked budget into the selected contract, sent in the same transaction right after `accept`, so
/// the destination is fixed before money reaches the contract (rule 1.2). Anyone may send it (the freelancer in
/// practice). Uses the stored total; a donation above it goes back to the business before the job vault closes.
pub fn lock_from_job_handler(ctx: Context<LockFromJob>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    // Validate
    let job = &ctx.accounts.job;
    let fund = &ctx.accounts.fund;
    require!(job.state == JobState::Selected, NedError::NotSelected);
    require!(job.fund == fund.key(), NedError::NotSelected);
    require!(fund.state == FundState::Accepted, NedError::InvalidFundState);
    require!(fund.total == job.total, NedError::JobFundMismatch);
    check_work_window(used(fund), now)?;

    // State
    let amount = job.total;
    let leftover = ctx.accounts.job_vault.amount.saturating_sub(amount);
    ctx.accounts.fund.state = FundState::Funded;
    ctx.accounts.job.state = JobState::Filled;

    // CPI 1: job vault -> contract vault (stored total), signed by the job PDA
    pay_from_job_vault(
        &ctx.accounts.job,
        &ctx.accounts.job_vault,
        &ctx.accounts.mint,
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.token_program,
        amount,
    )?;
    // CPI 2: any donation above the total -> business ATA
    pay_from_job_vault(
        &ctx.accounts.job,
        &ctx.accounts.job_vault,
        &ctx.accounts.mint,
        &ctx.accounts.business_token.to_account_info(),
        &ctx.accounts.token_program,
        leftover,
    )?;
    // CPI 3: close the empty job vault, rent -> business
    close_job_vault(&ctx.accounts.job, &ctx.accounts.job_vault, &ctx.accounts.business.to_account_info(), &ctx.accounts.token_program)?;

    let fund_key = ctx.accounts.fund.key();
    emit!(FundLocked { fund: fund_key, amount });
    emit!(JobFilled { job: ctx.accounts.job.key(), fund: fund_key, amount });
    Ok(())
}

#[derive(Accounts)]
pub struct LockFromJob<'info> {
    #[account(
        mut,
        seeds = [JOB_SEED, job.business.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = business,
        has_one = mint @ NedError::InvalidMint
    )]
    pub job: Box<Account<'info, JobListing>>,

    #[account(
        mut,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump,
        has_one = mint @ NedError::InvalidMint
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    #[account(
        mut,
        seeds = [JOB_VAULT_SEED, job.key().as_ref()],
        bump = job.vault_bump,
        token::mint = mint,
        token::authority = job,
        token::token_program = token_program
    )]
    pub job_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [VAULT_SEED, fund.key().as_ref()],
        bump = fund.vault_bump,
        token::mint = mint,
        token::authority = fund,
        token::token_program = token_program
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: the listing's business (has_one); receives the job vault rent and any donation
    #[account(mut)]
    pub business: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = business,
        associated_token::token_program = token_program
    )]
    pub business_token: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Anyone (the freelancer in practice)
    pub caller: Signer<'info>,

    #[account(address = USDC_MINT @ NedError::InvalidMint)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
}
