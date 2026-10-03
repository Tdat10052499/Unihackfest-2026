// Unsigned transaction builders, one per instruction. Each returns { tx, rent }: `rent` is the lamports the
// transaction will lock in new accounts (fund + vault, or an ATA that does not exist yet). The fee payer and
// blockhash are set later by services/chain/send.ts. Encoding and account order come from the IDL (N2).
import { PublicKey, Transaction, type Connection, type TransactionInstruction } from '@solana/web3.js';
import idl from '../idl/ned_program.json' with { type: 'json' };
import { DEMO_PAYOUT_PARTNER, TOKEN_PROGRAM_ID, USDC_DEVNET_MINT } from '../constants.ts';
import { ata, createAtaIdempotentIx } from '../chain/ata.ts';
import { buildIx, encodeIx, toBN } from '../chain/idl.ts';
import { getConnection, getProgramId } from '../config.ts';
import { coder, type FundAccount } from './decode.ts';
import { buildPostNote, NOTE_KIND_BRIEF, NOTE_KIND_DELIVERY, type EncryptedNote } from './notes.ts';
import { FUND_SIZE, TOKEN_ACCOUNT_SIZE } from './layout.ts';
import { fundPda, vaultPda } from './pda.ts';
import { demoRecipientId, payoutReference } from './reference.ts';
import { unsettled } from './rules.ts';

export type RentConnection = Pick<Connection, 'getMinimumBalanceForRentExemption' | 'getAccountInfo'>;
export interface Built {
  tx: Transaction;
  rent: number;
}
export interface MilestoneInputUnits {
  amount: bigint;
  submitBy: number;
  reviewBy: number;
}

const ix = (name: string, accounts: Record<string, PublicKey>, args: Record<string, unknown> = {}) =>
  buildIx(idl, getProgramId(), name, { token_program: TOKEN_PROGRAM_ID, ...accounts }, encodeIx(coder, name, args));

/** Accounts shared by every instruction that touches the vault */
const vaultAccounts = (fund: FundAccount) => ({ fund: fund.address, vault: vaultPda(fund.address) });

/** createAssociatedTokenAccountIdempotent for `owner`'s USDC ATA, paid by `payer`; rent only if it is missing */
async function ensureAta(payer: PublicKey, owner: PublicKey, conn: RentConnection) {
  const address = ata(USDC_DEVNET_MINT, owner);
  const exists = (await conn.getAccountInfo(address, 'confirmed')) !== null;
  return {
    address,
    ix: createAtaIdempotentIx(payer, owner, USDC_DEVNET_MINT),
    rent: exists ? 0 : await conn.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE),
  };
}

const tx = (...ixs: TransactionInstruction[]) => new Transaction().add(...ixs);
const isZero = (bytes: Uint8Array) => bytes.every((b) => b === 0);

/** Largest serialized transaction Solana accepts */
export const TX_MAX_BYTES = 1232;
const DUMMY_BLOCKHASH = '11111111111111111111111111111111';

/** Serialized size of `tx` with `feePayer` and one signature per signer (the blockhash does not change the size) */
export function txSize(tx: Transaction, feePayer: PublicKey): number {
  const copy = new Transaction({ feePayer, recentBlockhash: DUMMY_BLOCKHASH }).add(...tx.instructions);
  const message = copy.serializeMessage();
  const signers = message[0];
  return 1 + 64 * signers + message.length;
}

/** One transaction per post_note part */
function noteTxs(fund: PublicKey, author: PublicKey, note: EncryptedNote): Transaction[] {
  return note.parts.map((data, part) =>
    tx(buildPostNote({ fund, author, kind: note.kind as 0 | 1, milestone: note.milestone, part, parts: note.parts.length, data }))
  );
}

const u8index = (index: number) => {
  if (!Number.isInteger(index) || index < 0 || index > 255) throw new Error('Invalid milestone index');
  return index;
};

// ---- P0 ----

export async function buildCreateFund(
  p: {
    client: PublicKey;
    freelancer: PublicKey;
    title: string;
    milestones: MilestoneInputUnits[];
    payer?: PublicKey;
    fundId?: bigint;
    /** SHA-256 of the canonical brief JSON (content.ts briefHash) */
    briefHash: Uint8Array;
  },
  conn: RentConnection = getConnection()
): Promise<Built & { fund: PublicKey; fundId: bigint }> {
  const { briefHash } = p;
  if (briefHash.length !== 32 || isZero(briefHash)) throw new Error('The brief fingerprint is missing.');
  const fundId = p.fundId ?? BigInt(Date.now());
  const fund = fundPda(p.client, fundId);
  const [fundRent, vaultRent] = await Promise.all([
    conn.getMinimumBalanceForRentExemption(FUND_SIZE),
    conn.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE),
  ]);
  const create = ix(
    'create_fund',
    { client: p.client, payer: p.payer ?? p.client, fund, vault: vaultPda(fund) },
    {
      fund_id: toBN(fundId),
      freelancer: p.freelancer,
      title: p.title,
      milestones: p.milestones.map((m) => ({ amount: toBN(m.amount), submit_by: toBN(m.submitBy), review_by: toBN(m.reviewBy) })),
      brief_hash: Array.from(briefHash),
    }
  );
  return { tx: tx(create), rent: fundRent + vaultRent, fund, fundId };
}

/**
 * ownWallet → destination = the freelancer, reference = 32 zero bytes.
 * payoutPartner → destination = DEMO_PAYOUT_PARTNER, reference = SHA-256("demo-<username>-001").
 * `expectedBriefHash` = hash of the brief the freelancer read; the program refuses it if it differs (BriefMismatch).
 */
export async function buildAccept(p: {
  fund: FundAccount;
  freelancer: PublicKey;
  choice: 'ownWallet' | 'payoutPartner';
  username: string;
  expectedBriefHash: Uint8Array;
}): Promise<Built> {
  if (p.expectedBriefHash.length !== 32) throw new Error('The brief fingerprint is missing.');
  const own = p.choice === 'ownWallet';
  if (!own && !p.username) throw new Error('A username is needed for the payout reference');
  const reference = own ? new Uint8Array(32) : payoutReference(demoRecipientId(p.username));
  const accept = ix(
    'accept',
    { fund: p.fund.address, freelancer: p.freelancer },
    {
      payout_kind: own ? { OwnWallet: {} } : { PayoutPartner: {} },
      payout_destination: own ? p.freelancer : DEMO_PAYOUT_PARTNER,
      payout_reference: Array.from(reference),
      expected_brief_hash: Array.from(p.expectedBriefHash),
    }
  );
  return { tx: tx(accept), rent: 0 };
}

export async function buildLock(p: { fund: FundAccount; client: PublicKey }, conn: RentConnection = getConnection()): Promise<Built> {
  const clientAta = await ensureAta(p.client, p.client, conn);
  const lock = ix('lock', { ...vaultAccounts(p.fund), client: p.client, client_token: clientAta.address });
  return { tx: tx(clientAta.ix, lock), rent: clientAta.rent };
}

/**
 * Brief note transactions for a new fund (post_note kind 0, signed by the client), one per part. They can only run
 * after create_fund, while the fund is Created.
 */
export function buildBriefNotes(p: { fund: PublicKey; client: PublicKey; note: EncryptedNote }): Transaction[] {
  if (p.note.kind !== NOTE_KIND_BRIEF) throw new Error('Not a brief note');
  return noteTxs(p.fund, p.client, p.note);
}

/**
 * submit(index, evidence) plus the delivery note. The first note part rides in the submit transaction when the
 * serialized transaction stays within TX_MAX_BYTES; otherwise every part gets its own transaction (`extra`).
 */
export async function buildSubmit(p: {
  fund: FundAccount;
  freelancer: PublicKey;
  index: number;
  /** SHA-256 of the canonical delivery JSON (content.ts deliveryEvidence) */
  evidence: Uint8Array;
  note?: EncryptedNote;
}): Promise<Built & { evidence: Uint8Array; extra: Transaction[]; noteInSubmit: boolean }> {
  if (p.evidence.length !== 32 || isZero(p.evidence)) throw new Error('The delivery fingerprint is missing.');
  if (p.note && (p.note.kind !== NOTE_KIND_DELIVERY || p.note.milestone !== p.index)) throw new Error('Delivery note for another milestone');
  const submit = ix(
    'submit',
    { fund: p.fund.address, freelancer: p.freelancer },
    { index: u8index(p.index), evidence: Array.from(p.evidence) }
  );
  const notes = p.note ? noteTxs(p.fund.address, p.freelancer, p.note) : [];
  if (notes.length) {
    const combined = tx(submit, ...notes[0].instructions);
    if (txSize(combined, p.freelancer) <= TX_MAX_BYTES) {
      return { tx: combined, rent: 0, evidence: p.evidence, extra: notes.slice(1), noteInSubmit: true };
    }
  }
  return { tx: tx(submit), rent: 0, evidence: p.evidence, extra: notes, noteInSubmit: false };
}

export async function buildApprove(p: { fund: FundAccount; client: PublicKey; index: number }, conn: RentConnection = getConnection()): Promise<Built> {
  const dest = await ensureAta(p.client, p.fund.payoutDestination, conn);
  const approve = ix(
    'approve',
    { ...vaultAccounts(p.fund), client: p.client, destination: p.fund.payoutDestination, destination_token: dest.address },
    { index: u8index(p.index) }
  );
  return { tx: tx(dest.ix, approve), rent: dest.rent };
}

export async function buildReleaseAfterReview(p: { fund: FundAccount; caller: PublicKey; index: number }, conn: RentConnection = getConnection()): Promise<Built> {
  const dest = await ensureAta(p.caller, p.fund.payoutDestination, conn);
  const release = ix(
    'release_after_review',
    { ...vaultAccounts(p.fund), caller: p.caller, destination: p.fund.payoutDestination, destination_token: dest.address },
    { index: u8index(p.index) }
  );
  return { tx: tx(dest.ix, release), rent: dest.rent };
}

export async function buildRefund(p: { fund: FundAccount; caller: PublicKey; index: number }, conn: RentConnection = getConnection()): Promise<Built> {
  const clientAta = await ensureAta(p.caller, p.fund.client, conn);
  const refund = ix(
    'refund',
    { ...vaultAccounts(p.fund), caller: p.caller, client: p.fund.client, client_token: clientAta.address },
    { index: u8index(p.index) }
  );
  return { tx: tx(clientAta.ix, refund), rent: clientAta.rent };
}

export async function buildClose(p: { fund: FundAccount; creator: PublicKey }, conn: RentConnection = getConnection()): Promise<Built> {
  const clientAta = await ensureAta(p.creator, p.fund.client, conn);
  const close = ix('close', {
    ...vaultAccounts(p.fund),
    creator: p.creator,
    rent_payer: p.fund.rentPayer,
    client: p.fund.client,
    client_token: clientAta.address,
  });
  return { tx: tx(clientAta.ix, close), rent: clientAta.rent };
}

// ---- P1 (behind FEATURES.dispute) ----

export async function buildDispute(p: { fund: FundAccount; client: PublicKey; index: number }): Promise<Built> {
  return { tx: tx(ix('dispute', { fund: p.fund.address, client: p.client }, { index: u8index(p.index) })), rent: 0 };
}

export async function buildConcede(p: { fund: FundAccount; freelancer: PublicKey; index: number }, conn: RentConnection = getConnection()): Promise<Built> {
  const clientAta = await ensureAta(p.freelancer, p.fund.client, conn);
  const concede = ix(
    'concede',
    { ...vaultAccounts(p.fund), freelancer: p.freelancer, client: p.fund.client, client_token: clientAta.address },
    { index: u8index(p.index) }
  );
  return { tx: tx(clientAta.ix, concede), rent: clientAta.rent };
}

export async function buildProposeSplit(p: { fund: FundAccount; signer: PublicKey; toFreelancerUnits: bigint }): Promise<Built> {
  const propose = ix('propose_cancel', { fund: p.fund.address, signer: p.signer }, { freelancer_amount: toBN(p.toFreelancerUnits) });
  return { tx: tx(propose), rent: 0 };
}

/** Uses the proposal in `fund` as the expected values: decode the fund fresh right before calling this. */
export async function buildAcceptSplit(p: { fund: FundAccount; signer: PublicKey }, conn: RentConnection = getConnection()): Promise<Built> {
  const [dest, clientAta] = await Promise.all([
    ensureAta(p.signer, p.fund.payoutDestination, conn),
    ensureAta(p.signer, p.fund.client, conn),
  ]);
  const accept = ix(
    'accept_cancel',
    {
      ...vaultAccounts(p.fund),
      signer: p.signer,
      destination: p.fund.payoutDestination,
      destination_token: dest.address,
      client: p.fund.client,
      client_token: clientAta.address,
    },
    { expected_freelancer_amount: toBN(p.fund.cancelFreelancerAmount), expected_unsettled: toBN(unsettled(p.fund)) }
  );
  return { tx: tx(dest.ix, clientAta.ix, accept), rent: dest.rent + clientAta.rent };
}
