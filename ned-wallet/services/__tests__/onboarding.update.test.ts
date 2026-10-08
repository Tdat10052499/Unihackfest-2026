import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AccountProfile, AgreementRecord } from '@ned/core/account/types.ts';
import { AGREEMENT_VERSION } from '@ned/core/legal/agreement.ts';
import { accountState, EMPTY_DRAFT, hasOlderAgreement, preselectDraft, roleChoiceOf, type WalletHistory } from '../accountOnboarding.ts';

const none: WalletHistory = { createdContracts: 0, acceptedContracts: 0, listings: 0, applications: 0 };
const profile: AccountProfile = { version: 1, freelancer: true, client: null, country: 'SG', updatedAt: 0 };
const rec = (over: Partial<AgreementRecord>): AgreementRecord => ({
  agreementVersion: AGREEMENT_VERSION,
  consentVersion: 3,
  roles: { freelancer: true, client: null },
  country: 'SG',
  acceptedAt: 1,
  textSha256: 'x',
  ...over,
});

test('preselection: the Vietnam view → freelancer in Vietnam', () => {
  assert.deepEqual(preselectDraft('vn', { ...none, createdContracts: 3 }), { freelancer: true, client: null, country: 'VN' });
});

test('preselection, international view: client from created contracts or listings; no country', () => {
  for (const h of [{ ...none, createdContracts: 1 }, { ...none, listings: 2 }]) {
    const d = preselectDraft('intl', h);
    assert.deepEqual([d.freelancer, d.client, d.country], [false, { kind: 'individual' }, null]);
    assert.equal(roleChoiceOf(d), 'individual');
  }
});

test('preselection, international view: freelancer from accepted contracts or applications', () => {
  for (const h of [{ ...none, acceptedContracts: 1 }, { ...none, applications: 4 }]) {
    assert.deepEqual(preselectDraft('intl', h), { freelancer: true, client: null, country: null });
  }
});

test('preselection, international view: both roles when the history has both', () => {
  assert.deepEqual(preselectDraft('intl', { createdContracts: 1, acceptedContracts: 0, listings: 0, applications: 2 }), {
    freelancer: true,
    client: { kind: 'individual' },
    country: null,
  });
});

test('preselection: no history (or it could not be read, or no money view yet) preselects nothing', () => {
  assert.deepEqual(preselectDraft('intl', none), { freelancer: false, client: null, country: null });
  assert.equal(roleChoiceOf(preselectDraft('intl', none)), null);
  assert.equal(preselectDraft('intl', null), EMPTY_DRAFT);
  assert.equal(preselectDraft(null, { ...none, createdContracts: 1 }), EMPTY_DRAFT);
});

test('an existing wallet (ReverseRecord) with no profile goes to the update flow', () => {
  assert.deepEqual(accountState({ hasReverse: true, profile: null, hasAgreement: false, short: false }), { step: 'role', update: true });
  // A brand-new wallet gets the normal sign-up, not the update copy
  assert.deepEqual(accountState({ hasReverse: false, profile: null, hasAgreement: false, short: true }), { step: 'role', update: false });
});

test('an older agreement version sends the user to the update flow; a current one goes home', () => {
  assert.equal(hasOlderAgreement([rec({ agreementVersion: AGREEMENT_VERSION - 1 })], 3), true);
  assert.equal(hasOlderAgreement([rec({ consentVersion: 2 })], 3), true);
  assert.equal(hasOlderAgreement([rec({})], 3), false);
  assert.equal(hasOlderAgreement([rec({ agreementVersion: AGREEMENT_VERSION - 1, withdrawnAt: 2 })], 3), false, 'a withdrawn record is not in force');
  assert.equal(hasOlderAgreement(undefined, 3), false);
  assert.deepEqual(accountState({ hasReverse: true, profile, hasAgreement: false, short: false, olderAgreement: true }), { step: 'role', update: true });
  assert.deepEqual(accountState({ hasReverse: true, profile, hasAgreement: true, short: false }), { step: 'home', update: false });
});

test('flag off never sends anyone to the update flow', () => {
  const src = readFileSync(new URL('../onboarding.ts', import.meta.url), 'utf8');
  const start = src.indexOf('export async function resolveOnboarding');
  const body = src.slice(start, src.indexOf('\n}\n', start));
  // The flag-off body (after the accountRoles branch) never sets update and never returns a D30 step
  const legacy = body.split('\n').slice(2).join('\n');
  assert.doesNotMatch(legacy, /update|'role'|accountState/);
  assert.match(body.split('\n')[1], /if \(FEATURES\.accountRoles\) return resolveAccountOnboarding/);
  // and only the role step with update set routes to /role?update=1 (the legacy steps never carry it)
  assert.match(src, /if \(step === 'role' && update\) return '\/role\?update=1';/);
});
