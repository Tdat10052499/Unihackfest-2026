// U3 on the web: reads the signed-in wallet's contracts and jobs every 30 s and on focus, turns what changed into the
// core notices (contractNotice / jobNotice) and keeps them in this browser (lib/noticeStore.ts).
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from '@ned/core/config.ts';
import { fetchReverseRecords } from '@ned/core/identity/dualPda.ts';
import { decodeJobListing, type JobListingAccount } from '@ned/core/jobs/decode.ts';
import { jobEvents, jobSnapshot } from '@ned/core/jobs/events.ts';
import { listMyApplications, listMyJobs } from '@ned/core/jobs/queries.ts';
import { contractEvents, contractSnapshot } from '@ned/core/milestone/events.ts';
import { contractNotice, jobNotice } from '@ned/core/milestone/notices.ts';
import { getChainNow, listFunds } from '@ned/core/milestone/queries.ts';
import { shortAddress } from '../lib/format.ts';
import { loadNotices, markAllSeen, mergeNotices, saveNotices, unreadCount, type StoredNotice } from '../lib/noticeStore.ts';

export const NOTICES_POLL_MS = 30_000;

async function readAll(wallet: string) {
  const conn = getConnection();
  const [asClient, asFreelancer, mine, apps, now] = await Promise.all([
    listFunds(wallet, 'client'),
    listFunds(wallet, 'freelancer'),
    listMyJobs(wallet),
    listMyApplications(wallet),
    getChainNow(),
  ]);
  const funds = [...new Map([...asClient, ...asFreelancer].map((f) => [f.address.toBase58(), f])).values()];
  const infos = apps.length ? await conn.getMultipleAccountsInfo(apps.map((a) => a.job), 'confirmed') : [];
  const applied: JobListingAccount[] = [];
  infos.forEach((info, i) => {
    try {
      if (info) applied.push(decodeJobListing(apps[i].job, info.data));
    } catch {
      // not a listing any more
    }
  });
  return { funds, mine, applied, now };
}

export function useNotices(wallet: string | null, vn: boolean) {
  const [items, setItems] = useState<StoredNotice[]>(() => (wallet ? loadNotices(localStorage, wallet).items : []));
  useEffect(() => setItems(wallet ? loadNotices(localStorage, wallet).items : []), [wallet]);

  const data = useQuery({
    queryKey: ['notices', wallet],
    enabled: Boolean(wallet),
    refetchInterval: NOTICES_POLL_MS,
    refetchOnWindowFocus: true,
    queryFn: () => readAll(wallet!),
  }).data;

  useEffect(() => {
    if (!wallet || !data) return;
    void (async () => {
      const state = loadNotices(localStorage, wallet);
      const contractEvts = contractEvents(state.contracts, data.funds, wallet, state.at !== null ? { prevNow: state.at, now: data.now } : undefined);
      const jobEvts = jobEvents(state.jobs, data.mine, data.applied, wallet);
      const others = [...new Set(contractEvts.map((e) => e.counterparty))];
      const records = others.length ? await fetchReverseRecords(getConnection(), others.map((w) => new PublicKey(w))).catch(() => []) : [];
      const names: Record<string, string> = {};
      others.forEach((w, i) => (names[w] = records[i]?.username ? `@${records[i]!.username}` : shortAddress(w)));
      const incoming: StoredNotice[] = [
        ...contractEvts.map((e) => ({ id: e.id, ...contractNotice(e, vn, names[e.counterparty] ?? shortAddress(e.counterparty)), at: data.now, href: `/contract/${e.fund}`, seen: false })),
        ...jobEvts.map((e) => ({ id: e.id, ...jobNotice(e), at: data.now, href: e.kind === 'newApplicant' ? `/jobs/${e.job}/applicants` : `/jobs/${e.job}`, seen: false })),
      ];
      const next = {
        ...state,
        contracts: contractSnapshot(data.funds),
        jobs: jobSnapshot([...data.mine, ...data.applied]),
        at: data.now,
        items: mergeNotices(state.items, incoming),
      };
      saveNotices(localStorage, wallet, next);
      setItems(next.items);
    })();
  }, [wallet, data, vn]);

  const seeAll = useCallback(() => {
    if (!wallet) return;
    const state = loadNotices(localStorage, wallet);
    const next = { ...state, items: markAllSeen(state.items) };
    saveNotices(localStorage, wallet, next);
    setItems(next.items);
  }, [wallet]);

  return { items, unread: unreadCount(items), seeAll };
}
