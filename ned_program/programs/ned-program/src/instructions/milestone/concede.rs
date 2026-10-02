use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::MilestoneRefunded;
use crate::state::*;

/// Freelancer gives up a disputed milestone: refund to the client. A disputed milestone can therefore
/// always be settled by either side, so funds never freeze (review fix R5).
pub fn concede_handler(ctx: Context<Concede>, index: u8) -> Result<()> {
    let fund = &mut ctx.accounts.fund;

    // Validate
    require_state(fund, FundState::Funded)?;
    let i = index_ok(fund, index)?;
    require!(fund.milestones[i].status == MilestoneStatus::Disputed, NedError::InvalidMilestoneStatus);

    // State
    let amount = fund.milestones[i].amount;
    fund.refunded = fund.refunded.checked_add(amount).ok_or(NedError::MathOverflow)?;
    set_status(fund, i, MilestoneStatus::Refunded);

    // CPI: vault -> client ATA
    pay_from_vault(
        &ctx.accounts.fund,
        &ctx.accounts.vault,
        &ctx.accounts.mint,
        &ctx.accounts.client_token,
        &ctx.accounts.token_program,
        amount,
    )?;

    emit!(MilestoneRefunded {
        fund: ctx.accounts.fund.key(),
        index,
        amount,
        caller: ctx.accounts.freelancer.key(),
        conceded: true,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct Concede<'info> {
    #[account(
        mut,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump,
        has_one = freelancer,
        has_one = mint @ NedError::InvalidMint
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    pub freelancer: Signer<'info>,

    /// CHECK: only its address is used: it must be the fund's client
    #[account(address = fund.client)]
    pub client: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = client,
        associated_token::token_program = token_program
    )]
    pub client_token: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [VAULT_SEED, fund.key().as_ref()],
        bump = fund.vault_bump,
        token::mint = mint,
        token::authority = fund,
        token::token_program = token_program
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(address = USDC_MINT @ NedError::InvalidMint)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
}
