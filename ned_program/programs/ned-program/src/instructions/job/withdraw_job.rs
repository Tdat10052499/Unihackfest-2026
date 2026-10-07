use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use super::{accept_window_over, close_job_vault, pay_from_job_vault};
use crate::constants::*;
use crate::errors::NedError;
use crate::events::JobWithdrawn;
use crate::state::*;

/// Returns the budget to the business when no one was hired (nothing for a v1.4 "locks when hired" listing that was
/// never funded): at once while no one applied; after `select_by` when
/// open; after `select_by` and the accept window when someone was selected but did not accept. The listing account
/// stays as the record.
pub fn withdraw_job_handler(ctx: Context<WithdrawJob>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    // Validate
    let job = &ctx.accounts.job;
    let allowed = match job.state {
        JobState::Open => job.application_count == 0 || now > job.select_by,
        JobState::Selected => now > job.select_by && accept_window_over(job, now),
        _ => return err!(NedError::JobNotOpen),
    };
    require!(allowed, NedError::WithdrawTooEarly);

    // State: an unfunded listing (v1.4, D29) owes nothing back; only a donation, if any, is returned
    let amount = if job.unfunded == 1 { 0 } else { job.total };
    let leftover = ctx.accounts.job_vault.amount.saturating_sub(amount);
    ctx.accounts.job.state = JobState::Withdrawn;

    // CPI: the stored total, then any donation, -> business ATA; close the job vault, rent -> business
    let to = ctx.accounts.business_token.to_account_info();
    pay_from_job_vault(&ctx.accounts.job, &ctx.accounts.job_vault, &ctx.accounts.mint, &to, &ctx.accounts.token_program, amount)?;
    pay_from_job_vault(&ctx.accounts.job, &ctx.accounts.job_vault, &ctx.accounts.mint, &to, &ctx.accounts.token_program, leftover)?;
    close_job_vault(&ctx.accounts.job, &ctx.accounts.job_vault, &ctx.accounts.business.to_account_info(), &ctx.accounts.token_program)?;

    emit!(JobWithdrawn { job: ctx.accounts.job.key(), amount });
    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawJob<'info> {
    #[account(
        mut,
        seeds = [JOB_SEED, job.business.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = business,
        has_one = mint @ NedError::InvalidMint
    )]
    pub job: Box<Account<'info, JobListing>>,

    #[account(mut)]
    pub business: Signer<'info>,

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
        associated_token::mint = mint,
        associated_token::authority = business,
        associated_token::token_program = token_program
    )]
    pub business_token: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(address = USDC_MINT @ NedError::InvalidMint)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
}
