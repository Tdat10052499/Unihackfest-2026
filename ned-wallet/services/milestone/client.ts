// Unsigned transaction builders, one per instruction. Each returns { tx, rent }: `rent` is the lamports the
// transaction will lock in new accounts (fund + vault, or an ATA that does not exist yet). The fee payer and
// blockhash are set later by services/chain/send.ts. Encoding and account order come from the IDL (N2).
import { PublicKey, Transaction, type Connection, type TransactionInstruction } from '@solana/web3.js';
import idl from '../../idl/ned_program.json' with { type: 'json' };
import { DEMO_PAYOUT_PARTNER, PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DEVNET_MINT } from '../../constants/chain.ts';
import { ata, createAtaIdempotentIx } from '../chain/ata.ts';
import { buildIx, encodeIx, toBN } from '../chain/idl.ts';
import { connection as defaultConnection } from '../chain/connection.ts';
import { coder, type FundAccount } from './decode.ts';
import { evidenceHash } from './evidence.ts';
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
  buildIx(idl, PROGRAM_ID, name, { token_program: TOKEN_PROGRAM_ID, ...accounts }, encodeIx(coder, name, args));

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
  },
  conn: RentConnection = defaultConnection
): Promise<Built & { fund: PublicKey; fundId: bigint }> {
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
    }
  );
  return { tx: tx(create), rent: fundRent + vaultRent, fund, fundId };
}

/**
 * ownWallet → destination = the freelancer, reference = 32 zero bytes.
 * payoutPartner → destination = DEMO_PAYOUT_PARTNER, reference = SHA-256("demo-<username>-001").
 */
export async function buildAccept(p: {
  fund: FundAccount;
  freelancer: PublicKey;
  choice: 'ownWallet' | 'payoutPartner';
  username: string;
}): Promise<Built> {
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
    }
  );
  return { tx: tx(accept), rent: 0 };
}

export async function buildLock(p: { fund: FundAccount; client: PublicKey }, conn: RentConnection = defaultConnection): Promise<Built> {
  const clientAta = await ensureAta(p.client, p.client, conn);
  const lock = ix('lock', { ...vaultAccounts(p.fund), client: p.client, client_token: clientAta.address });
  return { tx: tx(clientAta.ix, lock), rent: clientAta.rent };
}

export async function buildSubmit(p: { fund: FundAccount; freelancer: PublicKey; index: number; link: string }): Promise<Built & { evidence: Uint8Array }> {
  const evidence = evidenceHash(p.link);
  const submit = ix(
    'submit',
    { fund: p.fund.address, freelancer: p.freelancer },
    { index: u8index(p.index), evidence: Array.from(evidence) }
  );
  return { tx: tx(submit), rent: 0, evidence };
}

export async function buildApprove(p: { fund: FundAccount; client: PublicKey; index: number }, conn: RentConnection = defaultConnection): Promise<Built> {
  const dest = await ensureAta(p.client, p.fund.payoutDestination, conn);
  const approve = ix(
    'approve',
    { ...vaultAccounts(p.fund), client: p.client, destination: p.fund.payoutDestination, destination_token: dest.address },
    { index: u8index(p.index) }
  );
  return { tx: tx(dest.ix, approve), rent: dest.rent };
}

export async function buildReleaseAfterReview(p: { fund: FundAccount; caller: PublicKey; index: number }, conn: RentConnection = defaultConnection): Promise<Built> {
  const dest = await ensureAta(p.caller, p.fund.payoutDestination, conn);
  const release = ix(
    'release_after_review',
    { ...vaultAccounts(p.fund), caller: p.caller, destination: p.fund.payoutDestination, destination_token: dest.address },
    { index: u8index(p.index) }
  );
  return { tx: tx(dest.ix, release), rent: dest.rent };
}

export async function buildRefund(p: { fund: FundAccount; caller: PublicKey; index: number }, conn: RentConnection = defaultConnection): Promise<Built> {
  const clientAta = await ensureAta(p.caller, p.fund.client, conn);
  const refund = ix(
    'refund',
    { ...vaultAccounts(p.fund), caller: p.caller, client: p.fund.client, client_token: clientAta.address },
    { index: u8index(p.index) }
  );
  return { tx: tx(clientAta.ix, refund), rent: clientAta.rent };
}

export async function buildClose(p: { fund: FundAccount; creator: PublicKey }, conn: RentConnection = defaultConnection): Promise<Built> {
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

export async function buildConcede(p: { fund: FundAccount; freelancer: PublicKey; index: number }, conn: RentConnection = defaultConnection): Promise<Built> {
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
export async function buildAcceptSplit(p: { fund: FundAccount; signer: PublicKey }, conn: RentConnection = defaultConnection): Promise<Built> {
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
