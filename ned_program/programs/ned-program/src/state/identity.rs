use anchor_lang::prelude::*;

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
