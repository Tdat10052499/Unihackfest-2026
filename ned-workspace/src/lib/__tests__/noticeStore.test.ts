import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyNotices, groupByDay, loadNotices, markAllSeen, MAX_NOTICES, mergeNotices, noticeKey, saveNotices, unreadCount, type StoredNotice } from '../noticeStore.ts';

const n = (id: string, at: number, seen = false): StoredNotice => ({ id, title: id, message: '', at, href: '/', seen });

test('merge: newest first, an id never repeats and keeps its seen flag, at most 50', () => {
  const old = [n('a', 10, true), n('b', 5)];
  const merged = mergeNotices(old, [n('a', 20), n('c', 30), n('c', 31)]);
  assert.deepEqual(merged.map((x) => [x.id, x.seen]), [['c', false], ['a', true], ['b', false]]);
  assert.equal(mergeNotices([], Array.from({ length: 60 }, (_, i) => n(`x${i}`, i))).length, MAX_NOTICES);
  assert.equal(unreadCount(merged), 2);
  assert.equal(unreadCount(markAllSeen(merged)), 0);
});

test('Today / Earlier by local day', () => {
  const now = Date.UTC(2026, 9, 6, 12) / 1000;
  const groups = groupByDay([n('t', now - 60), n('y', now - 2 * 86_400)], now);
  assert.deepEqual(groups.map((g) => [g.label, g.items.map((x) => x.id)]), [['Today', ['t']], ['Earlier', ['y']]]);
  assert.deepEqual(groupByDay([], now), []);
});

test('kept per wallet in this browser; a broken record starts again', () => {
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  saveNotices(storage, 'w1', { ...emptyNotices(), at: 5, items: [n('a', 1)] });
  assert.equal(loadNotices(storage, 'w1').items.length, 1);
  assert.deepEqual(loadNotices(storage, 'w2'), emptyNotices());
  mem.set(noticeKey('w1'), '{bad');
  assert.deepEqual(loadNotices(storage, 'w1'), emptyNotices());
});
