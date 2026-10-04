use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::NedError;
use crate::events::NotePosted;
use crate::state::*;

/// One part of an encrypted note (v1.1, program-spec row 13). `data` is ciphertext made by the app
/// (XChaCha20-Poly1305, key only in the invite link); the program never reads it and changes no state.
/// Brief (kind 0): the client, while the fund is Created, milestone 0.
/// Delivery (kind 1): the freelancer, for a Submitted milestone.
/// Key (kind 2, v1.2): either party, any state, milestone 0 — wraps of the contract key for registered devices.
pub fn post_note_handler(ctx: Context<PostNote>, kind: u8, milestone: u8, part: u8, parts: u8, data: Vec<u8>) -> Result<()> {
    let fund = &ctx.accounts.fund;
    let author = ctx.accounts.author.key();

    // Validate: who may post what, then the size and part rules
    let allowed = match kind {
        NOTE_KIND_BRIEF => author == fund.client && fund.state == FundState::Created && milestone == 0,
        NOTE_KIND_DELIVERY => {
            author == fund.freelancer
                && milestone < fund.milestone_count
                && fund.milestones[milestone as usize].status == MilestoneStatus::Submitted
        }
        NOTE_KIND_KEY => (author == fund.client || author == fund.freelancer) && milestone == 0,
        _ => false,
    };
    require!(allowed, NedError::NoteNotAllowed);
    require!((1..=NOTE_MAX_LEN).contains(&data.len()), NedError::InvalidNote);
    require!(part < parts && parts <= NOTE_MAX_PARTS, NedError::InvalidNote);

    emit!(NotePosted { fund: fund.key(), author, kind, milestone, part, parts, len: data.len() as u16 });
    Ok(())
}

#[derive(Accounts)]
pub struct PostNote<'info> {
    /// Read-only: listed so notes can be found with getSignaturesForAddress(fund)
    #[account(
        seeds = [FUND_SEED, fund.creator.as_ref(), &fund.fund_id.to_le_bytes()],
        bump = fund.bump
    )]
    pub fund: Box<Account<'info, SharedFund>>,

    pub author: Signer<'info>,
}
