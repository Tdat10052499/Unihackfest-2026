use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::constants::*;
use crate::errors::NedError;
use crate::events::JobFunded;
use crate::state::*;

/// v1.4 (D29, lock-at-hire-plan.md P3): locks the budget of a "locks when hired" listing in its job vault. The app
/// sends it in the same transaction as create_fund + select_job, so the budget is locked before the selected
/// freelancer can accept; select_job refuses an unfunded listing. Only the business, only once, only while the
/// listing is Open and select_by has not passed. Moves exactly the stored total.
pub fn fund_job_handler(ctx: Context<FundJob>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    // Validate
    let job = &ctx.accounts.job;
    require!(job.state == JobState::Open, NedError::JobNotOpen);
    require!(job.unfunded == 1, NedError::JobAlreadyFunded);
    require!(now <= job.select_by, NedError::SelectClosed);
    let total = job.total;

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

    // State
    let job = &mut ctx.accounts.job;
    job.unfunded = 0;

    emit!(JobFunded { job: job.key(), total });
    Ok(())
}

#[derive(Accounts)]
pub struct FundJob<'info> {
    #[account(
        mut,
        seeds = [JOB_SEED, job.business.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = business,
        has_one = mint @ NedError::InvalidMint
    )]
    pub job: Box<Account<'info, JobListing>>,

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
