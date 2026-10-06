// Encrypted brief and delivery notes (build-plan B1, program-spec row 13). A note is the canonical JSON of a brief
// or a delivery, encrypted with XChaCha20-Poly1305 under the contract key K and posted as one or more post_note
// parts. Part data: byte 0 version · 4-byte set ID · 24-byte nonce · ciphertext with tag.
// Associated data = fund ‖ kind ‖ milestone ‖ setId ‖ part ‖ parts, so a part cannot be moved to another contract,
// milestone, set or position. A set counts only if its plaintext hash equals the on-chain hash; never "the newest".
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { PublicKey, type Connection, type TransactionInstruction } from '@solana/web3.js';
import idl from '../idl/ned_program.json' with { type: 'json' };
import { buildIx, encodeIx } from '../chain/idl.ts';
import { getConnection, getProgramId } from '../config.ts';
import { parseBrief, parseDelivery, parseReview, type Brief, type Delivery, type Review } from './content.ts';
import { coder, type FundAccount } from './decode.ts';
import { NOTE_MAX_LEN, NOTE_MAX_PARTS } from './layout.ts';

export const NOTE_VERSION = 1;
export const NOTE_KIND_BRIEF = 0;
export const NOTE_KIND_DELIVERY = 1;
/** Client's review when requesting changes (D27, program v1.3): Submitted or Disputed milestones */
export const NOTE_KIND_REVIEW = 3;
/** Encrypted note kinds (kind 2, key wraps, lives in devicekeys.ts) */
export type NoteKind = typeof NOTE_KIND_BRIEF | typeof NOTE_KIND_DELIVERY | typeof NOTE_KIND_REVIEW;

const SET_ID_BYTES = 4;
const NONCE_BYTES = 24;
const TAG_BYTES = 16;
/** version + set ID + nonce + tag */
export const NOTE_PART_OVERHEAD = 1 + SET_ID_BYTES + NONCE_BYTES + TAG_BYTES;
/** Plaintext bytes per part so that one part's data is at most NOTE_MAX_LEN (900) bytes */
export const NOTE_PART_PLAINTEXT = NOTE_MAX_LEN - NOTE_PART_OVERHEAD;
/** Largest note: 8 parts */
export const NOTE_MAX_PLAINTEXT = NOTE_PART_PLAINTEXT * NOTE_MAX_PARTS;

export interface NoteHeader {
  fund: PublicKey;
  kind: NoteKind;
  milestone: number;
  setId: Uint8Array;
  part: number;
  parts: number;
}

/** fund ‖ kind ‖ milestone ‖ setId ‖ part ‖ parts */
export function associatedData(h: NoteHeader): Uint8Array {
  const ad = new Uint8Array(32 + 1 + 1 + SET_ID_BYTES + 1 + 1);
  ad.set(h.fund.toBytes(), 0);
  ad[32] = h.kind;
  ad[33] = h.milestone;
  ad.set(h.setId, 34);
  ad[38] = h.part;
  ad[39] = h.parts;
  return ad;
}

const random = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

/** One encrypted part as post_note data */
export function encryptNote(key: Uint8Array, header: NoteHeader, plaintext: Uint8Array, nonce: Uint8Array = random(NONCE_BYTES)): Uint8Array {
  const sealed = xchacha20poly1305(key, nonce, associatedData(header)).encrypt(plaintext);
  const out = new Uint8Array(1 + SET_ID_BYTES + NONCE_BYTES + sealed.length);
  out[0] = NOTE_VERSION;
  out.set(header.setId, 1);
  out.set(nonce, 1 + SET_ID_BYTES);
  out.set(sealed, 1 + SET_ID_BYTES + NONCE_BYTES);
  return out;
}

/** Set ID of a part's data (bytes 1–4), or null when the data is not a version-1 note */
export function noteSetId(data: Uint8Array): Uint8Array | null {
  return data.length > NOTE_PART_OVERHEAD && data[0] === NOTE_VERSION ? data.slice(1, 1 + SET_ID_BYTES) : null;
}

/** Throws on a wrong key, a changed byte, or a part moved to another fund / kind / milestone / set / position */
export function decryptNote(key: Uint8Array, header: Omit<NoteHeader, 'setId'>, data: Uint8Array): Uint8Array {
  const setId = noteSetId(data);
  if (!setId) throw new Error('Not a note');
  const nonce = data.slice(1 + SET_ID_BYTES, 1 + SET_ID_BYTES + NONCE_BYTES);
  return xchacha20poly1305(key, nonce, associatedData({ ...header, setId })).decrypt(data.slice(1 + SET_ID_BYTES + NONCE_BYTES));
}

/** Splits bytes into chunks of at most `max` bytes (at least one chunk) */
export function splitParts(bytes: Uint8Array, max: number = NOTE_PART_PLAINTEXT): Uint8Array[] {
  if (max < 1) throw new Error('Part size must be positive');
  const parts: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += max) parts.push(bytes.slice(i, i + max));
  return parts.length ? parts : [new Uint8Array(0)];
}

export function joinParts(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export interface EncryptedNote {
  setId: Uint8Array;
  kind: NoteKind;
  milestone: number;
  /** post_note data per part, each ≤ NOTE_MAX_LEN */
  parts: Uint8Array[];
}

/** Encrypts a whole note (canonical JSON bytes) into post_note parts under a fresh random set ID */
export function encryptNoteParts(key: Uint8Array, fund: PublicKey, kind: NoteKind, milestone: number, plaintext: Uint8Array): EncryptedNote {
  if (!plaintext.length) throw new Error('Empty note');
  const chunks = splitParts(plaintext);
  if (chunks.length > NOTE_MAX_PARTS) throw new Error('This text is too long to save with the contract. Shorten it and try again.');
  const setId = random(SET_ID_BYTES);
  const parts = chunks.map((chunk, part) => encryptNote(key, { fund, kind, milestone, setId, part, parts: chunks.length }, chunk));
  return { setId, kind, milestone, parts };
}

/** post_note instruction for one part (author = client for a brief, freelancer for a delivery) */
export function buildPostNote(p: { fund: PublicKey; author: PublicKey; kind: NoteKind; milestone: number; part: number; parts: number; data: Uint8Array }): TransactionInstruction {
  return buildIx(
    idl,
    getProgramId(),
    'post_note',
    { fund: p.fund, author: p.author },
    encodeIx(coder, 'post_note', { kind: p.kind, milestone: p.milestone, part: p.part, parts: p.parts, data: Buffer.from(p.data) })
  );
}

// ---- Reading notes back from the chain ----

export interface NoteRecord {
  signature: string;
  slot: number;
  author: PublicKey;
  kind: number;
  milestone: number;
  part: number;
  parts: number;
  data: Uint8Array;
  /** Block time of the transaction (unix seconds), when the RPC has it */
  blockTime?: number;
}

type NotesConnection = Pick<Connection, 'getSignaturesForAddress' | 'getTransactions'>;

/**
 * Every post_note part posted for `fund`, oldest first: getSignaturesForAddress(fund) + getTransactions. Skips failed
 * transactions, instructions of other programs, and post_note instructions for another fund.
 */
export async function fetchNotes(fund: PublicKey, conn: NotesConnection = getConnection()): Promise<NoteRecord[]> {
  const programId = getProgramId();
  const sigs = (await conn.getSignaturesForAddress(fund, { limit: 1000 }, 'confirmed')).filter((s) => !s.err);
  const records: NoteRecord[] = [];
  for (let i = 0; i < sigs.length; i += 100) {
    const batch = sigs.slice(i, i + 100);
    const txs = await conn.getTransactions(batch.map((s) => s.signature), { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    txs.forEach((tx, j) => {
      if (!tx || tx.meta?.err) return;
      const message = tx.transaction.message;
      const keys = message.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses });
      for (const ix of message.compiledInstructions) {
        if (!keys.get(ix.programIdIndex)?.equals(programId)) continue;
        let decoded: ReturnType<typeof coder.instruction.decode> = null;
        try {
          decoded = coder.instruction.decode(Buffer.from(ix.data));
        } catch {
          continue;
        }
        if (decoded?.name !== 'post_note') continue;
        const ixFund = keys.get(ix.accountKeyIndexes[0]);
        const author = keys.get(ix.accountKeyIndexes[1]);
        if (!ixFund?.equals(fund) || !author) continue;
        const a = decoded.data as { kind: number; milestone: number; part: number; parts: number; data: Uint8Array };
        const blockTime = tx.blockTime ?? batch[j].blockTime ?? undefined;
        records.push({
          signature: batch[j].signature,
          slot: tx.slot,
          author,
          kind: a.kind,
          milestone: a.milestone,
          part: a.part,
          parts: a.parts,
          data: Uint8Array.from(a.data),
          ...(blockTime ? { blockTime } : {}),
        });
      }
    });
  }
  return records.sort((a, b) => a.slot - b.slot);
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

interface NoteSet {
  kind: number;
  milestone: number;
  /** Plaintext of a complete, decryptable set */
  plaintext: Uint8Array;
  hash: Uint8Array;
  /** Of the last part on the chain (the moment the set became complete) */
  slot: number;
  signature: string;
  blockTime?: number;
}

/** The author the program checked must match the role of the kind: client for brief and review, freelancer for delivery */
function authorAllowed(fund: FundAccount, r: NoteRecord): boolean {
  if (r.kind === NOTE_KIND_BRIEF || r.kind === NOTE_KIND_REVIEW) return r.author.equals(fund.client);
  if (r.kind === NOTE_KIND_DELIVERY) return r.author.equals(fund.freelancer);
  return false;
}

/** Complete sets that decrypt under `key`, from parts whose author is allowed for their kind */
export function openNoteSets(fund: FundAccount, records: NoteRecord[], key: Uint8Array): NoteSet[] {
  const groups = new Map<string, NoteRecord[]>();
  for (const r of records) {
    const setId = noteSetId(r.data);
    if (!authorAllowed(fund, r) || !setId) continue;
    const id = `${r.kind}:${r.milestone}:${hex(setId)}`;
    groups.set(id, [...(groups.get(id) ?? []), r]);
  }
  const sets: NoteSet[] = [];
  for (const parts of groups.values()) {
    const { kind, milestone, parts: count } = parts[0];
    // The first copy of each position counts; a set with a missing position or mixed counts is incomplete
    const byPart = new Map<number, NoteRecord>();
    parts.forEach((p) => p.parts === count && !byPart.has(p.part) && byPart.set(p.part, p));
    if (byPart.size !== count) continue;
    try {
      const plain = Array.from({ length: count }, (_, part) =>
        decryptNote(key, { fund: fund.address, kind: kind as NoteKind, milestone, part, parts: count }, byPart.get(part)!.data)
      );
      const plaintext = joinParts(plain);
      const last = [...byPart.values()].reduce((a, b) => (b.slot > a.slot ? b : a));
      sets.push({ kind, milestone, plaintext, hash: sha256(plaintext), slot: last.slot, signature: last.signature, ...(last.blockTime ? { blockTime: last.blockTime } : {}) });
    } catch {
      // wrong key or tampered part: this set does not count
    }
  }
  return sets;
}

export type ContentStatus = 'ok' | 'mismatch' | 'noKey' | 'missing' | 'loading';

export interface ContractContent {
  brief?: Brief;
  contentStatus: Exclude<ContentStatus, 'loading'>;
  /** SHA-256 of the brief that is shown (equals the on-chain brief_hash when contentStatus is 'ok') */
  shownBriefHash?: Uint8Array;
  /** Per submitted milestone: the delivery whose hash equals the on-chain evidence, if any */
  deliveries: Record<number, { content?: Delivery; matches: boolean }>;
  /** D27: per milestone, every delivery (first, revisions, handover) and review, oldest first. Empty without the key */
  history: Record<number, MilestoneHistory>;
}

export interface NoteEntry {
  signature: string;
  slot: number;
  /** unix seconds, when known */
  time?: number;
}
export interface DeliveryEntry extends NoteEntry {
  content: Delivery;
  stage: 'first' | 'revision' | 'handover';
  /** For a first delivery: its hash equals the on-chain evidence. Revisions and handovers have no on-chain hash */
  matches: boolean;
}
export interface ReviewEntry extends NoteEntry {
  content: Review;
}
export interface MilestoneHistory {
  deliveries: DeliveryEntry[];
  reviews: ReviewEntry[];
}

/** A revision posted after the latest review (or any revision when there is no review) */
export function revisionAfterLatestReview(h: MilestoneHistory | undefined): boolean {
  if (!h) return false;
  const lastReview = h.reviews.length ? h.reviews[h.reviews.length - 1].slot : -1;
  return h.deliveries.some((d) => d.stage === 'revision' && d.slot > lastReview);
}
export const handoverSent = (h: MilestoneHistory | undefined) => Boolean(h?.deliveries.some((d) => d.stage === 'handover'));

function historyOf(fund: FundAccount, sets: NoteSet[]): Record<number, MilestoneHistory> {
  const out: Record<number, MilestoneHistory> = {};
  const entry = (s: NoteSet): NoteEntry => ({ signature: s.signature, slot: s.slot, ...(s.blockTime ? { time: s.blockTime } : {}) });
  const slotOf = (m: number) => (out[m] ??= { deliveries: [], reviews: [] });
  for (const s of [...sets].sort((a, b) => a.slot - b.slot)) {
    if (s.milestone >= fund.milestoneCount) continue;
    const text = new TextDecoder().decode(s.plaintext);
    if (s.kind === NOTE_KIND_DELIVERY) {
      const content = parseDelivery(text);
      if (!content) continue;
      const evidence = fund.milestones[s.milestone]?.evidence;
      slotOf(s.milestone).deliveries.push({ ...entry(s), content, stage: content.stage ?? 'first', matches: !content.stage && Boolean(evidence) && equal(s.hash, evidence) });
    } else if (s.kind === NOTE_KIND_REVIEW) {
      const content = parseReview(text);
      if (content) slotOf(s.milestone).reviews.push({ ...entry(s), content });
    }
  }
  return out;
}

/**
 * Brief and deliveries of a fund from its notes. Only a set whose plaintext hash equals the on-chain hash is shown;
 * other sets make the status "mismatch" (brief) or matches = false (delivery), whatever their order.
 */
export function readContractContent(fund: FundAccount, records: NoteRecord[], key: Uint8Array | null): ContractContent {
  const hasBriefNotes = records.some((r) => r.kind === NOTE_KIND_BRIEF && r.author.equals(fund.client));
  const submitted = fund.milestones.filter((m) => m.submittedAt > 0);
  if (!key) {
    return {
      contentStatus: hasBriefNotes ? 'noKey' : 'missing',
      deliveries: Object.fromEntries(submitted.map((m) => [m.index, { matches: false }])),
      history: {},
    };
  }
  const sets = openNoteSets(fund, records, key);
  const briefSet = sets.find((s) => s.kind === NOTE_KIND_BRIEF && s.milestone === 0 && equal(s.hash, fund.briefHash));
  const brief = briefSet ? parseBrief(new TextDecoder().decode(briefSet.plaintext)) : null;
  const deliveries: ContractContent['deliveries'] = {};
  for (const m of submitted) {
    const set = sets.find((s) => s.kind === NOTE_KIND_DELIVERY && s.milestone === m.index && equal(s.hash, m.evidence));
    const content = set ? parseDelivery(new TextDecoder().decode(set.plaintext)) : null;
    deliveries[m.index] = content ? { content, matches: true } : { matches: false };
  }
  const history = historyOf(fund, sets);
  if (brief && briefSet) return { brief, contentStatus: 'ok', shownBriefHash: briefSet.hash, deliveries, history };
  return { contentStatus: hasBriefNotes ? 'mismatch' : 'missing', deliveries, history };
}
