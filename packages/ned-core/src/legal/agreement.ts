// Draft for CL review (D30); not live until R9.
// The N.E.D Agreement (roles-and-agreement-plan.md §5 and §8): the copy deck C4 verbatim (NED-prompts-d30-design.md
// §C4), the cards per role, the three checkboxes, the consent version and scope, and the text hash stored in the
// AgreementRecord. D30, behind accountRoles.
import { sha256 } from '@noble/hashes/sha2.js';
import type { AccountProfile, AgreementRecord } from '../account/types.ts';
import { toHex } from '../milestone/evidence.ts';

export const AGREEMENT_VERSION = 1;

/** C4 · Agreement (OnbAgreement) */
export const AGREEMENT_COPY = {
  title: 'The N.E.D Agreement',
  sub: 'What you can count on, what you agree to, and what N.E.D does and does not do.',
  opening:
    'N.E.D is software for milestone contracts between clients and freelancers. When a client locks a budget, it sits in a vault owned by a Solana program, not by N.E.D, and it leaves only by the rules written into the contract. This pilot runs on Solana devnet with test tokens that have no value.',
  countOn: 'You can count on',
  agreeTo: 'You agree to',
  freelancer: { heading: 'As a freelancer' },
  client: { heading: 'As a client' },
  business: { heading: 'For your business' },
  ned: { heading: 'What N.E.D does and does not do', more: 'Read all' },
  links: 'Read the full Terms · Privacy notice · Disclosures',
  linksBusiness: 'Job posting rules',
  check1: 'I have read and agree to the N.E.D Terms of use, including my rights and duties above.',
  check2:
    'I agree that N.E.D processes my data as the Privacy notice says. My @username, wallet address, contract titles, job listings and pitches are written to Solana, where they are public and permanent.',
  check3: 'I am 18 or older, and the country and role I chose are true.',
  button: 'Agree and continue',
  disabled: 'Tick all three boxes to continue',
  version: 'Agreement version 1 · Terms 1.2 · Privacy 2',
  /** Button of the "What N.E.D does and does not do" sheet (board OnbAgreementNed). Not in the copy deck yet (R3) */
  close: 'Close',
} as const;

/** agreement.links in pieces, so each name can be a link; joined they give AGREEMENT_COPY.links exactly */
export const AGREEMENT_LINKS = {
  lead: 'Read the full',
  terms: 'Terms',
  privacy: 'Privacy notice',
  disclosures: 'Disclosures',
  separator: ' · ',
} as const;

/** A role card: what the user can count on and what they agree to */
export interface DutyCard {
  heading: string;
  countOn: readonly string[];
  agreeTo: readonly string[];
}

/** A card of plain items (business, N.E.D) */
export interface ListCard {
  heading: string;
  items: readonly string[];
}

export type AgreementCard = DutyCard | ListCard;

export const isDutyCard = (c: AgreementCard): c is DutyCard => 'countOn' in c;

/** Design §8.2 */
export const FREELANCER_CARD: DutyCard = {
  heading: AGREEMENT_COPY.freelancer.heading,
  countOn: [
    'You see the budget locked in the program before you start work.',
    // F11 (PO, 8 Oct): the deploy wallet can still upgrade the program, so no "Nobody, including N.E.D"
    'The place your earnings go is fixed when you accept. No instruction in the program lets anyone change it.',
    'If the client neither approves nor requests changes before the review deadline, anyone can release the milestone to you (Release now).',
    'A change request never sends the money back to the client alone. It stays locked until you both agree.',
    'Your brief and your deliveries are encrypted. N.E.D has no key.',
    // Lawyer to confirm (design §9 question 3); R9 may change it
    'Until a milestone is released, you keep the rights to the work submitted for it, unless you and the client agree otherwise.',
  ],
  agreeTo: [
    'Do the work you accept, and submit only work you have the right to hand over.',
    'Submit a preview that shows the work honestly, and hand over the final files you listed after release.',
    'Keep personal data out of public fields: @username, contract titles, job pitches.',
    'Handle your own tax and records. Records from N.E.D are not tax advice.',
    'If you live in Vietnam: you receive VND through a payout partner and never receive, hold or send USDC through N.E.D.',
  ],
};

/** Design §8.3 */
export const CLIENT_CARD: DutyCard = {
  heading: AGREEMENT_COPY.client.heading,
  countOn: [
    'Your budget leaves the vault only by the rules written when the contract was created.',
    'If a submission deadline passes with nothing submitted, anyone can refund that milestone to you.',
    'Before you release, you see a preview and the list of final files the freelancer promised, with their fingerprints.',
    'You can request changes before the review deadline. The amount then stays locked until you both agree.',
  ],
  agreeTo: [
    'Lock the budget before work starts. Review before the review deadline, or the milestone can be released.',
    'Write a clear brief with "done when" points for each milestone, and hire only for lawful work.',
    'Use contracts for independent services. Whether a relationship counts as employment under the law that applies to you is your responsibility.',
    'You do not live in Vietnam, and your business is not registered there.',
  ],
};

/** Shown under the client card for a business */
export const BUSINESS_CARD: ListCard = {
  heading: AGREEMENT_COPY.business.heading,
  items: [
    'The business details you give are true and kept up to date.',
    'Only people the business allows act for it.',
    'The business is responsible for everything done from this account.',
  ],
};

/** Design §8.4. The screen shows the first NED_CARD_PREVIEW items; "Read all" opens the rest (OnbAgreementNed) */
export const NED_CARD: ListCard = {
  heading: AGREEMENT_COPY.ned.heading,
  items: [
    'N.E.D provides the software. It does not hold, convert or move your funds. No instruction in the program lets anyone at N.E.D move a locked budget.',
    'N.E.D is not a party to your contract. It does not choose, vet or employ anyone, and it does not decide disagreements. There is no neutral arbiter in this pilot.',
    'N.E.D does not check identities, business details, the quality of the work or whether files are handed over. What users declare is self-declared.',
    'The program has not been audited, the team still holds the upgrade authority (see Disclosures), and the payout partner is simulated.',
    'Transactions you sign cannot be reversed. N.E.D cannot recover a lost login or undo a release or refund.',
    'To the extent the law allows, N.E.D is not responsible for losses caused by another user, by transactions you sign, or by outages of Solana, Dynamic or other services. Nothing here removes rights you have by law that cannot be waived.',
    'N.E.D may stop offering its app to an account that breaks these terms (false declarations, unlawful work, impersonation, money laundering). It cannot freeze or take funds already locked in the program.',
    'N.E.D shows any new version of these terms before it applies to you. You keep using the app only by agreeing again.',
  ],
};

export const NED_CARD_PREVIEW = 3;

/** The three checkboxes, all unticked by default; the button needs all three */
export const AGREEMENT_CHECKS: readonly string[] = [AGREEMENT_COPY.check1, AGREEMENT_COPY.check2, AGREEMENT_COPY.check3];

type RolesOf = Pick<AccountProfile, 'freelancer' | 'client' | 'country'>;

/** The cards for the profile's roles, in the order freelancer, client, business, N.E.D */
export function agreementCards(p: Pick<AccountProfile, 'freelancer' | 'client'>): AgreementCard[] {
  const cards: AgreementCard[] = [];
  if (p.freelancer) cards.push(FREELANCER_CARD);
  if (p.client) cards.push(CLIENT_CARD);
  if (p.client?.kind === 'business') cards.push(BUSINESS_CARD);
  cards.push(NED_CARD);
  return cards;
}

/** The link line under the cards; clients also get the Job posting rules (design §5) */
export const agreementLinks = (p: Pick<AccountProfile, 'client'>): string[] =>
  p.client ? [AGREEMENT_COPY.links, AGREEMENT_COPY.linksBusiness] : [AGREEMENT_COPY.links];

export interface AgreementVersions {
  agreement: number;
  terms: string;
  privacy: number;
}

export const CURRENT_AGREEMENT_VERSIONS: AgreementVersions = { agreement: AGREEMENT_VERSION, terms: '1.2', privacy: 2 };

/** "Agreement version 1 · Terms 1.2 · Privacy 2" for the current versions */
export const agreementVersionLine = (v: AgreementVersions): string =>
  `Agreement version ${v.agreement} · Terms ${v.terms} · Privacy ${v.privacy}`;

/**
 * The exact text shown on the agreement screen for this profile, one line per string, for the hash. The N.E.D card
 * is included whole ("Read all" is part of what is agreed). The last line is the declaration that check 3 confirms
 * (roles and country), so the hash also binds what the user declared.
 */
export function agreementText(p: RolesOf, versions: AgreementVersions = CURRENT_AGREEMENT_VERSIONS): string {
  const lines: string[] = [AGREEMENT_COPY.title, AGREEMENT_COPY.sub, AGREEMENT_COPY.opening];
  for (const card of agreementCards(p)) {
    lines.push(card.heading);
    if (isDutyCard(card)) lines.push(AGREEMENT_COPY.countOn, ...card.countOn, AGREEMENT_COPY.agreeTo, ...card.agreeTo);
    else lines.push(...card.items);
  }
  lines.push(...agreementLinks(p), ...AGREEMENT_CHECKS, agreementVersionLine(versions));
  const roles = [p.freelancer ? 'freelancer' : null, p.client ? `client (${p.client.kind})` : null].filter(Boolean);
  lines.push(`Declared: ${roles.join(' + ')} · ${p.country}`);
  return lines.join('\n');
}

/** The latest record that is not withdrawn, at AGREEMENT_VERSION and the given consent version (both apps) */
export function currentAgreement(records: readonly AgreementRecord[] | undefined, consent: number): AgreementRecord | null {
  if (!records) return null;
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (r.withdrawnAt) continue;
    return r.agreementVersion === AGREEMENT_VERSION && r.consentVersion === consent ? r : null;
  }
  return null;
}

const encoder = new TextEncoder();

/** SHA-256 of the text, lower-case hex (AgreementRecord.textSha256) */
export const agreementHash = (text: string): string => toHex(sha256(encoder.encode(text)));

// Consent (Decree 356/2025 Art. 6). One place for the version both apps check: the wallet store
// (ned-wallet/stores/useConsentStore.ts) and the Workspace mirror (ned-workspace/src/hooks/consent.ts).

/** Consent v3 is the D30 agreement (absorbs D12/D14); v2 is today's single consent box */
export const consentVersion = (accountRoles: boolean): number => (accountRoles ? 3 : 2);

/** What consent v2 covers (stored with the log); today's wallet consent screen */
export const CONSENT_SCOPE_V2: readonly string[] = [
  'google-account-name',
  'email',
  'wallet-address',
  'login-provider-dynamic-us',
  'username-onchain',
  'phone-hash-onchain-optional',
  'device-key-onchain',
  'encrypted-contract-content-onchain',
  'rpc-helius-us',
];

/** Consent v3: v2 plus the D30 declarations and the public N.E.D Jobs data */
export const CONSENT_SCOPE_V3: readonly string[] = [...CONSENT_SCOPE_V2, 'country', 'role', 'business-details', 'jobs-public'];
