// Read hooks of the Jobs site (TanStack Query over @ned/core jobs). Pages use these, never web3.js directly.
// Listings refresh every 30 s and on focus (funded-jobs-plan section 6.1).
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from '@ned/core/config.ts';
import { fetchReverseRecords } from '@ned/core/identity/dualPda.ts';
import { decodeJobListing, type JobListingAccount } from '@ned/core/jobs/decode.ts';
import { fetchJobBrief } from '@ned/core/jobs/brief.ts';
import { getApplication, getJob, listApplicants, listMyApplications, listMyJobs, listOpenJobs } from '@ned/core/jobs/queries.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { listFunds } from '@ned/core/milestone/queries.ts';

export const JOBS_POLL_MS = 30_000;

export function useOpenJobs() {
  return useQuery({ queryKey: ['jobs', 'open'], queryFn: () => listOpenJobs(), refetchInterval: JOBS_POLL_MS, refetchOnWindowFocus: true });
}

/** Listing addresses the wallet applied to */
export function useAppliedJobs(wallet: string | null) {
  return useQuery({
    queryKey: ['jobs', 'applied', wallet],
    enabled: Boolean(wallet),
    refetchInterval: JOBS_POLL_MS,
    queryFn: async () => new Set((await listMyApplications(wallet!)).map((a) => a.job.toBase58())),
  });
}

/** wallet → "@username" for the wallets that have a profile */
export function useDisplayNames(wallets: string[]) {
  const unique = [...new Set(wallets)].sort();
  return useQuery({
    queryKey: ['names', unique.join(',')],
    enabled: unique.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const records = await fetchReverseRecords(getConnection(), unique.map((w) => new PublicKey(w)));
      const out: Record<string, string> = {};
      unique.forEach((w, i) => {
        const username = records[i]?.username;
        if (username) out[w] = `@${username}`;
      });
      return out;
    },
  });
}

/** The wallet's applications with their listings (one getMultipleAccounts for the listings), newest first */
export function useMyApplications(wallet: string | null) {
  return useQuery({
    queryKey: ['jobs', 'myApplications', wallet],
    enabled: Boolean(wallet),
    refetchInterval: JOBS_POLL_MS,
    queryFn: async () => {
      const apps = await listMyApplications(wallet!);
      const infos = apps.length ? await getConnection().getMultipleAccountsInfo(apps.map((a) => a.job), 'confirmed') : [];
      return apps.map((application, i) => {
        const info = infos[i];
        let job: JobListingAccount | null = null;
        try {
          job = info ? decodeJobListing(application.job, info.data) : null;
        } catch {
          job = null;
        }
        return { application, job };
      });
    },
  });
}

/** Listings the wallet posted, any state, newest first */
export function useMyListings(wallet: string | null) {
  return useQuery({ queryKey: ['jobs', 'mine', wallet], enabled: Boolean(wallet), refetchInterval: JOBS_POLL_MS, queryFn: () => listMyJobs(wallet!) });
}

/** One listing (null when it does not exist) */
export function useJob(address: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'one', address],
    enabled: Boolean(address),
    refetchInterval: JOBS_POLL_MS,
    queryFn: async () => {
      try {
        return await getJob(address!);
      } catch {
        return null;
      }
    },
  });
}

/** The public brief of a listing, checked against its brief_hash */
export function useJobBrief(job: JobListingAccount | null | undefined) {
  return useQuery({
    queryKey: ['jobs', 'brief', job?.address.toBase58(), job ? Array.from(job.briefHash).join(',') : ''],
    enabled: Boolean(job),
    staleTime: 60_000,
    queryFn: () => fetchJobBrief(job!),
  });
}

/** The wallet's application to a listing, or null */
export function useMyApplication(job: string | undefined, wallet: string | null) {
  return useQuery({
    queryKey: ['jobs', 'application', job, wallet],
    enabled: Boolean(job && wallet),
    refetchInterval: JOBS_POLL_MS,
    queryFn: () => getApplication(new PublicKey(job!), new PublicKey(wallet!)),
  });
}

export function useApplicants(job: string | undefined) {
  return useQuery({ queryKey: ['jobs', 'applicants', job], enabled: Boolean(job), refetchInterval: JOBS_POLL_MS, queryFn: () => listApplicants(job!) });
}

/**
 * Track records counted from the SharedFund accounts that exist on Solana now (closed contracts are not counted),
 * per wallet and role. Facts only, never a rating.
 */
export function useTrackRecords(wallets: string[], role: 'client' | 'freelancer') {
  const unique = [...new Set(wallets)].sort();
  return useQuery({
    queryKey: ['jobs', 'records', role, unique.join(',')],
    enabled: unique.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const out: Record<string, FundAccount[]> = {};
      await Promise.all(unique.map(async (w) => (out[w] = await listFunds(w, role))));
      return out;
    },
  });
}
