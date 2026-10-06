import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';
import { filterJobs, filtersFromQuery, filtersToQuery, foldText, sortJobs, type JobFilters } from '../search.ts';
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
