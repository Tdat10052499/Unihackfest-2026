import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AccountProfile } from '@ned/core/account/types.ts';
import { GATE_COPY } from '@ned/core/account/copy.ts';
import { capabilitiesFor, clientGateLine } from '../accountSettings.ts';

const p = (over: Partial<AccountProfile>): AccountProfile => ({ version: 1, freelancer: true, client: null, country: 'SG', updatedAt: 0, ...over });
const CLIENT = ['createContract', 'lock', 'postJob', 'selectApplicant'] as const;
const FREELANCER = ['apply', 'accept', 'submit'] as const;

test('flag off: today\'s region rule, whatever the profile says', () => {
  for (const profile of [null, p({ freelancer: false, client: { kind: 'individual' } }), p({})]) {
    const intl = capabilitiesFor(false, profile, 'intl');
    const vn = capabilitiesFor(false, profile, 'vn');
    const none = capabilitiesFor(false, profile, null);
    for (const a of CLIENT) {
      assert.equal(intl[a], true, `intl ${a}`);
      assert.equal(vn[a], false, `vn ${a}`);
      assert.equal(none[a], false, `no region yet counts as Vietnam: ${a}`);
    }
    for (const a of FREELANCER) for (const c of [intl, vn, none]) assert.equal(c[a], true, a);
    assert.deepEqual([intl.region, vn.region, none.region], ['intl', 'vn', 'vn']);
  }
});

test('flag on, build §4 rows: create contract, slide to lock, post a job, select applicant need the client role', () => {
  const freelancerSG = capabilitiesFor(true, p({}), 'intl');
  const clientSG = capabilitiesFor(true, p({ freelancer: false, client: { kind: 'individual' } }), 'intl');
  const businessSG = capabilitiesFor(true, p({ freelancer: false, client: { kind: 'business' } }), 'intl');
  const vn = capabilitiesFor(true, p({ country: 'VN' }), 'vn');
  for (const a of CLIENT) {
    assert.equal(freelancerSG[a], false, `freelancer outside VN: ${a}`);
    assert.equal(clientSG[a], true, `client: ${a}`);
    assert.equal(businessSG[a], true, `business: ${a}`);
    assert.equal(vn[a], false, `VN: ${a}`);
  }
});

test('flag on, build §4 rows: apply and accept need the freelancer role; Vietnam residents always have it', () => {
  const clientOnly = capabilitiesFor(true, p({ freelancer: false, client: { kind: 'individual' } }), 'intl');
  const both = capabilitiesFor(true, p({ client: { kind: 'individual' } }), 'intl');
  const vn = capabilitiesFor(true, p({ country: 'VN', freelancer: false }), 'vn');
  for (const a of FREELANCER) {
    assert.equal(clientOnly[a], false, `client only: ${a}`);
    assert.equal(both[a], true, `both: ${a}`);
    assert.equal(vn[a], true, `VN: ${a}`);
  }
});

test('flag on, build §4 row: the money view stays the region of the country; no profile = freelancer + Vietnam view', () => {
  assert.equal(capabilitiesFor(true, p({ country: 'VN' }), 'intl').region, 'vn');
  assert.equal(capabilitiesFor(true, p({ country: 'DE' }), 'vn').region, 'intl');
  const none = capabilitiesFor(true, null, 'intl');
  for (const a of CLIENT) assert.equal(none[a], false);
  for (const a of FREELANCER) assert.equal(none[a], true);
  assert.equal(none.region, 'vn');
});

test('a refused client action shows the GATE_COPY line for the user\'s view', () => {
  assert.equal(clientGateLine({ region: 'vn' }), GATE_COPY.clientNeededVN);
  assert.equal(clientGateLine({ region: 'intl' }), GATE_COPY.clientNeeded);
});
