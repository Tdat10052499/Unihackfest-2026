// Records (build-plan B5 = refactor-plan PR6): milestones released to the signed-in freelancer, kept per wallet in
// `@ned_records_v1:<wallet>`. Sources:
//   1. open contracts: a released milestone without a record → read that contract's transactions for the date,
//      the release transaction and the amount;
//   2. the wallet's own history: the freelancer signs `accept`, so its signatures list every contract it joined,
//      including contracts closed on another device. Each closed contract is read once.
// No brief text and no key here: titles come from the chain (create_fund) and are public already.
import { Buffer } from 'buffer';
import { PublicKey, type Connection, type VersionedTransactionResponse } from '@solana/web3.js';
import { getProgramId } from '../config.ts';
import { USD_VND_RATE, USD_VND_RATE_DATE } from '../constants.ts';
import idl from '../idl/ned_program.json' with { type: 'json' };
import { coder, type FundAccount } from './decode.ts';
import { usdcFromUnits, vndFromUnits } from './format.ts';
import type { KeyStorage } from './keys.ts';

export const RECORDS_PREFIX = '@ned_records_v1:';
/** Wallet signatures read on the first scan; later scans read only newer ones */
export const FIRST_SCAN_LIMIT = 100;
const FUND_SCAN_LIMIT = 100;
const TX_CHUNK = 5;

export interface ReleaseRecord {
  /** `${fund}:${index}` */
  id: string;
  fund: string;
  index: number;
  title: string;
  client: string;
  /** base units, as a decimal string (JSON has no bigint) */
  amountUnits: string;
  /** unix seconds, block time of the release */
  releasedAt: number;
  /** the approve / release_after_review transaction */
  signature: string;
  destination: 'ownWallet' | 'payoutPartner';
  /** F1: Accept & release (approve) or Release now (release_after_review); absent in records saved before */
  by?: 'approve' | 'releaseNow';
}

export interface RecordsCache {
  v: 1;
  records: ReleaseRecord[];
  /** contracts this wallet accepted (from its history) */
  accepted: string[];
  /** accepted contracts that are closed and were read in full */
  done: string[];
  /** newest wallet signature already scanned */
  until?: string;
}

export const emptyRecords = (): RecordsCache => ({ v: 1, records: [], accepted: [], done: [] });

export async function loadRecords(storage: KeyStorage, wallet: string): Promise<RecordsCache> {
  try {
    const raw = await storage.getItem(RECORDS_PREFIX + wallet);
    const parsed = raw ? (JSON.parse(raw) as RecordsCache) : null;
    if (parsed?.v === 1 && Array.isArray(parsed.records)) return { ...emptyRecords(), ...parsed };
  } catch {
    // a broken cache is rebuilt from the chain
  }
  return emptyRecords();
}

export async function saveRecords(storage: KeyStorage, wallet: string, cache: RecordsCache): Promise<void> {
  await storage.setItem(RECORDS_PREFIX + wallet, JSON.stringify(cache));
}

// ---- reading transactions ----

type TxConnection = Pick<Connection, 'getSignaturesForAddress' | 'getTransactions'>;

export interface ProgramIx {
  name: string;
  data: Record<string, unknown>;
  accounts: string[];
}

/** Top-level ned_program instructions of a successful transaction, decoded with the IDL */
export function programInstructions(tx: VersionedTransactionResponse | null, programId: PublicKey = getProgramId()): ProgramIx[] {
  if (!tx || tx.meta?.err) return [];
  const message = tx.transaction.message;
  const keys = message.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses ?? undefined });
  const out: ProgramIx[] = [];
  for (const ix of message.compiledInstructions) {
    if (!keys.get(ix.programIdIndex)?.equals(programId)) continue;
    const accounts = ix.accountKeyIndexes.map((i) => keys.get(i)?.toBase58() ?? '');
    const decoded = decodeIx(Buffer.from(ix.data));
    if (decoded) out.push({ ...decoded, accounts });
  }
  return out;
}

const CREATE_FUND = Buffer.from((idl.instructions.find((i) => i.name === 'create_fund') as { discriminator: number[] }).discriminator);

/** IDL decode; v1 contracts (before brief_hash) still give create_fund's title (fund_id u64, freelancer, title) */
function decodeIx(data: Buffer): { name: string; data: Record<string, unknown> } | null {
  try {
    const decoded = coder.instruction.decode(data);
    if (decoded) return { name: decoded.name, data: decoded.data as Record<string, unknown> };
  } catch {
    // older layout
  }
  if (data.length >= 52 && data.subarray(0, 8).equals(CREATE_FUND)) {
    const len = data.readUInt32LE(48);
    if (len <= 32 && data.length >= 52 + len) return { name: 'create_fund', data: { title: data.subarray(52, 52 + len).toString('utf8') } };
  }
  return null;
}

async function transactions(conn: TxConnection, signatures: string[]): Promise<(VersionedTransactionResponse | null)[]> {
  const out: (VersionedTransactionResponse | null)[] = [];
  for (let i = 0; i < signatures.length; i += TX_CHUNK) {
    const chunk = signatures.slice(i, i + TX_CHUNK);
    for (let attempt = 0; ; attempt++) {
      try {
        out.push(...(await conn.getTransactions(chunk, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })));
        break;
      } catch (err) {
        // rate limit (429): wait and try again, then give up for this sync
        if (attempt >= 3) throw err;
        await new Promise((resolve) => setTimeout(resolve, 600 * 2 ** attempt));
      }
    }
  }
  return out;
}

/** Token amount that `account` gained in this transaction (base units) */
function received(tx: VersionedTransactionResponse, account: string): bigint {
  const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses ?? undefined });
  let index = -1;
  for (let i = 0; i < keys.length; i++) if (keys.get(i)?.toBase58() === account) index = i;
  const amount = (list?: { accountIndex: number; uiTokenAmount: { amount: string } }[] | null) =>
    BigInt(list?.find((b) => b.accountIndex === index)?.uiTokenAmount.amount ?? '0');
  return amount(tx.meta?.postTokenBalances) - amount(tx.meta?.preTokenBalances);
}

const RELEASES = new Set(['approve', 'release_after_review']);

/** The contract an instruction acts on: create_fund has it third; lock_from_job (v1.3) second, after the job */
export function fundOfInstruction(ix: ProgramIx): string | undefined {
  if (ix.name === 'create_fund') return ix.accounts[2];
  if (ix.name === 'lock_from_job') return ix.accounts[1];
  return ix.accounts[0];
}

/** Timeline step of each contract instruction; lock_from_job (the job's budget moving in) is the lock step */
export const HISTORY_STEP: Record<string, 'created' | 'accepted' | 'locked' | 'submitted' | 'changesRequested' | 'released' | 'refunded' | 'settledBySplit' | 'note'> = {
  create_fund: 'created',
  accept: 'accepted',
  lock: 'locked',
  lock_from_job: 'locked',
  submit: 'submitted',
  dispute: 'changesRequested',
  approve: 'released',
  release_after_review: 'released',
  refund: 'refunded',
  concede: 'refunded',
  accept_cancel: 'settledBySplit',
  post_note: 'note',
};

export interface HistoryEntry {
  step: (typeof HISTORY_STEP)[string];
  instruction: string;
  /** milestone index for per-milestone steps */
  index?: number;
  signature: string;
  time: number;
}

/** A contract's steps in chain order (oldest first), from its transactions; works for closed contracts too */
export async function readFundHistory(conn: TxConnection, fund: string): Promise<HistoryEntry[]> {
  const sigs = await conn.getSignaturesForAddress(new PublicKey(fund), { limit: FUND_SCAN_LIMIT }, 'confirmed');
  const ok = sigs.filter((s) => !s.err).reverse();
  const txs = await transactions(conn, ok.map((s) => s.signature));
  const out: HistoryEntry[] = [];
  txs.forEach((tx, i) => {
    for (const ix of programInstructions(tx)) {
      const step = HISTORY_STEP[ix.name];
      if (!step || step === 'note' || fundOfInstruction(ix) !== fund) continue;
      const index = ix.data.index === undefined ? undefined : Number(ix.data.index);
      out.push({ step, instruction: ix.name, ...(index !== undefined ? { index } : {}), signature: ok[i].signature, time: tx?.blockTime ?? ok[i].blockTime ?? 0 });
    }
  });
  return out;
}

/**
 * Every release in one contract's history. Works for closed contracts too (signatures stay on the chain).
 * `open`, when given, supplies the title, client, payout kind and amounts that the history might not reach.
 */
export async function readFundReleases(conn: TxConnection, fund: string, open?: FundAccount): Promise<ReleaseRecord[]> {
  const sigs = await conn.getSignaturesForAddress(new PublicKey(fund), { limit: FUND_SCAN_LIMIT }, 'confirmed');
  const ok = sigs.filter((s) => !s.err).reverse(); // oldest first
  const txs = await transactions(conn, ok.map((s) => s.signature));
  let title = open?.title ?? '';
  let client = open?.client.toBase58() ?? '';
  let destination: ReleaseRecord['destination'] = open?.payoutKind === 'PayoutPartner' ? 'payoutPartner' : 'ownWallet';
  const out: ReleaseRecord[] = [];
  txs.forEach((tx, i) => {
    for (const ix of programInstructions(tx)) {
      if (fundOfInstruction(ix) !== fund) continue;
      if (ix.name === 'create_fund') {
        title ||= String(ix.data.title ?? '');
        client ||= ix.accounts[0];
      } else if (ix.name === 'accept' && !open) {
        destination = Object.keys(ix.data.payout_kind as object)[0] === 'PayoutPartner' ? 'payoutPartner' : 'ownWallet';
      } else if (RELEASES.has(ix.name) && tx) {
        const index = Number(ix.data.index);
        const amount = open?.milestones[index]?.amount ?? received(tx, ix.accounts[3]);
        out.push({
          id: `${fund}:${index}`,
          fund,
          index,
          title: '',
          client: '',
          amountUnits: amount.toString(),
          releasedAt: tx.blockTime ?? ok[i].blockTime ?? 0,
          signature: ok[i].signature,
          destination,
          by: ix.name === 'approve' ? 'approve' : 'releaseNow',
        });
      }
    }
  });
  return out.map((r) => ({ ...r, title: title || 'Contract', client, destination }));
}

/** Contracts that `wallet` accepted, from its signatures newer than `until`; `newest` is the next `until` */
export async function readAcceptedFunds(
  conn: TxConnection,
  wallet: string,
  until?: string
): Promise<{ funds: string[]; newest?: string }> {
  const sigs = await conn.getSignaturesForAddress(new PublicKey(wallet), until ? { until } : { limit: FIRST_SCAN_LIMIT }, 'confirmed');
  const ok = sigs.filter((s) => !s.err);
  const txs = await transactions(conn, ok.map((s) => s.signature));
  const funds = new Set<string>();
  for (const tx of txs)
    for (const ix of programInstructions(tx)) if (ix.name === 'accept' && ix.accounts[1] === wallet) funds.add(ix.accounts[0]);
  return { funds: [...funds], newest: sigs[0]?.signature ?? until };
}

/**
 * Brings the cache up to date. `open` are the open contracts where `wallet` is the freelancer.
 * Returns the same object when nothing changed.
 */
export async function syncRecords(conn: TxConnection, wallet: string, open: FundAccount[], cache: RecordsCache): Promise<RecordsCache> {
  const have = new Set(cache.records.map((r) => r.id));
  const add: ReleaseRecord[] = [];
  const openByAddress = new Map(open.map((f) => [f.address.toBase58(), f]));

  // 1. open contracts with a released milestone that has no record yet
  for (const [address, f] of openByAddress) {
    if (f.freelancer.toBase58() !== wallet) continue;
    if (!f.milestones.some((m) => m.status === 'Released' && !have.has(`${address}:${m.index}`))) continue;
    add.push(...(await readFundReleases(conn, address, f)));
  }

  // 2. contracts from the wallet's history that are closed now and not read yet
  const scan = await readAcceptedFunds(conn, wallet, cache.until);
  const accepted = [...new Set([...cache.accepted, ...scan.funds])];
  const done = new Set(cache.done);
  for (const address of accepted) {
    if (done.has(address) || openByAddress.has(address)) continue;
    add.push(...(await readFundReleases(conn, address)));
    done.add(address);
  }

  const fresh = add.filter((r) => !have.has(r.id) && (have.add(r.id), true));
  if (!fresh.length && scan.newest === cache.until && accepted.length === cache.accepted.length && done.size === cache.done.length)
    return cache;
  return {
    v: 1,
    records: [...cache.records, ...fresh].sort((a, b) => b.releasedAt - a.releasedAt),
    accepted,
    done: [...done],
    ...(scan.newest ? { until: scan.newest } : {}),
  };
}

// ---- grouping and export ----

export interface RecordMonth {
  /** "2026-10" */
  key: string;
  /** "October 2026" */
  label: string;
  records: ReleaseRecord[];
  totalUnits: bigint;
}

/** Newest month first, newest record first (device time zone) */
export function groupByMonth(records: ReleaseRecord[]): RecordMonth[] {
  const months = new Map<string, RecordMonth>();
  for (const r of [...records].sort((a, b) => b.releasedAt - a.releasedAt)) {
    const d = new Date(r.releasedAt * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let m = months.get(key);
    if (!m) {
      m = { key, label: d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }), records: [], totalUnits: 0n };
      months.set(key, m);
    }
    m.records.push(r);
    m.totalUnits += BigInt(r.amountUnits);
  }
  return [...months.values()];
}

export const txExplorerUrl = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEADER = [
  'date_utc',
  'contract',
  'milestone',
  'title',
  'from_wallet',
  'amount_usdc',
  'amount_vnd_estimate',
  'usd_vnd_rate',
  'rate_date',
  'released_to',
  'transaction',
  'note',
];

/** F2 (compliance fix list): every row says what this is not */
export const RECORDS_CSV_NOTE = 'devnet test money; VND is an estimate at the 2 Oct rate; payout partner simulated; not tax advice';
export const RECORDS_CSV_FILENAME = 'ned-records-devnet.csv';

/** CSV of the records, oldest first. Devnet test money; VND is an estimate at the fixed demo rate. */
export function recordsCsv(records: ReleaseRecord[]): string {
  const rows = [...records]
    .sort((a, b) => a.releasedAt - b.releasedAt)
    .map((r) => {
      const units = BigInt(r.amountUnits);
      return [
        new Date(r.releasedAt * 1000).toISOString(),
        r.fund,
        r.index + 1,
        r.title,
        r.client,
        usdcFromUnits(units),
        vndFromUnits(units),
        USD_VND_RATE,
        USD_VND_RATE_DATE,
        r.destination === 'payoutPartner' ? 'payout partner (simulated)' : 'own wallet',
        txExplorerUrl(r.signature),
        RECORDS_CSV_NOTE,
      ]
        .map(csvCell)
        .join(',');
    });
  return [CSV_HEADER.join(','), ...rows].join('\n') + '\n';
}
