use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

#[test]
fn test_initialize_profile() {
    let program_id = ned_program::id();
    let payer = Keypair::new();
    let (profile_pda, _bump) = Pubkey::find_program_address(
        &[b"profile", payer.pubkey().as_ref()],
        &program_id,
    );
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/ned_program.so"
    ));
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    let instruction = Instruction::new_with_bytes(
        program_id,
        &ned_program::instruction::InitializeProfile {
            default_fiat: "VND".to_string(),
        }
        .data(),
        ned_program::accounts::InitializeProfile {
            user_profile: profile_pda,
            signer: payer.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[instruction], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer]).unwrap();

    let res = svm.send_transaction(tx);
    assert!(res.is_ok());

    let profile_account = svm.get_account(&profile_pda).unwrap();
    let mut data: &[u8] = &profile_account.data;
    let profile_state = ned_program::UserProfile::try_deserialize(&mut data).unwrap();
    assert_eq!(profile_state.owner, payer.pubkey());
    assert_eq!(profile_state.active_fiat, "VND");
}
