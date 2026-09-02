import { Buffer } from 'buffer';
(globalThis as any).Buffer = Buffer;
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getConnection,
  getProgram,
  deriveUserProfilePda,
  AnchorWallet,
  PROGRAM_ID,
} from '../src/utils/anchorClient';

async function main() {
  console.log('\n======================================================');
  console.log('🚀 [ON-CHAIN TEST] GỬI LỆNH INITIALIZE_PROFILE LÊN DEVNET');
  console.log('======================================================\n');

  const connection = getConnection();
  console.log(`📡 RPC Endpoint: ${connection.rpcEndpoint}`);
  console.log(`🔑 Program ID:   ${PROGRAM_ID.toBase58()}`);

  // 1. Đọc ví tài trợ (funder)
  const funderKeyBytes = JSON.parse(
    fs.readFileSync('/home/tdat1/.config/solana/id.json', 'utf-8')
  );
  const funderKeypair = Keypair.fromSecretKey(Uint8Array.from(funderKeyBytes));
  console.log(`💰 Funder Wallet: ${funderKeypair.publicKey.toBase58()}`);

  // 2. Tạo một user mới ngẫu nhiên để test initialize
  const testUser = Keypair.generate();
  console.log(`👤 Test User Wallet: ${testUser.publicKey.toBase58()}`);

  // 3. Chuyển 0.02 SOL từ Funder sang Test User để trả phí khởi tạo PDA
  console.log('\n💸 Đang chuyển 0.02 SOL làm phí rent PDA...');
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: funderKeypair.publicKey,
      toPubkey: testUser.publicKey,
      lamports: 0.02 * LAMPORTS_PER_SOL,
    })
  );
  const fundSig = await sendAndConfirmTransaction(connection, fundTx, [funderKeypair]);
  console.log(`   ↳ Fund Tx Hash: https://explorer.solana.com/tx/${fundSig}?cluster=devnet`);

  // 4. Tạo AnchorWallet cho Test User
  const userWallet: AnchorWallet = {
    publicKey: testUser.publicKey,
    signTransaction: async (tx) => {
      if ('partialSign' in tx) {
        tx.partialSign(testUser);
      }
      return tx;
    },
    signAllTransactions: async (txs) => {
      for (const tx of txs) {
        if ('partialSign' in tx) {
          tx.partialSign(testUser);
        }
      }
      return txs;
    },
  };

  // 5. Tính PDA
  const [pda, bump] = deriveUserProfilePda(testUser.publicKey);
  console.log(`\n🏛️  UserProfile PDA: ${pda.toBase58()} (Bump: ${bump})`);

  // 6. Gửi lệnh initializeProfile("VND")
  console.log('\n⚡ Đang gọi Smart Contract: initializeProfile("VND")...');
  const program = getProgram(userWallet);

  const txHash = await program.methods
    .initializeProfile('VND')
    .accounts({
      userProfile: pda,
      signer: testUser.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([testUser])
    .rpc();

  console.log(`\n🎉 GIAO DỊCH THÀNH CÔNG!`);
  console.log(`   ↳ Tx Signature: ${txHash}`);
  console.log(`   ↳ Solana Explorer: https://explorer.solana.com/tx/${txHash}?cluster=devnet`);

  // 7. Đọc lại dữ liệu on-chain sau khi khởi tạo
  console.log('\n🔍 Đang fetch dữ liệu PDA on-chain...');
  const profileAccount = await program.account.userProfile.fetch(pda);
  console.log('   ↳ Owner:       ', profileAccount.owner.toBase58());
  console.log('   ↳ Active Fiat: ', profileAccount.activeFiat);

  console.log('\n======================================================');
  console.log('✅ HOÀN TẤT KIỂM THỬ: KHỞI TẠO HỒ SƠ 100% THÀNH CÔNG!');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('\n❌ LỖI:', err);
  process.exit(1);
});
