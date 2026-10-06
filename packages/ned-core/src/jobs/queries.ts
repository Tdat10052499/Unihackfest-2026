// Job reads by memcmp (funded-jobs-plan.md section 5). One getProgramAccounts call returns every field the board
// searches and filters on (section 6.1); no server.
import bs58 from 'bs58';
import { PublicKey, type Connection, type GetProgramAccountsFilter } from '@solana/web3.js';
import { getConnection, getProgramId } from '../config.ts';
import { decodeJobApplication, decodeJobListing, JOB_APPLICATION_DISCRIMINATOR, JOB_LISTING_DISCRIMINATOR, type JobApplicationAccount, type JobListingAccount } from './decode.ts';
import { jobAppPda } from './pda.ts';
import {
  APP_OFFSET_FREELANCER,
  APP_OFFSET_JOB,
  JOB_APPLICATION_SIZE,
  JOB_LISTING_SIZE,
  JOB_OFFSET_BUSINESS,
  JOB_OFFSET_CATEGORY,
  JOB_OFFSET_FUND,
  JOB_OFFSET_STATE,
  JOB_STATES,
} from './layout.ts';

type ListConnection = Pick<Connection, 'getProgramAccounts'>;
type InfoConnection = Pick<Connection, 'getAccountInfo'>;
const key = (k: PublicKey | string) => (typeof k === 'string' ? k : k.toBase58());
const byte = (n: number) => bs58.encode(Uint8Array.of(n));

const listingFilters = (extra: GetProgramAccountsFilter[]): GetProgramAccountsFilter[] => [
  { dataSize: JOB_LISTING_SIZE },
  { memcmp: { offset: 0, bytes: bs58.encode(JOB_LISTING_DISCRIMINATOR) } },
  ...extra,
];
const applicationFilters = (extra: GetProgramAccountsFilter[]): GetProgramAccountsFilter[] => [
  { dataSize: JOB_APPLICATION_SIZE },
  { memcmp: { offset: 0, bytes: bs58.encode(JOB_APPLICATION_DISCRIMINATOR) } },
  ...extra,
];

async function listings(conn: ListConnection, filters: GetProgramAccountsFilter[]): Promise<JobListingAccount[]> {
  const accounts = await conn.getProgramAccounts(getProgramId(), { commitment: 'confirmed', filters: listingFilters(filters) });
  const out: JobListingAccount[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      out.push(decodeJobListing(pubkey, account.data));
    } catch (err) {
      console.warn('[jobs] skipped an account that does not decode as JobListing', pubkey.toBase58(), err);
    }
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

async function applications(conn: ListConnection, filters: GetProgramAccountsFilter[]): Promise<JobApplicationAccount[]> {
  const accounts = await conn.getProgramAccounts(getProgramId(), { commitment: 'confirmed', filters: applicationFilters(filters) });
  const out: JobApplicationAccount[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      out.push(decodeJobApplication(pubkey, account.data));
    } catch (err) {
      console.warn('[jobs] skipped an account that does not decode as JobApplication', pubkey.toBase58(), err);
    }
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** Open listings (state at 9), optionally one category (at 42); newest first */
export function listOpenJobs(opts: { category?: number } = {}, conn: ListConnection = getConnection()) {
  const filters: GetProgramAccountsFilter[] = [{ memcmp: { offset: JOB_OFFSET_STATE, bytes: byte(JOB_STATES.indexOf('Open')) } }];
  if (opts.category !== undefined) filters.push({ memcmp: { offset: JOB_OFFSET_CATEGORY, bytes: byte(opts.category) } });
  return listings(conn, filters);
}

/** Every listing of a business, any state (at 10); newest first */
export function listMyJobs(business: PublicKey | string, conn: ListConnection = getConnection()) {
  return listings(conn, [{ memcmp: { offset: JOB_OFFSET_BUSINESS, bytes: key(business) } }]);
}

/** Applications to one job (at 9); newest first */
export function listApplicants(job: PublicKey | string, conn: ListConnection = getConnection()) {
  return applications(conn, [{ memcmp: { offset: APP_OFFSET_JOB, bytes: key(job) } }]);
}

/** Applications of one freelancer (at 41); newest first */
export function listMyApplications(freelancer: PublicKey | string, conn: ListConnection = getConnection()) {
  return applications(conn, [{ memcmp: { offset: APP_OFFSET_FREELANCER, bytes: key(freelancer) } }]);
}

/** The listing whose `fund` is this contract (at 508), or null for an ordinary contract */
export async function jobForFund(fund: PublicKey | string, conn: ListConnection = getConnection()): Promise<JobListingAccount | null> {
  const found = await listings(conn, [{ memcmp: { offset: JOB_OFFSET_FUND, bytes: key(fund) } }]);
  return found[0] ?? null;
}

/** One listing; null when it does not exist or is not owned by the program */
export async function getJob(address: PublicKey | string, conn: InfoConnection = getConnection()): Promise<JobListingAccount | null> {
  const k = typeof address === 'string' ? new PublicKey(address) : address;
  const info = await conn.getAccountInfo(k, 'confirmed');
  if (!info || !info.owner.equals(getProgramId())) return null;
  return decodeJobListing(k, info.data);
}

/** The application of `freelancer` to `job`, or null */
export async function getApplication(job: PublicKey, freelancer: PublicKey, conn: InfoConnection = getConnection()): Promise<JobApplicationAccount | null> {
  const address = jobAppPda(job, freelancer);
  const info = await conn.getAccountInfo(address, 'confirmed');
  if (!info || !info.owner.equals(getProgramId())) return null;
  return decodeJobApplication(address, info.data);
}
