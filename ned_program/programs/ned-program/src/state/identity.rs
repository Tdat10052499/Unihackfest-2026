use anchor_lang::prelude::*;

// =============================================================================
// STATE ACCOUNTS
// =============================================================================

/// [b"name", username] → wallet that owns the username
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

/// [b"reverse", wallet] → public profile of the wallet (returning user = has a ReverseRecord)
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

/// [b"phone_v1", scrypt(phone)] → wallet that linked the phone number (not OTP-verified)
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
