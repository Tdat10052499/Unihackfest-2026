// Unsigned instruction builders for the job instructions (program v1.4: post_job_open and fund_job added). Account order and Borsh encoding come
// from the IDL, like milestone/client.ts. No sending here; actions.ts and jobs/actions.ts send.
import { PublicKey, type TransactionInstruction } from '@solana/web3.js';
import idl from '../idl/ned_program.json' with { type: 'json' };
import { ata } from '../chain/ata.ts';
import { buildIx, encodeIx, toBN } from '../chain/idl.ts';
import { getProgramId } from '../config.ts';
import { TOKEN_PROGRAM_ID, USDC_DEVNET_MINT } from '../constants.ts';
import { coder } from '../milestone/decode.ts';
import { unitsFromUsdc } from '../milestone/format.ts';
import { vaultPda } from '../milestone/pda.ts';
import { jobAppPda, jobPda, jobVaultPda } from './pda.ts';
import type { JobDraft } from './rules.ts';
import { skillsMask } from './taxonomy.ts';

const jobIx = (name: string, accounts: Record<string, PublicKey>, args: Record<string, unknown> = {}): TransactionInstruction =>
  buildIx(idl, getProgramId(), name, { token_program: TOKEN_PROGRAM_ID, ...accounts }, encodeIx(coder, name, args));

/**
 * post_job for a validated draft (locks the total now), or post_job_open with `lockNow: false` (v1.4: same arguments and
 * accounts, nothing locked until fund_job at selection)
 */
export function buildPostJobIx(p: { business: PublicKey; jobId: bigint; draft: JobDraft; briefHash: Uint8Array; payer?: PublicKey; lockNow?: boolean }): { ix: TransactionInstruction; job: PublicKey } {
  const job = jobPda(p.business, p.jobId);
  const ix = jobIx(
    p.lockNow === false ? 'post_job_open' : 'post_job',
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

/** fund_job (v1.4): locks the stored total of a "locks when hired" listing; sent first in the select transaction */
export const buildFundJobIx = (job: PublicKey, business: PublicKey) =>
  jobIx('fund_job', { job, business, job_vault: jobVaultPda(job), business_token: ata(USDC_DEVNET_MINT, business) });

/** select_job: sent right after create_fund in the same transaction; `freelancer` is the contract's freelancer */
export const buildSelectJobIx = (job: PublicKey, business: PublicKey, fund: PublicKey, freelancer: PublicKey) =>
  jobIx('select_job', { job, business, fund, application: jobAppPda(job, freelancer) });

/** lock_from_job: sent right after accept in the same transaction (or alone); anyone may sign as `caller` */
export const buildLockFromJobIx = (p: { job: PublicKey; business: PublicKey; fund: PublicKey; caller: PublicKey }) =>
  jobIx('lock_from_job', {
    job: p.job,
    fund: p.fund,
    job_vault: jobVaultPda(p.job),
    vault: vaultPda(p.fund),
    business: p.business,
    business_token: ata(USDC_DEVNET_MINT, p.business),
    caller: p.caller,
  });

export const buildWithdrawJobIx = (job: PublicKey, business: PublicKey) =>
  jobIx('withdraw_job', { job, business, job_vault: jobVaultPda(job), business_token: ata(USDC_DEVNET_MINT, business) });
