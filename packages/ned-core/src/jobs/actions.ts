// Job actions (funded-jobs-plan.md section 5): fresh listing read → rules.ts check → build → sign → send → confirm.
// Same pipeline as ../actions.ts (runBuilt). The accept side (accept + lock_from_job) is in ../actions.ts runAccept.
import { PublicKey, Transaction } from '@solana/web3.js';
import { runBuilt, runCreate, runFundAction, NOT_NOW, type ActionEnv } from '../actions.ts';
import { ata, createAtaIdempotentIx } from '../chain/ata.ts';
import { fetchUsdcUnits } from '../chain/balance.ts';
import { UserFacingError } from '../chain/errors.ts';
import { sendAndConfirm } from '../chain/send.ts';
import { getConnection } from '../config.ts';
import { USDC_DEVNET_MINT } from '../constants.ts';
import { equalBytes, hashBytes, type BriefDraft } from '../milestone/content.ts';
import { formatUsdc } from '../milestone/format.ts';
import { TOKEN_ACCOUNT_SIZE } from '../milestone/layout.ts';
import type { Region } from '../milestone/view.ts';
import { buildJobBriefTxs, fetchJobBrief, jobBriefBytes } from './brief.ts';
import type { JobListingAccount } from './decode.ts';
import { JOB_APPLICATION_SIZE, JOB_LISTING_SIZE } from './layout.ts';
import * as milestoneClient from '../milestone/client.ts';
import { fundPda } from '../milestone/pda.ts';
import { getFund } from '../milestone/queries.ts';
import * as milestoneRules from '../milestone/rules.ts';
import { buildApplyJobIx, buildPostJobIx, buildSelectJobIx, buildWithdrawJobIx } from './client.ts';
import { jobAppPda } from './pda.ts';
import { getApplication, getJob } from './queries.ts';
import { assertJobDraft, canApply, canSelect, canWithdraw, jobDraftTotal, pitchProblem, type JobDraft } from './rules.ts';

export const POST_JOB_VN_REFUSED = 'Posting a job is not available in the Vietnam view.';

/** post_job confirmed but a brief part did not: the listing exists and its budget is locked; post the brief again */
export class JobBriefNotSavedError extends UserFacingError {
  readonly job: string;
  constructor(job: string) {
    super('The job was published and its budget is locked, but its brief was not saved. Open the job and save the brief again.');
    this.job = job;
  }
}

/** Fresh read of a listing (never act on a stale poll result) */
export async function readJob(address: string | undefined, env: ActionEnv): Promise<JobListingAccount> {
  if (!address) throw new UserFacingError('Open a job first.');
  const job = await getJob(address, env.connection ?? getConnection());
  if (!job) throw new UserFacingError('This job no longer exists.');
  return job;
}

async function sendBriefParts(env: ActionEnv, txs: Transaction[], onPart?: (done: number, total: number) => void): Promise<string[]> {
  const { walletAddress, signTransaction } = env.signer;
  const out: string[] = [];
  for (const tx of txs) {
    onPart?.(out.length, txs.length);
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
  region: Region,
  /** Called before each brief part is sent (0-based), for a "Saving the brief 1 of 2" line */
  onBriefPart?: (done: number, total: number) => void
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
    const briefSignatures = await sendBriefParts(env, buildJobBriefTxs({ job: result.job, business: new PublicKey(env.signer.walletAddress!), bytes }), onBriefPart);
    return { signature: result.signature, job, briefSignatures };
  } catch {
    throw new JobBriefNotSavedError(job);
  }
}

/** Posts the brief again for an open listing (after JobBriefNotSavedError); it must hash to the listing's brief_hash */
export async function runPostJobBrief(
  env: ActionEnv,
  address: string | undefined,
  brief: BriefDraft,
  onBriefPart?: (done: number, total: number) => void
): Promise<{ briefSignatures: string[] }> {
  const { walletAddress } = env.signer;
  if (!walletAddress) throw new UserFacingError('Sign in first.');
  const job = await readJob(address, env);
  if (!job.business.equals(new PublicKey(walletAddress)) || job.state !== 'Open') throw new UserFacingError(NOT_NOW);
  const bytes = jobBriefBytes(job.title, brief);
  if (!equalBytes(hashBytes(bytes), job.briefHash)) throw new UserFacingError('This brief is not the one this job was published with.');
  return { briefSignatures: await sendBriefParts(env, buildJobBriefTxs({ job: job.address, business: job.business, bytes }), onBriefPart) };
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

/** Base units → a plain decimal string unitsFromUsdc reads back exactly (no thousands separator, 6 decimals) */
const plainUsdc = (units: bigint) => `${units / 1_000_000n}.${(units % 1_000_000n).toString().padStart(6, '0')}`;

/**
 * "Select" on the Applicants page: create_fund for the applicant with the listing's title, public brief and
 * template (absolute deadlines from chain time: submit_by = now + work_secs, review_by = submit_by + review_secs),
 * and select_job in the same transaction. The contract key, brief notes and key wraps are the normal runCreate path.
 * On a re-select (the first person did not accept in time), the previous contract is closed in the same transaction,
 * or first on its own when the three do not fit in one transaction, so it can never be accepted later.
 */
export async function runSelectJob(env: ActionEnv, address: string | undefined, freelancer: string) {
  const { walletAddress } = env.signer;
  if (!walletAddress) throw new UserFacingError('Sign in first.');
  const connection = env.connection ?? getConnection();
  const me = new PublicKey(walletAddress);
  const job = await readJob(address, env);
  const now = await env.now();
  if (!canSelect(job, me, now)) throw new UserFacingError(NOT_NOW);
  const applicant = new PublicKey(freelancer);
  if (!(await getApplication(job.address, applicant, connection))) throw new UserFacingError('This person has not applied to this job.');
  const brief = await fetchJobBrief(job, connection);
  if (brief.status !== 'ok' || !brief.brief) throw new UserFacingError('The public brief of this job is missing or does not match. Save the brief again first.');
  const draft = {
    freelancer,
    title: job.title,
    milestones: job.milestones.map((t) => ({ amountUsdc: plainUsdc(t.amount), submitBy: now + t.workSecs, reviewSeconds: t.reviewSecs })),
    brief: { scope: brief.brief.scope, references: brief.brief.references, milestones: brief.brief.milestones },
  };
  if (!equalBytes(hashBytes(jobBriefBytes(job.title, draft.brief)), job.briefHash)) throw new UserFacingError('The public brief of this job does not match. Save the brief again first.');

  // The contract address is only known inside runCreate; select_job needs it, so fix the fund ID here
  const fundId = BigInt(Date.now());
  const fund = fundPda(me, fundId);
  const select = buildSelectJobIx(job.address, me, fund, applicant);

  const previous = job.state === 'Selected' && job.fund ? await getFund(job.fund, connection) : null;
  const closable = previous && milestoneRules.canClose(previous, me) && previous.state !== 'Settled' ? previous : null;
  const before = closable ? (await milestoneClient.buildClose({ fund: closable, creator: me }, connection)).tx.instructions : [];
  let closeSignature: string | undefined;
  let result: Awaited<ReturnType<typeof runCreate>>;
  try {
    result = await runCreate(env, draft, { before, after: [select], fundId });
  } catch (err) {
    if (!before.length || !String((err as Error)?.message).includes('too large')) throw err;
    closeSignature = (await runFundAction(env, closable!.address.toBase58(), 'close')).signature;
    result = await runCreate(env, draft, { after: [select], fundId });
  }
  return { ...result, job: job.address.toBase58(), ...(closeSignature ? { closeSignature } : {}) };
}
