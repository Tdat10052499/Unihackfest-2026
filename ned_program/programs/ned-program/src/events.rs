use anchor_lang::prelude::*;

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
