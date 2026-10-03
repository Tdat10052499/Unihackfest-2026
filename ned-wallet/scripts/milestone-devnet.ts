/**
 * Milestone Lock smoke run on devnet with local keypairs (non-ui-plan N10). Uses the same builders as the app
 * (services/milestone/client.ts), so a green run proves the app's encoding and account lists on the real program.
 *
 *   npm run milestone:devnet                 # create → accept (VND path) → lock → submit/approve 0 → submit 1,
 *                                            # wait, release_after_review 1 → close
 *   npm run milestone:devnet -- --refund     # create → accept → lock → no submit, wait, refund 0 and 1 → close
 *   npm run milestone:devnet -- --own-wallet # accept with the freelancer's own wallet (USDC is recycled to the client)
 *   npm run milestone:devnet -- --client <path> --freelancer <path>
 *
 * Keypairs: by default ~/.config/solana/ned-milestone-client.json and ned-milestone-freelancer.json (created once,
 * outside the repo, reused). SOL top-ups come from ~/.config/solana/id.json, capped at MAX_TOPUP_SOL per run.
 * USDC: the client needs 2 devnet USDC. If it has less, the script prints the Circle faucet steps and stops.
 * On the VND path the released USDC goes to DEMO_PAYOUT_PARTNER; until N12 that is a placeholder without a private
 * key, so those 1–2 USDC cannot be recycled.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  Connection,
  Keypair,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { DEMO_PAYOUT_PARTNER, PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DEVNET_MINT } from '../constants/chain';
import { ata, createAtaIdempotentIx } from '../services/chain/ata';
import { fetchUsdcUnits } from '../services/chain/balance';
import { PROGRAM_ERRORS } from '../services/chain/errors';
import * as client from '../services/milestone/client';
import { formatUsdc } from '../services/milestone/format';
import { getChainNow, getFund } from '../services/milestone/queries';

const USDC = 1_000_000n;
const AMOUNT = 1n * USDC; // per milestone, 2 milestones
const REVIEW_WINDOW = 60;
/** submission deadline = chain time at start + this; leaves time for create, accept and lock (work window 60 s) */
const SUBMIT_AFTER = 90;
const MAX_TOPUP_SOL = 0.2;
const CLIENT_MIN_SOL = 0.03;
const FREELANCER_MIN_SOL = 0.01;

const has = (name: string) => process.argv.includes(`--${name}`);
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

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

const solanaDir = path.join(os.homedir(), '.config', 'solana');
function loadOrCreateKeypair(file: string, label: string): Keypair {
  if (fs.existsSync(file)) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, 'utf8'))));
  const kp = Keypair.generate();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  console.log(`🔑 created ${label} keypair ${kp.publicKey.toBase58()} at ${file}`);
  return kp;
}

/** SPL Token Transfer (instruction 3) */
function tokenTransferIx(source: PublicKey, destination: PublicKey, owner: PublicKey, amount: bigint) {
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0);
  data.writeBigUInt64LE(amount, 1);
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
const explorerAddress = (a: PublicKey) => `https://explorer.solana.com/address/${a.toBase58()}?cluster=devnet`;
const sol = (lamports: number) => (lamports / LAMPORTS_PER_SOL).toFixed(6);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const rows: { step: string; cu: number | null; sig: string }[] = [];

async function send(connection: Connection, tx: Transaction, signers: Keypair[], step: string) {
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, signers, { commitment: 'confirmed' });
    const info = await connection.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    // compute units of ned_program itself (an ATA create in the same transaction is not counted)
    const log = info?.meta?.logMessages?.find((l) => l.startsWith(`Program ${PROGRAM_ID.toBase58()} consumed`));
    const cu = log ? Number(/consumed (\d+)/.exec(log)?.[1]) : (info?.meta?.computeUnitsConsumed ?? null);
    rows.push({ step, cu, sig });
    console.log(`✅ ${step.padEnd(24)} ${String(cu ?? '?').padStart(6)} CU  ${explorerTx(sig)}`);
    return sig;
  } catch (err: any) {
    const logs: string[] = err?.logs ?? err?.transactionLogs ?? [];
    const code = /custom program error: 0x([0-9a-f]+)/i.exec(String(err?.message ?? err))?.[1];
    const name = code ? PROGRAM_ERRORS[parseInt(code, 16)] : undefined;
    if (logs.length) console.error(logs.join('\n'));
    throw new Error(`${step} failed${name ? ` (${name})` : ''}: ${err?.message ?? err}`);
  }
}

/** Waits until chain time is strictly past `deadline` (program-spec 3.4: "passed" means now > deadline) */
async function waitPast(connection: Connection, deadline: number, what: string) {
  for (;;) {
    const now = await getChainNow(connection);
    if (now > deadline) return;
    const left = deadline - now + 1;
    process.stdout.write(`⏳ waiting ${left}s for ${what}…\r`);
    await sleep(Math.min(5, left) * 1000);
  }
}

async function topUp(connection: Connection, funder: Keypair, targets: { kp: Keypair; min: number; label: string }[]) {
  const transfers = [];
  for (const t of targets) {
    const balance = await connection.getBalance(t.kp.publicKey, 'confirmed');
    const need = Math.ceil(t.min * LAMPORTS_PER_SOL) - balance;
    if (need > 0) transfers.push({ ...t, need });
  }
  const total = transfers.reduce((s, t) => s + t.need, 0);
  if (total === 0) return;
  if (total > MAX_TOPUP_SOL * LAMPORTS_PER_SOL) {
    throw new Error(`Top-up of ${sol(total)} SOL is above the ${MAX_TOPUP_SOL} SOL cap. Fund the keypairs by hand.`);
  }
  const tx = new Transaction().add(
    ...transfers.map((t) => SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: t.kp.publicKey, lamports: t.need }))
  );
  await send(connection, tx, [funder], `top up ${sol(total)} SOL`);
}

async function main() {
  const refund = has('refund');
  const ownWallet = has('own-wallet');
  const connection = new Connection(loadEnvRpc(), 'confirmed');
  const funderPath = path.join(solanaDir, 'id.json');
  if (!fs.existsSync(funderPath)) throw new Error(`Funder keypair not found: ${funderPath}`);
  const funder = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(funderPath, 'utf8'))));
  const clientKp = loadOrCreateKeypair(arg('client') ?? path.join(solanaDir, 'ned-milestone-client.json'), 'client');
  const freelancerKp = loadOrCreateKeypair(arg('freelancer') ?? path.join(solanaDir, 'ned-milestone-freelancer.json'), 'freelancer');
  const [c, f] = [clientKp.publicKey, freelancerKp.publicKey];

  console.log(`ned_program ${PROGRAM_ID.toBase58()} (devnet)`);
  console.log(`client      ${c.toBase58()}`);
  console.log(`freelancer  ${f.toBase58()}`);
  console.log(`path        ${refund ? 'refund' : 'approve + release_after_review'}, ${ownWallet ? 'own wallet' : 'VND (payout partner)'}\n`);

  // USDC first: nothing is spent if the client has none
  const usdc = await fetchUsdcUnits(connection, c);
  if (usdc < 2n * AMOUNT) {
    console.log(`❌ The client has ${formatUsdc(usdc)}; it needs ${formatUsdc(2n * AMOUNT)}.`);
    console.log('   Get devnet USDC from the Circle faucet:');
    console.log('   1. Open https://faucet.circle.com');
    console.log('   2. Choose USDC and the network "Solana Devnet"');
    console.log(`   3. Paste the client address ${c.toBase58()} and send (20 USDC, once per 2 hours)`);
    console.log('   4. Run this script again.');
    process.exit(1);
  }

  await topUp(connection, funder, [
    { kp: clientKp, min: CLIENT_MIN_SOL, label: 'client' },
    { kp: freelancerKp, min: FREELANCER_MIN_SOL, label: 'freelancer' },
  ]);
  const startSol = await connection.getBalance(c, 'confirmed');
  const destination = ownWallet ? f : DEMO_PAYOUT_PARTNER;
  const destBefore = await fetchUsdcUnits(connection, destination);

  // 1. create: 2 milestones × 1 USDC, review window 60 s
  const t0 = await getChainNow(connection);
  const submitBy = t0 + SUBMIT_AFTER;
  const title = refund ? 'Smoke test (refund)' : 'Smoke test';
  // TEMPORARY until B1 (canonical brief JSON): the brief hash is SHA-256 of the title
  const briefHash = client.temporaryBriefHash(title);
  const created = await client.buildCreateFund(
    {
      client: c,
      freelancer: f,
      title,
      briefHash,
      milestones: [0, 1].map(() => ({ amount: AMOUNT, submitBy, reviewBy: submitBy + REVIEW_WINDOW })),
    },
    connection
  );
  await send(connection, created.tx, [clientKp], 'create_fund');
  const fundKey = created.fund;
  console.log(`   fund ${explorerAddress(fundKey)}`);
  const fresh = async () => {
    const fund = await getFund(fundKey, connection);
    if (!fund) throw new Error('fund not found');
    return fund;
  };
  const stored = await fresh();
  if (stored.version !== 2 || Buffer.compare(Buffer.from(stored.briefHash), Buffer.from(briefHash)) !== 0) {
    throw new Error('the fund does not hold the v1.1 brief hash');
  }
  console.log('   v1.1 fund: version 2, brief hash stored');

  // 2. accept (VND path by default)
  await send(
    connection,
    (
      await client.buildAccept({
        fund: await fresh(),
        freelancer: f,
        choice: ownWallet ? 'ownWallet' : 'payoutPartner',
        username: 'smoke',
        // TEMPORARY (smoke only): the freelancer "read" the brief = the title. B1 hashes the decrypted brief.
        expectedBriefHash: client.temporaryBriefHash(title),
      })
    ).tx,
    [freelancerKp],
    `accept (${ownWallet ? 'OwnWallet' : 'PayoutPartner'})`
  );
  // 3. lock
  await send(connection, (await client.buildLock({ fund: await fresh(), client: c }, connection)).tx, [clientKp], 'lock');

  if (!refund) {
    // 4. submit 0, approve 0
    await send(connection, (await client.buildSubmit({ fund: await fresh(), freelancer: f, index: 0, link: 'https://example.com/delivery-1' })).tx, [freelancerKp], 'submit 0');
    await send(connection, (await client.buildApprove({ fund: await fresh(), client: c, index: 0 }, connection)).tx, [clientKp], 'approve 0');
    // 5. submit 1, wait past review_by, release_after_review 1 (signed by the client here; anyone may sign)
    await send(connection, (await client.buildSubmit({ fund: await fresh(), freelancer: f, index: 1, link: 'https://example.com/delivery-2' })).tx, [freelancerKp], 'submit 1');
    await waitPast(connection, submitBy + REVIEW_WINDOW, 'the review deadline');
    await send(connection, (await client.buildReleaseAfterReview({ fund: await fresh(), caller: c, index: 1 }, connection)).tx, [clientKp], 'release_after_review 1');
  } else {
    // --refund: no submit; wait past submit_by, refund both
    await waitPast(connection, submitBy, 'the submission deadline');
    for (const index of [0, 1]) {
      await send(connection, (await client.buildRefund({ fund: await fresh(), caller: c, index }, connection)).tx, [clientKp], `refund ${index}`);
    }
  }

  const settled = await fresh();
  console.log(`   state ${settled.state}: released ${formatUsdc(settled.released)}, refunded ${formatUsdc(settled.refunded)}, total ${formatUsdc(settled.total)}`);
  if (settled.state !== 'Settled' || settled.released + settled.refunded !== settled.total) throw new Error('invariant failed');

  // 6. close: rent of fund + vault back to the client
  await send(connection, (await client.buildClose({ fund: settled, creator: c }, connection)).tx, [clientKp], 'close');
  if (await getFund(fundKey, connection)) throw new Error('fund still exists after close');

  const received = (await fetchUsdcUnits(connection, destination)) - destBefore;
  console.log(`\n   ${ownWallet ? 'freelancer' : 'payout partner'} received ${formatUsdc(received)}; client SOL ${sol(startSol)} → ${sol(await connection.getBalance(c, 'confirmed'))}`);

  // Recycle: own-wallet earnings go back to the client so the next run needs no faucet
  if (ownWallet && received > 0n) {
    const tx = new Transaction().add(
      createAtaIdempotentIx(f, c, USDC_DEVNET_MINT),
      tokenTransferIx(ata(USDC_DEVNET_MINT, f), ata(USDC_DEVNET_MINT, c), f, received)
    );
    await send(connection, tx, [freelancerKp], `recycle ${formatUsdc(received)}`);
  }

  console.log('\n| Step | Compute units | Signature |\n| --- | ---: | --- |');
  for (const r of rows) console.log(`| ${r.step} | ${r.cu ?? '?'} | ${r.sig} |`);
  console.log('\n🎉 milestone devnet smoke run passed');
}

main().catch((err) => {
  console.error(`\n❌ ${err?.message ?? err}`);
  process.exit(1);
});
