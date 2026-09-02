use anchor_lang::prelude::*;

declare_id!("8tTSP75q3ggaxQiZdeC4LShcyjHN5yWJY4NnZeE3JaEi");

#[program]
pub mod ned_program {
    use super::*;

    pub fn initialize_profile(ctx: Context<InitializeProfile>, default_fiat: String) -> Result<()> {
        // Kiểm tra an toàn độ dài chuỗi active_fiat chống buffer overflow
        require!(
            default_fiat.as_bytes().len() <= UserProfile::MAX_FIAT_LEN,
            ErrorCode::FiatCurrencyTooLong
        );

        let profile = &mut ctx.accounts.user_profile;
        profile.owner = ctx.accounts.signer.key();
        profile.active_fiat = default_fiat;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + UserProfile::INIT_SPACE, // Type-safe space calculation qua Anchor InitSpace
        seeds = [b"profile", signer.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub owner: Pubkey,
    #[max_len(10)]
    pub active_fiat: String, // Tối đa 10 bytes (đủ cho "VND", "USD", "EUR", "USDC", v.v.)
}

impl UserProfile {
    pub const MAX_FIAT_LEN: usize = 10;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Chuỗi active_fiat vượt quá độ dài tối đa cho phép (10 ký tự).")]
    FiatCurrencyTooLong,
}
