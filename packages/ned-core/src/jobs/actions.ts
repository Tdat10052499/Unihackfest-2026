// Job actions (funded-jobs-plan.md section 5): fresh listing read → rules.ts check → build → sign → send → confirm.
// Same pipeline as ../actions.ts (runBuilt). runSelectJob and the accept wiring come in S4.
import { PublicKey, Transaction, type TransactionInstruction } from '@solana/web3.js';
import idl from '../idl/ned_program.json' with { type: 'json' };
import { runBuilt, NOT_NOW, type ActionEnv } from '../actions.ts';
import { ata, createAtaIdempotentIx } from '../chain/ata.ts';
import { fetchUsdcUnits } from '../chain/balance.ts';
import { UserFacingError } from '../chain/errors.ts';
import { buildIx, encodeIx, toBN } from '../chain/idl.ts';
import { sendAndConfirm } from '../chain/send.ts';
import { getConnection, getProgramId } from '../config.ts';
import { TOKEN_PROGRAM_ID, USDC_DEVNET_MINT } from '../constants.ts';
import { equalBytes, hashBytes, type BriefDraft } from '../milestone/content.ts';
import { coder } from '../milestone/decode.ts';
import { formatUsdc, unitsFromUsdc } from '../milestone/format.ts';
import { TOKEN_ACCOUNT_SIZE } from '../milestone/layout.ts';
import type { Region } from '../milestone/view.ts';
import { buildJobBriefTxs, jobBriefBytes } from './brief.ts';
import type { JobListingAccount } from './decode.ts';
import { JOB_APPLICATION_SIZE, JOB_LISTING_SIZE } from './layout.ts';
import { jobAppPda, jobPda, jobVaultPda } from './pda.ts';
import { getApplication, getJob } from './queries.ts';
import { assertJobDraft, canApply, canWithdraw, jobDraftTotal, pitchProblem, type JobDraft } from './rules.ts';
import { skillsMask } from './taxonomy.ts';

export const POST_JOB_VN_REFUSED = 'Posting a job is not available in the Vietnam view.';

/** post_job confirmed but a brief part did not: the listing exists and its budget is locked; post the brief again */
export class JobBriefNotSavedError extends UserFacingError {
  readonly job: string;
  constructor(job: string) {
    super('The job was published and its budget is locked, but its brief was not saved. Open the job and save the brief again.');
    this.job = job;
  }
}

const jobIx = (name: string, accounts: Record<string, PublicKey>, args: Record<string, unknown> = {}): TransactionInstruction =>
  buildIx(idl, getProgramId(), name, { token_program: TOKEN_PROGRAM_ID, ...accounts }, encodeIx(coder, name, args));

/** post_job instruction for a validated draft (accounts and Borsh args from the IDL) */
export function buildPostJobIx(p: { business: PublicKey; jobId: bigint; draft: JobDraft; briefHash: Uint8Array; payer?: PublicKey }): { ix: TransactionInstruction; job: PublicKey } {
  const job = jobPda(p.business, p.jobId);
  const ix = jobIx(
    'post_job',
    { business: p.business, payer: p.payer ?? p.business, job, job_vault: jobVaultPda(job), business_token: ata(USDC_DEVNET_MINT, p.business) },
    {
      job_id: toBN(p.jobId),
      title: p.draft.title.trim(),
      summary: p.draft.summary.trim(),
      category: p.draft.category,
      skills: toBN(skillsMask(p.draft.skills)),
      milestones: p.draft.milestones.map((m) => ({ amount: toBN(unitsFromUsdc(m.amountUsdc) ?? 0n), work_secs: toBN(m.workSecs), review_secs: toBN(m.reviewSecs) })),
      brief_hash: Array.from(p.briefHash),
      apply_by: toBN(p.draft.applyBy),
      select_by: toBN(p.draft.selectBy),
    }
  );
  return { ix, job };
}

export const buildApplyJobIx = (job: PublicKey, freelancer: PublicKey, pitch: string) =>
  jobIx('apply_job', { job, application: jobAppPda(job, freelancer), freelancer }, { pitch: pitch.trim() });

export const buildWithdrawJobIx = (job: PublicKey, business: PublicKey) =>
  jobIx('withdraw_job', { job, business, job_vault: jobVaultPda(job), business_token: ata(USDC_DEVNET_MINT, business) });

/** Fresh read of a listing (never act on a stale poll result) */
export async function readJob(address: string | undefined, env: ActionEnv): Promise<JobListingAccount> {
  if (!address) throw new UserFacingError('Open a job first.');
  const job = await getJob(address, env.connection ?? getConnection());
  if (!job) throw new UserFacingError('This job no longer exists.');
  return job;
}

async function sendBriefParts(env: ActionEnv, txs: Transaction[]): Promise<string[]> {
  const { walletAddress, signTransaction } = env.signer;
  const out: string[] = [];
  for (const tx of txs) {
    const opts = { ...(env.onStatus ? { onStatus: env.onStatus } : {}), ...(env.connection ? { connection: env.connection } : {}) };
    out.push((await sendAndConfirm(tx, { walletAddress, signTransaction }, opts)).signature);
  }
  return out;
}

/**
 * "Lock budget & publish": post_job (the total leaves the business wallet into the job vault), then the public brief
 * parts. Never in the Vietnam view (that view never posts a job).
 */
export async function runPostJob(
  env: ActionEnv,
  draft: JobDraft,
  region: Region
): Promise<{ signature: string; job: string; briefSignatures: string[] }> {
  if (region === 'vn') throw new UserFacingError(POST_JOB_VN_REFUSED);
  const connection = env.connection ?? getConnection();
  const bytes = jobBriefBytes(draft.title.trim(), draft.brief);
  const result = await runBuilt(env, async (me) => {
    assertJobDraft(draft, await env.now());
    const total = jobDraftTotal(draft);
    const balance = await fetchUsdcUnits(connection, me);
    if (balance < total) throw new UserFacingError(`You need ${formatUsdc(total)} to publish this job; your wallet has ${formatUsdc(balance)}.`);
    const { ix, job } = buildPostJobIx({ business: me, jobId: BigInt(Date.now()), draft, briefHash: hashBytes(bytes) });
    const [listingRent, vaultRent] = await Promise.all([
      connection.getMinimumBalanceForRentExemption(JOB_LISTING_SIZE),
      connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE),
    ]);
    return { tx: new Transaction().add(ix), rent: listingRent + vaultRent, job };
  });
  const job = result.job.toBase58();
  try {
    const briefSignatures = await sendBriefParts(env, buildJobBriefTxs({ job: result.job, business: new PublicKey(env.signer.walletAddress!), bytes }));
    return { signature: result.signature, job, briefSignatures };
  } catch {
    throw new JobBriefNotSavedError(job);
  }
}

/** Posts the brief again for an open listing (after JobBriefNotSavedError); it must hash to the listing's brief_hash */
export async function runPostJobBrief(env: ActionEnv, address: string | undefined, brief: BriefDraft): Promise<{ briefSignatures: string[] }> {
  const { walletAddress } = env.signer;
  if (!walletAddress) throw new UserFacingError('Sign in first.');
  const job = await readJob(address, env);
  if (!job.business.equals(new PublicKey(walletAddress)) || job.state !== 'Open') throw new UserFacingError(NOT_NOW);
  const bytes = jobBriefBytes(job.title, brief);
  if (!equalBytes(hashBytes(bytes), job.briefHash)) throw new UserFacingError('This brief is not the one this job was published with.');
  return { briefSignatures: await sendBriefParts(env, buildJobBriefTxs({ job: job.address, business: job.business, bytes })) };
}

/** apply_job with a public pitch (≤ 280 bytes); the freelancer pays the application rent */
export function runApplyJob(env: ActionEnv, address: string | undefined, pitch: string) {
  const connection = env.connection ?? getConnection();
  return runBuilt(env, async (me) => {
    const problem = pitchProblem(pitch);
    if (problem) throw new UserFacingError(problem);
    const job = await readJob(address, env);
    const applied = (await getApplication(job.address, me, connection)) !== null;
    if (applied) throw new UserFacingError('You already applied to this job.');
    if (!canApply(job, me, await env.now())) throw new UserFacingError(NOT_NOW);
    const rent = await connection.getMinimumBalanceForRentExemption(JOB_APPLICATION_SIZE);
    return { tx: new Transaction().add(buildApplyJobIx(job.address, me, pitch)), rent, application: jobAppPda(job.address, me).toBase58() };
  });
}

/** withdraw_job: the whole budget back to the business wallet (its USDC account is re-created if it was closed) */
export function runWithdrawJob(env: ActionEnv, address: string | undefined) {
  const connection = env.connection ?? getConnection();
  return runBuilt(env, async (me) => {
    const job = await readJob(address, env);
    if (!canWithdraw(job, me, await env.now())) throw new UserFacingError(NOT_NOW);
    const token = ata(USDC_DEVNET_MINT, me);
    const exists = (await connection.getAccountInfo(token, 'confirmed')) !== null;
    const rent = exists ? 0 : await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
    const tx = new Transaction().add(createAtaIdempotentIx(me, me, USDC_DEVNET_MINT), buildWithdrawJobIx(job.address, me));
    return { tx, rent, amount: job.total };
  });
}

