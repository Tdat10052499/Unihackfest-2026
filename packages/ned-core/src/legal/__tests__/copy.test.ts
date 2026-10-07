import { test } from 'node:test';
import assert from 'node:assert/strict';
import { disclosuresDoc, JOB_POSTING_RULES, LEGAL_DOC_IDS, legalDocs, PRIVACY, TEAM_EMAIL, TERMS } from '../copy.ts';
import * as core from '../../index.ts';

const text = (s: { title: string; body: string[] }[]) => s.map((x) => `${x.title} ${x.body.join(' ')}`).join(' ');

test('one source: the four documents of /jobs/legal, in order, built from the shipped text', () => {
  const docs = legalDocs(false);
  assert.deepEqual(docs.map((d) => d.id), [...LEGAL_DOC_IDS]);
  assert.equal(docs[0].sections, TERMS);
  assert.equal(docs[1].sections, PRIVACY);
  assert.equal(docs[2].sections.length, 12);
  assert.equal(docs[3].sections, JOB_POSTING_RULES);
  assert.equal(typeof core.legalDocs, 'function', 'exported from @ned/core');
});

test('disclosures follow the dispute flag; rules keep the visible [team email] placeholder', () => {
  assert.match(text(disclosuresDoc(false)), /No disputes in this demo/);
  assert.match(text(disclosuresDoc(true)), /No neutral arbiter/);
  assert.equal(TEAM_EMAIL, '[team email]');
  assert.match(text(JOB_POSTING_RULES), /\[team email\]/);
});

test('wording: no escrow, safe, guaranteed or licensed partner; "payment" only in the flagged Terms line', () => {
  const all = legalDocs(true).map((d) => text(d.sections)).join(' ');
  assert.doesNotMatch(all, /escrow|\bsafe\b|guaranteed|licensed partner|\bpay\b/i);
  assert.deepEqual(all.match(/payment\w*/gi), ['payment']);
});
