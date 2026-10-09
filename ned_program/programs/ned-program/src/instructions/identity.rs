use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Allocate, Assign, CreateAccount, Transfer};

use crate::constants::*;
use crate::errors::NedError;
use crate::events::*;
use crate::state::*;

// =============================================================================
// HANDLERS (docs on the #[program] entry points in lib.rs)
// =============================================================================

pub fn create_profile_handler(ctx: Context<CreateProfile>, username: String) -> Result<()> {
    let wallet = ctx.accounts.signer.key();
    let now = Clock::get()?.unix_timestamp;

    create_pda(
        &ctx.accounts.signer,
        &ctx.accounts.name_record,
        &ctx.accounts.system_program,
        NameRecord::SPACE,
        &[NAME_SEED, username.as_bytes(), &[ctx.bumps.name_record]],
    )?;
    write_account(
        &ctx.accounts.name_record,
        &NameRecord { wallet, created_at: now, bump: ctx.bumps.name_record },
    )?;

    create_pda(
        &ctx.accounts.signer,
        &ctx.accounts.reverse_record,
        &ctx.accounts.system_program,
        ReverseRecord::SPACE,
        &[REVERSE_SEED, wallet.as_ref(), &[ctx.bumps.reverse_record]],
    )?;
    write_account(
        &ctx.accounts.reverse_record,
        &ReverseRecord {
            username: username.clone(),
            has_phone: false,
            created_at: now,
            bump: ctx.bumps.reverse_record,
        },
    )?;

    emit!(ProfileCreated { wallet, username });
    Ok(())
}

pub fn link_phone_handler(ctx: Context<LinkPhone>, phone_key: [u8; 32]) -> Result<()> {
    let wallet = ctx.accounts.signer.key();

    create_pda(
        &ctx.accounts.signer,
        &ctx.accounts.phone_record,
        &ctx.accounts.system_program,
        PhoneRecord::SPACE,
        &[PHONE_SEED, phone_key.as_ref(), &[ctx.bumps.phone_record]],
    )?;
    write_account(
        &ctx.accounts.phone_record,
        &PhoneRecord {
            wallet,
            created_at: Clock::get()?.unix_timestamp,
            bump: ctx.bumps.phone_record,
        },
    )?;

    ctx.accounts.reverse_record.has_phone = true;

    emit!(PhoneLinked { wallet, phone_record: ctx.accounts.phone_record.key() });
    Ok(())
}

pub fn unlink_phone_handler(ctx: Context<UnlinkPhone>) -> Result<()> {
    ctx.accounts.reverse_record.has_phone = false;

    emit!(PhoneUnlinked {
        wallet: ctx.accounts.signer.key(),
        phone_record: ctx.accounts.phone_record.key(),
    });
    Ok(())
}

pub fn update_username_handler(ctx: Context<UpdateUsername>, new_username: String) -> Result<()> {
    let wallet = ctx.accounts.signer.key();
    let old_username = ctx.accounts.reverse_record.username.clone();

    create_pda(
        &ctx.accounts.signer,
        &ctx.accounts.new_name_record,
        &ctx.accounts.system_program,
        NameRecord::SPACE,
        &[NAME_SEED, new_username.as_bytes(), &[ctx.bumps.new_name_record]],
    )?;
    write_account(
        &ctx.accounts.new_name_record,
        &NameRecord {
            wallet,
            created_at: Clock::get()?.unix_timestamp,
            bump: ctx.bumps.new_name_record,
        },
    )?;

    ctx.accounts.reverse_record.username = new_username.clone();

    emit!(UsernameUpdated { wallet, old_username, new_username });
    Ok(())
}

// =============================================================================
// HELPERS
// =============================================================================

/// Valid username: 3–20 characters, only [a-z0-9_]
pub fn is_valid_username(username: &str) -> bool {
    let len = username.len();
    (USERNAME_MIN_LEN..=USERNAME_MAX_LEN).contains(&len)
        && username
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
}

/// Creates a PDA owned by this program; the signer pays the rent. Also handles a PDA that already received lamports
/// (like Anchor's `init`), so nobody can block a username / phone number by sending SOL to the address.
fn create_pda<'info>(
    payer: &Signer<'info>,
    target: &UncheckedAccount<'info>,
    system_program: &Program<'info, System>,
    space: usize,
    seeds: &[&[u8]],
) -> Result<()> {
    let rent = Rent::get()?.minimum_balance(space);
    let signer_seeds: &[&[&[u8]]] = &[seeds];
    let system_program_id = system_program.key();

    if target.lamports() == 0 {
        system_program::create_account(
            CpiContext::new_with_signer(
                system_program_id,
                CreateAccount { from: payer.to_account_info(), to: target.to_account_info() },
                signer_seeds,
            ),
            rent,
            space as u64,
            &crate::ID,
        )?;
    } else {
        let top_up = rent.saturating_sub(target.lamports());
        if top_up > 0 {
            system_program::transfer(
                CpiContext::new(
                    system_program_id,
                    Transfer { from: payer.to_account_info(), to: target.to_account_info() },
                ),
                top_up,
            )?;
        }
        system_program::allocate(
            CpiContext::new_with_signer(
                system_program_id,
                Allocate { account_to_allocate: target.to_account_info() },
                signer_seeds,
            ),
            space as u64,
        )?;
        system_program::assign(
            CpiContext::new_with_signer(
                system_program_id,
                Assign { account_to_assign: target.to_account_info() },
                signer_seeds,
            ),
            &crate::ID,
        )?;
    }
    Ok(())
}

/// Writes the discriminator + Borsh data into the account just created
fn write_account<T: AccountSerialize>(target: &UncheckedAccount, value: &T) -> Result<()> {
    let mut data = target.try_borrow_mut_data()?;
    value.try_serialize(&mut &mut data[..])
}

// =============================================================================
// ACCOUNTS VALIDATION CONTEXTS
// Constraints run in declaration order: check the username on `signer` before deriving the PDA from it.
// =============================================================================

#[derive(Accounts)]
#[instruction(username: String)]
pub struct CreateProfile<'info> {
    #[account(mut, constraint = is_valid_username(&username) @ NedError::InvalidUsername)]
    pub signer: Signer<'info>,

    /// CHECK: PDA [b"name", username] — must be free; created in the handler with create_pda
    #[account(
        mut,
        seeds = [NAME_SEED, username.as_bytes()],
        bump,
        constraint = name_record.data_is_empty() @ NedError::UsernameTaken
    )]
    pub name_record: UncheckedAccount<'info>,

    /// CHECK: PDA [b"reverse", signer] — must be free (one profile per wallet)
    #[account(
        mut,
        seeds = [REVERSE_SEED, signer.key().as_ref()],
        bump,
        constraint = reverse_record.data_is_empty() @ NedError::ProfileAlreadyExists
    )]
    pub reverse_record: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(phone_key: [u8; 32])]
pub struct LinkPhone<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [REVERSE_SEED, signer.key().as_ref()],
        bump = reverse_record.bump,
        constraint = !reverse_record.has_phone @ NedError::PhoneAlreadyLinked
    )]
    pub reverse_record: Account<'info, ReverseRecord>,

    /// CHECK: PDA [b"phone_v1", phone_key] — must be free (1 phone number ↔ 1 account)
    #[account(
        mut,
        seeds = [PHONE_SEED, phone_key.as_ref()],
        bump,
        constraint = phone_record.data_is_empty() @ NedError::PhoneTaken
    )]
    pub phone_record: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnlinkPhone<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [REVERSE_SEED, signer.key().as_ref()],
        bump = reverse_record.bump
    )]
    pub reverse_record: Account<'info, ReverseRecord>,

    /// The signer's own PhoneRecord (Account<> checks owner = program + discriminator)
    #[account(
        mut,
        close = signer,
        constraint = phone_record.wallet == signer.key() @ NedError::NotPhoneOwner
    )]
    pub phone_record: Account<'info, PhoneRecord>,
}

#[derive(Accounts)]
#[instruction(new_username: String)]
pub struct UpdateUsername<'info> {
    #[account(mut, constraint = is_valid_username(&new_username) @ NedError::InvalidUsername)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [REVERSE_SEED, signer.key().as_ref()],
        bump = reverse_record.bump,
        constraint = reverse_record.username != new_username @ NedError::SameUsername
    )]
    pub reverse_record: Account<'info, ReverseRecord>,

    /// Current NameRecord — closed, rent refunded to the signer
    #[account(
        mut,
        close = signer,
        seeds = [NAME_SEED, reverse_record.username.as_bytes()],
        bump = old_name_record.bump,
        constraint = old_name_record.wallet == signer.key() @ NedError::NotNameOwner
    )]
    pub old_name_record: Account<'info, NameRecord>,

    /// CHECK: PDA [b"name", new_username] — must be free; created in the handler with create_pda
    #[account(
        mut,
        seeds = [NAME_SEED, new_username.as_bytes()],
        bump,
        constraint = new_name_record.data_is_empty() @ NedError::UsernameTaken
    )]
    pub new_name_record: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
