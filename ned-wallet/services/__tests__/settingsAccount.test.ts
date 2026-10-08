import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AccountProfile } from '@ned/core/account/types.ts';
import { SETTINGS_COPY } from '@ned/core/account/copy.ts';
import { countryChange, openClientWork, profileWithCountry, profileWithRole, roleSwitchState } from '../accountSettings.ts';

const p = (over: Partial<AccountProfile>): AccountProfile => ({ version: 1, freelancer: true, client: null, country: 'SG', updatedAt: 0, ...over });
const mia = p({ freelancer: true, client: { kind: 'business' }, business: { name: 'Lumen', registeredIn: 'SG', size: '2-10', industry: 0 } });

test('open client work: client contracts not settled, listings Open or Selected', () => {
  const funds = [
    { role: 'client' as const, state: 'created' },
    { role: 'client' as const, state: 'funded' },
    { role: 'client' as const, state: 'settled' },
    { role: 'freelancer' as const, state: 'funded' },
  ];
  const jobs = [{ state: 'Open' }, { state: 'Selected' }, { state: 'Filled' }, { state: 'Withdrawn' }];
  assert.deepEqual(openClientWork(funds, jobs), { clientContracts: 2, listings: 2 });
  assert.deepEqual(openClientWork([], []), { clientContracts: 0, listings: 0 });
});

test('moving to Vietnam with nothing open: confirm sheet, and the client role and business go', () => {
  assert.deepEqual(countryChange(mia, 'VN', [{ role: 'client', state: 'settled' }], [{ state: 'Filled' }]), { ok: true, dropsClient: true });
  const moved = profileWithCountry(mia, 'VN', 9);
  assert.deepEqual([moved.country, moved.freelancer, moved.client, moved.business, moved.updatedAt], ['VN', true, null, undefined, 9]);
  assert.deepEqual(profileWithCountry(mia, 'DE', 9).business, mia.business, 'outside Vietnam nothing is dropped');
});

test('moving to Vietnam is blocked by an open client contract or an open listing, with the C5 copy', () => {
  const byContract = countryChange(mia, 'VN', [{ role: 'client', state: 'funded' }], []);
  assert.equal(byContract.ok, false);
  assert.ok(!byContract.ok && byContract.reason === 'openClientWork');
  assert.deepEqual(!byContract.ok && byContract.copy, { title: SETTINGS_COPY.sheet.blocked.title, body: SETTINGS_COPY.sheet.blocked.body(1, 0), ok: SETTINGS_COPY.sheet.blocked.ok });
  const byListing = countryChange(mia, 'VN', [], [{ state: 'Selected' }]);
  assert.ok(!byListing.ok && byListing.copy?.body === SETTINGS_COPY.sheet.blocked.body(0, 1));
  assert.equal(countryChange(mia, 'DE', [{ role: 'client', state: 'funded' }], [{ state: 'Open' }]).ok, true, 'other countries are never blocked');
});

test('at least one role stays on; Also hire is locked for Vietnam residents', () => {
  const freelancer = p({});
  assert.deepEqual(roleSwitchState(freelancer, 'freelancer'), { on: true, locked: 'atLeastOne' });
  assert.deepEqual(roleSwitchState(freelancer, 'client'), { on: false, locked: null });
  assert.equal(profileWithRole(freelancer, 'freelancer', false, 1), freelancer, 'the last role cannot be switched off');
  const both = profileWithRole(freelancer, 'client', true, 1);
  assert.deepEqual(both.client, { kind: 'individual' });
  assert.equal(profileWithRole(both, 'freelancer', false, 2).freelancer, false, 'with two roles one can go');
  assert.deepEqual(profileWithRole(profileWithRole(mia, 'client', false, 1), 'client', true, 2).client, { kind: 'business' }, 'a business comes back as a business');
  const vn = p({ country: 'VN' });
  assert.deepEqual(roleSwitchState(vn, 'client'), { on: false, locked: 'vietnam' });
  assert.deepEqual(roleSwitchState(vn, 'freelancer'), { on: true, locked: 'vietnam' });
  assert.equal(profileWithRole(vn, 'client', true, 1), vn);
});
