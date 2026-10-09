/**
 * Checks the on-chain identity (T1.5) on devnet with a local keypair.
 *
 *   pnpm run identity:devnet                       # uses ~/.config/solana/id.json
 *   pnpm run identity:devnet -- --fresh            # temporary wallet, funded with 0.05 SOL from id.json
 *   pnpm run identity:devnet -- --keypair <path> --username alice_01 --phone 0901234567
 *
 * Flow: create_profile (if the wallet has no profile) → read Name + Reverse → link_phone → read Phone
 *        → print the real sizes + rent → unlink_phone (rent refunded).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  buildCreateProfileTx,
  buildLinkPhoneTx,
  buildUnlinkPhoneTx,
  deriveNamePda,
  derivePhonePda,
  deriveReversePda,
  fetchNameRecord,
  fetchPhoneRecord,
  fetchReverseRecord,
  IDENTITY_ERRORS,
  IDENTITY_PROGRAM_ID,
} from '../services/identity/dualPda';
import { getPhoneKey } from '../services/identity/phoneKey';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function loadEnvRpc(): string {
  // Read EXPO_PUBLIC_HELIUS_DEVNET_URL from .env if present (never printed); defaults to the public RPC
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('EXPO_PUBLIC_HELIUS_DEVNET_URL='));
    if (line) return line.split('=').slice(1).join('=').replace(/"/g, '').trim();
  } catch {}
  return 'https://api.devnet.solana.com';
}

function loadKeypair(file: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, 'utf8'))));
}

const explorer = (sig: string) => `https://solscan.io/tx/${sig}?cluster=devnet`;

async function send(connection: Connection, tx: Transaction, signer: Keypair, label: string) {
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [signer], { commitment: 'confirmed' });
    console.log(`✅ ${label}: ${explorer(sig)}`);
    return sig;
  } catch (err: any) {
    const code = /custom program error: 0x([0-9a-f]+)/i.exec(String(err?.message ?? err))?.[1];
    const name = code ? IDENTITY_ERRORS[parseInt(code, 16)] : undefined;
    throw new Error(`${label} failed${name ? ` (${name})` : ''}: ${err?.message ?? err}`);
  }
}

async function describe(connection: Connection, label: string, address: PublicKey) {
  const info = await connection.getAccountInfo(address, 'confirmed');
  if (!info) return console.log(`   ${label}: (none)`);
  console.log(`   ${label}: ${address.toBase58()} — ${info.data.length} bytes, ${info.lamports} lamports (${info.lamports / LAMPORTS_PER_SOL} SOL)`);
}

/** T1.7 fixtures: two fresh profiles, only the first links a phone. Keys remain in memory.
 * Fund 0.004 SOL each; return leftover SOL after profile creation. No mainnet writes. */
async function createRecipients(connection: Connection, funder: Keypair) {
  const report: { username: string; wallet: string; phone: string | null }[] = [];
  for (let i = 0; i < 2; i++) {
    const recipient = Keypair.generate();
    const wallet = recipient.publicKey;
    const username = `t17_${i}_${wallet.toBase58().slice(0, 8).toLowerCase()}`;
    await send(connection, new Transaction().add(SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: wallet, lamports: 4_000_000 })), funder, 'fund test recipient');
    const tx = buildCreateProfileTx(wallet, username);
    let phone: string | null = null;
    if (i === 0) {
      // Synthetic VN-format test number: no OTP, never contact this number.
      phone = arg('phone') ?? `09${Math.floor(10000000 + Math.random() * 89999999)}`;
      const derived = await getPhoneKey(phone);
      if (await fetchPhoneRecord(connection, derived.phoneKey)) throw new Error('Test phone is already linked. Supply another synthetic --phone.');
      phone = derived.e164;
      tx.add(...buildLinkPhoneTx(wallet, derived.phoneKey).instructions);
    }
    await send(connection, tx, recipient, `create recipient @${username}`);
    const reverse = await fetchReverseRecord(connection, wallet);
    const name = await fetchNameRecord(connection, username);
    if (reverse?.username !== username || !name?.wallet.equals(wallet) || reverse.hasPhone !== (phone !== null)) throw new Error('Recipient record verification failed');
    if (phone && !(await fetchPhoneRecord(connection, (await getPhoneKey(phone)).phoneKey))?.wallet.equals(wallet)) throw new Error('Phone record verification failed');
    report.push({ username, wallet: wallet.toBase58(), phone });
    const remaining = await connection.getBalance(wallet, 'confirmed');
    if (remaining > 5_000) await send(connection, new Transaction().add(SystemProgram.transfer({ fromPubkey: wallet, toPubkey: funder.publicKey, lamports: remaining - 5_000 })), recipient, 'return leftover devnet SOL');
  }
  console.log('T1.7 recipient fixtures (public only):', JSON.stringify(report, null, 2));
  console.log('These are receive-only test wallets; ephemeral private keys are not retained.');
}

async function main() {
  const connection = new Connection(loadEnvRpc(), 'confirmed');
  const defaultKeypair = path.join(os.homedir(), '.config', 'solana', 'id.json');
  const funder = loadKeypair(arg('keypair') ?? defaultKeypair);
  if (process.argv.includes('--recipients')) {
    if (await connection.getGenesisHash() !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') throw new Error('Recipient fixtures must run on devnet');
    await createRecipients(connection, funder);
    return;
  }
  let user = funder;

  if (process.argv.includes('--fresh')) {
    user = Keypair.generate();
    await send(
      connection,
      new Transaction().add(SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: user.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL })),
      funder,
      `fund fresh wallet ${user.publicKey.toBase58()} with 0.05 SOL`
    );
  }

  console.log(`Program: ${IDENTITY_PROGRAM_ID.toBase58()}`);
  console.log(`Wallet:  ${user.publicKey.toBase58()} (${(await connection.getBalance(user.publicKey)) / LAMPORTS_PER_SOL} SOL)`);

  // 1. create_profile (if missing)
  let reverse = await fetchReverseRecord(connection, user.publicKey);
  if (!reverse) {
    const username = arg('username') ?? `ned_${user.publicKey.toBase58().slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const owner = await fetchNameRecord(connection, username);
    if (owner) throw new Error(`@${username} is already taken by ${owner.wallet.toBase58()}`);
    await send(connection, buildCreateProfileTx(user.publicKey, username), user, `create_profile @${username}`);
    reverse = await fetchReverseRecord(connection, user.publicKey);
  } else {
    console.log(`ℹ️  Wallet already has a profile: @${reverse.username}`);
  }
  if (!reverse) throw new Error('ReverseRecord not found after create_profile');

  const name = await fetchNameRecord(connection, reverse.username);
  console.log(`\nReverseRecord → @${reverse.username}, has_phone=${reverse.hasPhone}`);
  console.log(`NameRecord @${reverse.username} → ${name?.wallet.toBase58()} (${name?.wallet.equals(user.publicKey) ? 'matches' : 'MISMATCH'})`);

  // 2. link_phone → read back → unlink_phone (rent refunded)
  const rawPhone = arg('phone') ?? `09${Math.floor(10000000 + Math.random() * 89999999)}`;
  const { e164, phoneKey } = await getPhoneKey(rawPhone);
  console.log(`\nPhone ${e164} → phone_key ${Buffer.from(phoneKey).toString('hex').slice(0, 16)}… (plain number never sent on-chain)`);
  if (reverse.hasPhone) {
    console.log('ℹ️  Wallet already has a linked phone — skipping link/unlink');
  } else {
    await send(connection, buildLinkPhoneTx(user.publicKey, phoneKey), user, 'link_phone');
    const phone = await fetchPhoneRecord(connection, phoneKey);
    console.log(`PhoneRecord → ${phone?.wallet.toBase58()} (${phone?.wallet.equals(user.publicKey) ? 'matches' : 'MISMATCH'})`);
  }

  console.log('\nAccount sizes & rent (devnet):');
  await describe(connection, 'NameRecord   ', deriveNamePda(reverse.username));
  await describe(connection, 'ReverseRecord', deriveReversePda(user.publicKey));
  await describe(connection, 'PhoneRecord  ', derivePhonePda(phoneKey));

  if (!reverse.hasPhone) {
    await send(connection, buildUnlinkPhoneTx(user.publicKey, phoneKey), user, 'unlink_phone (rent refunded)');
    const after = await fetchReverseRecord(connection, user.publicKey);
    console.log(`After unlink: has_phone=${after?.hasPhone}, PhoneRecord closed=${!(await fetchPhoneRecord(connection, phoneKey))}`);
  }
}

main().catch((err) => {
  console.error('❌', err.message ?? err);
  process.exit(1);
});
