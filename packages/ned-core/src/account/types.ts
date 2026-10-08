// Account-level types (D30, roles-and-agreement-build.md §2). Never reuse `Role`: it is the per-contract
// client/freelancer role in milestone/view.ts. `Region` stays the money-view switch, derived from the country
// (rules.ts regionFromCountry). D30, behind accountRoles.

export type AccountRole = 'freelancer' | 'client';
export type ClientKind = 'individual' | 'business';
/** ISO 3166-1 alpha-2, upper case, from COUNTRIES */
export type CountryCode = string;
export type TeamSize = 'solo' | '2-10' | '11-50' | '51-200' | '200+';

export const TEAM_SIZES: readonly { id: TeamSize; label: string }[] = [
  { id: 'solo', label: 'Just me' },
  { id: '2-10', label: '2–10' },
  { id: '11-50', label: '11–50' },
  { id: '51-200', label: '51–200' },
  { id: '200+', label: '200+' },
];

export interface BusinessDetails {
  /** 2–80 */
  name: string;
  /** never 'VN' */
  registeredIn: CountryCode;
  size: TeamSize;
  /** JOB_CATEGORIES index (jobs/taxonomy.ts) */
  industry: number;
  /** https URL */
  website?: string;
  /** the person's role in the business, ≤ 60 */
  title?: string;
  /** device only, never on-chain, ≤ 40 */
  registrationNo?: string;
}

export interface AccountProfile {
  version: 1;
  freelancer: boolean;
  client: null | { kind: ClientKind };
  country: CountryCode;
  /** required when client.kind === 'business' */
  business?: BusinessDetails;
  /** unix ms */
  updatedAt: number;
}

export interface AgreementRecord {
  /** AGREEMENT_VERSION */
  agreementVersion: number;
  /** CONSENT_VERSION (3) */
  consentVersion: number;
  roles: { freelancer: boolean; client: ClientKind | null };
  country: CountryCode;
  acceptedAt: number;
  /** hash of the exact text shown (agreementText()) */
  textSha256: string;
  withdrawnAt?: number;
}
