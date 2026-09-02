import 'dotenv/config';
import { Keypair, PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  getConnection,
  getProgram,
  PROGRAM_ID,
  ReadOnlyWallet,
} from '../src/utils/anchorClient';

const USDC_DEVNET_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): TransactionInstruction {
  const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.alloc(0),
  });
}

async function testTransferInstruction() {
  console.log('\n======================================================');
  console.log('🚀 [SIMULATION TEST] KIỂM THỬ LỆNH TRANSFER_STABLECOIN CPI');
  console.log('======================================================\n');

  const connection = getConnection();
  console.log(`📡 RPC Endpoint:     ${connection.rpcEndpoint}`);
  console.log(`🔑 Program ID:       ${PROGRAM_ID.toBase58()}`);
  console.log(`💵 USDC Mint:        ${USDC_DEVNET_MINT.toBase58()}`);

  const sender = Keypair.generate();
  const receiver = Keypair.generate();
  console.log(`👤 Người gửi:        ${sender.publicKey.toBase58()}`);
  console.log(`🎯 Người nhận:       ${receiver.publicKey.toBase58()}`);

  // 1. Tính toán ATA
  const senderAta = getAssociatedTokenAddress(USDC_DEVNET_MINT, sender.publicKey);
  const receiverAta = getAssociatedTokenAddress(USDC_DEVNET_MINT, receiver.publicKey);
  console.log(`\n🏛️  Sender ATA:       ${senderAta.toBase58()}`);
  console.log(`🏛️  Receiver ATA:     ${receiverAta.toBase58()}`);

  // 2. Tạo Program Client
  const wallet = new ReadOnlyWallet(sender.publicKey);
  const program = getProgram(wallet);

  // 3. Số lượng chuyển (Ví dụ 12.5 USDC = 12_500_000 units)
  const amountUsdc = 12.5;
  const rawAmount = Math.round(amountUsdc * 1_000_000);
  const amountBn = new anchor.BN(rawAmount);

  console.log(`\n⚡ Chuẩn bị lệnh CPI transferStablecoin (${amountUsdc} USDC = ${rawAmount} raw units)...`);

  const createAtaIx = createAssociatedTokenAccountInstruction(
    sender.publicKey,
    receiverAta,
    receiver.publicKey,
    USDC_DEVNET_MINT
  );

  const txBuilder = program.methods
    .transferStablecoin(amountBn)
    .accounts({
      fromTokenAccount: senderAta,
      toTokenAccount: receiverAta,
      mint: USDC_DEVNET_MINT,
      signer: sender.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([createAtaIx]);

  const instruction = await txBuilder.instruction();

  console.log('\n✅ CẤU TRÚC INSTRUCTION CHUYỂN TOKEN CPI CHUẨN:');
  console.log(`   ↳ Program ID:         ${instruction.programId.toBase58()}`);
  console.log(`   ↳ Instruction Data:   ${instruction.data.length} bytes`);
  console.log(`   ↳ Số lượng Accounts:  ${instruction.keys.length}`);
  console.log('   ↳ Danh sách Accounts:');
  instruction.keys.forEach((k, idx) => {
    console.log(`      [${idx + 1}] ${k.pubkey.toBase58()} (isSigner: ${k.isSigner}, isWritable: ${k.isWritable})`);
  });

  console.log('\n======================================================');
  console.log('✅ HOÀN TẤT KIỂM THỬ TRANSFER_STABLECOIN THÀNH CÔNG!');
  console.log('======================================================\n');
}

testTransferInstruction().catch((err) => {
  console.error('\n❌ LỖI:', err);
  process.exit(1);
});
