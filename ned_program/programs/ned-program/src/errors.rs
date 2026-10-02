use anchor_lang::prelude::*;

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
