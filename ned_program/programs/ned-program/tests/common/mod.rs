//! Shared helpers for the LiteSVM tests (identity, milestone).
//! Build first: `anchor build` (reads target/deploy/ned_program.so).
#![allow(dead_code)]

use anchor_lang::prelude::{Clock, Pubkey};
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::AccountDeserialize;
use litesvm::types::TransactionMetadata;
use litesvm::LiteSVM;
use ned_program::{NAME_SEED, PHONE_SEED, REVERSE_SEED};
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_transaction::Transaction;

pub const PROGRAM_SO: &[u8] = include_bytes!("../../../../target/deploy/ned_program.so");
pub const SYSTEM_PROGRAM_ID: Pubkey = anchor_lang::solana_program::system_program::ID;
pub const TOKEN_PROGRAM_ID: Pubkey = Pubkey::from_str_const("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
pub const ATA_PROGRAM_ID: Pubkey = Pubkey::from_str_const("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
/// Circle devnet USDC (program-spec 2: `USDC_MINT`), 6 decimals
pub const USDC_MINT: Pubkey = Pubkey::from_str_const("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
pub const USDC_DECIMALS: u8 = 6;

// -----------------------------------------------------------------------------
// SVM, users, transactions
// -----------------------------------------------------------------------------

pub fn setup() -> LiteSVM {
    let mut svm = LiteSVM::new();
    svm.add_program(ned_program::ID, PROGRAM_SO).expect("load program");
    svm
}

pub fn new_user(svm: &mut LiteSVM) -> Keypair {
    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), 10_000_000_000).expect("airdrop");
    user
}

/// Sends several instructions in one transaction; `payer` pays the fee, `extra_signers` also sign.
/// Err holds the whole log so Anchor error names can be matched.
pub fn send_signed(
    svm: &mut LiteSVM,
    ixs: &[Instruction],
    payer: &Keypair,
    extra_signers: &[&Keypair],
) -> Result<TransactionMetadata, String> {
    svm.expire_blockhash();
    let msg = Message::new(ixs, Some(&payer.pubkey()));
    let mut signers: Vec<&Keypair> = vec![payer];
    signers.extend_from_slice(extra_signers);
    let tx = Transaction::new(&signers, msg, svm.latest_blockhash());
    svm.send_transaction(tx).map_err(|e| format!("{:?}\n{}", e.err, e.meta.logs.join("\n")))
}

/// Sends 1 instruction; Err holds the whole log so Anchor error names can be matched
pub fn send(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair) -> Result<(), String> {
    send_signed(svm, &[ix], payer, &[]).map(|_| ())
}

pub fn assert_err<T>(result: Result<T, String>, expected: &str) {
    match result {
        Ok(_) => panic!("expected error {expected}, but transaction succeeded"),
        Err(logs) => assert!(logs.contains(expected), "expected {expected}, got:\n{logs}"),
    }
}

/// Prints and returns the compute units of a successful transaction (CU table for the deck)
pub fn cu(label: &str, meta: &TransactionMetadata) -> u64 {
    println!("CU {label}: {}", meta.compute_units_consumed);
    meta.compute_units_consumed
}

/// Sets the chain time (Clock::unix_timestamp) for the deadline tests
pub fn set_clock(svm: &mut LiteSVM, unix_ts: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = unix_ts;
    svm.set_sysvar::<Clock>(&clock);
}

pub fn read<T: AccountDeserialize>(svm: &LiteSVM, address: &Pubkey) -> Option<T> {
    let account = svm.get_account(address)?;
    if account.data.is_empty() {
        return None;
    }
    T::try_deserialize(&mut account.data.as_slice()).ok()
}

// -----------------------------------------------------------------------------
// Identity PDAs
// -----------------------------------------------------------------------------

pub fn name_pda(username: &str) -> Pubkey {
    Pubkey::find_program_address(&[NAME_SEED, username.as_bytes()], &ned_program::ID).0
}
pub fn reverse_pda(wallet: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[REVERSE_SEED, wallet.as_ref()], &ned_program::ID).0
}
pub fn phone_pda(phone_key: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[PHONE_SEED, phone_key.as_ref()], &ned_program::ID).0
}

// -----------------------------------------------------------------------------
// SPL Token accounts (raw layout, owner = Token program)
// -----------------------------------------------------------------------------

/// Mint SPL Token (82 byte): mint_authority COption, supply, decimals, is_initialized, freeze_authority COption
pub fn mint_data(authority: &Pubkey, supply: u64, decimals: u8) -> Vec<u8> {
    let mut d = Vec::with_capacity(82);
    d.extend_from_slice(&1u32.to_le_bytes());
    d.extend_from_slice(authority.as_ref());
    d.extend_from_slice(&supply.to_le_bytes());
    d.push(decimals);
    d.push(1);
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&[0u8; 32]);
    d
}

/// Token account SPL (165 byte): mint, owner, amount, delegate, state=Initialized, is_native, delegated_amount, close_authority
pub fn token_account_data(mint: &Pubkey, owner: &Pubkey, amount: u64) -> Vec<u8> {
    let mut d = Vec::with_capacity(165);
    d.extend_from_slice(mint.as_ref());
    d.extend_from_slice(owner.as_ref());
    d.extend_from_slice(&amount.to_le_bytes());
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&[0u8; 32]);
    d.push(1);
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&0u64.to_le_bytes());
    d.extend_from_slice(&0u64.to_le_bytes());
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&[0u8; 32]);
    d
}

pub fn put_token_program_account(svm: &mut LiteSVM, address: Pubkey, data: Vec<u8>) {
    let lamports = svm.minimum_balance_for_rent_exemption(data.len());
    svm.set_account(
        address,
        solana_account::Account { lamports, data, owner: TOKEN_PROGRAM_ID, executable: false, rent_epoch: 0 },
    )
    .unwrap();
}

pub fn token_amount(svm: &LiteSVM, address: &Pubkey) -> u64 {
    let data = svm.get_account(address).unwrap().data;
    u64::from_le_bytes(data[64..72].try_into().unwrap())
}

/// Puts the devnet USDC mint at its fixed address (the program pins `USDC_MINT`); the authority does not matter since tests set balances directly
pub fn put_usdc_mint(svm: &mut LiteSVM) -> Pubkey {
    put_token_program_account(svm, USDC_MINT, mint_data(&Pubkey::new_unique(), 1_000_000_000_000, USDC_DECIMALS));
    USDC_MINT
}

/// ATA address: PDA [owner, Token program, mint] of the Associated Token program
pub fn ata(owner: &Pubkey, mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[owner.as_ref(), TOKEN_PROGRAM_ID.as_ref(), mint.as_ref()], &ATA_PROGRAM_ID).0
}

/// Puts a token account at the ATA of `owner` with `amount`; returns the ATA address
pub fn put_token_account(svm: &mut LiteSVM, owner: &Pubkey, mint: &Pubkey, amount: u64) -> Pubkey {
    let address = ata(owner, mint);
    put_token_program_account(svm, address, token_account_data(mint, owner, amount));
    address
}
