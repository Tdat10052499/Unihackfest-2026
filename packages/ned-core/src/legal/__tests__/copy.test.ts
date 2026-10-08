import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORE_FEATURES } from '../../features.ts';
import {
  AGREEMENT_COPY,
  BUSINESS_CARD,
  CLIENT_CARD,
  FREELANCER_CARD,
  NED_CARD,
} from '../agreement.ts';
import {
  disclosuresDoc,
  GOVERNING_LAW,
  JOB_POSTING_RULES,
  LEGAL_DOC_IDS,
  legalDocs,
  legalPlaceholders,
  OPERATOR_NAME,
  PRIVACY,
  PRIVACY_V2,
  TEAM_EMAIL,
  TERMS,
  TERMS_V12,
} from '../copy.ts';
import * as core from '../../index.ts';

const text = (s: { title: string; body: string[] }[]) => s.map((x) => `${x.title} ${x.body.join(' ')}`).join(' ');

test('one source: the four documents of /jobs/legal, in order, built from the shipped text', () => {
  const docs = legalDocs(false);
  assert.deepEqual(docs.map((d) => d.id), [...LEGAL_DOC_IDS]);
  assert.equal(docs[0].sections, TERMS);
  assert.equal(docs[1].sections, PRIVACY);
  assert.equal(docs[2].sections.length, 15, 'v1.4 adds "Some listings lock only when they hire"; D15 adds "Residence is self-declared"');
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
  assert.ok(where.body.includes('If you press Load preview or Download, your browser connects to the site that hosts the link (for example Google Drive, Figma or YouTube). That site receives your IP address and may use its own cookies. N.E.D sends it nothing else.'));
});

test('v1.4 lock at hire (CL pre-pitch-check 9.3 items 1–3)', () => {
  assert.match(text(TERMS), /either when it is posted or when the business selects a freelancer, and always before the freelancer accepts/);
  assert.doesNotMatch(text(TERMS), /post with a budget locked in the program/);
  const r = text(JOB_POSTING_RULES);
  assert.equal(JOB_POSTING_RULES[0].title, 'Lock the budget now or when you hire');
  assert.match(r, /Listings marked Locks when hired have no money locked until you select someone/);
  assert.match(r, /N\.E\.D does not check that you can lock the budget; if you cannot, you cannot select/);
  assert.match(r, /nothing is returned for a listing that locks when you hire/);
  const d = disclosuresDoc(true);
  const i = d.findIndex((x) => x.title === 'Some listings lock only when they hire');
  assert.equal(d[i - 1].title, 'Public on-chain', 'right after the public line');
  assert.equal(d[i].body[0], 'Listings marked Locks when hired have no locked budget until the business selects someone. Your application and pitch are public even if the listing is never funded.');
});

// D30 (R2): section 0 rule 4 of the D30 prompts (design §6)
const D30_BANNED =
  /\bpay(ment|s|ing)?\b|escrow|intermediar|trung gian|guarantee|\bsafe\b|protected|verified|trusted|employer|employee|salary/i;

test('D30: no banned word in Terms 1.2, Privacy 2 or any agreement string', () => {
  const agreement = [
    ...Object.values(AGREEMENT_COPY).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))),
    ...[FREELANCER_CARD, CLIENT_CARD].flatMap((c) => [c.heading, ...c.countOn, ...c.agreeTo]),
    ...[BUSINESS_CARD, NED_CARD].flatMap((c) => [c.heading, ...c.items]),
  ];
  for (const s of [...agreement, text(TERMS_V12), text(PRIVACY_V2)]) assert.doesNotMatch(s, D30_BANNED, s);
});

test('D30 F11: no agreement string says "including N.E.D, can change" (PO, 8 Oct)', () => {
  const agreement = [
    ...[FREELANCER_CARD, CLIENT_CARD].flatMap((c) => [c.heading, ...c.countOn, ...c.agreeTo]),
    ...[BUSINESS_CARD, NED_CARD].flatMap((c) => [c.heading, ...c.items]),
    ...Object.values(AGREEMENT_COPY).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))),
    text(TERMS_V12),
  ];
  for (const s of agreement) assert.doesNotMatch(s, /including N\.E\.D, can change/i, s);
  assert.ok(FREELANCER_CARD.countOn.includes('The place your earnings go is fixed when you accept. No instruction in the program lets anyone change it.'));
});

test('D30: legalDocs serves Terms 1.2 / Privacy 2 only with accountRoles; live text unchanged', () => {
  assert.equal(legalDocs(false)[0].sections, TERMS);
  assert.equal(legalDocs(true, false)[1].sections, PRIVACY);
  assert.equal(legalDocs(true, true)[0].sections, TERMS_V12);
  assert.equal(legalDocs(true, true)[1].sections, PRIVACY_V2);
  for (const t of TERMS.filter((x) => x.title !== 'Changes')) assert.ok(TERMS_V12.includes(t), t.title);
  const titles = TERMS_V12.map((t) => t.title);
  for (const t of ['Who we are', 'Your role and where you live', 'Rights and duties', 'Limit of responsibility', 'Misuse', 'Changes', 'Contact', 'Law']) {
    assert.ok(titles.includes(t), t);
  }
  assert.match(text(TERMS_V12), /\[operator\]/);
  assert.match(text(TERMS_V12), /\[team email\]/);
});

test('D30: Privacy 2 has the CL §14.2 items and the on-device line', () => {
  const p = text(PRIVACY_V2);
  for (const s of [
    /Country, role and business details are kept on this device/,
    /Dynamic \(login\), Helius \(blockchain data\), Vercel and GitHub \(hosting\) process data in the United States/,
    /Solana nodes run worldwide/,
    /How long data is kept/,
    /access, correct or delete your data, to restrict or object/,
    /complain/,
    /cannot be corrected or deleted by anyone/,
    /18 or older/,
    /Residence is self-declared/,
    /phone number is optional/i,
    /Job listings, applications and the pitch/,
    /public and permanent/,
  ]) assert.match(p, s);
  for (const s of PRIVACY.filter((x) => x.title !== 'Data on Solana is public or permanent')) assert.ok(PRIVACY_V2.includes(s), s.title);
});

// Expected to fail until R9 fills OPERATOR_NAME and GOVERNING_LAW (design §9 questions 1–2); a todo while the flag is off
(CORE_FEATURES.accountRoles ? test : test.todo)('D30: no legal placeholder left once accountRoles is on', () => {
  assert.deepEqual(legalPlaceholders(true), [], `replace ${OPERATOR_NAME} and ${GOVERNING_LAW} before R9`);
});
