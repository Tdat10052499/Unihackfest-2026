// Fixture contracts in every state of S7 (dev tools and tests only): the Contract and Review pages are pure views, so
// these render them without a chain. Wallets are fixed so the avatars and names stay the same in screenshots.
import { PublicKey } from '@solana/web3.js';
import { USDC_DEVNET_MINT } from '@ned/core/constants.ts';
import { canonicalDelivery, deliveryEvidence, type BriefDraft, type DeliveryDraft } from '@ned/core/milestone/content.ts';
import type { FundAccount, MilestoneAccount } from '@ned/core/milestone/decode.ts';
import type { MilestoneStatusName } from '@ned/core/milestone/layout.ts';
import type { ContractContent, DeliveryEntry, ReviewEntry } from '@ned/core/milestone/notes.ts';
import { toFundView, type FundView, type Region } from '@ned/core/milestone/view.ts';

export const CLIENT = new PublicKey('9PZwK7pZmZnqfq1D5Xm9JvmoFQbPSjCoxj4AHiVLrhkW');
export const FREELANCER = new PublicKey('6HaTF69iUhG2btQYAczH3ZUHWoMTyJnUz62iZZLi6cCG');
export const FUND = new PublicKey('BvTzebz2UdPhPRAuyFynEQQXWM8yDZMCZxc5aH192E9Y');
export const NAMES = { [CLIENT.toBase58()]: '@mia', [FREELANCER.toBase58()]: '@vinh' };
export const T0 = 1_791_000_000;
const USDC = 1_000_000n;
const H = 3_600;

export const BRIEF: BriefDraft = {
  scope: 'A cleaner wordmark and a small cup icon for a coffee brand. Must read well on cups and on a phone screen.',
  references: ['https://example.com/menu-board'],
  milestones: [
    { name: 'Two logo concepts', criteria: ['Two distinct wordmark directions', 'Shown on light and dark backgrounds', 'Readable at 32 px'] },
    { name: 'Final logo files', criteria: ['SVG and PNG (1x, 2x)', 'One-page usage sheet'] },
  ],
};
/** F2: the promised list of the fixture deliveries (fingerprints only) */
export const FINALS = [
  { name: 'logo.svg', size: 18_204, sha256: 'b1c2'.padEnd(64, '1') },
  { name: 'logo@2x.png', size: 96_512, sha256: 'c3d4'.padEnd(64, '2') },
  { name: 'usage-sheet.pdf', size: 241_877, sha256: 'd5e6'.padEnd(64, '3') },
];
export const FIRST: DeliveryDraft = {
  links: ['https://www.figma.com/file/abc/Logo?version-id=2214', 'https://drive.google.com/drive/folders/preview-sheet'],
  files: [{ name: 'concepts-preview.png', size: 482_113, sha256: 'a3f1'.padEnd(64, '0') }],
  note: 'Two directions: a rounded wordmark and a stamp. Previews are watermarked.',
  finals: FINALS,
};
export const REVISION: DeliveryDraft = {
  links: ['https://www.figma.com/file/abc/Logo?version-id=2290'],
  files: [],
  note: 'Dark background version added, icon thickened for 32 px.',
  finals: [...FINALS, { name: 'logo-dark.svg', size: 18_377, sha256: 'e7f8'.padEnd(64, '4') }],
  stage: 'revision',
};
export const HANDOVER: DeliveryDraft = { links: ['https://drive.google.com/file/d/1FinalLogoFilesZip/view?usp=sharing'], files: FINALS, note: 'Final SVG and PNG files and the usage sheet.', stage: 'handover' };

const ms = (index: number, status: MilestoneStatusName, extra: Partial<MilestoneAccount> = {}): MilestoneAccount => ({
  index,
  amount: index === 0 ? 8n * USDC : 12n * USDC,
  submitBy: T0 + (index + 1) * 48 * H,
  reviewBy: T0 + (index + 1) * 48 * H + 48 * H,
  submittedAt: 0,
  evidence: new Uint8Array(32),
  status,
  ...extra,
});
const submitted = (index: number, status: MilestoneStatusName): MilestoneAccount => ms(index, status, { submittedAt: T0 + 20 * H, evidence: deliveryEvidence(FIRST) });

function fund(state: FundAccount['state'], milestones: MilestoneAccount[], extra: Partial<FundAccount> = {}): FundAccount {
  return {
    address: FUND,
    version: 2,
    state,
    payoutKind: state === 'Created' ? 'Unset' : 'PayoutPartner',
    client: CLIENT,
    freelancer: FREELANCER,
    creator: CLIENT,
    rentPayer: CLIENT,
    payoutDestination: state === 'Created' ? PublicKey.default : new PublicKey('FA2qzovJShkNNNnMz3nXmYXvBzenRTgU2oko7RBBhbyp'),
    mint: USDC_DEVNET_MINT,
    fundId: 1n,
    createdAt: T0 - 24 * H,
    total: milestones.reduce((s, m) => s + m.amount, 0n),
    released: milestones.filter((m) => m.status === 'Released').reduce((s, m) => s + m.amount, 0n),
    refunded: milestones.filter((m) => m.status === 'Refunded').reduce((s, m) => s + m.amount, 0n),
    milestoneCount: milestones.length,
    milestones,
    cancelProposer: null,
    cancelFreelancerAmount: 0n,
    title: 'Logo refresh',
    bump: 255,
    vaultBump: 254,
    payoutReference: new Uint8Array(32).fill(1),
    briefHash: new Uint8Array(32).fill(7),
    ...extra,
  };
}

const entry = (content: DeliveryDraft, stage: DeliveryEntry['stage'], time: number, matches = false): DeliveryEntry => ({
  signature: `${stage}-${time}`,
  slot: time,
  time,
  content: { ...JSON.parse(canonicalDelivery(content)) },
  stage,
  matches,
});
const reviewNote = (time: number): ReviewEntry => ({ signature: `review-${time}`, slot: time, time, content: { v: 1, unmet: [1, 2], reason: 'The dark background version is missing, and the icon breaks up at 32 px.' } });

function content(f: FundAccount, history: ContractContent['history'] = {}): ContractContent {
  const deliveries: ContractContent['deliveries'] = {};
  for (const m of f.milestones) if (m.submittedAt > 0) deliveries[m.index] = { content: { v: 1, ...FIRST }, matches: true };
  return { brief: { v: 1, title: 'Logo refresh', ...BRIEF }, contentStatus: 'ok', shownBriefHash: f.briefHash, deliveries, history };
}

export interface Scenario {
  id: string;
  label: string;
  now: number;
  fund: FundAccount;
  content: ContractContent;
  job?: { address: string; state: 'Open' | 'Selected' | 'Filled' | 'Withdrawn' };
}

const firstEntry = entry(FIRST, 'first', T0 + 20 * H, true);
export const SCENARIOS: Scenario[] = (() => {
  const list: Omit<Scenario, 'content'>[] = [
    { id: 'created', label: 'Created', now: T0, fund: fund('Created', [ms(0, 'Pending'), ms(1, 'Pending')]) },
    { id: 'job-accepted', label: 'Job contract, accepted', now: T0, fund: fund('Accepted', [ms(0, 'Pending'), ms(1, 'Pending')]), job: { address: 'EospZ3hwVu1sCLpLY9SyRxoL4bvg4gq4MfAsAi312BfF', state: 'Selected' } },
    { id: 'funded', label: 'Locked · work in progress', now: T0 + H, fund: fund('Funded', [ms(0, 'Pending'), ms(1, 'Pending')]) },
    { id: 'submitted', label: 'Submitted · in review', now: T0 + 30 * H, fund: fund('Funded', [submitted(0, 'Submitted'), ms(1, 'Pending')]) },
    { id: 'review-over', label: 'Review time over', now: T0 + 97 * H, fund: fund('Funded', [submitted(0, 'Submitted'), ms(1, 'Pending')]) },
    { id: 'submit-missed', label: 'Submission deadline passed', now: T0 + 49 * H, fund: fund('Funded', [ms(0, 'Pending'), ms(1, 'Pending')]) },
    { id: 'changes', label: 'Changes requested', now: T0 + 40 * H, fund: fund('Funded', [submitted(0, 'Disputed'), ms(1, 'Pending')]) },
    { id: 'revised', label: 'Revised version', now: T0 + 60 * H, fund: fund('Funded', [submitted(0, 'Disputed'), ms(1, 'Pending')]) },
    { id: 'split', label: 'Split proposed', now: T0 + 62 * H, fund: fund('Funded', [submitted(0, 'Disputed'), ms(1, 'Pending')], { cancelProposer: FREELANCER, cancelFreelancerAmount: 10n * USDC }) },
    { id: 'released', label: 'Released · waiting for final files', now: T0 + 70 * H, fund: fund('Funded', [submitted(0, 'Released'), ms(1, 'Pending')]) },
    { id: 'final-files', label: 'Final files handed over', now: T0 + 80 * H, fund: fund('Funded', [submitted(0, 'Released'), ms(1, 'Pending')]) },
    { id: 'refunded', label: 'Refunded after a missed deadline', now: T0 + 60 * H, fund: fund('Funded', [ms(0, 'Refunded'), ms(1, 'Pending')]) },
    { id: 'split-settled', label: 'Settled by a split', now: T0 + 70 * H, fund: fund('Settled', [submitted(0, 'Cancelled'), ms(1, 'Cancelled')]) },
    { id: 'settled-no-handover', label: 'Settled · final files not handed over', now: T0 + 150 * H, fund: fund('Settled', [submitted(0, 'Released'), { ...submitted(1, 'Released'), index: 1 }]) },
  ];
  return list.map((s) => {
    const history: ContractContent['history'] =
      s.id === 'changes' || s.id === 'split'
        ? { 0: { deliveries: [firstEntry], reviews: [reviewNote(T0 + 30 * H)] } }
        : s.id === 'revised'
          ? { 0: { deliveries: [firstEntry, entry(REVISION, 'revision', T0 + 50 * H)], reviews: [reviewNote(T0 + 30 * H)] } }
          : s.id === 'released' || s.id === 'submitted' || s.id === 'review-over' || s.id === 'settled-no-handover'
            ? { 0: { deliveries: [firstEntry], reviews: [] } }
            : s.id === 'final-files'
              ? { 0: { deliveries: [firstEntry, entry(HANDOVER, 'handover', T0 + 75 * H)], reviews: [] } }
              : {};
    return { ...s, content: content(s.fund, history) };
  });
})();

export function scenarioView(s: Scenario, role: 'client' | 'freelancer', region: Region = 'intl', p1 = true): FundView {
  const me = (role === 'client' ? CLIENT : FREELANCER).toBase58();
  return toFundView(s.fund, me, region, s.now, { names: NAMES, p1, content: s.content, ...(s.job ? { job: s.job } : {}) });
}
