//! Test identity on-chain (Phương án C) + transfer_stablecoin bằng LiteSVM.
//! Cần build trước: `anchor build` (đọc target/deploy/ned_program.so).

use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use ned_program::{NameRecord, PhoneRecord, ReverseRecord, NAME_SEED, PHONE_SEED, REVERSE_SEED};
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_transaction::Transaction;

use anchor_lang::prelude::Pubkey;
use anchor_lang::solana_program::instruction::Instruction;

const PROGRAM_SO: &[u8] = include_bytes!("../../../target/deploy/ned_program.so");
const SYSTEM_PROGRAM_ID: Pubkey = anchor_lang::solana_program::system_program::ID;
const TOKEN_PROGRAM_ID: Pubkey = Pubkey::from_str_const("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

fn setup() -> LiteSVM {
    let mut svm = LiteSVM::new();
    svm.add_program(ned_program::ID, PROGRAM_SO).expect("load program");
    svm
}

fn new_user(svm: &mut LiteSVM) -> Keypair {
    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), 10_000_000_000).expect("airdrop");
    user
}

/// Gửi 1 instruction; Err chứa toàn bộ log để so khớp tên lỗi Anchor
fn send(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair) -> Result<(), String> {
    svm.expire_blockhash();
    let msg = Message::new(&[ix], Some(&payer.pubkey()));
    let tx = Transaction::new(&[payer], msg, svm.latest_blockhash());
    svm.send_transaction(tx).map(|_| ()).map_err(|e| format!("{:?}\n{}", e.err, e.meta.logs.join("\n")))
}

fn assert_err(result: Result<(), String>, expected: &str) {
    match result {
        Ok(()) => panic!("expected error {expected}, but transaction succeeded"),
        Err(logs) => assert!(logs.contains(expected), "expected {expected}, got:\n{logs}"),
    }
}

fn name_pda(username: &str) -> Pubkey {
    Pubkey::find_program_address(&[NAME_SEED, username.as_bytes()], &ned_program::ID).0
}
fn reverse_pda(wallet: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[REVERSE_SEED, wallet.as_ref()], &ned_program::ID).0
}
fn phone_pda(phone_key: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[PHONE_SEED, phone_key.as_ref()], &ned_program::ID).0
}

fn read<T: AccountDeserialize>(svm: &LiteSVM, address: &Pubkey) -> Option<T> {
    let account = svm.get_account(address)?;
    if account.data.is_empty() {
        return None;
    }
    T::try_deserialize(&mut account.data.as_slice()).ok()
}

fn create_profile_ix(user: &Pubkey, username: &str) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::CreateProfile {
            signer: *user,
            name_record: name_pda(username),
            reverse_record: reverse_pda(user),
            system_program: SYSTEM_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::CreateProfile { username: username.to_string() }.data(),
    }
}

fn link_phone_ix(user: &Pubkey, phone_key: [u8; 32]) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::LinkPhone {
            signer: *user,
            reverse_record: reverse_pda(user),
            phone_record: phone_pda(&phone_key),
            system_program: SYSTEM_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::LinkPhone { phone_key }.data(),
    }
}

fn unlink_phone_ix(user: &Pubkey, phone_record: Pubkey) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::UnlinkPhone {
            signer: *user,
            reverse_record: reverse_pda(user),
            phone_record,
        }
        .to_account_metas(None),
        data: ned_program::instruction::UnlinkPhone {}.data(),
    }
}

fn update_username_ix(user: &Pubkey, old: &str, new: &str) -> Instruction {
    Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::UpdateUsername {
            signer: *user,
            reverse_record: reverse_pda(user),
            old_name_record: name_pda(old),
            new_name_record: name_pda(new),
            system_program: SYSTEM_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::UpdateUsername { new_username: new.to_string() }.data(),
    }
}

// -----------------------------------------------------------------------------
// create_profile
// -----------------------------------------------------------------------------

#[test]
fn create_profile_creates_name_and_reverse() {
    let mut svm = setup();
    let alice = new_user(&mut svm);
    send(&mut svm, create_profile_ix(&alice.pubkey(), "alice_01"), &alice).unwrap();

    let name: NameRecord = read(&svm, &name_pda("alice_01")).unwrap();
    assert_eq!(name.wallet, alice.pubkey());
    let reverse: ReverseRecord = read(&svm, &reverse_pda(&alice.pubkey())).unwrap();
    assert_eq!(reverse.username, "alice_01");
    assert!(!reverse.has_phone);

    // Kích thước + rent thực tế (in ra để ghi vào báo cáo)
    for (label, address) in [("NameRecord", name_pda("alice_01")), ("ReverseRecord", reverse_pda(&alice.pubkey()))] {
        let account = svm.get_account(&address).unwrap();
        println!("{label}: {} bytes, {} lamports", account.data.len(), account.lamports);
        assert_eq!(account.lamports, svm.minimum_balance_for_rent_exemption(account.data.len()));
    }
    assert_eq!(NameRecord::SPACE, 49);
    assert_eq!(ReverseRecord::SPACE, 42);
    assert_eq!(PhoneRecord::SPACE, 49);
}

#[test]
fn duplicate_username_is_rejected() {
    let mut svm = setup();
    let alice = new_user(&mut svm);
    let bob = new_user(&mut svm);
    send(&mut svm, create_profile_ix(&alice.pubkey(), "alice"), &alice).unwrap();
    assert_err(send(&mut svm, create_profile_ix(&bob.pubkey(), "alice"), &bob), "UsernameTaken");
}

#[test]
fn second_profile_for_same_wallet_is_rejected() {
    let mut svm = setup();
    let alice = new_user(&mut svm);
    send(&mut svm, create_profile_ix(&alice.pubkey(), "alice"), &alice).unwrap();
    assert_err(send(&mut svm, create_profile_ix(&alice.pubkey(), "alice2"), &alice), "ProfileAlreadyExists");
}

#[test]
fn invalid_usernames_are_rejected() {
    let mut svm = setup();
    let user = new_user(&mut svm);
    for bad in ["ab", "Alice", "bad-name", "has space", "abcdefghijklmnopqrstu"] {
        assert_err(send(&mut svm, create_profile_ix(&user.pubkey(), bad), &user), "InvalidUsername");
    }
    // Biên hợp lệ: 3 và 20 ký tự
    send(&mut svm, create_profile_ix(&user.pubkey(), "abcdefghijklmnopqrst"), &user).unwrap();
}

#[test]
fn prefunded_name_pda_cannot_block_a_username() {
    let mut svm = setup();
    let alice = new_user(&mut svm);
    // Kẻ phá gửi SOL vào địa chỉ PDA trước để "chiếm chỗ"
    svm.airdrop(&name_pda("grief"), 1_000).unwrap();
    send(&mut svm, create_profile_ix(&alice.pubkey(), "grief"), &alice).unwrap();
    let name: NameRecord = read(&svm, &name_pda("grief")).unwrap();
    assert_eq!(name.wallet, alice.pubkey());
}

// -----------------------------------------------------------------------------
// link_phone / unlink_phone
// -----------------------------------------------------------------------------

#[test]
fn phone_link_unlink_relink_flow() {
    let mut svm = setup();
    let alice = new_user(&mut svm);
    let bob = new_user(&mut svm);
    send(&mut svm, create_profile_ix(&alice.pubkey(), "alice"), &alice).unwrap();
    send(&mut svm, create_profile_ix(&bob.pubkey(), "bob"), &bob).unwrap();

    let key_a = [7u8; 32];
    let key_b = [9u8; 32];

    // Alice liên kết số A
    send(&mut svm, link_phone_ix(&alice.pubkey(), key_a), &alice).unwrap();
    let phone: PhoneRecord = read(&svm, &phone_pda(&key_a)).unwrap();
    assert_eq!(phone.wallet, alice.pubkey());
    let reverse: ReverseRecord = read(&svm, &reverse_pda(&alice.pubkey())).unwrap();
    assert!(reverse.has_phone);
    let phone_account = svm.get_account(&phone_pda(&key_a)).unwrap();
    println!("PhoneRecord: {} bytes, {} lamports", phone_account.data.len(), phone_account.lamports);

    // Bob không lấy được số A
    assert_err(send(&mut svm, link_phone_ix(&bob.pubkey(), key_a), &bob), "PhoneTaken");
    // Alice không liên kết thêm số thứ hai
    assert_err(send(&mut svm, link_phone_ix(&alice.pubkey(), key_b), &alice), "PhoneAlreadyLinked");
    // Bob không huỷ được số của Alice
    assert_err(send(&mut svm, unlink_phone_ix(&bob.pubkey(), phone_pda(&key_a)), &bob), "NotPhoneOwner");

    // Alice huỷ liên kết → account đóng, rent hoàn về Alice
    let before = svm.get_account(&alice.pubkey()).unwrap().lamports;
    send(&mut svm, unlink_phone_ix(&alice.pubkey(), phone_pda(&key_a)), &alice).unwrap();
    let after = svm.get_account(&alice.pubkey()).unwrap().lamports;
    assert!(read::<PhoneRecord>(&svm, &phone_pda(&key_a)).is_none());
    assert_eq!(after, before + phone_account.lamports - 5_000, "rent refunded minus tx fee");
    let reverse: ReverseRecord = read(&svm, &reverse_pda(&alice.pubkey())).unwrap();
    assert!(!reverse.has_phone);

    // Số A giờ trống → Bob liên kết được; Alice liên kết lại số B được
    send(&mut svm, link_phone_ix(&bob.pubkey(), key_a), &bob).unwrap();
    send(&mut svm, link_phone_ix(&alice.pubkey(), key_b), &alice).unwrap();
    let phone: PhoneRecord = read(&svm, &phone_pda(&key_a)).unwrap();
    assert_eq!(phone.wallet, bob.pubkey());
}

#[test]
fn link_phone_requires_a_profile() {
    let mut svm = setup();
    let nobody = new_user(&mut svm);
    assert_err(send(&mut svm, link_phone_ix(&nobody.pubkey(), [1u8; 32]), &nobody), "AccountNotInitialized");
}

// -----------------------------------------------------------------------------
// update_username
// -----------------------------------------------------------------------------

#[test]
fn update_username_frees_old_name() {
    let mut svm = setup();
    let alice = new_user(&mut svm);
    let bob = new_user(&mut svm);
    let carol = new_user(&mut svm);
    send(&mut svm, create_profile_ix(&alice.pubkey(), "alice"), &alice).unwrap();
    send(&mut svm, create_profile_ix(&bob.pubkey(), "bob"), &bob).unwrap();

    send(&mut svm, update_username_ix(&alice.pubkey(), "alice", "alice2"), &alice).unwrap();
    assert!(read::<NameRecord>(&svm, &name_pda("alice")).is_none(), "old name closed");
    let name: NameRecord = read(&svm, &name_pda("alice2")).unwrap();
    assert_eq!(name.wallet, alice.pubkey());
    let reverse: ReverseRecord = read(&svm, &reverse_pda(&alice.pubkey())).unwrap();
    assert_eq!(reverse.username, "alice2");

    // Tên cũ được giải phóng cho người khác
    send(&mut svm, create_profile_ix(&carol.pubkey(), "alice"), &carol).unwrap();

    // Lỗi: trùng tên hiện tại, tên đã có người dùng, tên sai định dạng
    assert_err(send(&mut svm, update_username_ix(&alice.pubkey(), "alice2", "alice2"), &alice), "SameUsername");
    assert_err(send(&mut svm, update_username_ix(&alice.pubkey(), "alice2", "bob"), &alice), "UsernameTaken");
    assert_err(send(&mut svm, update_username_ix(&alice.pubkey(), "alice2", "Bad!"), &alice), "InvalidUsername");
}

#[test]
fn cannot_rename_someone_elses_name() {
    let mut svm = setup();
    let alice = new_user(&mut svm);
    let bob = new_user(&mut svm);
    send(&mut svm, create_profile_ix(&alice.pubkey(), "alice"), &alice).unwrap();
    send(&mut svm, create_profile_ix(&bob.pubkey(), "bob"), &bob).unwrap();
    // Bob truyền NameRecord "alice" làm tên cũ → seeds không khớp ReverseRecord của Bob
    assert_err(send(&mut svm, update_username_ix(&bob.pubkey(), "alice", "bobby"), &bob), "ConstraintSeeds");
    let name: NameRecord = read(&svm, &name_pda("alice")).unwrap();
    assert_eq!(name.wallet, alice.pubkey());
}

// -----------------------------------------------------------------------------
// transfer_stablecoin
// -----------------------------------------------------------------------------

/// Mint SPL Token (82 byte): mint_authority COption, supply, decimals, is_initialized, freeze_authority COption
fn mint_data(authority: &Pubkey, supply: u64, decimals: u8) -> Vec<u8> {
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
fn token_account_data(mint: &Pubkey, owner: &Pubkey, amount: u64) -> Vec<u8> {
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

fn put_token_program_account(svm: &mut LiteSVM, address: Pubkey, data: Vec<u8>) {
    let lamports = svm.minimum_balance_for_rent_exemption(data.len());
    svm.set_account(
        address,
        solana_account::Account { lamports, data, owner: TOKEN_PROGRAM_ID, executable: false, rent_epoch: 0 },
    )
    .unwrap();
}

fn token_amount(svm: &LiteSVM, address: &Pubkey) -> u64 {
    let data = svm.get_account(address).unwrap().data;
    u64::from_le_bytes(data[64..72].try_into().unwrap())
}

#[test]
fn transfer_stablecoin_still_works() {
    let mut svm = setup();
    let alice = new_user(&mut svm);
    let bob = Pubkey::new_unique();
    let mint = Pubkey::new_unique();
    let from = Pubkey::new_unique();
    let to = Pubkey::new_unique();
    put_token_program_account(&mut svm, mint, mint_data(&alice.pubkey(), 5_000_000, 6));
    put_token_program_account(&mut svm, from, token_account_data(&mint, &alice.pubkey(), 5_000_000));
    put_token_program_account(&mut svm, to, token_account_data(&mint, &bob, 0));

    let ix = |amount: u64| Instruction {
        program_id: ned_program::ID,
        accounts: ned_program::accounts::TransferStablecoin {
            from_token_account: from,
            to_token_account: to,
            mint,
            signer: alice.pubkey(),
            token_program: TOKEN_PROGRAM_ID,
        }
        .to_account_metas(None),
        data: ned_program::instruction::TransferStablecoin { amount }.data(),
    };

    send(&mut svm, ix(1_000_000), &alice).unwrap();
    assert_eq!(token_amount(&svm, &from), 4_000_000);
    assert_eq!(token_amount(&svm, &to), 1_000_000);
    assert_err(send(&mut svm, ix(0), &alice), "InvalidAmount");
}
