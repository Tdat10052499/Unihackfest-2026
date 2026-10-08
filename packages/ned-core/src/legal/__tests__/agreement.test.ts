import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AccountProfile } from '../../account/types.ts';
import {
  AGREEMENT_CHECKS,
  AGREEMENT_COPY,
  AGREEMENT_LINKS,
  AGREEMENT_VERSION,
  agreementCards,
  agreementHash,
  agreementText,
  agreementVersionLine,
  BUSINESS_CARD,
  CLIENT_CARD,
  CONSENT_SCOPE_V2,
  CONSENT_SCOPE_V3,
  consentVersion,
  CURRENT_AGREEMENT_VERSIONS,
  FREELANCER_CARD,
  NED_CARD,
  NED_CARD_PREVIEW,
} from '../agreement.ts';
import * as core from '../../index.ts';

type P = Pick<AccountProfile, 'freelancer' | 'client' | 'country'>;
const freelancer: P = { freelancer: true, client: null, country: 'VN' };
const client: P = { freelancer: false, client: { kind: 'individual' }, country: 'SG' };
const business: P = { freelancer: false, client: { kind: 'business' }, country: 'SG' };

test('the hash is stable for the same input, 64 hex characters', () => {
  const a = agreementHash(agreementText(freelancer));
  assert.equal(a, agreementHash(agreementText({ ...freelancer })));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(agreementHash('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256 test vector');
});

test('the hash changes with role, country and version', () => {
  const base = agreementHash(agreementText({ ...freelancer, country: 'SG' }));
  assert.notEqual(base, agreementHash(agreementText(client)), 'role');
  assert.notEqual(base, agreementHash(agreementText({ ...freelancer, client: { kind: 'individual' }, country: 'SG' })), 'second role');
  assert.notEqual(base, agreementHash(agreementText(freelancer)), 'country');
  assert.notEqual(agreementHash(agreementText(client)), agreementHash(agreementText(business)), 'client kind');
  const v2 = { ...CURRENT_AGREEMENT_VERSIONS, agreement: 2 };
  assert.notEqual(base, agreementHash(agreementText({ ...freelancer, country: 'SG' }, v2)), 'agreement version');
  const t13 = { ...CURRENT_AGREEMENT_VERSIONS, terms: '1.3' };
  assert.notEqual(base, agreementHash(agreementText({ ...freelancer, country: 'SG' }, t13)), 'terms version');
});

test('cards per role, in the order freelancer, client, business, N.E.D', () => {
  assert.deepEqual(agreementCards(freelancer), [FREELANCER_CARD, NED_CARD]);
  assert.deepEqual(agreementCards(client), [CLIENT_CARD, NED_CARD]);
  assert.deepEqual(agreementCards(business), [CLIENT_CARD, BUSINESS_CARD, NED_CARD], 'a business client: client, business and N.E.D');
  assert.deepEqual(agreementCards({ freelancer: true, client: { kind: 'business' } }), [FREELANCER_CARD, CLIENT_CARD, BUSINESS_CARD, NED_CARD]);
});

test('a business that also works gets four cards; the N.E.D card shows three items before Read all', () => {
  assert.equal(agreementCards({ freelancer: true, client: { kind: 'business' } }).length, 4);
  assert.equal(NED_CARD.items.length, 8);
  assert.equal(NED_CARD_PREVIEW, 3);
  assert.equal(AGREEMENT_COPY.ned.more, 'Read all');
});

test('the text shown holds the three checks, the cards and the version line', () => {
  const t = agreementText(business);
  assert.equal(AGREEMENT_CHECKS.length, 3);
  for (const c of AGREEMENT_CHECKS) assert.ok(t.includes(c), c);
  assert.ok(t.includes('I am 18 or older, and the country and role I chose are true.'));
  for (const line of [...CLIENT_CARD.countOn, ...CLIENT_CARD.agreeTo, ...BUSINESS_CARD.items, ...NED_CARD.items]) assert.ok(t.includes(line), line);
  assert.ok(!t.includes(FREELANCER_CARD.agreeTo[0]), 'no freelancer card for a client-only profile');
  assert.ok(t.includes(AGREEMENT_COPY.linksBusiness), 'clients get the Job posting rules link');
  assert.ok(!agreementText(freelancer).includes(AGREEMENT_COPY.linksBusiness));
  assert.equal(agreementVersionLine(CURRENT_AGREEMENT_VERSIONS), AGREEMENT_COPY.version);
  assert.equal(CURRENT_AGREEMENT_VERSIONS.agreement, AGREEMENT_VERSION);
  assert.ok(t.split('\n').every((l) => l.length > 0));
});

test('consent version and scope in one place', () => {
  assert.equal(consentVersion(false), 2);
  assert.equal(consentVersion(true), 3);
  assert.deepEqual(CONSENT_SCOPE_V3, [...CONSENT_SCOPE_V2, 'country', 'role', 'business-details', 'jobs-public']);
  assert.equal(typeof core.agreementHash, 'function', 'exported from @ned/core');
});

test('the link pieces join to agreement.links exactly', () => {
  const l = AGREEMENT_LINKS;
  assert.equal(`${l.lead} ${l.terms}${l.separator}${l.privacy}${l.separator}${l.disclosures}`, AGREEMENT_COPY.links);
});
