// SharedFund account → typed FundAccount (amounts bigint, only slots 0..milestone_count).
import { PublicKey } from '@solana/web3.js';
import type { Idl } from '@coral-xyz/anchor';
import idl from '../idl/ned_program.json' with { type: 'json' };
import { decodeAccount, fromBN, loadCoder } from '../chain/idl.ts';
import { FUND_SIZE, type FundStateName, type MilestoneStatusName, type PayoutKindName } from './layout.ts';

export const coder = loadCoder(idl as unknown as Idl);
export const FUND_DISCRIMINATOR: Uint8Array = Uint8Array.from(
  (idl.accounts.find((a) => a.name === 'SharedFund') as { discriminator: number[] }).discriminator
);

export interface MilestoneAccount {
  index: number;
  amount: bigint;
  submitBy: number;
  reviewBy: number;
  submittedAt: number;
  evidence: Uint8Array;
  status: MilestoneStatusName;
}

export interface FundAccount {
  address: PublicKey;
  version: number;
  state: FundStateName;
  payoutKind: PayoutKindName;
  client: PublicKey;
  freelancer: PublicKey;
  creator: PublicKey;
  rentPayer: PublicKey;
  /** PublicKey.default until `accept` */
  payoutDestination: PublicKey;
  mint: PublicKey;
  fundId: bigint;
  createdAt: number;
  total: bigint;
  released: bigint;
  refunded: bigint;
  milestoneCount: number;
  /** Only the used slots 0..milestoneCount */
  milestones: MilestoneAccount[];
  /** null = no pending cancel proposal */
  cancelProposer: PublicKey | null;
  cancelFreelancerAmount: bigint;
  title: string;
  bump: number;
  vaultBump: number;
  payoutReference: Uint8Array;
}

type Raw = Record<string, any>;
const variant = <T extends string>(v: Record<string, unknown>) => Object.keys(v)[0] as T;
const seconds = (v: { toString(): string }) => Number(fromBN(v));

export function decodeFund(address: PublicKey, data: Uint8Array): FundAccount {
  if (data.length !== FUND_SIZE) throw new Error(`SharedFund must be ${FUND_SIZE} bytes, got ${data.length}`);
  const f = decodeAccount<Raw>(coder, 'SharedFund', data);
  const count: number = f.milestone_count;
  const titleBytes = Uint8Array.from(f.title as number[]);
  const end = titleBytes.indexOf(0);
  return {
    address,
    version: f.version,
    state: variant(f.state),
    payoutKind: variant(f.payout_kind),
    client: f.client,
    freelancer: f.freelancer,
    creator: f.creator,
    rentPayer: f.rent_payer,
    payoutDestination: f.payout_destination,
    mint: f.mint,
    fundId: fromBN(f.fund_id),
    createdAt: seconds(f.created_at),
    total: fromBN(f.total),
    released: fromBN(f.released),
    refunded: fromBN(f.refunded),
    milestoneCount: count,
    milestones: (f.milestones as Raw[]).slice(0, count).map((m, index) => ({
      index,
      amount: fromBN(m.amount),
      submitBy: seconds(m.submit_by),
      reviewBy: seconds(m.review_by),
      submittedAt: seconds(m.submitted_at),
      evidence: Uint8Array.from(m.evidence as number[]),
      status: variant(m.status),
    })),
    cancelProposer: (f.cancel_proposer as PublicKey).equals(PublicKey.default) ? null : f.cancel_proposer,
    cancelFreelancerAmount: fromBN(f.cancel_freelancer_amount),
    title: new TextDecoder().decode(end === -1 ? titleBytes : titleBytes.subarray(0, end)),
    bump: f.bump,
    vaultBump: f.vault_bump,
    payoutReference: Uint8Array.from(f.payout_reference as number[]),
  };
}
