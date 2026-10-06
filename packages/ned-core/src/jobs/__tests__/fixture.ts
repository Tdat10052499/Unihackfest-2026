// Hand-built JobListing (576 bytes) and JobApplication (364 bytes) accounts at the offsets of funded-jobs-plan.md
// section 4.2, written without the IDL coder so the decoder test checks the layout.
import { Keypair, PublicKey } from '@solana/web3.js';
import { USDC_DEVNET_MINT } from '../../constants.ts';
import { decodeJobApplication, decodeJobListing, JOB_APPLICATION_DISCRIMINATOR, JOB_LISTING_DISCRIMINATOR, type JobListingAccount } from '../decode.ts';
import { JOB_STATES, type JobStateName } from '../layout.ts';

export const T0 = 1_759_400_000;
export const USDC = 1_000_000n;
export const BUSINESS = Keypair.generate().publicKey;
export const FREELANCER = Keypair.generate().publicKey;
export const STRANGER = Keypair.generate().publicKey;
export const JOB_ADDRESS = Keypair.generate().publicKey;
export const FUND_ADDRESS = Keypair.generate().publicKey;
export const BRIEF_HASH = new Uint8Array(32).fill(0xab);

export interface FixtureJob {
  address?: PublicKey;
  state?: JobStateName;
  business?: PublicKey;
  category?: number;
  skills?: bigint;
  jobId?: bigint;
  createdAt?: number;
  applyBy?: number;
  selectBy?: number;
  milestones?: { amount: bigint; workSecs: number; reviewSecs: number }[];
  title?: string;
  summary?: string;
  briefHash?: Uint8Array;
  selected?: PublicKey;
  selectedAt?: number;
  fund?: PublicKey;
  applicationCount?: number;
}

export function jobBytes(f: FixtureJob = {}): Uint8Array {
  const b = Buffer.alloc(576);
  Buffer.from(JOB_LISTING_DISCRIMINATOR).copy(b, 0);
  const ms = f.milestones ?? [{ amount: 10n * USDC, workSecs: 3 * 86_400, reviewSecs: 86_400 }];
  b[8] = 1;
  b[9] = JOB_STATES.indexOf(f.state ?? 'Open');
  (f.business ?? BUSINESS).toBuffer().copy(b, 10);
  b[42] = f.category ?? 0;
  b.writeBigUInt64LE(f.skills ?? 0b1001n, 43);
  USDC_DEVNET_MINT.toBuffer().copy(b, 51);
  b.writeBigUInt64LE(f.jobId ?? 42n, 83);
  b.writeBigInt64LE(BigInt(f.createdAt ?? T0), 91);
  b.writeBigInt64LE(BigInt(f.applyBy ?? T0 + 3 * 86_400), 99);
  b.writeBigInt64LE(BigInt(f.selectBy ?? T0 + 5 * 86_400), 107);
  b.writeBigUInt64LE(ms.reduce((s, m) => s + m.amount, 0n), 115);
  b[123] = ms.length;
  ms.forEach((m, i) => {
    b.writeBigUInt64LE(m.amount, 124 + i * 24);
    b.writeBigInt64LE(BigInt(m.workSecs), 132 + i * 24);
    b.writeBigInt64LE(BigInt(m.reviewSecs), 140 + i * 24);
  });
  Buffer.from(f.title ?? 'Logo for a café').copy(b, 244);
  Buffer.from(f.summary ?? 'A simple logo and two colour variants.').copy(b, 276);
  Buffer.from(f.briefHash ?? BRIEF_HASH).copy(b, 436);
  (f.selected ?? PublicKey.default).toBuffer().copy(b, 468);
  b.writeBigInt64LE(BigInt(f.selectedAt ?? 0), 500);
  (f.fund ?? PublicKey.default).toBuffer().copy(b, 508);
  b.writeUInt16LE(f.applicationCount ?? 0, 540);
  b[542] = 254;
  b[543] = 253;
  return b;
}

export const job = (f: FixtureJob = {}): JobListingAccount => decodeJobListing(f.address ?? JOB_ADDRESS, jobBytes(f));

export function applicationBytes(p: { job?: PublicKey; freelancer?: PublicKey; pitch?: string; createdAt?: number } = {}): Uint8Array {
  const b = Buffer.alloc(364);
  Buffer.from(JOB_APPLICATION_DISCRIMINATOR).copy(b, 0);
  b[8] = 1;
  (p.job ?? JOB_ADDRESS).toBuffer().copy(b, 9);
  (p.freelancer ?? FREELANCER).toBuffer().copy(b, 41);
  b.writeBigInt64LE(BigInt(p.createdAt ?? T0 + 60), 73);
  const pitch = Buffer.from(p.pitch ?? 'I design logos for cafés.');
  b.writeUInt16LE(pitch.length, 81);
  pitch.copy(b, 83);
  b[363] = 252;
  return b;
}

export const application = (p: Parameters<typeof applicationBytes>[0] = {}) => decodeJobApplication(Keypair.generate().publicKey, applicationBytes(p));
