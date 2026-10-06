// Read hooks of the Jobs site (TanStack Query over @ned/core jobs). Pages use these, never web3.js directly.
// Listings refresh every 30 s and on focus (funded-jobs-plan section 6.1).
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from '@ned/core/config.ts';
import { fetchReverseRecords } from '@ned/core/identity/dualPda.ts';
import { decodeJobListing, type JobListingAccount } from '@ned/core/jobs/decode.ts';
import { listMyApplications, listMyJobs, listOpenJobs } from '@ned/core/jobs/queries.ts';

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
