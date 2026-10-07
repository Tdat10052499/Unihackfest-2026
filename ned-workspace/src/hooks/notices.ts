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
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import { fetchNotes, NOTE_KIND_DELIVERY } from '@ned/core/milestone/notes.ts';
import { readFundReleases } from '@ned/core/milestone/records.ts';
import { finalsNotices, type FinalsWatch } from '../lib/finalFiles.ts';
import { shortAddress } from '../lib/format.ts';
import { loadNotices, markAllSeen, mergeNotices, saveNotices, unreadCount, type StoredNotice } from '../lib/noticeStore.ts';

export const NOTICES_POLL_MS = 30_000;
/** Stop watching a released milestone for its final files a week after release */
const FINALS_WATCH_SECS = 7 * 86_400;

/**
 * F2: the released milestones this wallet is part of, with their release time (read once from the contract's
 * transactions) and whether the final files arrived. A hand-over is a delivery note by the freelancer on that
 * milestone after the release; the note is not decrypted here.
 */
async function watchFinals(wallet: string, funds: FundAccount[], known: Record<string, { releasedAt: number | null; handed: boolean }>, now: number) {
  const conn = getConnection();
  const watch: FinalsWatch[] = [];
  const next: Record<string, { releasedAt: number | null; handed: boolean }> = {};
  for (const f of funds) {
    const address = f.address.toBase58();
    const role = f.client.toBase58() === wallet ? 'client' : f.freelancer.toBase58() === wallet ? 'freelancer' : null;
    if (!role) continue;
    const released = f.milestones.map((m, i) => (m.status === 'Released' ? i : -1)).filter((i) => i >= 0);
    if (!released.length) continue;
    const open = released.filter((i) => !known[`${address}:${i}`]?.handed);
    let times: Record<number, number> = {};
    if (released.some((i) => !(`${address}:${i}` in known))) {
      const records = await readFundReleases(conn, address, f).catch(() => []);
      times = Object.fromEntries(records.map((r) => [r.index, r.releasedAt]));
    }
    const notes = open.length ? await fetchNotes(f.address, conn).catch(() => []) : [];
    for (const i of released) {
      const key = `${address}:${i}`;
      const releasedAt = known[key]?.releasedAt ?? times[i] ?? null;
      if (releasedAt && now - releasedAt > FINALS_WATCH_SECS && known[key]) {
        next[key] = known[key];
        continue;
      }
      const handed =
        known[key]?.handed ||
        notes.some((n) => n.kind === NOTE_KIND_DELIVERY && n.milestone === i && n.author.equals(f.freelancer) && n.blockTime !== undefined && releasedAt !== null && n.blockTime >= releasedAt);
      next[key] = { releasedAt, handed };
      watch.push({ fund: address, index: i, title: f.title, role, releasedAt, handed });
    }
  }
  return { watch, next };
}

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
      const finals = await watchFinals(wallet, data.funds, state.finals ?? {}, data.now).catch(() => ({ watch: [], next: state.finals ?? {} }));
      const prevHanded = Object.fromEntries(Object.entries(state.finals ?? {}).map(([k, v]) => [k, v.handed]));
      const finalsEvts = finalsNotices(finals.watch, prevHanded, state.at, data.now);
      const incoming: StoredNotice[] = [
        ...finalsEvts.map((e) => ({ ...e, at: data.now, seen: false })),
        ...contractEvts.map((e) => ({ id: e.id, ...contractNotice(e, vn, names[e.counterparty] ?? shortAddress(e.counterparty)), at: data.now, href: `/contract/${e.fund}`, seen: false })),
        ...jobEvts.map((e) => ({ id: e.id, ...jobNotice(e), at: data.now, href: e.kind === 'newApplicant' ? `/jobs/${e.job}/applicants` : `/jobs/${e.job}`, seen: false })),
      ];
      const next = {
        ...state,
        contracts: contractSnapshot(data.funds),
        jobs: jobSnapshot([...data.mine, ...data.applied]),
        at: data.now,
        items: mergeNotices(state.items, incoming),
        finals: finals.next,
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
