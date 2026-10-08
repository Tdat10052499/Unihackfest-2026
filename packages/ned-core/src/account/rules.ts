// Pure account rules (D30, roles-and-agreement-build.md §2 and §4). These are UI rules: the program does not know
// anyone's role or residence and does not check them (design §3). D30, behind accountRoles.
import { JOB_CATEGORY_COUNT } from '../jobs/layout.ts';
import type { Region } from '../milestone/view.ts';
import { BUSINESS_COPY, ROLE_COPY, SETTINGS_COPY } from './copy.ts';
import { isCountry } from './countries.ts';
import { TEAM_SIZES, type AccountProfile, type BusinessDetails, type CountryCode } from './types.ts';

export const VIETNAM: CountryCode = 'VN';

export const regionFromCountry = (country: CountryCode): Region => (country === VIETNAM ? 'vn' : 'intl');

/** Clients lock USDC, and N.E.D does not offer USDC to people who live in Vietnam */
export const canBeClient = (country: CountryCode): boolean => country !== VIETNAM;

/** A business registered in Vietnam cannot be a client either (Decree 52/2024 Art. 8(6) covers organisations) */
export const canRegisterBusinessIn = (country: CountryCode): boolean => country !== VIETNAM;

export const BUSINESS_LIMITS = { nameMin: 2, nameMax: 80, titleMax: 60, registrationNoMax: 40 } as const;

export type BusinessField = keyof BusinessDetails;

export interface FieldError {
  field: BusinessField;
  message: string;
}

const HTTPS_URL = /^https:\/\/[^\s/?#.]+\.[^\s]+$/i;

/**
 * Errors for the business step, in field order; empty when valid. Messages come from the copy deck. The deck has no
 * line for a too-long title or registration number: the inputs cap their length, so those errors carry an empty
 * message and screens should never reach them.
 */
export function validateBusiness(b: BusinessDetails): FieldError[] {
  const errors: FieldError[] = [];
  const name = b.name.trim();
  if (name.length < BUSINESS_LIMITS.nameMin || name.length > BUSINESS_LIMITS.nameMax) {
    errors.push({ field: 'name', message: BUSINESS_COPY.name.error });
  }
  if (!canRegisterBusinessIn(b.registeredIn)) {
    errors.push({ field: 'registeredIn', message: BUSINESS_COPY.registeredIn.errorVN });
  } else if (!isCountry(b.registeredIn)) {
    errors.push({ field: 'registeredIn', message: ROLE_COPY.common.chooseOne });
  }
  if (!TEAM_SIZES.some((s) => s.id === b.size)) errors.push({ field: 'size', message: ROLE_COPY.common.chooseOne });
  if (!Number.isInteger(b.industry) || b.industry < 0 || b.industry >= JOB_CATEGORY_COUNT) {
    errors.push({ field: 'industry', message: ROLE_COPY.common.chooseOne });
  }
  if (b.website !== undefined && b.website.trim() !== '' && !HTTPS_URL.test(b.website.trim())) {
    errors.push({ field: 'website', message: BUSINESS_COPY.website.error });
  }
  if (b.title !== undefined && b.title.trim().length > BUSINESS_LIMITS.titleMax) {
    errors.push({ field: 'title', message: '' });
  }
  if (b.registrationNo !== undefined && b.registrationNo.trim().length > BUSINESS_LIMITS.registrationNoMax) {
    errors.push({ field: 'registrationNo', message: '' });
  }
  return errors;
}

export type ProfileIssue =
  | 'unknownCountry'
  | 'noRole'
  | 'vietnamNotFreelancer'
  | 'clientNotAllowed'
  | 'businessMissing'
  | 'businessInvalid';

/** Problems with a whole profile; empty when it can be saved */
export function validateProfile(p: AccountProfile): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  if (!isCountry(p.country)) issues.push('unknownCountry');
  if (!p.freelancer && !p.client) issues.push('noRole');
  if (p.country === VIETNAM && !p.freelancer) issues.push('vietnamNotFreelancer');
  if (p.client && !canBeClient(p.country)) issues.push('clientNotAllowed');
  if (p.client?.kind === 'business') {
    if (!p.business) issues.push('businessMissing');
    else if (validateBusiness(p.business).length > 0) issues.push('businessInvalid');
  }
  return issues;
}

export interface Capabilities {
  createContract: boolean;
  lock: boolean;
  postJob: boolean;
  selectApplicant: boolean;
  apply: boolean;
  accept: boolean;
  submit: boolean;
  /** The money view. Unchanged by roles */
  region: Region;
}

/**
 * What the UI shows (build §4). Client actions need the client role and a country outside Vietnam; freelancer
 * actions need the freelancer role, which every Vietnam resident has. A null profile (no account yet) gives today's
 * default: freelancer, Vietnam view.
 */
export function capabilities(p: AccountProfile | null): Capabilities {
  const country = p?.country ?? VIETNAM;
  const client = !!p?.client && canBeClient(country);
  const freelancer = p ? p.freelancer || country === VIETNAM : true;
  return {
    createContract: client,
    lock: client,
    postJob: client,
    selectApplicant: client,
    apply: freelancer,
    accept: freelancer,
    submit: freelancer,
    region: regionFromCountry(country),
  };
}

/**
 * The same shape with FEATURES.accountRoles on or off, for both apps. Off: today's rule, region only (client actions
 * need the international view; anyone may accept and submit; no region yet counts as Vietnam). On: capabilities(profile).
 */
export function capabilitiesFor(accountRoles: boolean, p: AccountProfile | null, region: Region | null): Capabilities {
  if (accountRoles) return capabilities(p);
  const client = (region ?? 'vn') !== 'vn';
  return { createContract: client, lock: client, postJob: client, selectApplicant: client, apply: true, accept: true, submit: true, region: region ?? 'vn' };
}

export interface OpenClientWork {
  clientContracts: number;
  listings: number;
}

export type CountryChange =
  | { ok: true; /** moving to Vietnam: the client role (and business) is dropped */ dropsClient: boolean }
  | { ok: false; reason: 'openClientWork'; copy: { title: string; body: string; ok: string } }
  | { ok: false; reason: 'unknownCountry'; copy: null };

/** Moving to Vietnam is refused while the wallet has open client contracts or job listings (closes D17) */
export function canChangeCountry(p: AccountProfile, next: CountryCode, open: OpenClientWork): CountryChange {
  if (!isCountry(next)) return { ok: false, reason: 'unknownCountry', copy: null };
  const movingToVN = next === VIETNAM && p.country !== VIETNAM;
  if (movingToVN && open.clientContracts + open.listings > 0) {
    const s = SETTINGS_COPY.sheet.blocked;
    return {
      ok: false,
      reason: 'openClientWork',
      copy: { title: s.title, body: s.body(open.clientContracts, open.listings), ok: s.ok },
    };
  }
  return { ok: true, dropsClient: !canBeClient(next) && !!p.client };
}
