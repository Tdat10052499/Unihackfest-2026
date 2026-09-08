use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("8tTSP75q3ggaxQiZdeC4LShcyjHN5yWJY4NnZeE3JaEi");

pub const IDENTITY_SEED: &[u8] = b"identity";

#[program]
pub mod ned_program {
    use super::*;

    /// =========================================================================
    /// 1. MODULE: USER PROFILE
    /// =========================================================================

    /// Khởi tạo hồ sơ người dùng Web3 (UserProfile PDA)
    pub fn initialize_profile(
        ctx: Context<InitializeProfile>,
        default_fiat: String,
    ) -> Result<()> {
        require!(
            default_fiat.as_bytes().len() <= UserProfile::MAX_FIAT_LEN,
            ErrorCode::FiatCurrencyTooLong
        );

        let profile = &mut ctx.accounts.user_profile;
        profile.owner = ctx.accounts.signer.key();
        profile.active_fiat = default_fiat;
        profile.preferred_mint = Pubkey::default();
        profile.bump = ctx.bumps.user_profile;

        emit!(ProfileInitialized {
            owner: profile.owner,
            active_fiat: profile.active_fiat.clone(),
            pda: profile.key(),
        });

        Ok(())
    }

    /// Cập nhật thông tin hồ sơ người dùng (Active Fiat hoặc Preferred Stablecoin Mint)
    pub fn update_profile(
        ctx: Context<UpdateProfile>,
        new_fiat: Option<String>,
        new_mint: Option<Pubkey>,
    ) -> Result<()> {
        let profile = &mut ctx.accounts.user_profile;

        if let Some(fiat) = new_fiat {
            require!(
                fiat.as_bytes().len() <= UserProfile::MAX_FIAT_LEN,
                ErrorCode::FiatCurrencyTooLong
            );
            profile.active_fiat = fiat;
        }

        if let Some(mint) = new_mint {
            profile.preferred_mint = mint;
        }

        emit!(ProfileUpdated {
            owner: profile.owner,
            active_fiat: profile.active_fiat.clone(),
            preferred_mint: profile.preferred_mint,
        });

        Ok(())
    }

    /// =========================================================================
    /// 2. MODULE: STABLECOIN TRANSFERS
    /// =========================================================================

    /// Chuyển Stablecoin (SPL Token / Token 2022) an toàn qua CPI TransferChecked
    pub fn transfer_stablecoin(
        ctx: Context<TransferStablecoin>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

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

    /// =========================================================================
    /// 3. MODULE: N.E.D ON-CHAIN IDENTITY (PDA MAPPING)
    /// =========================================================================

    /// Đăng ký danh tính mới (Username / Số điện thoại)
    pub fn register_identity(
        ctx: Context<RegisterIdentity>,
        _hashed_identifier: [u8; 32],
        identity_type: u8,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity_account;
        identity.wallet = ctx.accounts.target_wallet.key();
        identity.authority = ctx.accounts.authority.key();
        identity.identity_type = identity_type;
        identity.bump = ctx.bumps.identity_account;
        identity.created_at = Clock::get()?.unix_timestamp;

        emit!(IdentityRegistered {
            wallet: identity.wallet,
            authority: identity.authority,
            identity_type,
            pda: identity.key(),
        });

        Ok(())
    }

    /// Cập nhật ví đích (Chỉ authority mới có quyền gọi)
    pub fn update_wallet(
        ctx: Context<UpdateWallet>,
        new_wallet: Pubkey,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity_account;
        let old_wallet = identity.wallet;
        identity.wallet = new_wallet;

        emit!(IdentityWalletUpdated {
            authority: identity.authority,
            old_wallet,
            new_wallet,
            pda: identity.key(),
        });

        Ok(())
    }

    /// Đóng Account và hoàn tiền Rent về lại cho Recipient (Relayer / Sponsor)
    pub fn close_identity(_ctx: Context<CloseIdentity>) -> Result<()> {
        Ok(())
    }
}

// =============================================================================
// ACCOUNTS VALIDATION CONTEXTS
// =============================================================================

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"profile", signer.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        seeds = [b"profile", signer.key().as_ref()],
        bump = user_profile.bump,
        has_one = owner @ ErrorCode::Unauthorized
    )]
    pub user_profile: Account<'info, UserProfile>,

    pub signer: Signer<'info>,
    /// CHECK: Ràng buộc has_one đảm bảo signer phải trùng khớp với owner của profile
    pub owner: UncheckedAccount<'info>,
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

#[derive(Accounts)]
#[instruction(hashed_identifier: [u8; 32], identity_type: u8)]
pub struct RegisterIdentity<'info> {
    #[account(
        init,
        payer = payer,
        space = IdentityAccount::LEN,
        seeds = [IDENTITY_SEED, hashed_identifier.as_ref()],
        bump
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    /// CHECK: Ví đích thực tế nhận tiền (SystemAccount)
    pub target_wallet: SystemAccount<'info>,

    /// Chủ sở hữu định danh (User)
    pub authority: Signer<'info>,

    /// Ví trả phí Gas & Rent (N.E.D Hub Relayer hoặc chính user)
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateWallet<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseIdentity<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized,
        close = recipient
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    pub authority: Signer<'info>,

    /// CHECK: Ví nhận lại tiền Rent đã ký quỹ (Payer/Relayer)
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
}

// =============================================================================
// STATE ACCOUNTS
// =============================================================================

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub owner: Pubkey,
    #[max_len(10)]
    pub active_fiat: String,
    pub preferred_mint: Pubkey,
    pub bump: u8,
}

impl UserProfile {
    pub const MAX_FIAT_LEN: usize = 10;
}

#[account]
pub struct IdentityAccount {
    /// 1. Địa chỉ ví nhận tài sản thực tế (32 bytes)
    pub wallet: Pubkey,
    /// 2. Khóa ủy quyền quản trị định danh (32 bytes)
    pub authority: Pubkey,
    /// 3. Loại định danh: 0: Username, 1: Phone (1 byte)
    pub identity_type: u8,
    /// 4. Canonical Bump seed (1 byte)
    pub bump: u8,
    /// 5. Thời điểm tạo on-chain (8 bytes)
    pub created_at: i64,
}

impl IdentityAccount {
    /// 8 bytes Anchor discriminator + 32 + 32 + 1 + 1 + 8 = 82 bytes
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 8;
}

// =============================================================================
// EVENTS
// =============================================================================

#[event]
pub struct ProfileInitialized {
    pub owner: Pubkey,
    pub active_fiat: String,
    pub pda: Pubkey,
}

#[event]
pub struct ProfileUpdated {
    pub owner: Pubkey,
    pub active_fiat: String,
    pub preferred_mint: Pubkey,
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

#[event]
pub struct IdentityRegistered {
    pub wallet: Pubkey,
    pub authority: Pubkey,
    pub identity_type: u8,
    pub pda: Pubkey,
}

#[event]
pub struct IdentityWalletUpdated {
    pub authority: Pubkey,
    pub old_wallet: Pubkey,
    pub new_wallet: Pubkey,
    pub pda: Pubkey,
}

// =============================================================================
// ERROR CODES
// =============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Chuỗi active_fiat vượt quá độ dài tối đa cho phép (10 ký tự).")]
    FiatCurrencyTooLong,
    #[msg("Số lượng token giao dịch phải lớn hơn 0.")]
    InvalidAmount,
    #[msg("Bạn không có quyền thực hiện hành động này trên hồ sơ hoặc định danh.")]
    Unauthorized,
}
