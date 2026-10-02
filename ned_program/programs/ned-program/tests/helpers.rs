//! Self-checks for the shared test helpers in tests/common (used by the milestone tests).

mod common;

use anchor_lang::prelude::{Clock, Pubkey};
use common::*;

#[test]
fn ata_matches_a_devnet_usdc_account() {
    // Read from devnet on 2 Oct 2026 (getTokenAccountsByOwner, mint = devnet USDC)
    let owner = Pubkey::from_str_const("9PZwK7pZmZnqfq1D5Xm9JvmoFQbPSjCoxj4AHiVLrhkW");
    let expected = Pubkey::from_str_const("xxhShY2iMXU2LY4f5sJ2cuQCZqZD4fgUdoPkXGVsjMM");
    assert_eq!(ata(&owner, &USDC_MINT), expected);
}

#[test]
fn usdc_mint_and_token_account_are_placed() {
    let mut svm = setup();
    let mint = put_usdc_mint(&mut svm);
    let account = svm.get_account(&mint).unwrap();
    assert_eq!(account.owner, TOKEN_PROGRAM_ID);
    assert_eq!(account.data[44], USDC_DECIMALS);

    let owner = Pubkey::new_unique();
    let address = put_token_account(&mut svm, &owner, &mint, 20_000_000);
    assert_eq!(address, ata(&owner, &mint));
    assert_eq!(token_amount(&svm, &address), 20_000_000);
}

#[test]
fn set_clock_moves_chain_time() {
    let mut svm = setup();
    set_clock(&mut svm, 1_759_400_000);
    assert_eq!(svm.get_sysvar::<Clock>().unix_timestamp, 1_759_400_000);
    set_clock(&mut svm, 1_759_400_061);
    assert_eq!(svm.get_sysvar::<Clock>().unix_timestamp, 1_759_400_061);
}

#[test]
fn send_signed_adds_extra_signers_and_reports_cu() {
    use anchor_lang::solana_program::system_instruction;
    use solana_signer::Signer;
    let mut svm = setup();
    let payer = new_user(&mut svm);
    let other = new_user(&mut svm);
    let to = Pubkey::new_unique();
    // `other` moves its own lamports, so it must sign in addition to the fee payer
    // (without it, Transaction::new panics on the missing signature)
    let ix = system_instruction::transfer(&other.pubkey(), &to, 1_000_000);
    let meta = send_signed(&mut svm, &[ix], &payer, &[&other]).unwrap();
    assert!(cu("system transfer", &meta) > 0);
    assert_eq!(svm.get_balance(&to), Some(1_000_000));
}
