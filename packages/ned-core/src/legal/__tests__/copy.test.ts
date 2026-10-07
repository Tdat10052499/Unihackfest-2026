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
  assert.equal(docs[2].sections.length, 13);
  assert.equal(docs[3].sections, JOB_POSTING_RULES);
  assert.equal(typeof core.legalDocs, 'function', 'exported from @ned/core');
});

test('disclosures follow the dispute flag; rules keep the visible [team email] placeholder', () => {
  assert.match(text(disclosuresDoc(false)), /No disputes in this demo/);
  assert.match(text(disclosuresDoc(true)), /No neutral arbiter/);
  assert.equal(TEAM_EMAIL, '[team email]');
  assert.match(text(JOB_POSTING_RULES), /\[team email\]/);
});

test('wording: no escrow, safe, guaranteed, licensed partner, payment or money-transfer service (CL review 7 Oct)', () => {
  const all = legalDocs(true).map((d) => text(d.sections)).join(' ');
  assert.doesNotMatch(all, /escrow|\bsafe\b|guaranteed|licensed partner|\bpay\b|payment|money-transfer|never hold crypto/i);
});

test('job posting rules: Vietnam view cannot post, no listing review, devnet accept window first', () => {
  const r = text(JOB_POSTING_RULES);
  assert.match(r, /The Vietnam view cannot post jobs or lock funds/);
  assert.match(r, /N\.E\.D does not review or approve listings/);
  assert.match(r, /2 minutes to accept on devnet \(48 hours planned for launch\)/);
});

test('F11: the upgrade authority is disclosed, and no text says "no one at N.E.D can move" funds', () => {
  assert.match(text(disclosuresDoc(true)), /The team can still upgrade the program/);
  const all = legalDocs(true).map((d) => text(d.sections)).join(' ');
  assert.doesNotMatch(all, /no one at N\.E\.D can move|Nobody, including N\.E\.D/i);
});

test('R3: the Privacy notice names the preview sites under "Where data goes"', () => {
  const where = PRIVACY.find((s) => s.title === 'Where data goes')!;
  assert.ok(where.body.includes('If you press Load preview, your browser connects to the site that hosts the link (for example Google Drive, Figma or YouTube). That site receives your IP address and may use its own cookies. N.E.D sends it nothing else.'));
});
