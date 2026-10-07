// Notifications on the web (U3): the core events become notices here, kept per wallet in this browser only (the
// "seen" marker included). Nothing is stored anywhere else. Pure apart from the storage it is given.
import type { ContractSnapshot } from '@ned/core/milestone/events.ts';
import type { JobSnapshot } from '@ned/core/jobs/events.ts';

export interface StoredNotice {
  /** the event id (stable, so a notice never repeats) */
  id: string;
  title: string;
  message: string;
  /** unix seconds (chain time of the read that found it) */
  at: number;
  href: string;
  seen: boolean;
}

export interface NoticeState {
  v: 1;
  contracts: ContractSnapshot | null;
  jobs: JobSnapshot | null;
  /** chain time of the last read: deadline events fire for (at, now] */
  at: number | null;
  items: StoredNotice[];
  /** F2: released milestones (`${fund}:${index}`): release time (when read) and whether the final files arrived */
  finals?: Record<string, { releasedAt: number | null; handed: boolean }>;
}

export const MAX_NOTICES = 50;
export const EMPTY_TEXT = 'Contract updates, transfers and alerts show up here.';
export const noticeKey = (wallet: string) => `ned.notices.v1.${wallet}`;
export const emptyNotices = (): NoticeState => ({ v: 1, contracts: null, jobs: null, at: null, items: [] });

export function loadNotices(storage: Pick<Storage, 'getItem'>, wallet: string): NoticeState {
  try {
    const raw = storage.getItem(noticeKey(wallet));
    const s = raw ? (JSON.parse(raw) as NoticeState) : null;
    if (s?.v === 1 && Array.isArray(s.items)) return s;
  } catch {
    // a broken record starts again
  }
  return emptyNotices();
}

export function saveNotices(storage: Pick<Storage, 'setItem'>, wallet: string, state: NoticeState): void {
  try {
    storage.setItem(noticeKey(wallet), JSON.stringify(state));
  } catch {
    // storage full or blocked: notices last until reload
  }
}

/** New notices first; an id already present is kept as it was (with its seen flag); at most MAX_NOTICES */
export function mergeNotices(items: StoredNotice[], incoming: StoredNotice[]): StoredNotice[] {
  const known = new Set(items.map((n) => n.id));
  const fresh = incoming.filter((n) => !known.has(n.id) && (known.add(n.id), true));
  return [...fresh, ...items].sort((a, b) => b.at - a.at).slice(0, MAX_NOTICES);
}

export const markAllSeen = (items: StoredNotice[]) => items.map((n) => (n.seen ? n : { ...n, seen: true }));
export const unreadCount = (items: StoredNotice[]) => items.filter((n) => !n.seen).length;

/** "Today" (same local day as now) and "Earlier" */
export function groupByDay(items: StoredNotice[], now: number): { label: 'Today' | 'Earlier'; items: StoredNotice[] }[] {
  const day = (t: number) => new Date(t * 1000).toDateString();
  const today = items.filter((n) => day(n.at) === day(now));
  const earlier = items.filter((n) => day(n.at) !== day(now));
  return [
    ...(today.length ? [{ label: 'Today' as const, items: today }] : []),
    ...(earlier.length ? [{ label: 'Earlier' as const, items: earlier }] : []),
  ];
}
