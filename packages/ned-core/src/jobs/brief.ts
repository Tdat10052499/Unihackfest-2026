// Public job brief (funded-jobs-plan.md section 4.3, post_job_brief). The listing stores brief_hash = SHA-256 of the
// canonical brief JSON (the same canonicalBrief as contracts, with the listing title); the JSON itself is posted in
// PLAIN TEXT, split into post_job_brief parts, and read back from the listing's transactions. The selected contract
// is created with the same title and brief, so its brief_hash equals the listing's.
import { Buffer } from 'buffer';
import { PublicKey, Transaction, type Connection } from '@solana/web3.js';
import idl from '../idl/ned_program.json' with { type: 'json' };
import { buildIx, encodeIx } from '../chain/idl.ts';
import { getConnection, getProgramId } from '../config.ts';
import { canonicalBrief, contentBytes, equalBytes, hashBytes, parseBrief, type Brief, type BriefDraft } from '../milestone/content.ts';
import { coder } from '../milestone/decode.ts';
import { NOTE_MAX_LEN, NOTE_MAX_PARTS } from '../milestone/layout.ts';
import { joinParts, splitParts } from '../milestone/notes.ts';
import type { JobListingAccount } from './decode.ts';

/** Canonical brief bytes of a job (UTF-8 JSON) */
export const jobBriefBytes = (title: string, brief: BriefDraft) => contentBytes(canonicalBrief(title, brief));

/** post_job_brief parts of a brief: at most NOTE_MAX_LEN bytes each, at most NOTE_MAX_PARTS parts */
export function jobBriefParts(bytes: Uint8Array): Uint8Array[] {
  if (!bytes.length) throw new Error('Empty brief');
  const parts = splitParts(bytes, NOTE_MAX_LEN);
  if (parts.length > NOTE_MAX_PARTS) throw new Error('The brief is too long to publish. Shorten the scope or the done-when points.');
  return parts;
}

/** One post_job_brief transaction per part, signed by the business */
export function buildJobBriefTxs(p: { job: PublicKey; business: PublicKey; bytes: Uint8Array }): Transaction[] {
  const parts = jobBriefParts(p.bytes);
  return parts.map((data, part) =>
    new Transaction().add(
      buildIx(idl, getProgramId(), 'post_job_brief', { job: p.job, business: p.business }, encodeIx(coder, 'post_job_brief', { part, parts: parts.length, data: Buffer.from(data) }))
    )
  );
}

export interface JobBriefRecord {
  signature: string;
  slot: number;
  /** Order inside one transaction */
  position: number;
  part: number;
  parts: number;
  data: Uint8Array;
}

type BriefConnection = Pick<Connection, 'getSignaturesForAddress' | 'getTransactions'>;

/**
 * Every post_job_brief part posted for the listing by its business, oldest first. Skips failed transactions,
 * other programs and instructions, and parts for another job or signed by someone else.
 */
export async function fetchJobBriefRecords(job: Pick<JobListingAccount, 'address' | 'business'>, conn: BriefConnection = getConnection()): Promise<JobBriefRecord[]> {
  const programId = getProgramId();
  const sigs = (await conn.getSignaturesForAddress(job.address, { limit: 1000 }, 'confirmed')).filter((s) => !s.err);
  const records: JobBriefRecord[] = [];
  for (let i = 0; i < sigs.length; i += 100) {
    const batch = sigs.slice(i, i + 100);
    const txs = await conn.getTransactions(batch.map((s) => s.signature), { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    txs.forEach((tx, j) => {
      if (!tx || tx.meta?.err) return;
      const message = tx.transaction.message;
      const keys = message.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses });
      message.compiledInstructions.forEach((ix, position) => {
        if (!keys.get(ix.programIdIndex)?.equals(programId)) return;
        let decoded: ReturnType<typeof coder.instruction.decode> = null;
        try {
          decoded = coder.instruction.decode(Buffer.from(ix.data));
        } catch {
          return;
        }
        if (decoded?.name !== 'post_job_brief') return;
        if (!keys.get(ix.accountKeyIndexes[0])?.equals(job.address) || !keys.get(ix.accountKeyIndexes[1])?.equals(job.business)) return;
        const a = decoded.data as { part: number; parts: number; data: Uint8Array };
        records.push({ signature: batch[j].signature, slot: tx.slot, position, part: a.part, parts: a.parts, data: Uint8Array.from(a.data) });
      });
    });
  }
  // getSignaturesForAddress is newest first; sort oldest first (slot, then the order the RPC returned within a slot)
  const order = new Map(sigs.map((s, k) => [s.signature, sigs.length - k]));
  return records.sort((a, b) => a.slot - b.slot || order.get(a.signature)! - order.get(b.signature)! || a.position - b.position);
}

/** Complete sets in chain order: a set collects parts 0..parts-1 of one count; a repeated position starts a new set */
export function completeBriefSets(records: JobBriefRecord[]): Uint8Array[] {
  const sets: Uint8Array[] = [];
  let current: { parts: number; chunks: Map<number, Uint8Array> } | null = null;
  for (const r of records) {
    if (r.parts < 1 || r.part >= r.parts) continue;
    if (!current || current.parts !== r.parts || current.chunks.has(r.part)) current = { parts: r.parts, chunks: new Map() };
    current.chunks.set(r.part, r.data);
    if (current.chunks.size === current.parts) {
      sets.push(joinParts(Array.from({ length: current.parts }, (_, k) => current!.chunks.get(k)!)));
      current = null;
    }
  }
  return sets;
}

export type JobBriefStatus = 'ok' | 'mismatch' | 'missing';
export interface JobBriefResult {
  status: JobBriefStatus;
  /** Only when status is 'ok' */
  brief?: Brief;
  /** SHA-256 of the brief that is shown (equals the listing's brief_hash when 'ok') */
  shownBriefHash?: Uint8Array;
}

/** The latest complete set wins: 'ok' when it hashes to brief_hash and parses, 'mismatch' otherwise, 'missing' with none */
export function readJobBrief(briefHash: Uint8Array, records: JobBriefRecord[]): JobBriefResult {
  const sets = completeBriefSets(records);
  const latest = sets[sets.length - 1];
  if (!latest) return { status: 'missing' };
  const hash = hashBytes(latest);
  const brief = parseBrief(new TextDecoder().decode(latest));
  if (!brief || !equalBytes(hash, briefHash)) return { status: 'mismatch' };
  return { status: 'ok', brief, shownBriefHash: hash };
}

/** Reads the public brief of a listing and checks it against brief_hash */
export async function fetchJobBrief(job: Pick<JobListingAccount, 'address' | 'business' | 'briefHash'>, conn: BriefConnection = getConnection()): Promise<JobBriefResult> {
  return readJobBrief(job.briefHash, await fetchJobBriefRecords(job, conn));
}
