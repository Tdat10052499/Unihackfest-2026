// D30 sign-up logic behind FEATURES.accountRoles (roles-and-agreement-build.md §3): the next step for a wallet, the
// draft kept between the role, country and business screens, and the writes on "Agree and continue". Pure (no
// stores, no React) so node --test can run it; screens and services/onboarding.ts pass the store data in.
import type { AccountProfile, AgreementRecord, BusinessDetails, ClientKind, CountryCode } from '@ned/core/account/types.ts';
import { canBeClient, regionFromCountry, validateProfile } from '@ned/core/account/rules.ts';
import { AGREEMENT_VERSION, agreementHash, agreementText, CONSENT_SCOPE_V3, consentVersion } from '@ned/core/legal/agreement.ts';
import type { Region } from '@ned/core/milestone/view.ts';

export type AccountStep = 'role' | 'country' | 'business' | 'agreement' | 'fund' | 'profile' | 'home';

export interface AccountFacts {
  /** A ReverseRecord exists: the wallet already has an @username */
  hasReverse: boolean;
  profile: AccountProfile | null;
  /** A current agreement (getAgreement) and consent v3 */
  hasAgreement: boolean;
  /** SOL below the setup cost; only read for a new wallet */
  short: boolean;
  /** R7: the latest agreement still in force is an older version (hasOlderAgreement) */
  olderAgreement?: boolean;
}

/** The first of role / country / business that the stored profile still needs, or null when it is complete */
export function missingAccountStep(profile: AccountProfile | null): 'role' | 'country' | 'business' | null {
  if (!profile) return 'role';
  const issues = validateProfile(profile);
  if (issues.includes('noRole') || issues.includes('vietnamNotFreelancer') || issues.includes('clientNotAllowed')) return 'role';
  if (issues.includes('unknownCountry')) return 'country';
  if (issues.includes('businessMissing') || issues.includes('businessInvalid')) return 'business';
  return null;
}

/**
 * New wallet: role → country → business (business only) → agreement → fund (SOL short) → profile → home.
 * Returning wallet: the missing ones of role / country / business / agreement, then home.
 * The agreement (consent v3) always comes before fund, the first step that sends the wallet address to a third party.
 */
export function accountStep(f: AccountFacts): AccountStep {
  const missing = missingAccountStep(f.profile);
  if (missing) return missing;
  if (!f.hasAgreement) return 'agreement';
  if (f.hasReverse) return 'home';
  return f.short ? 'fund' : 'profile';
}

/**
 * R7 (build §6): a wallet that used N.E.D before D30 (ReverseRecord, no profile) or agreed to an older version goes
 * through the update flow once: role (update=1, preselected) → country → (business) → agreement → home.
 */
export function accountState(f: AccountFacts): { step: AccountStep; update: boolean } {
  const update = f.hasReverse && (!f.profile || Boolean(f.olderAgreement));
  return update ? { step: 'role', update } : { step: accountStep(f), update: false };
}

/** The latest record not withdrawn is below the current agreement or consent version */
export function hasOlderAgreement(records: readonly AgreementRecord[] | undefined, consent: number): boolean {
  const latest = [...(records ?? [])].reverse().find((r) => !r.withdrawnAt);
  return Boolean(latest && (latest.agreementVersion < AGREEMENT_VERSION || latest.consentVersion < consent));
}

/** What the wallet did before D30, read once from the chain at the start of the update flow */
export interface WalletHistory {
  /** Contracts this wallet created as the client */
  createdContracts: number;
  /** Contracts this wallet accepted as the freelancer (state after Created) */
  acceptedContracts: number;
  /** Job listings this wallet posted */
  listings: number;
  /** Job applications this wallet sent */
  applications: number;
}

/**
 * Preselection for the update flow (build §6): Vietnam view → freelancer in Vietnam; international view → the roles
 * the history shows (created or posted → client; accepted or applied → freelancer; both → both; none → nothing) and no
 * country. Only a preselection: the user confirms every screen.
 */
export function preselectDraft(region: Region | null, history: WalletHistory | null): SignupDraft {
  if (region === 'vn') return { freelancer: true, client: null, country: 'VN' };
  if (region !== 'intl' || !history) return EMPTY_DRAFT;
  const client = history.createdContracts > 0 || history.listings > 0;
  const freelancer = history.acceptedContracts > 0 || history.applications > 0;
  return { freelancer, client: client ? { kind: 'individual' } : null, country: null };
}

/** What the sign-up screens collect before the agreement; kept in memory only (stores/useSignupDraft.ts) */
export interface SignupDraft {
  freelancer: boolean;
  client: null | { kind: ClientKind };
  country: CountryCode | null;
  business?: BusinessDetails;
}

export const EMPTY_DRAFT: SignupDraft = { freelancer: false, client: null, country: null };

export type RoleChoice = 'freelancer' | 'individual' | 'business';

export function roleChoiceOf(d: Pick<SignupDraft, 'freelancer' | 'client'>): RoleChoice | null {
  if (d.client) return d.client.kind === 'business' ? 'business' : 'individual';
  return d.freelancer ? 'freelancer' : null;
}

/** Step 1 sets one role; the other one is added later in Settings */
export function draftWithRole(d: SignupDraft, choice: RoleChoice): SignupDraft {
  if (choice === 'freelancer') return { ...d, freelancer: true, client: null, business: undefined };
  return { ...d, freelancer: false, client: { kind: choice }, business: choice === 'business' ? d.business : undefined };
}

/** Choosing Vietnam with a client role opens "Join as a freelancer?" instead of saving the country */
export function countryChoice(d: SignupDraft, country: CountryCode): { draft: SignupDraft; askFreelancer: boolean } {
  if (d.client && !canBeClient(country)) return { draft: d, askFreelancer: true };
  return { draft: { ...d, country }, askFreelancer: false };
}

/** "Continue as a freelancer" on the sheet: Vietnam, freelancer only */
export function draftAsVietnamFreelancer(d: SignupDraft): SignupDraft {
  return { ...d, freelancer: true, client: null, business: undefined, country: 'VN' };
}

export const isBusinessDraft = (d: Pick<SignupDraft, 'client'>) => d.client?.kind === 'business';

/** StepHeader total: 4, or 5 for a business (role, country, business, agreement, profile) */
export const signupSteps = (d: Pick<SignupDraft, 'client'>) => (isBusinessDraft(d) ? 5 : 4);

/** The route after the country step */
export const routeAfterCountry = (d: SignupDraft): '/business' | '/agreement' => (isBusinessDraft(d) ? '/business' : '/agreement');

export function draftToProfile(d: SignupDraft, now: number): AccountProfile | null {
  if (!d.country) return null;
  return {
    version: 1,
    freelancer: d.freelancer,
    client: d.client,
    country: d.country,
    ...(d.client?.kind === 'business' && d.business ? { business: d.business } : {}),
    updatedAt: now,
  };
}

/** The agreement step only opens for a complete, valid draft (a Vietnam draft with a client role never gets there) */
export function draftReadyForAgreement(d: SignupDraft): boolean {
  const p = draftToProfile(d, 0);
  return !!p && validateProfile(p).length === 0;
}

export const draftFromProfile = (p: AccountProfile): SignupDraft => ({
  freelancer: p.freelancer,
  client: p.client,
  country: p.country,
  business: p.business,
});

/** The store writes of "Agree and continue", in this order (build §3) */
export interface AgreeWrites {
  acceptConsent: (wallet: string, scope: string[], version: number) => void;
  setProfile: (wallet: string, profile: AccountProfile) => void;
  acceptAgreement: (wallet: string, record: AgreementRecord) => void;
  setRegion: (wallet: string, region: Region) => void;
}

export function commitAgreement(w: AgreeWrites, wallet: string, profile: AccountProfile, now: number): AgreementRecord {
  if (validateProfile(profile).length > 0) throw new Error('The account profile is not complete');
  const version = consentVersion(true);
  w.acceptConsent(wallet, [...CONSENT_SCOPE_V3], version);
  w.setProfile(wallet, profile);
  const record: AgreementRecord = {
    agreementVersion: AGREEMENT_VERSION,
    consentVersion: version,
    roles: { freelancer: profile.freelancer, client: profile.client?.kind ?? null },
    country: profile.country,
    acceptedAt: now,
    textSha256: agreementHash(agreementText(profile)),
  };
  w.acceptAgreement(wallet, record);
  w.setRegion(wallet, regionFromCountry(profile.country));
  return record;
}

/** Moved to core (shared with the Workspace, R6) */
export { currentAgreement } from '@ned/core/legal/agreement.ts';
