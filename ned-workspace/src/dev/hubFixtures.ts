// Dev only: open listings shaped like the WebJobs board's sample jobs, for /dev/hub screenshots. Not chain data.
import { PublicKey } from '@solana/web3.js';
import type { JobListingAccount } from '@ned/core/jobs/decode.ts';
import { skillsMask } from '@ned/core/jobs/taxonomy.ts';

const DAY = 86_400;
export const HUB_NOW = 1_791_300_000;
const key = (n: number) => new PublicKey(Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + n * 13) % 251));

const BUSINESSES = ['orbit_cafe', 'mia', 'lumen_labs', 'pixel_harbor', 'fernway', 'tanaka_studio'];
export const HUB_NAMES: Record<string, string> = Object.fromEntries(BUSINESSES.map((b, i) => [key(100 + i).toBase58(), `@${b}`]));

// title, business index, category, skills, USDC per milestone with work days, applicants
const SAMPLES: [string, number, number, number[], [number, number][], number][] = [
  ['Social posts for a launch week', 0, 3, [20], [[12, 7]], 1],
  ['Clean up a product spreadsheet', 5, 5, [24], [[10, 3]], 0],
  ['Four blog posts on remote work', 2, 2, [13], [[7.5, 7], [7.5, 14], [7.5, 21], [7.5, 30]], 2],
  ['Mobile app bug fixes (React Native)', 3, 1, [7, 6], [[25, 7], [25, 14]], 3],
  ['60-second explainer video', 4, 4, [17], [[15, 5], [30, 14]], 3],
  ['Review a small Solana program', 3, 1, [9], [[50, 9], [30, 14]], 1],
  ['Landing page in Framer', 2, 0, [1, 3], [[15, 4], [25, 9], [20, 14]], 7],
  ['Translate app onboarding, EN → VI', 1, 2, [12], [[15, 3]], 2],
  ['Icon set, 24 icons', 1, 0, [2, 3], [[15, 7]], 5],
  ['Logo refresh for a coffee brand', 0, 0, [0, 2], [[8, 3], [12, 7]], 4],
];

export const HUB_JOBS: JobListingAccount[] = SAMPLES.map(([title, biz, category, skills, plan, apps], n) => {
  const milestones = plan.map(([usdc, days], index) => ({ index, amount: BigInt(Math.round(usdc * 1_000_000)), workSecs: days * DAY, reviewSecs: 2 * DAY }));
  return {
    address: key(n),
    version: 1,
    state: 'Open',
    business: key(100 + biz),
    category,
    skills: skillsMask(skills),
    mint: key(200),
    jobId: BigInt(n + 1),
    createdAt: HUB_NOW - (10 - n) * 3_600,
    applyBy: HUB_NOW + (2 + (n % 4)) * DAY,
    selectBy: HUB_NOW + 6 * DAY,
    total: milestones.reduce((s, m) => s + m.amount, 0n),
    milestoneCount: milestones.length,
    milestones,
    title,
    summary: '',
    briefHash: new Uint8Array(32).fill(1),
    selected: null,
    selectedAt: 0,
    fund: null,
    applicationCount: apps,
    bump: 255,
    vaultBump: 254,
  } as JobListingAccount;
});
