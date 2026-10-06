import { Keypair } from '@solana/web3.js';
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { skillsMask } from '@ned/core/jobs/taxonomy.ts';

export const T0 = 1_759_400_000;
export const USDC = 1_000_000n;

export function listing(over: Partial<JobListingAccount> = {}): JobListingAccount {
  const amount = over.total ?? 10n * USDC;
  return {
    address: Keypair.generate().publicKey,
    version: 1,
    state: 'Open',
    business: Keypair.generate().publicKey,
    category: 0,
    skills: skillsMask([0, 3]),
    mint: Keypair.generate().publicKey,
    jobId: 1n,
    createdAt: T0,
    applyBy: T0 + 3 * 86_400,
    selectBy: T0 + 5 * 86_400,
    total: amount,
    milestoneCount: 1,
    milestones: [{ index: 0, amount, workSecs: 7 * 86_400, reviewSecs: 86_400 }],
    title: 'Logo refresh for a coffee brand',
    summary: 'A cleaner wordmark.',
    briefHash: new Uint8Array(32).fill(1),
    selected: null,
    selectedAt: 0,
    fund: null,
    applicationCount: 0,
    bump: 255,
    vaultBump: 254,
    ...over,
  };
}
