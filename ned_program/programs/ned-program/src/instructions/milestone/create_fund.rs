use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::FundCreated;
use crate::state::*;

pub fn create_fund_handler(
    ctx: Context<CreateFund>,
    fund_id: u64,
    freelancer: Pubkey,
    title: String,
    milestones: Vec<MilestoneInput>,
) -> Result<()> {
    let client = ctx.accounts.client.key();
    let now = Clock::get()?.unix_timestamp;

    // Validate
    require!(
        (1..=MAX_MILESTONES).contains(&milestones.len()),
        NedError::InvalidMilestoneCount
    );
    require!(freelancer != Pubkey::default(), NedError::InvalidFreelancer);
    require!(freelancer != client, NedError::SameParty);
    require!(title.len() <= TITLE_MAX_LEN, NedError::TitleTooLong);

    let mut slots = [Milestone::default(); MAX_MILESTONES];
    let mut total: u64 = 0;
    for (slot, input) in slots.iter_mut().zip(milestones.iter()) {
        require!(input.amount > 0, NedError::InvalidAmount);
        let review_window = input.review_by.checked_sub(input.submit_by).ok_or(NedError::MathOverflow)?;
        require!(review_window >= MIN_REVIEW_WINDOW_SECS, NedError::ReviewWindowTooShort);
        total = total.checked_add(input.amount).ok_or(NedError::MathOverflow)?;
        *slot = Milestone {
            amount: input.amount,
            submit_by: input.submit_by,
            review_by: input.review_by,
            ..Milestone::default()
        };
    }
    require!(total <= MAX_CONTRACT_AMOUNT, NedError::AmountTooLarge);
    check_work_window(&slots[..milestones.len()], now)?;

    // State
    let mut title_bytes = [0u8; 32];
    title_bytes[..title.len()].copy_from_slice(title.as_bytes());

    let fund = &mut ctx.accounts.fund;
    fund.version = ACCOUNT_VERSION;
    fund.kind = FundKind::Milestone;
    fund.state = FundState::Created;
    fund.payout_kind = PayoutKind::Unset;
    fund.client = client;
    fund.freelancer = freelancer;
    fund.creator = client;
    fund.rent_payer = ctx.accounts.payer.key();
    fund.payout_destination = Pubkey::default();
    fund.mint = ctx.accounts.mint.key();
    fund.fund_id = fund_id;
    fund.created_at = now;
    fund.total = total;
    fund.released = 0;
    fund.refunded = 0;
    fund.milestone_count = milestones.len() as u8;
    fund.milestones = slots;
    fund.cancel_proposer = Pubkey::default();
    fund.cancel_freelancer_amount = 0;
    fund.title = title_bytes;
    fund.bump = ctx.bumps.fund;
    fund.vault_bump = ctx.bumps.vault;
    fund.payout_reference = [0u8; 32];
    fund._reserved = [0u8; 32];

    emit!(FundCreated {
        fund: fund.key(),
        client,
        freelancer,
        total,
        milestone_count: fund.milestone_count,
    });
    Ok(())
}

#[derive(Accounts)]
#[instruction(fund_id: u64)]
pub struct CreateFund<'info> {
    pub client: Signer<'info>,

    /// Pays the rent of the fund and the vault (may be the client)
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = SharedFund::SPACE,
        seeds = [FUND_SEED, client.key().as_ref(), &fund_id.to_le_bytes()],
        bump
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    #[account(
        init,
        payer = payer,
        seeds = [VAULT_SEED, fund.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = fund,
        token::token_program = token_program
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(address = USDC_MINT @ NedError::InvalidMint)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
