use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

// Crate-root re-exports: Anchor's #[program] and the tests use these paths
// (NameRecord, PhoneRecord, ReverseRecord, NAME_SEED, ...).
pub use constants::*;
pub use errors::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh");

#[program]
pub mod ned_program {
    use super::*;

    // =========================================================================
    // 1. IDENTITY: username công khai + SĐT tuỳ chọn (chỉ lưu phone_key = scrypt(SĐT))
    // =========================================================================

    /// Tạo hồ sơ: NameRecord [b"name", username] + ReverseRecord [b"reverse", wallet]
    pub fn create_profile(ctx: Context<CreateProfile>, username: String) -> Result<()> {
        create_profile_handler(ctx, username)
    }

    /// Liên kết SĐT: PhoneRecord [b"phone_v1", phone_key]. phone_key = scrypt(SĐT E.164) tính trong app —
    /// program không bao giờ nhận hay lưu SĐT dạng rõ.
    pub fn link_phone(ctx: Context<LinkPhone>, phone_key: [u8; 32]) -> Result<()> {
        link_phone_handler(ctx, phone_key)
    }

    /// Huỷ liên kết SĐT: đóng PhoneRecord của chính mình (hoàn rent về signer)
    pub fn unlink_phone(ctx: Context<UnlinkPhone>) -> Result<()> {
        unlink_phone_handler(ctx)
    }

    /// Đổi username: đóng NameRecord cũ (hoàn rent), tạo NameRecord mới, cập nhật ReverseRecord
    pub fn update_username(ctx: Context<UpdateUsername>, new_username: String) -> Result<()> {
        update_username_handler(ctx, new_username)
    }

    // =========================================================================
    // 2. STABLECOIN TRANSFERS
    // =========================================================================

    /// Chuyển Stablecoin (SPL Token / Token 2022) an toàn qua CPI TransferChecked
    pub fn transfer_stablecoin(ctx: Context<TransferStablecoin>, amount: u64) -> Result<()> {
        transfer_stablecoin_handler(ctx, amount)
    }
}
