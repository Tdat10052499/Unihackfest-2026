/**
 * Funded Jobs smoke run on devnet (program v1.4: funded-jobs-plan.md section 4, lock-at-hire-plan.md section 2), with
 * throwaway keypairs.
 *
 *   npm run jobs:smoke                 # checks, then the run; stops with the addresses to fund if SOL/USDC is short
 *   npm run jobs:smoke -- --airdrop    # also asks the devnet SOL faucet (only when the PO approved it in the session)
 *   npm run jobs:smoke -- --check      # only the checks: deployed program = local build, core IDL = built IDL
 *
 * Run 1: post_job (1 milestone, 0.1 USDC) → post_job_brief → apply_job → create_fund + select_job (one tx)
 *        → accept (VND path) + lock_from_job (one tx) → submit → approve (0.1 USDC to DEMO_PAYOUT_PARTNER).
 * Run 2: post_job (0.1 USDC) → withdraw_job with no applicants (the business gets it back).
 * Run 3 (v1.4, lock at hire): post_job_open (0.1 USDC planned, nothing locked) → apply_job
 *        → fund_job + create_fund + select_job (one tx) → accept (VND path) + lock_from_job → submit → approve.
 * Run 4 (v1.4): post_job_open → withdraw_job with nothing locked (0 back, job vault closed).
 *
 * Keypairs: ned-wallet/.smoke-keys/{business,freelancer}.json, created on the first run (gitignored). Never the team,
 * deploy or demo keys. USDC only comes from the Circle faucet by hand; the script never moves USDC from another wallet.
 */
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, Transaction, type TransactionInstruction } from '@solana/web3.js';
import { configureCore, getProgramId } from '@ned/core/config.ts';
import { DEMO_PAYOUT_PARTNER, TOKEN_PROGRAM_ID, USDC_DEVNET_MINT } from '@ned/core/constants.ts';
import { ata } from '@ned/core/chain/ata.ts';
import { buildIx, decodeAccount, encodeIx, fromBN, toBN } from '@ned/core/chain/idl.ts';
import { buildAccept, buildApprove, buildCreateFund, buildSubmit } from '@ned/core/milestone/client.ts';
import { coder } from '@ned/core/milestone/decode.ts';
import { hashContent } from '@ned/core/milestone/content.ts';
import { getChainNow, getFund } from '@ned/core/milestone/queries.ts';
import idl from '@ned/core/idl/ned_program.json';

const USDC = 1_000_000n;
const AMOUNT = USDC / 10n; // 0.1 USDC per job
const WORK_SECS = 600;
const REVIEW_SECS = 60;
const BUSINESS_MIN_SOL = 0.08; // 4 listings + job vaults, 2 funds + vaults (rent), fees
const FREELANCER_MIN_SOL = 0.01; // application rent, fees
const AIRDROP_SOL = 1;

const repo = path.join(__dirname, '..', '..');
const keysDir = path.join(__dirname, '..', '.smoke-keys');
const has = (name: string) => process.argv.includes(`--${name}`);
const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
const explorerAddress = (a: PublicKey) => `https://explorer.solana.com/address/${a.toBase58()}?cluster=devnet`;
const usdc = (units: bigint) => `${(Number(units) / 1e6).toFixed(2)} USDC`;
const u64 = (v: bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(v);
  return b;
};

function rpcUrl(): string {
  // EXPO_PUBLIC_HELIUS_DEVNET_URL from .env if present (never printed), else the public devnet RPC
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const value = env.split('\n').find((l) => l.startsWith('EXPO_PUBLIC_HELIUS_DEVNET_URL='))?.split('=').slice(1).join('=').replace(/"/g, '').trim();
    if (value) return value;
  } catch {}
  return 'https://api.devnet.solana.com';
}

function throwaway(label: string): Keypair {
  const file = path.join(keysDir, `${label}.json`);
  if (fs.existsSync(file)) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, 'utf8'))));
  const kp = Keypair.generate();
  fs.mkdirSync(keysDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  console.log(`🔑 new throwaway ${label} ${kp.publicKey.toBase58()} (ned-wallet/.smoke-keys/${label}.json, gitignored)`);
  return kp;
}

// --- PDAs and job instructions (IDL account order and Borsh encoding from @ned/core) ---

const programId = () => getProgramId();
const jobPda = (business: PublicKey, jobId: bigint) => PublicKey.findProgramAddressSync([Buffer.from('job'), business.toBuffer(), u64(jobId)], programId())[0];
const jobVaultPda = (job: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('job_vault'), job.toBuffer()], programId())[0];
const appPda = (job: PublicKey, freelancer: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('job_app'), job.toBuffer(), freelancer.toBuffer()], programId())[0];
const vaultPda = (fund: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from('vault'), fund.toBuffer()], programId())[0];

const jobIx = (name: string, accounts: Record<string, PublicKey>, args: Record<string, unknown> = {}): TransactionInstruction =>
  buildIx(idl, programId(), name, { token_program: TOKEN_PROGRAM_ID, ...accounts }, encodeIx(coder, name, args));

/** post_job locks the budget now; post_job_open (v1.4) takes the same arguments and accounts and locks nothing */
function postJobIx(business: PublicKey, jobId: bigint, title: string, briefHash: Uint8Array, applyBy: number, selectBy: number, name: 'post_job' | 'post_job_open' = 'post_job') {
  const job = jobPda(business, jobId);
  return jobIx(
    name,
    { business, payer: business, job, job_vault: jobVaultPda(job), business_token: ata(USDC_DEVNET_MINT, business) },
    {
      job_id: toBN(jobId),
      title,
      summary: 'Smoke test listing: one small milestone on devnet.',
      category: 0,
      skills: toBN(1n),
      milestones: [{ amount: toBN(AMOUNT), work_secs: toBN(WORK_SECS), review_secs: toBN(REVIEW_SECS) }],
      brief_hash: Array.from(briefHash),
      apply_by: toBN(applyBy),
      select_by: toBN(selectBy),
    }
  );
}

type Listing = { state: Record<string, unknown>; total: { toString(): string }; application_count: number; selected: PublicKey; fund: PublicKey; unfunded: number };
async function readListing(conn: Connection, job: PublicKey): Promise<Listing> {
  const info = await conn.getAccountInfo(job, 'confirmed');
  if (!info) throw new Error(`listing ${job.toBase58()} not found`);
  return decodeAccount<Listing>(coder, 'JobListing', info.data);
}
const stateName = (s: Record<string, unknown>) => Object.keys(s)[0];
const token = async (conn: Connection, account: PublicKey) => BigInt((await conn.getTokenAccountBalance(account, 'confirmed')).value.amount);

// --- Sending ---

const sigs: { step: string; sig: string; cu: number | null }[] = [];
async function send(conn: Connection, step: string, ixs: TransactionInstruction[] | Transaction, signers: Keypair[]) {
  const tx = ixs instanceof Transaction ? ixs : new Transaction().add(...ixs);
  try {
    const sig = await sendAndConfirmTransaction(conn, tx, signers, { commitment: 'confirmed' });
    const info = await conn.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    const cu = info?.meta?.computeUnitsConsumed ?? null;
    sigs.push({ step, sig, cu });
    console.log(`✅ ${step.padEnd(30)} ${String(cu ?? '?').padStart(6)} CU  ${explorerTx(sig)}`);
    return sig;
  } catch (err: any) {
    const logs: string[] = err?.logs ?? err?.transactionLogs ?? [];
    if (logs.length) console.error(logs.join('\n'));
    throw new Error(`${step} failed: ${err?.message ?? err}`);
  }
}

// --- Checks: deployed program = local build, core IDL = built IDL ---

const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

async function checks(conn: Connection): Promise<boolean> {
  let ok = true;
  const so = path.join(repo, 'ned_program', 'target', 'deploy', 'ned_program.so');
  const program = await conn.getAccountInfo(programId(), 'confirmed');
  if (!program) throw new Error('program account not found');
  const programData = new PublicKey(program.data.subarray(4, 36));
  const data = (await conn.getAccountInfo(programData, 'confirmed'))?.data;
  if (!data) throw new Error('program data account not found');
  const deployed = data.subarray(45); // UpgradeableLoaderState::ProgramData header
  const v14 = deployed.includes(Buffer.from('Instruction: FundJob'));
  console.log(`program ${programId().toBase58()} · data ${data.length} bytes · lock at hire ${v14 ? 'present (v1.4)' : 'MISSING (still v1.3?)'}`);
  if (!v14) ok = false;
  if (fs.existsSync(so)) {
    const local = fs.readFileSync(so);
    const same = deployed.subarray(0, local.length).equals(local) && deployed.subarray(local.length).every((b) => b === 0);
    console.log(`deployed binary ${same ? '=' : '≠'} ned_program/target/deploy/ned_program.so (${local.length} bytes, sha256 ${sha(local).slice(0, 16)}…)`);
    if (!same) ok = false;
  } else console.log('no local build to compare (run anchor build in ned_program/)');
  const built = path.join(repo, 'ned_program', 'target', 'idl', 'ned_program.json');
  const core = path.join(repo, 'packages', 'ned-core', 'src', 'idl', 'ned_program.json');
  if (fs.existsSync(built)) {
    const same = fs.readFileSync(built).equals(fs.readFileSync(core));
    console.log(`packages/ned-core IDL ${same ? '=' : '≠'} ned_program/target/idl/ned_program.json`);
    if (!same) ok = false;
  }
  return ok;
}

// --- Funding ---

/** `allowAirdrop` is false while the program is not upgraded, so no faucet SOL is spent on a run that cannot start */
async function ensureFunds(conn: Connection, business: Keypair, freelancer: Keypair, allowAirdrop: boolean): Promise<boolean> {
  const need = [
    { kp: business, min: BUSINESS_MIN_SOL, label: 'business' },
    { kp: freelancer, min: FREELANCER_MIN_SOL, label: 'freelancer' },
  ];
  let short = false;
  for (const n of need) {
    let bal = await conn.getBalance(n.kp.publicKey, 'confirmed');
    if (bal < n.min * LAMPORTS_PER_SOL && allowAirdrop && has('airdrop')) {
      try {
        const sig = await conn.requestAirdrop(n.kp.publicKey, AIRDROP_SOL * LAMPORTS_PER_SOL);
        await conn.confirmTransaction(sig, 'confirmed');
        console.log(`🚰 faucet ${AIRDROP_SOL} SOL → ${n.label}  ${explorerTx(sig)}`);
        bal = await conn.getBalance(n.kp.publicKey, 'confirmed');
      } catch (err: any) {
        console.log(`🚰 faucet refused for ${n.label}: ${String(err?.message ?? err).slice(0, 120)}`);
      }
    }
    if (bal < n.min * LAMPORTS_PER_SOL) {
      short = true;
      console.log(`⛽ ${n.label} ${n.kp.publicKey.toBase58()} has ${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL, needs ${n.min} SOL (https://faucet.solana.com)`);
    }
  }
  const tokens = await conn.getTokenAccountBalance(ata(USDC_DEVNET_MINT, business.publicKey), 'confirmed').catch(() => null);
  const units = BigInt(tokens?.value.amount ?? '0');
  if (units < 2n * AMOUNT) {
    short = true;
    console.log(`💵 business ${business.publicKey.toBase58()} has ${usdc(units)}, needs ${usdc(2n * AMOUNT)}: https://faucet.circle.com → Solana Devnet → paste this address`);
  }
  return !short;
}

// --- Run ---

async function main() {
  const url = rpcUrl();
  configureCore({ rpcUrl: url });
  const conn = new Connection(url, 'confirmed');

  const checksOk = await checks(conn);
  if (has('check')) process.exit(checksOk ? 0 : 1);

  const business = throwaway('business');
  const freelancer = throwaway('freelancer');
  console.log(`business   ${business.publicKey.toBase58()}\nfreelancer ${freelancer.publicKey.toBase58()}`);
  const funded = await ensureFunds(conn, business, freelancer, checksOk);
  if (!checksOk) {
    console.log('\n⛔ The deployed program is not this v1.4 build. Upgrade it first (PO), then run again.');
    process.exit(1);
  }
  if (!funded) {
    console.log('\n⛔ Fund the addresses above, then run again.');
    process.exit(2);
  }

  const B = business.publicKey;
  const F = freelancer.publicKey;
  const businessToken = ata(USDC_DEVNET_MINT, B);
  const now = await getChainNow();

  // Run 1 — the full flow
  const brief = JSON.stringify({ v: 1, title: 'Smoke test job', scope: 'Deliver one file.', acceptance: 'The file opens.' });
  const briefHash = hashContent(brief);
  const jobId1 = BigInt(Date.now());
  const job1 = jobPda(B, jobId1);
  console.log(`\nJob 1 ${job1.toBase58()}`);
  await send(conn, 'post_job', [postJobIx(B, jobId1, 'Smoke test job', briefHash, now + 600, now + 900)], [business]);
  await send(conn, 'post_job_brief', [jobIx('post_job_brief', { job: job1, business: B }, { part: 0, parts: 1, data: Buffer.from(brief) })], [business]);
  await send(conn, 'apply_job', [jobIx('apply_job', { job: job1, application: appPda(job1, F), freelancer: F }, { pitch: 'Smoke test applicant.' })], [freelancer]);

  const at = await getChainNow();
  const created = await buildCreateFund({
    client: B,
    freelancer: F,
    title: 'Smoke test job',
    milestones: [{ amount: AMOUNT, submitBy: at + WORK_SECS, reviewBy: at + WORK_SECS + REVIEW_SECS }],
    briefHash,
  });
  const fundKey = created.fund;
  const select = jobIx('select_job', { job: job1, business: B, fund: fundKey, application: appPda(job1, F) });
  await send(conn, 'create_fund + select_job', [...created.tx.instructions, select], [business]);

  let fund = await getFund(fundKey);
  if (!fund) throw new Error('fund not found after create_fund');
  const accept = await buildAccept({ fund, freelancer: F, choice: 'payoutPartner', username: 'smoketest', expectedBriefHash: briefHash });
  const lockFromJob = jobIx('lock_from_job', {
    job: job1,
    fund: fundKey,
    job_vault: jobVaultPda(job1),
    vault: vaultPda(fundKey),
    business: B,
    business_token: businessToken,
    caller: F,
  });
  await send(conn, 'accept + lock_from_job', [...accept.tx.instructions, lockFromJob], [freelancer]);

  fund = (await getFund(fundKey))!;
  const evidence = hashContent(JSON.stringify({ v: 1, files: ['smoke.txt'] }));
  const submit = await buildSubmit({ fund, freelancer: F, index: 0, evidence });
  await send(conn, 'submit', submit.tx, [freelancer]);
  fund = (await getFund(fundKey))!;
  const approve = await buildApprove({ fund, client: B, index: 0 });
  await send(conn, 'approve', approve.tx, [business]);

  // Run 2 — withdraw with no applicants
  const jobId2 = jobId1 + 1n;
  const job2 = jobPda(B, jobId2);
  const now2 = await getChainNow();
  console.log(`\nJob 2 ${job2.toBase58()}`);
  await send(conn, 'post_job', [postJobIx(B, jobId2, 'Smoke test withdraw', briefHash, now2 + 600, now2 + 900)], [business]);
  const before = BigInt((await conn.getTokenAccountBalance(businessToken, 'confirmed')).value.amount);
  await send(conn, 'withdraw_job', [jobIx('withdraw_job', { job: job2, business: B, job_vault: jobVaultPda(job2), business_token: businessToken })], [business]);
  const after = BigInt((await conn.getTokenAccountBalance(businessToken, 'confirmed')).value.amount);

  // Run 3 — lock at hire (v1.4): nothing locked at posting; the budget moves in the same transaction as the selection
  const brief3 = JSON.stringify({ v: 1, title: 'Smoke lock at hire', scope: 'Deliver one file.', acceptance: 'The file opens.' });
  const briefHash3 = hashContent(brief3);
  const jobId3 = jobId1 + 2n;
  const job3 = jobPda(B, jobId3);
  const now3 = await getChainNow();
  console.log(`\nJob 3 ${job3.toBase58()} (locks when hired)`);
  const before3 = BigInt((await conn.getTokenAccountBalance(businessToken, 'confirmed')).value.amount);
  await send(conn, 'post_job_open', [postJobIx(B, jobId3, 'Smoke lock at hire', briefHash3, now3 + 600, now3 + 900, 'post_job_open')], [business]);
  const posted3 = BigInt((await conn.getTokenAccountBalance(businessToken, 'confirmed')).value.amount);
  const open3 = await readListing(conn, job3);
  await send(conn, 'post_job_brief', [jobIx('post_job_brief', { job: job3, business: B }, { part: 0, parts: 1, data: Buffer.from(brief3) })], [business]);
  await send(conn, 'apply_job', [jobIx('apply_job', { job: job3, application: appPda(job3, F), freelancer: F }, { pitch: 'Smoke test applicant.' })], [freelancer]);

  const at3 = await getChainNow();
  const created3 = await buildCreateFund({
    client: B,
    freelancer: F,
    title: 'Smoke lock at hire',
    milestones: [{ amount: AMOUNT, submitBy: at3 + WORK_SECS, reviewBy: at3 + WORK_SECS + REVIEW_SECS }],
    briefHash: briefHash3,
  });
  const fundKey3 = created3.fund;
  const fundJob = jobIx('fund_job', { job: job3, business: B, job_vault: jobVaultPda(job3), business_token: businessToken });
  const select3 = jobIx('select_job', { job: job3, business: B, fund: fundKey3, application: appPda(job3, F) });
  const selectTx = new Transaction().add(fundJob, ...created3.tx.instructions, select3);
  selectTx.feePayer = B;
  selectTx.recentBlockhash = (await conn.getLatestBlockhash('confirmed')).blockhash;
  const selectBytes = 1 + 64 + selectTx.serializeMessage().length;
  console.log(`   fund_job + create_fund + select_job: ${selectBytes} bytes (limit 1232)`);
  await send(conn, 'fund_job + create_fund + select_job', selectTx, [business]);
  const locked3 = await token(conn, jobVaultPda(job3));

  let fund3 = (await getFund(fundKey3))!;
  const accept3 = await buildAccept({ fund: fund3, freelancer: F, choice: 'payoutPartner', username: 'smoketest', expectedBriefHash: briefHash3 });
  const lockFromJob3 = jobIx('lock_from_job', {
    job: job3,
    fund: fundKey3,
    job_vault: jobVaultPda(job3),
    vault: vaultPda(fundKey3),
    business: B,
    business_token: businessToken,
    caller: F,
  });
  await send(conn, 'accept + lock_from_job', [...accept3.tx.instructions, lockFromJob3], [freelancer]);
  fund3 = (await getFund(fundKey3))!;
  const submit3 = await buildSubmit({ fund: fund3, freelancer: F, index: 0, evidence });
  await send(conn, 'submit', submit3.tx, [freelancer]);
  fund3 = (await getFund(fundKey3))!;
  const approve3 = await buildApprove({ fund: fund3, client: B, index: 0 });
  await send(conn, 'approve', approve3.tx, [business]);

  // Run 4 — an unfunded listing withdrawn: nothing to return, the job vault closes
  const jobId4 = jobId1 + 3n;
  const job4 = jobPda(B, jobId4);
  const now4 = await getChainNow();
  console.log(`\nJob 4 ${job4.toBase58()} (locks when hired, withdrawn)`);
  await send(conn, 'post_job_open', [postJobIx(B, jobId4, 'Smoke open withdraw', briefHash, now4 + 600, now4 + 900, 'post_job_open')], [business]);
  const before4 = BigInt((await conn.getTokenAccountBalance(businessToken, 'confirmed')).value.amount);
  await send(conn, 'withdraw_job', [jobIx('withdraw_job', { job: job4, business: B, job_vault: jobVaultPda(job4), business_token: businessToken })], [business]);
  const after4 = BigInt((await conn.getTokenAccountBalance(businessToken, 'confirmed')).value.amount);

  // Final states
  const l1 = await readListing(conn, job1);
  const l2 = await readListing(conn, job2);
  fund = (await getFund(fundKey))!;
  const gone = async (a: PublicKey) => (await conn.getAccountInfo(a, 'confirmed')) === null;
  const l3 = await readListing(conn, job3);
  const l4 = await readListing(conn, job4);
  fund3 = (await getFund(fundKey3))!;
  const partner = await conn.getTokenAccountBalance(ata(USDC_DEVNET_MINT, DEMO_PAYOUT_PARTNER), 'confirmed');
  console.log('\nFinal states');
  console.log(`  job 1  ${stateName(l1.state)} · total ${usdc(fromBN(l1.total))} · applications ${l1.application_count} · selected ${l1.selected.toBase58()} · job vault closed ${await gone(jobVaultPda(job1))}  ${explorerAddress(job1)}`);
  console.log(`  fund   ${fund.state} · milestone 1 ${fund.milestones[0].status} · released ${usdc(fund.released)} · destination ${fund.payoutKind}  ${explorerAddress(fundKey)}`);
  console.log(`  job 2  ${stateName(l2.state)} · returned ${usdc(after - before)} · job vault closed ${await gone(jobVaultPda(job2))}  ${explorerAddress(job2)}`);
  console.log(`  job 3  posted unfunded=${open3.unfunded}, ${usdc(before3 - posted3)} moved · at select ${usdc(locked3)} locked · now ${stateName(l3.state)} · unfunded ${l3.unfunded} · job vault closed ${await gone(jobVaultPda(job3))}  ${explorerAddress(job3)}`);
  console.log(`  fund 3 ${fund3.state} · milestone 1 ${fund3.milestones[0].status} · released ${usdc(fund3.released)}  ${explorerAddress(fundKey3)}`);
  console.log(`  job 4  ${stateName(l4.state)} · unfunded ${l4.unfunded} · returned ${usdc(after4 - before4)} · job vault closed ${await gone(jobVaultPda(job4))}  ${explorerAddress(job4)}`);
  console.log(`  DEMO_PAYOUT_PARTNER USDC ${partner.value.uiAmountString}`);

  const ok =
    stateName(l1.state) === 'Filled' &&
    l1.fund.equals(fundKey) &&
    fund.milestones[0].status === 'Released' &&
    stateName(l2.state) === 'Withdrawn' &&
    after - before === AMOUNT &&
    (await gone(jobVaultPda(job1))) &&
    (await gone(jobVaultPda(job2))) &&
    open3.unfunded === 1 &&
    before3 === posted3 &&
    locked3 === AMOUNT &&
    selectBytes <= 1232 &&
    stateName(l3.state) === 'Filled' &&
    l3.unfunded === 0 &&
    l3.fund.equals(fundKey3) &&
    fund3.milestones[0].status === 'Released' &&
    (await gone(jobVaultPda(job3))) &&
    stateName(l4.state) === 'Withdrawn' &&
    l4.unfunded === 1 &&
    after4 === before4 &&
    (await gone(jobVaultPda(job4)));
  console.log(ok ? '\n🟢 jobs smoke run green' : '\n🔴 final states differ from the expected ones');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n🔴 ${err?.message ?? err}`);
  process.exit(1);
});
