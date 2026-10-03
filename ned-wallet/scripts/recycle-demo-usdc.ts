/**
 * Sends the devnet USDC that reached the demo payout partner back to the client (Mia), so the next demo run does
 * not need a faucet claim (non-ui-plan N12, product-spec section 7).
 *
 *   npm run recycle:demo-usdc -- --to <mia wallet> [--amount 20]
 *   npm run recycle:demo-usdc -- --create-ata                       # only create the partner's USDC account
 *   npm run recycle:demo-usdc -- --to <wallet> --dry-run
 *
 * --keypair defaults to ~/.config/solana/ned-demo-partner.json.
 *
 * --amount is in USDC (default: the whole partner balance). The partner keypair only signs the transfer; network
 * fees and any account rent are paid by --payer (default ~/.config/solana/id.json), so the partner needs no SOL.
 * The partner's and Mia's USDC accounts are created if missing. Nothing secret is printed.
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
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { DEMO_PAYOUT_PARTNER, TOKEN_PROGRAM_ID, USDC_DEVNET_MINT } from '../constants/chain';
import { ata, createAtaIdempotentIx } from '../services/chain/ata';
import { fetchUsdcUnits } from '../services/chain/balance';
import { formatUsdc, unitsFromUsdc } from '../services/milestone/format';

const has = (name: string) => process.argv.includes(`--${name}`);
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const expandHome = (p: string) => (p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p);

function loadEnvRpc(): string {
  // EXPO_PUBLIC_HELIUS_DEVNET_URL from .env if present (never printed), else the public devnet RPC
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const line = env.split('\n').find((l) => l.startsWith('EXPO_PUBLIC_HELIUS_DEVNET_URL='));
    const value = line?.split('=').slice(1).join('=').replace(/"/g, '').trim();
    if (value) return value;
  } catch {}
  return 'https://api.devnet.solana.com';
}

function loadKeypair(file: string, label: string): Keypair {
  const full = expandHome(file);
  if (!fs.existsSync(full)) throw new Error(`${label} keypair not found: ${full}`);
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(full, 'utf8'))));
}

/** SPL Token TransferChecked (instruction 12): amount + decimals, so a wrong mint fails */
function transferCheckedIx(source: PublicKey, destination: PublicKey, owner: PublicKey, amount: bigint) {
  const data = Buffer.alloc(10);
  data.writeUInt8(12, 0);
  data.writeBigUInt64LE(amount, 1);
  data.writeUInt8(6, 9);
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: USDC_DEVNET_MINT, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

async function main() {
  const keypairPath = arg('keypair') ?? path.join(os.homedir(), '.config', 'solana', 'ned-demo-partner.json');
  const partner = loadKeypair(keypairPath, 'partner');
  const payer = loadKeypair(arg('payer') ?? path.join(os.homedir(), '.config', 'solana', 'id.json'), 'payer');
  const connection = new Connection(loadEnvRpc(), 'confirmed');

  if (!partner.publicKey.equals(DEMO_PAYOUT_PARTNER)) {
    throw new Error(`This keypair is ${partner.publicKey.toBase58()}, not DEMO_PAYOUT_PARTNER ${DEMO_PAYOUT_PARTNER.toBase58()}.`);
  }
  const partnerAta = ata(USDC_DEVNET_MINT, partner.publicKey);
  const partnerAtaExists = (await connection.getAccountInfo(partnerAta, 'confirmed')) !== null;
  const balance = await fetchUsdcUnits(connection, partner.publicKey);
  console.log(`partner ${partner.publicKey.toBase58()} · USDC account ${partnerAtaExists ? 'exists' : 'missing'} · ${formatUsdc(balance)}`);
  console.log(`payer   ${payer.publicKey.toBase58()} · ${(await connection.getBalance(payer.publicKey, 'confirmed')) / LAMPORTS_PER_SOL} SOL`);

  // --create-ata: only make sure the partner's USDC account exists (paid by the payer)
  if (has('create-ata')) {
    if (partnerAtaExists) return console.log('nothing to do: the partner USDC account already exists');
    if (has('dry-run')) return console.log('dry run: would create the partner USDC account');
    const sig = await sendAndConfirmTransaction(connection, new Transaction().add(createAtaIdempotentIx(payer.publicKey, partner.publicKey, USDC_DEVNET_MINT)), [payer], { commitment: 'confirmed' });
    return console.log(`✅ created ${partnerAta.toBase58()}: ${explorerTx(sig)}`);
  }

  const toArg = arg('to');
  if (!toArg) {
    throw new Error('Usage: npm run recycle:demo-usdc -- --to <wallet> [--amount <USDC>] [--keypair <partner>] [--payer <keypair>] [--dry-run] | --create-ata');
  }
  const to = new PublicKey(toArg);
  const requested = arg('amount');
  const amount = requested === undefined ? balance : unitsFromUsdc(requested);
  if (amount === null || amount <= 0n) throw new Error(requested === undefined ? 'The partner holds no USDC.' : `Invalid --amount "${requested}".`);
  if (amount > balance) throw new Error(`The partner holds ${formatUsdc(balance)}; cannot send ${formatUsdc(amount)}.`);

  const toAta = ata(USDC_DEVNET_MINT, to);
  const before = await fetchUsdcUnits(connection, to);
  console.log(`send ${formatUsdc(amount)} → ${to.toBase58()} (now ${formatUsdc(before)})`);
  if (has('dry-run')) return console.log('dry run: nothing sent');

  const tx = new Transaction().add(
    createAtaIdempotentIx(payer.publicKey, to, USDC_DEVNET_MINT),
    transferCheckedIx(partnerAta, toAta, partner.publicKey, amount)
  );
  const sig = await sendAndConfirmTransaction(connection, tx, [payer, partner], { commitment: 'confirmed' });
  console.log(`✅ ${explorerTx(sig)}`);
  console.log(`   ${to.toBase58()}: ${formatUsdc(before)} → ${formatUsdc(await fetchUsdcUnits(connection, to))}; partner: ${formatUsdc(await fetchUsdcUnits(connection, partner.publicKey))}`);
}

main().catch((err) => {
  console.error(`❌ ${err?.message ?? err}`);
  process.exit(1);
});
