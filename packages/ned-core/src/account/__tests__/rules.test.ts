import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS_COPY, ROLE_COPY, SETTINGS_COPY } from '../copy.ts';
import {
  canBeClient,
  canChangeCountry,
  canRegisterBusinessIn,
  capabilities,
  regionFromCountry,
  validateBusiness,
  validateProfile,
} from '../rules.ts';
import type { AccountProfile, BusinessDetails } from '../types.ts';

const business = (over: Partial<BusinessDetails> = {}): BusinessDetails => ({
  name: 'Lumen Studio Pte. Ltd.',
  registeredIn: 'SG',
  size: '2-10',
  industry: 0,
  ...over,
});

const profile = (over: Partial<AccountProfile> = {}): AccountProfile => ({
  version: 1,
  freelancer: true,
  client: null,
  country: 'SG',
  updatedAt: 0,
  ...over,
});

const NONE = { clientContracts: 0, listings: 0 };

test('regionFromCountry: VN gives vn, anything else intl', () => {
  assert.equal(regionFromCountry('VN'), 'vn');
  assert.equal(regionFromCountry('SG'), 'intl');
  assert.equal(regionFromCountry('US'), 'intl');
});

test('canBeClient and canRegisterBusinessIn: everywhere but Vietnam', () => {
  assert.equal(canBeClient('VN'), false);
  assert.equal(canBeClient('DE'), true);
  assert.equal(canRegisterBusinessIn('VN'), false);
  assert.equal(canRegisterBusinessIn('SG'), true);
});

test('validateBusiness: a valid business has no errors; optional fields may be empty', () => {
  assert.deepEqual(validateBusiness(business()), []);
  assert.deepEqual(
    validateBusiness(business({ website: 'https://lumen.example', title: 'Founder', registrationNo: '2019-12345' })),
    [],
  );
  assert.deepEqual(validateBusiness(business({ website: '' })), []);
});

test('validateBusiness: each field, with the copy-deck message', () => {
  const err = (b: BusinessDetails) => validateBusiness(b).map((e) => [e.field, e.message]);
  assert.deepEqual(err(business({ name: ' A ' })), [['name', BUSINESS_COPY.name.error]]);
  assert.deepEqual(err(business({ name: 'x'.repeat(81) })), [['name', BUSINESS_COPY.name.error]]);
  assert.deepEqual(err(business({ name: 'x'.repeat(80) })), []);
  assert.deepEqual(err(business({ registeredIn: 'VN' })), [['registeredIn', BUSINESS_COPY.registeredIn.errorVN]]);
  assert.deepEqual(err(business({ registeredIn: 'XX' })), [['registeredIn', ROLE_COPY.common.chooseOne]]);
  assert.deepEqual(err(business({ size: 'huge' as never })), [['size', ROLE_COPY.common.chooseOne]]);
  assert.deepEqual(err(business({ industry: 8 })), [['industry', ROLE_COPY.common.chooseOne]]);
  assert.deepEqual(err(business({ industry: -1 })), [['industry', ROLE_COPY.common.chooseOne]]);
  assert.deepEqual(err(business({ industry: 7 })), []);
  for (const website of ['http://lumen.example', 'lumen.example', 'https://', 'https://lumen', 'https://a b.com']) {
    assert.deepEqual(err(business({ website })), [['website', BUSINESS_COPY.website.error]], website);
  }
  assert.deepEqual(err(business({ website: 'https://www.linkedin.com/company/lumen' })), []);
  assert.deepEqual(validateBusiness(business({ title: 'x'.repeat(61) })).map((e) => e.field), ['title']);
  assert.deepEqual(validateBusiness(business({ registrationNo: 'x'.repeat(41) })).map((e) => e.field), ['registrationNo']);
});

test('a business registered in Vietnam fails, also inside a profile', () => {
  assert.equal(validateBusiness(business({ registeredIn: 'VN' }))[0].field, 'registeredIn');
  const p = profile({ client: { kind: 'business' }, business: business({ registeredIn: 'VN' }) });
  assert.deepEqual(validateProfile(p), ['businessInvalid']);
});

test('validateProfile', () => {
  assert.deepEqual(validateProfile(profile()), []);
  assert.deepEqual(validateProfile(profile({ freelancer: false, client: { kind: 'individual' } })), []);
  assert.deepEqual(validateProfile(profile({ client: { kind: 'individual' } })), [], 'both roles outside VN');
  assert.deepEqual(validateProfile(profile({ freelancer: false })), ['noRole']);
  assert.deepEqual(validateProfile(profile({ country: 'XX' })), ['unknownCountry']);
  assert.deepEqual(validateProfile(profile({ client: { kind: 'business' } })), ['businessMissing']);
  assert.deepEqual(validateProfile(profile({ client: { kind: 'business' }, business: business() })), []);
  assert.deepEqual(validateProfile(profile({ country: 'VN' })), []);
});

test('a Vietnam profile cannot hold the client role', () => {
  assert.deepEqual(validateProfile(profile({ country: 'VN', client: { kind: 'individual' } })), ['clientNotAllowed']);
  assert.deepEqual(validateProfile(profile({ country: 'VN', freelancer: false, client: { kind: 'individual' } })), [
    'vietnamNotFreelancer',
    'clientNotAllowed',
  ]);
  const cap = capabilities(profile({ country: 'VN', client: { kind: 'business' }, business: business() }));
  assert.equal(cap.createContract, false, 'capabilities ignore a client role stored for a VN resident');
  assert.equal(cap.lock, false);
  assert.equal(cap.apply, true);
});

const CLIENT_ACTIONS = ['createContract', 'lock', 'postJob', 'selectApplicant'] as const;
const FREELANCER_ACTIONS = ['apply', 'accept', 'submit'] as const;

test('build §4: client actions need the client role', () => {
  const freelancerOnly = capabilities(profile());
  const clientOnly = capabilities(profile({ freelancer: false, client: { kind: 'individual' } }));
  const businessClient = capabilities(profile({ freelancer: false, client: { kind: 'business' }, business: business() }));
  for (const a of CLIENT_ACTIONS) {
    assert.equal(freelancerOnly[a], false, `freelancer outside VN: ${a}`);
    assert.equal(clientOnly[a], true, `client: ${a}`);
    assert.equal(businessClient[a], true, `business client: ${a}`);
  }
});

test('build §4: apply, accept and submit need the freelancer role; VN residents always have it', () => {
  const clientOnly = capabilities(profile({ freelancer: false, client: { kind: 'individual' } }));
  const both = capabilities(profile({ client: { kind: 'individual' } }));
  const vn = capabilities(profile({ country: 'VN' }));
  for (const a of FREELANCER_ACTIONS) {
    assert.equal(clientOnly[a], false, `client only: ${a}`);
    assert.equal(both[a], true, `both: ${a}`);
    assert.equal(vn[a], true, `VN: ${a}`);
  }
  for (const a of CLIENT_ACTIONS) assert.equal(both[a], true, `both: ${a}`);
  for (const a of CLIENT_ACTIONS) assert.equal(vn[a], false, `VN: ${a}`);
});

test('build §4: the money view is the region, derived from the country, not the role', () => {
  assert.equal(capabilities(profile({ country: 'VN' })).region, 'vn');
  assert.equal(capabilities(profile()).region, 'intl');
  assert.equal(capabilities(profile({ freelancer: false, client: { kind: 'individual' } })).region, 'intl');
});

test('a null profile gives today\'s default: freelancer, Vietnam view', () => {
  assert.deepEqual(capabilities(null), {
    createContract: false,
    lock: false,
    postJob: false,
    selectApplicant: false,
    apply: true,
    accept: true,
    submit: true,
    region: 'vn',
  });
});

test('canChangeCountry: moving to Vietnam is refused while client work is open', () => {
  const client = profile({ client: { kind: 'individual' } });
  const blocked = canChangeCountry(client, 'VN', { clientContracts: 2, listings: 1 });
  assert.equal(blocked.ok, false);
  assert.ok(!blocked.ok && blocked.reason === 'openClientWork');
  assert.deepEqual(!blocked.ok && blocked.copy, {
    title: SETTINGS_COPY.sheet.blocked.title,
    body: SETTINGS_COPY.sheet.blocked.body(2, 1),
    ok: SETTINGS_COPY.sheet.blocked.ok,
  });
  assert.equal(canChangeCountry(client, 'VN', { clientContracts: 0, listings: 1 }).ok, false, 'a listing alone blocks');
  assert.equal(canChangeCountry(client, 'VN', { clientContracts: 1, listings: 0 }).ok, false);
});

test('canChangeCountry: allowed moves', () => {
  const client = profile({ client: { kind: 'individual' } });
  assert.deepEqual(canChangeCountry(client, 'VN', NONE), { ok: true, dropsClient: true });
  assert.deepEqual(canChangeCountry(profile(), 'VN', NONE), { ok: true, dropsClient: false });
  assert.deepEqual(canChangeCountry(client, 'DE', { clientContracts: 3, listings: 2 }), { ok: true, dropsClient: false });
  assert.deepEqual(canChangeCountry(profile({ country: 'VN' }), 'SG', NONE), { ok: true, dropsClient: false });
  assert.deepEqual(canChangeCountry(client, 'XX', NONE), { ok: false, reason: 'unknownCountry', copy: null });
});
