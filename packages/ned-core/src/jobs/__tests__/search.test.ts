import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';
import { filterJobs, filtersFromQuery, filtersToQuery, foldText, inBudget, sortJobs, type JobFilters } from '../search.ts';
import { skillsMask } from '../taxonomy.ts';
import { job, T0, USDC } from './fixture.ts';

const DAY = 86_400;
const A = job({ address: PublicKey.unique(), title: 'Logo cho quán cà phê', summary: 'Thiết kế logo đơn giản', category: 0, skills: skillsMask([0, 3]), createdAt: T0 + 3, applyBy: T0 + 10 * DAY, milestones: [{ amount: 50n * USDC, workSecs: 5 * DAY, reviewSecs: DAY }] });
const B = job({ address: PublicKey.unique(), title: 'Landing page', summary: 'React front end for a budgeting app', category: 1, skills: skillsMask([6]), createdAt: T0 + 2, applyBy: T0 + 12 * 3600, milestones: [{ amount: 100n * USDC, workSecs: 10 * DAY, reviewSecs: DAY }, { amount: 100n * USDC, workSecs: 20 * DAY, reviewSecs: DAY }] });
const C = job({ address: PublicKey.unique(), title: 'Translate a deck', summary: 'English to Vietnamese, 20 slides', category: 2, skills: skillsMask([12]), createdAt: T0 + 1, applyBy: T0 + 2 * DAY, milestones: Array.from({ length: 4 }, () => ({ amount: 5n * USDC, workSecs: 40 * DAY, reviewSecs: DAY })) });
const ALL = [A, B, C];
const ctx = { now: T0 };
const ids = (jobs: typeof ALL) => jobs.map((j) => (j === A ? 'A' : j === B ? 'B' : 'C')).join('');

test('foldText is case- and accent-insensitive (Vietnamese included)', () => {
  assert.equal(foldText('  Thiết KẾ   Đà Nẵng '), 'thiet ke da nang');
});

test('text search on title + summary, every word must match, accents ignored', () => {
  assert.equal(ids(filterJobs(ALL, { q: 'LOGO' }, ctx)), 'A');
  assert.equal(ids(filterJobs(ALL, { q: 'thiet ke' }, ctx)), 'A');
  assert.equal(ids(filterJobs(ALL, { q: 'react budgeting' }, ctx)), 'B');
  assert.equal(ids(filterJobs(ALL, { q: 'react logo' }, ctx)), '');
});

test('category, skills (any of), budget, duration, milestone count, apply within 24 h, hide applied', () => {
  assert.equal(ids(filterJobs(ALL, { cat: 'development' }, ctx)), 'B');
  assert.equal(ids(filterJobs(ALL, { skills: ['figma', 'en-vi'] }, ctx)), 'AC');
  assert.equal(ids(filterJobs(ALL, { min: 50 }, ctx)), 'AB');
  assert.equal(ids(filterJobs(ALL, { max: 50 }, ctx)), 'AC');
  assert.equal(ids(filterJobs(ALL, { min: 21, max: 199 }, ctx)), 'A');
  assert.equal(ids(filterJobs(ALL, { dur: '1w' }, ctx)), 'A');
  assert.equal(ids(filterJobs(ALL, { dur: '1m' }, ctx)), 'AB');
  assert.equal(ids(filterJobs(ALL, { ms: '1' }, ctx)), 'A');
  assert.equal(ids(filterJobs(ALL, { ms: '2-3' }, ctx)), 'B');
  assert.equal(ids(filterJobs(ALL, { ms: '4-5' }, ctx)), 'C');
  assert.equal(ids(filterJobs(ALL, { soon: true }, ctx)), 'B');
  assert.equal(ids(filterJobs(ALL, { hide: true }, { now: T0, applied: new Set([A.address.toBase58()]) })), 'BC');
  assert.equal(ids(filterJobs(ALL, { hide: true }, ctx)), 'ABC', 'nothing to hide without the list');
  assert.equal(ids(filterJobs(ALL, {}, ctx)), 'ABC');
});

test('sortJobs: newest, apply by soonest, budget high to low; never in place', () => {
  const input = [C, A, B];
  assert.equal(ids(sortJobs(input)), 'ABC');
  assert.equal(ids(sortJobs(input, 'soon')), 'BCA');
  assert.equal(ids(sortJobs(input, 'budget')), 'BAC');
  assert.equal(ids(input), 'CAB');
});

test('URL round trip, defaults left out, invalid values dropped', () => {
  const f: JobFilters = { q: 'logo cà phê', cat: 'design', skills: ['figma', 'logo-brand'], min: 10, max: 100, dur: '2w', ms: '2-3', soon: true, hide: true, sort: 'budget' };
  const query = filtersToQuery(f);
  assert.equal(query, 'q=logo+c%C3%A0+ph%C3%AA&cat=design&skills=figma,logo-brand&min=10&max=100&dur=2w&ms=2-3&soon=24h&hide=applied&sort=budget');
  assert.deepEqual(filtersFromQuery(query), f);
  assert.deepEqual(filtersFromQuery(`?${query}`), f);
  assert.equal(filtersToQuery({}), '');
  assert.equal(filtersToQuery({ sort: 'new' }), '');
  assert.deepEqual(filtersFromQuery('cat=nope&skills=figma,nope,figma&min=-1&max=abc&dur=1y&ms=9&sort=old&soon=1&hide=1'), { skills: ['figma'] });
  assert.deepEqual(filtersFromQuery(new URLSearchParams('q=%20%20')), {});
});

test('v4: budget presets, view and tab in the URL (key order q, cat, budget, skills, …, sort, view, tab)', () => {
  const f: JobFilters = { q: 'logo', cat: 'design', budget: '20to50', skills: ['figma'], dur: '1w', ms: '1', soon: true, hide: true, sort: 'soon', view: 'list', tab: 'applied' };
  const query = filtersToQuery(f);
  assert.equal(query, 'q=logo&cat=design&budget=20to50&skills=figma&dur=1w&ms=1&soon=24h&hide=applied&sort=soon&view=list&tab=applied');
  assert.deepEqual(filtersFromQuery(query), f);
  assert.equal(filtersToQuery({ view: 'grid', tab: 'open' }), '');
  assert.deepEqual(filtersFromQuery('budget=huge&view=table&tab=nope'), {});
  assert.deepEqual(filtersFromQuery('min=10&max=100'), { min: 10, max: 100 }, 'older links with min / max still work');
  const U = 1_000_000n;
  assert.deepEqual([19n, 20n, 50n, 51n].map((n) => [inBudget(n * U, 'lt20'), inBudget(n * U, '20to50'), inBudget(n * U, 'gt50')]), [
    [true, false, false],
    [false, true, false],
    [false, true, false],
    [false, false, true],
  ]);
  const ctx = { now: 0 };
  assert.equal(filterJobs(ALL, { view: 'list', tab: 'applied' }, ctx).length, ALL.length, 'view and tab never filter');
});

test('v1.4 funded=1: filter, URL round trip after hide, and Newest puts funded first within the same day', () => {
  const fundedOld = job({ address: PublicKey.unique(), title: 'A', createdAt: T0 });
  const openNew = job({ address: PublicKey.unique(), title: 'B', createdAt: T0 + 60, unfunded: true });
  const fundedNew = job({ address: PublicKey.unique(), title: 'C', createdAt: T0 + 30 });
  const nextDay = job({ address: PublicKey.unique(), title: 'D', createdAt: T0 + 86_400, unfunded: true });
  const list = [fundedOld, openNew, fundedNew, nextDay];
  assert.deepEqual(filterJobs(list, { funded: true }, { now: T0 }).map((j) => j.title), ['A', 'C']);
  assert.equal(filterJobs(list, {}, { now: T0 }).length, 4, 'off by default');
  const titles = sortJobs(list).map((j) => j.title);
  assert.equal(titles[0], 'D', 'a newer day still comes first');
  const sameDay = titles.slice(1);
  assert.ok(sameDay.indexOf('B') > sameDay.indexOf('C') && sameDay.indexOf('B') > sameDay.indexOf('A'), `funded first within the day: ${titles}`);
  assert.equal(filtersToQuery({ hide: true, funded: true, sort: 'soon' }), 'hide=applied&funded=1&sort=soon');
  assert.deepEqual(filtersFromQuery('funded=1'), { funded: true });
  assert.deepEqual(filtersFromQuery('funded=yes'), {});
});
