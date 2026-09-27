use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Allocate, Assign, CreateAccount, Transfer};
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

declare_id!("8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh");

/// Seeds của identity on-chain (Phương án C)
pub const NAME_SEED: &[u8] = b"name";
pub const REVERSE_SEED: &[u8] = b"reverse";
pub const PHONE_SEED: &[u8] = b"phone_v1";

pub const USERNAME_MIN_LEN: usize = 3;
pub const USERNAME_MAX_LEN: usize = 20;

#[program]
pub mod ned_program {
    use super::*;

    // =========================================================================
    // 1. IDENTITY: username công khai + SĐT tuỳ chọn (chỉ lưu phone_key = scrypt(SĐT))
    // =========================================================================

    /// Tạo hồ sơ: NameRecord [b"name", username] + ReverseRecord [b"reverse", wallet]
    pub fn create_profile(ctx: Context<CreateProfile>, username: String) -> Result<()> {
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

    /// Liên kết SĐT: PhoneRecord [b"phone_v1", phone_key]. phone_key = scrypt(SĐT E.164) tính trong app —
    /// program không bao giờ nhận hay lưu SĐT dạng rõ.
    pub fn link_phone(ctx: Context<LinkPhone>, phone_key: [u8; 32]) -> Result<()> {
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

    /// Huỷ liên kết SĐT: đóng PhoneRecord của chính mình (hoàn rent về signer)
    pub fn unlink_phone(ctx: Context<UnlinkPhone>) -> Result<()> {
        ctx.accounts.reverse_record.has_phone = false;

        emit!(PhoneUnlinked {
            wallet: ctx.accounts.signer.key(),
            phone_record: ctx.accounts.phone_record.key(),
        });
        Ok(())
    }

    /// Đổi username: đóng NameRecord cũ (hoàn rent), tạo NameRecord mới, cập nhật ReverseRecord
    pub fn update_username(ctx: Context<UpdateUsername>, new_username: String) -> Result<()> {
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

    // =========================================================================
    // 2. STABLECOIN TRANSFERS
    // =========================================================================

    /// Chuyển Stablecoin (SPL Token / Token 2022) an toàn qua CPI TransferChecked
    pub fn transfer_stablecoin(ctx: Context<TransferStablecoin>, amount: u64) -> Result<()> {
        require!(amount > 0, NedError::InvalidAmount);

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.from_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.to_token_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        emit!(StablecoinTransferred {
            from: ctx.accounts.signer.key(),
            from_token_account: ctx.accounts.from_token_account.key(),
            to_token_account: ctx.accounts.to_token_account.key(),
            mint: ctx.accounts.mint.key(),
            amount,
            decimals: ctx.accounts.mint.decimals,
        });
        Ok(())
    }
}

// =============================================================================
// HELPERS
// =============================================================================

/// Username hợp lệ: 3–20 ký tự, chỉ [a-z0-9_]
pub fn is_valid_username(username: &str) -> bool {
    let len = username.len();
    (USERNAME_MIN_LEN..=USERNAME_MAX_LEN).contains(&len)
        && username
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
}

/// Tạo PDA thuộc program này, signer trả rent. Xử lý cả trường hợp PDA đã bị gửi sẵn lamports
/// (giống `init` của Anchor) để không ai chặn được một username / SĐT bằng cách chuyển SOL vào địa chỉ.
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

/// Ghi discriminator + dữ liệu Borsh vào account vừa tạo
fn write_account<T: AccountSerialize>(target: &UncheckedAccount, value: &T) -> Result<()> {
    let mut data = target.try_borrow_mut_data()?;
    value.try_serialize(&mut &mut data[..])
}

// =============================================================================
// ACCOUNTS VALIDATION CONTEXTS
// Ràng buộc chạy theo thứ tự khai báo: kiểm tra username trên `signer` trước khi derive PDA từ nó.
// =============================================================================

#[derive(Accounts)]
#[instruction(username: String)]
pub struct CreateProfile<'info> {
    #[account(mut, constraint = is_valid_username(&username) @ NedError::InvalidUsername)]
    pub signer: Signer<'info>,

    /// CHECK: PDA [b"name", username] — phải còn trống, được tạo trong handler bằng create_pda
    #[account(
        mut,
        seeds = [NAME_SEED, username.as_bytes()],
        bump,
        constraint = name_record.data_is_empty() @ NedError::UsernameTaken
    )]
    pub name_record: UncheckedAccount<'info>,

    /// CHECK: PDA [b"reverse", signer] — phải còn trống (mỗi ví một hồ sơ)
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

    /// CHECK: PDA [b"phone_v1", phone_key] — phải còn trống (1 SĐT ↔ 1 tài khoản)
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

    /// PhoneRecord của chính signer (Account<> kiểm tra owner = program + discriminator)
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

    /// NameRecord hiện tại — đóng và hoàn rent về signer
    #[account(
        mut,
        close = signer,
        seeds = [NAME_SEED, reverse_record.username.as_bytes()],
        bump = old_name_record.bump,
        constraint = old_name_record.wallet == signer.key() @ NedError::NotNameOwner
    )]
    pub old_name_record: Account<'info, NameRecord>,

    /// CHECK: PDA [b"name", new_username] — phải còn trống, được tạo trong handler bằng create_pda
    #[account(
        mut,
        seeds = [NAME_SEED, new_username.as_bytes()],
        bump,
        constraint = new_name_record.data_is_empty() @ NedError::UsernameTaken
    )]
    pub new_name_record: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferStablecoin<'info> {
    #[account(
        mut,
        token::mint = mint,
        token::authority = signer,
        token::token_program = token_program
    )]
    pub from_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::token_program = token_program
    )]
    pub to_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

// =============================================================================
// STATE ACCOUNTS
// =============================================================================

/// [b"name", username] → ví sở hữu username
#[account]
#[derive(InitSpace)]
pub struct NameRecord {
    pub wallet: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

impl NameRecord {
    pub const SPACE: usize = 8 + Self::INIT_SPACE;
}

/// [b"reverse", wallet] → hồ sơ công khai của ví (người quay lại = có ReverseRecord)
#[account]
#[derive(InitSpace)]
pub struct ReverseRecord {
    #[max_len(20)]
    pub username: String,
    pub has_phone: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl ReverseRecord {
    pub const SPACE: usize = 8 + Self::INIT_SPACE;
}

/// [b"phone_v1", scrypt(SĐT)] → ví đã liên kết SĐT (chưa xác minh OTP)
#[account]
#[derive(InitSpace)]
pub struct PhoneRecord {
    pub wallet: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

impl PhoneRecord {
    pub const SPACE: usize = 8 + Self::INIT_SPACE;
}

// =============================================================================
// EVENTS
// =============================================================================

#[event]
pub struct ProfileCreated {
    pub wallet: Pubkey,
    pub username: String,
}

#[event]
pub struct PhoneLinked {
    pub wallet: Pubkey,
    pub phone_record: Pubkey,
}

#[event]
pub struct PhoneUnlinked {
    pub wallet: Pubkey,
    pub phone_record: Pubkey,
}

#[event]
pub struct UsernameUpdated {
    pub wallet: Pubkey,
    pub old_username: String,
    pub new_username: String,
}

#[event]
pub struct StablecoinTransferred {
    pub from: Pubkey,
    pub from_token_account: Pubkey,
    pub to_token_account: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub decimals: u8,
}

// =============================================================================
// ERROR CODES
// =============================================================================

#[error_code]
pub enum NedError {
    #[msg("Username must be 3-20 characters: lowercase letters, digits or underscore.")]
    InvalidUsername,
    #[msg("This username is already taken.")]
    UsernameTaken,
    #[msg("This wallet already has a profile.")]
    ProfileAlreadyExists,
    #[msg("The new username is the same as the current one.")]
    SameUsername,
    #[msg("Only the owner of this username can change it.")]
    NotNameOwner,
    #[msg("This phone number is already linked to another N.E.D account.")]
    PhoneTaken,
    #[msg("This wallet already has a linked phone number. Unlink it first.")]
    PhoneAlreadyLinked,
    #[msg("Only the wallet that linked this phone number can unlink it.")]
    NotPhoneOwner,
    #[msg("Token amount must be greater than 0.")]
    InvalidAmount,
}
