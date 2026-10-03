// Hand-built 740-byte SharedFund accounts (v1.1) (program-spec 3.1), shared by the milestone tests.
import { Keypair, PublicKey } from '@solana/web3.js';
import { USDC_DEVNET_MINT } from '../../constants.ts';
import { decodeFund, FUND_DISCRIMINATOR, type FundAccount } from '../decode.ts';
import { FUND_STATES, MILESTONE_STATUSES, PAYOUT_KINDS, type FundStateName, type MilestoneStatusName, type PayoutKindName } from '../layout.ts';

export const T0 = 1_759_400_000;
export const USDC = 1_000_000n;
export const CLIENT = Keypair.generate().publicKey;
export const FREELANCER = Keypair.generate().publicKey;
export const STRANGER = Keypair.generate().publicKey;

export interface FixtureMilestone {
  amount?: bigint;
  submitBy: number;
  reviewBy: number;
  submittedAt?: number;
  evidence?: Uint8Array;
  status?: MilestoneStatusName;
}

export interface FixtureFund {
  state?: FundStateName;
  payoutKind?: PayoutKindName;
  client?: PublicKey;
  freelancer?: PublicKey;
  payoutDestination?: PublicKey;
  milestones: FixtureMilestone[];
  released?: bigint;
  refunded?: bigint;
  cancelProposer?: PublicKey;
  cancelFreelancerAmount?: bigint;
  title?: string;
  fundId?: bigint;
  payoutReference?: Uint8Array;
  briefHash?: Uint8Array;
}

/** Default brief hash of fixture funds (never all zero on-chain) */
export const BRIEF_HASH = new Uint8Array(32).fill(5);

export function fundBytes(f: FixtureFund): Uint8Array {
  const b = Buffer.alloc(740);
  const client = f.client ?? CLIENT;
  Buffer.from(FUND_DISCRIMINATOR).copy(b, 0);
  b[8] = 2;
  b[9] = 0;
  b[10] = FUND_STATES.indexOf(f.state ?? 'Funded');
  b[11] = PAYOUT_KINDS.indexOf(f.payoutKind ?? 'OwnWallet');
  client.toBuffer().copy(b, 12);
  (f.freelancer ?? FREELANCER).toBuffer().copy(b, 44);
  client.toBuffer().copy(b, 76); // creator
  client.toBuffer().copy(b, 108); // rent_payer
  (f.payoutDestination ?? (f.payoutKind === 'Unset' ? PublicKey.default : f.freelancer ?? FREELANCER)).toBuffer().copy(b, 140);
  USDC_DEVNET_MINT.toBuffer().copy(b, 172);
  b.writeBigUInt64LE(f.fundId ?? 1_759_400_000_123n, 204);
  b.writeBigInt64LE(BigInt(T0), 212);
  const total = f.milestones.reduce((s, m) => s + (m.amount ?? 10n * USDC), 0n);
  b.writeBigUInt64LE(total, 220);
  b.writeBigUInt64LE(f.released ?? 0n, 228);
  b.writeBigUInt64LE(f.refunded ?? 0n, 236);
  b[244] = f.milestones.length;
  f.milestones.forEach((m, i) => {
    const o = 245 + i * 65;
    b.writeBigUInt64LE(m.amount ?? 10n * USDC, o);
    b.writeBigInt64LE(BigInt(m.submitBy), o + 8);
    b.writeBigInt64LE(BigInt(m.reviewBy), o + 16);
    b.writeBigInt64LE(BigInt(m.submittedAt ?? 0), o + 24);
    Buffer.from(m.evidence ?? new Uint8Array(32)).copy(b, o + 32);
    b[o + 64] = MILESTONE_STATUSES.indexOf(m.status ?? 'Pending');
  });
  (f.cancelProposer ?? PublicKey.default).toBuffer().copy(b, 570);
  b.writeBigUInt64LE(f.cancelFreelancerAmount ?? 0n, 602);
  Buffer.from(f.title ?? 'Landing page design', 'utf8').copy(b, 610);
  b[642] = 255;
  b[643] = 254;
  Buffer.from(f.payoutReference ?? new Uint8Array(32)).copy(b, 644);
  Buffer.from(f.briefHash ?? BRIEF_HASH).copy(b, 676);
  return new Uint8Array(b);
}

export const FUND_ADDRESS = Keypair.generate().publicKey;
export const fund = (f: FixtureFund): FundAccount => decodeFund(FUND_ADDRESS, fundBytes(f));

/** One milestone due at T0 + 600, review window 120 s */
export const M = (status: MilestoneStatusName = 'Pending', extra: Partial<FixtureMilestone> = {}): FixtureMilestone => ({
  submitBy: T0 + 600,
  reviewBy: T0 + 720,
  status,
  ...extra,
});
