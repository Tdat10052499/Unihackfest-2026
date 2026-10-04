// Framework-free Milestone Lock action pipeline (workspace-plan section 1): fresh fund read → rules.ts check →
// builder → sign with the injected signer → send → confirm → result. Both apps wrap it in their own hooks
// (busy / status / error state, refresh). Errors stay raw here; map them with describeActionError.
import { PublicKey, Transaction, type Connection } from '@solana/web3.js';
export type { BriefDraft, DeliveryDraft } from './milestone/content.ts';
import { fetchUsdcUnits } from './chain/balance.ts';
import { describeTxError, UserFacingError } from './chain/errors.ts';
import { sendAndConfirm, type SendAuth, type SendStatus } from './chain/send.ts';
import { getConnection } from './config.ts';
import { prepareTransactionCost } from './identity/transactionCost.ts';
import * as client from './milestone/client.ts';
import type { FundAccount } from './milestone/decode.ts';
import { shortHash } from './milestone/evidence.ts';
import { assertContent, canonicalBrief, canonicalDelivery, contentBytes, equalBytes, hashBytes, validateBrief, validateDelivery, type BriefDraft, type DeliveryDraft } from './milestone/content.ts';
import { generateContentKey, inviteLink, loadContentKey, saveContentKey, type KeyStorage } from './milestone/keys.ts';
import { buildKeyNotes, buildRegisterDevice, contentKeyFromNotes, deviceKeysPda, fetchDeviceKeys, loadDeviceKey, loadOrCreateDeviceKey, wrappedRecipients } from './milestone/devicekeys.ts';
import { toBase64Url as toB64 } from './milestone/keys.ts';
import { fetchNotes } from './milestone/notes.ts';
import { encryptNoteParts, NOTE_KIND_BRIEF, NOTE_KIND_DELIVERY, NOTE_MAX_PLAINTEXT, type EncryptedNote } from './milestone/notes.ts';
import { formatUsdc, unitsFromUsdc } from './milestone/format.ts';
import { getFund } from './milestone/queries.ts';
import * as rules from './milestone/rules.ts';
import type { ActionKind, ContractDraft } from './milestone/view.ts';

export const NOT_NOW = 'This action is not available right now. Refresh the contract and try again.';

export interface ActionEnv {
  /** The signed-in wallet and its signer (Dynamic embedded wallet in both apps) */
  signer: SendAuth;
  /** Chain time in unix seconds */
  now(): Promise<number>;
  onStatus?: (status: SendStatus) => void;
  /** Defaults to the configured devnet connection */
  connection?: Connection;
  /** Where this device keeps contract keys (AsyncStorage on mobile, localStorage on the Workspace); needed by create and submit */
  keys?: KeyStorage;
}

export interface ActionExtra {
  /** accept: SHA-256 of the brief shown to the freelancer (never read from the fund) */
  expectedBriefHash?: Uint8Array;
  /** submit: SHA-256 of the canonical delivery JSON, and its encrypted note */
  evidence?: Uint8Array;
  note?: EncryptedNote;
  /** proposeSplit: base units to the freelancer */
  units?: bigint;
}

/** Thrown when create_fund confirmed but a brief note did not: the contract exists, its brief can be posted again */
export class BriefNotSavedError extends UserFacingError {
  readonly fund: string;
  readonly inviteLink: string;
  constructor(fund: string, inviteLink: string) {
    super('The contract was created, but its brief was not saved. Open the contract and save the brief again.');
    this.fund = fund;
    this.inviteLink = inviteLink;
  }
}

/** User-facing English sentence for any action error */
export const describeActionError = (err: unknown) => describeTxError(err, 'contract');

/** Builds the transaction for `kind` after the same checks the program makes */
export async function buildMilestoneAction(
  kind: ActionKind,
  me: PublicKey,
  fund: FundAccount,
  now: number,
  index = 0,
  extra?: ActionExtra,
  connection: Connection = getConnection()
): Promise<client.Built & { evidence?: Uint8Array; extra?: Transaction[] }> {
  const check = (ok: boolean) => {
    if (!ok) throw new UserFacingError(NOT_NOW);
  };
  switch (kind) {
    case 'accept':
      // Same fee and rent for both choices; the own-wallet variant needs no username
      check(rules.canAccept(fund, me, now));
      if (!extra?.expectedBriefHash) throw new UserFacingError('Read the brief before accepting.');
      return client.buildAccept({ fund, freelancer: me, choice: 'ownWallet', username: '', expectedBriefHash: extra.expectedBriefHash });
    case 'lock': {
      check(rules.canLock(fund, me, now));
      // The Token program would fail with a bare 0x1; say what is missing instead
      const balance = await fetchUsdcUnits(connection, me);
      if (balance < fund.total) {
        throw new UserFacingError(`You need ${formatUsdc(fund.total)} to lock this contract; your wallet has ${formatUsdc(balance)}.`);
      }
      return client.buildLock({ fund, client: me }, connection);
    }
    case 'submit':
      check(rules.canSubmit(fund, me, index, now));
      if (!extra?.evidence) throw new UserFacingError('Add your delivery first.');
      return client.buildSubmit({ fund, freelancer: me, index, evidence: extra.evidence, ...(extra.note ? { note: extra.note } : {}) });
    case 'approve':
      check(rules.canApprove(fund, me, index));
      return client.buildApprove({ fund, client: me, index }, connection);
    case 'releaseNow':
      check(rules.canReleaseAfterReview(fund, index, now));
      return client.buildReleaseAfterReview({ fund, caller: me, index }, connection);
    case 'refundNow':
      check(rules.canRefund(fund, index, now));
      return client.buildRefund({ fund, caller: me, index }, connection);
    case 'close':
      check(rules.canClose(fund, me));
      return client.buildClose({ fund, creator: me }, connection);
    case 'dispute':
      check(rules.canDispute(fund, me, index, now));
      return client.buildDispute({ fund, client: me, index });
    case 'concede':
      check(rules.canConcede(fund, me, index));
      return client.buildConcede({ fund, freelancer: me, index }, connection);
    case 'proposeSplit': {
      const units = extra?.units ?? 0n;
      if (!rules.canProposeSplit(fund, me)) throw new UserFacingError(NOT_NOW);
      if (!rules.canProposeSplit(fund, me, units)) throw new UserFacingError('The proposed amount is larger than what is still locked.');
      return client.buildProposeSplit({ fund, signer: me, toFreelancerUnits: units });
    }
    case 'acceptSplit':
      check(rules.canAcceptSplit(fund, me));
      return client.buildAcceptSplit({ fund, signer: me }, connection);
  }
}

/** Fresh read of a contract (never act on a stale poll result) */
export async function readFund(address: string | undefined, connection: Connection = getConnection()): Promise<FundAccount> {
  if (!address) throw new UserFacingError('Open a contract first.');
  const fund = await getFund(address, connection);
  if (!fund) throw new UserFacingError('This contract no longer exists.');
  return fund;
}

/** Signs, sends and confirms a built transaction; returns the builder's extra fields plus the signature */
export async function runBuilt<T>(
  env: ActionEnv,
  work: (me: PublicKey) => Promise<{ tx: Transaction; rent: number } & T>
): Promise<{ signature: string } & T> {
  const { walletAddress, signTransaction } = env.signer;
  if (!walletAddress) throw new UserFacingError('Sign in first.');
  const built = await work(new PublicKey(walletAddress));
  const { signature } = await sendAndConfirm(built.tx, { walletAddress, signTransaction }, sendOptions(env, built.rent));
  const { tx: _tx, rent: _rent, ...rest } = built;
  return { ...(rest as T), signature };
}

const sendOptions = (env: ActionEnv, rent = 0) => ({
  rent,
  ...(env.onStatus ? { onStatus: env.onStatus } : {}),
  ...(env.connection ? { connection: env.connection } : {}),
});

/** Sends follow-up transactions (note parts) one by one; returns their signatures */
async function sendExtra(env: ActionEnv, txs: Transaction[]): Promise<string[]> {
  const { walletAddress, signTransaction } = env.signer;
  const out: string[] = [];
  for (const t of txs) out.push((await sendAndConfirm(t, { walletAddress, signTransaction }, sendOptions(env))).signature);
  return out;
}

const needKeys = (env: ActionEnv): KeyStorage => {
  if (!env.keys) throw new Error('No contract key storage configured');
  return env.keys;
};

/** Any per-contract action (lock, submit, approve, releaseNow, refundNow, close, and the P1 group) */
export function runFundAction(env: ActionEnv, address: string | undefined, kind: ActionKind, index?: number, extra?: ActionExtra) {
  const connection = env.connection ?? getConnection();
  return runBuilt(env, async (me) => buildMilestoneAction(kind, me, await readFund(address, connection), await env.now(), index, extra, connection));
}

/** Canonical brief JSON bytes for a draft, after the B1 limits */
function briefBytes(title: string, brief: BriefDraft, milestoneCount: number): Uint8Array {
  assertContent(validateBrief(brief, milestoneCount));
  const bytes = contentBytes(canonicalBrief(title, brief));
  if (bytes.length > NOTE_MAX_PLAINTEXT) throw new UserFacingError('The brief is too long to save with the contract. Shorten the scope or the done-when points.');
  return bytes;
}

/**
 * create_fund from the create form, then the encrypted brief notes. A fresh contract key K is stored on this device
 * before anything is sent; the invite link is the only other place K goes.
 */
export async function runCreate(
  env: ActionEnv,
  draft: ContractDraft & { brief: BriefDraft }
): Promise<{ signature: string; fund: string; inviteLink: string; noteSignatures: string[]; keySignatures: string[] }> {
  const connection = env.connection ?? getConnection();
  const keys = needKeys(env);
  const key = generateContentKey();
  let note: EncryptedNote | undefined;
  const result = await runBuilt(env, async (me) => {
    const check = rules.validateDraft(draft, await env.now(), me);
    if (!check.ok) throw new UserFacingError(check.errors[0].message);
    const bytes = briefBytes(draft.title, draft.brief, draft.milestones.length);
    const built = await client.buildCreateFund(
      {
        client: me,
        freelancer: new PublicKey(draft.freelancer),
        title: draft.title,
        briefHash: hashBytes(bytes),
        milestones: draft.milestones.map((m) => ({
          amount: unitsFromUsdc(m.amountUsdc) ?? 0n,
          submitBy: m.submitBy,
          reviewBy: m.submitBy + m.reviewSeconds,
        })),
      },
      connection
    );
    note = encryptNoteParts(key, built.fund, NOTE_KIND_BRIEF, 0, bytes);
    await saveContentKey(keys, me.toBase58(), built.fund.toBase58(), key);
    return built;
  });
  const fund = result.fund.toBase58();
  const link = inviteLink(fund, key);
  let noteSignatures: string[];
  try {
    noteSignatures = await sendExtra(env, client.buildBriefNotes({ fund: result.fund, client: new PublicKey(env.signer.walletAddress!), note: note! }));
  } catch {
    throw new BriefNotSavedError(fund, link);
  }
  // Key sync (D22): wrap K for every registered device of both parties. Best effort: the invite link still works.
  let keySignatures: string[] = [];
  try {
    keySignatures = (await runShareKey(env, fund, { contentKey: key, freelancer: draft.freelancer })).signatures;
  } catch {
    keySignatures = [];
  }
  return { signature: result.signature, fund, inviteLink: link, noteSignatures, keySignatures };
}

// ---- key sync (decision D22, key-sync-plan.md Plan C) ----

/**
 * Registers this device's key for the signed-in wallet when it is not listed yet (one small transaction, the first
 * time on each device). Returns false when nothing had to be sent.
 */
export async function runRegisterDevice(env: ActionEnv): Promise<{ registered: boolean; signature?: string }> {
  const { walletAddress, signTransaction } = env.signer;
  if (!walletAddress) throw new UserFacingError('Sign in first.');
  const connection = env.connection ?? getConnection();
  const me = new PublicKey(walletAddress);
  const device = await loadOrCreateDeviceKey(needKeys(env), walletAddress);
  const listInfo = await connection.getAccountInfo(deviceKeysPda(me), 'confirmed');
  const listed = (await fetchDeviceKeys([me], connection)).get(walletAddress) ?? [];
  if (listed.some((k) => equalBytes(k, device.publicKey))) return { registered: false };
  const tx = new Transaction().add(...buildRegisterDevice({ wallet: me, publicKey: device.publicKey, listExists: Boolean(listInfo) }));
  const { signature } = await sendAndConfirm(tx, { walletAddress, signTransaction }, sendOptions(env));
  return { registered: true, signature };
}

/**
 * Posts wraps of the contract key for every registered device of the client and the freelancer that has none yet
 * (sibling re-wrap, and the freelancer after opening an invite link). Needs K on this device. No transaction when
 * every device already has a wrap.
 */
export async function runShareKey(
  env: ActionEnv,
  address: string,
  known?: { contentKey?: Uint8Array; freelancer?: string }
): Promise<{ signatures: string[]; wrapped: number }> {
  const { walletAddress } = env.signer;
  if (!walletAddress) throw new UserFacingError('Sign in first.');
  const connection = env.connection ?? getConnection();
  const fund = await readFund(address, connection);
  const me = new PublicKey(walletAddress);
  if (!fund.client.equals(me) && !fund.freelancer.equals(me)) return { signatures: [], wrapped: 0 };
  const contentKey = known?.contentKey ?? (await loadContentKey(needKeys(env), walletAddress, address));
  if (!contentKey) return { signatures: [], wrapped: 0 };
  const registry = await fetchDeviceKeys([fund.client, fund.freelancer], connection);
  const all = [...(registry.get(fund.client.toBase58()) ?? []), ...(registry.get(fund.freelancer.toBase58()) ?? [])];
  const already = wrappedRecipients(await fetchNotes(fund.address, connection));
  const missing = all.filter((k) => !already.has(toB64(k)));
  if (!missing.length) return { signatures: [], wrapped: 0 };
  const signatures = await sendExtra(env, buildKeyNotes({ fund: fund.address, author: me, contentKey, recipients: missing }));
  return { signatures, wrapped: missing.length };
}

/**
 * K for `address` from the fund's key notes, using this device's key; saved on the device when found. Read-only
 * (no transaction). Returns null when no wrap is addressed to this device.
 */
export async function recoverContentKey(
  storage: KeyStorage,
  wallet: string,
  fund: FundAccount,
  records?: Awaited<ReturnType<typeof fetchNotes>>,
  connection: Connection = getConnection()
): Promise<Uint8Array | null> {
  const device = await loadDeviceKey(storage, wallet);
  if (!device) return null;
  const key = contentKeyFromNotes(fund, records ?? (await fetchNotes(fund.address, connection)), device);
  if (key) await saveContentKey(storage, wallet, fund.address.toBase58(), key);
  return key;
}

/** Posts the brief again for a Created fund (after BriefNotSavedError); the brief must hash to the stored brief_hash */
export async function runPostBrief(env: ActionEnv, address: string | undefined, brief: BriefDraft): Promise<{ noteSignatures: string[] }> {
  const { walletAddress } = env.signer;
  if (!walletAddress) throw new UserFacingError('Sign in first.');
  const fund = await readFund(address, env.connection ?? getConnection());
  if (!fund.client.equals(new PublicKey(walletAddress)) || fund.state !== 'Created') throw new UserFacingError(NOT_NOW);
  const bytes = briefBytes(fund.title, brief, fund.milestoneCount);
  if (!equalBytes(hashBytes(bytes), fund.briefHash)) {
    throw new UserFacingError('This brief is not the one this contract was created with.');
  }
  const key = await loadContentKey(needKeys(env), walletAddress, fund.address.toBase58());
  if (!key) throw new UserFacingError('The contract key is not on this device. Open the contract link here first.');
  const note = encryptNoteParts(key, fund.address, NOTE_KIND_BRIEF, 0, bytes);
  return { noteSignatures: await sendExtra(env, client.buildBriefNotes({ fund: fund.address, client: fund.client, note })) };
}

/**
 * accept with the freelancer's payout choice. `shownBriefHash` is the SHA-256 of the decrypted brief the screen
 * showed (useContractContent), never the value read from the fund: a client could close a Created fund and recreate
 * it with another brief. `username` builds the demo payout reference (VND path only).
 */
export function runAccept(
  env: ActionEnv,
  address: string | undefined,
  choice: 'ownWallet' | 'payoutPartner',
  username: string,
  shownBriefHash: Uint8Array | undefined
) {
  const connection = env.connection ?? getConnection();
  return runBuilt(env, async (me) => {
    if (!shownBriefHash || shownBriefHash.length !== 32) throw new UserFacingError('Read the brief before accepting.');
    const fund = await readFund(address, connection);
    if (!rules.canAccept(fund, me, await env.now())) throw new UserFacingError(NOT_NOW);
    if (!equalBytes(shownBriefHash, fund.briefHash)) throw new UserFacingError('The brief changed. Read the brief again before accepting.');
    // The payout-partner reference is built from the username (demo-<username>-001)
    if (choice === 'payoutPartner' && !username) {
      throw new UserFacingError('Create your N.E.D profile before choosing a VND payout.');
    }
    return client.buildAccept({ fund, freelancer: me, choice, username, expectedBriefHash: shownBriefHash });
  });
}

/**
 * submit with a delivery: evidence = SHA-256 of the canonical delivery JSON, plus the encrypted delivery note (in the
 * submit transaction when it fits). Needs the contract key on this device.
 */
export async function runSubmit(env: ActionEnv, address: string | undefined, index: number, delivery: DeliveryDraft) {
  assertContent(validateDelivery(delivery));
  const json = canonicalDelivery(delivery);
  const bytes = contentBytes(json);
  if (bytes.length > NOTE_MAX_PLAINTEXT) throw new UserFacingError('The delivery is too long to save. Shorten the note.');
  const evidence = hashBytes(bytes);
  const { walletAddress } = env.signer;
  if (!walletAddress || !address) throw new UserFacingError('Sign in first.');
  const key = await loadContentKey(needKeys(env), walletAddress, address);
  if (!key) throw new UserFacingError('Open the contract link on this device first, so your delivery can be saved with the contract.');
  const note = encryptNoteParts(key, new PublicKey(address), NOTE_KIND_DELIVERY, index, bytes);
  const result = await runFundAction(env, address, 'submit', index, { evidence, note });
  const noteSignatures = await sendExtra(env, (result as unknown as { extra: Transaction[] }).extra ?? []);
  return {
    signature: result.signature,
    evidence: shortHash(evidence),
    noteInSubmit: (result as unknown as { noteInSubmit: boolean }).noteInSubmit,
    noteSignatures,
  };
}

/** Network fee and account rent of an action, without signing */
export async function previewAction(env: ActionEnv, address: string | undefined, kind: ActionKind, index?: number) {
  const { walletAddress } = env.signer;
  if (!walletAddress) throw new UserFacingError('Sign in first.');
  const connection = env.connection ?? getConnection();
  const me = new PublicKey(walletAddress);
  const fund = await readFund(address, connection);
  // Fee preview only (nothing is signed): any non-zero hashes give the same size and fee
  const extra: ActionExtra = { expectedBriefHash: fund.briefHash, evidence: new Uint8Array(32).fill(1) };
  const built = await buildMilestoneAction(kind, me, fund, await env.now(), index, extra, connection);
  const cost = await prepareTransactionCost(connection, built.tx, walletAddress, built.rent);
  return { feeLamports: cost.fee, rentLamports: cost.rent };
}
