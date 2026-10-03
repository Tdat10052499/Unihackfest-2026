use anchor_lang::prelude::*;

use super::common::*;
use crate::constants::*;
use crate::errors::NedError;
use crate::events::FundAccepted;
use crate::state::*;

pub fn accept_handler(
    ctx: Context<Accept>,
    payout_kind: PayoutKind,
    payout_destination: Pubkey,
    payout_reference: [u8; 32],
    expected_brief_hash: [u8; 32],
) -> Result<()> {
    let fund = &mut ctx.accounts.fund;
    let now = Clock::get()?.unix_timestamp;

    // Validate
    require_state(fund, FundState::Created)?;
    // The freelancer agrees to the brief they read (v1.1)
    require!(expected_brief_hash == fund.brief_hash, NedError::BriefMismatch);
    check_work_window(used(fund), now)?;
    let reference_is_zero = payout_reference.iter().all(|b| *b == 0);
    match payout_kind {
        PayoutKind::Unset => return err!(NedError::InvalidPayoutKind),
        PayoutKind::OwnWallet => {
            require!(payout_destination == fund.freelancer, NedError::InvalidPayoutDestination);
            require!(reference_is_zero, NedError::InvalidPayoutReference);
        }
        PayoutKind::PayoutPartner => {
            require!(PAYOUT_PARTNERS.contains(&payout_destination), NedError::PayoutPartnerNotAllowed);
            require!(!reference_is_zero, NedError::InvalidPayoutReference);
        }
    }

    // State: the destination is fixed from here on (rule 1.2)
    fund.payout_kind = payout_kind;
    fund.payout_destination = payout_destination;
    fund.payout_reference = payout_reference;
    fund.state = FundState::Accepted;

    emit!(FundAccepted { fund: fund.key(), payout_kind, payout_destination, payout_reference });
    Ok(())
}

#[derive(Accounts)]
pub struct Accept<'info> {
    #[account(
        mut,
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump,
        has_one = freelancer
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    pub freelancer: Signer<'info>,
}
