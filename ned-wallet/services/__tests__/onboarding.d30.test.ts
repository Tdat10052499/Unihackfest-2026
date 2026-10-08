import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AccountProfile, AgreementRecord } from '@ned/core/account/types.ts';
import { AGREEMENT_VERSION, agreementHash, agreementText, CONSENT_SCOPE_V3 } from '@ned/core/legal/agreement.ts';
import {
  accountStep,
  commitAgreement,
  countryChoice,
  currentAgreement,
  draftAsVietnamFreelancer,
  draftReadyForAgreement,
  draftToProfile,
  draftWithRole,
  EMPTY_DRAFT,
  routeAfterCountry,
  signupSteps,
  type AccountFacts,
  type AccountStep,
  type SignupDraft,
} from '../accountOnboarding.ts';

const SRC = readFileSync(new URL('../onboarding.ts', import.meta.url), 'utf8');
const LUMEN = { name: 'Lumen Studio Pte. Ltd.', registeredIn: 'SG', size: '2-10', industry: 0 } as const;

function body(src: string): string {
  const start = src.indexOf('export async function resolveOnboarding');
  return src.slice(start, src.indexOf('\n}\n', start) + 2);
}

test('flag off: resolveOnboarding keeps its pre-D30 body; only the accountRoles branch is new', () => {
  const now = body(SRC).split('\n');
  assert.equal(now[1], '  if (FEATURES.accountRoles) return resolveAccountOnboarding(connection, wallet);');
  const legacy = [now[0], ...now.slice(2)].join('\n');
  // The body as it was before D30 (commit 85f7934): consent → (fund) → profile, or consent → region → home
  assert.equal(
    legacy,
    `export async function resolveOnboarding(connection: Connection, wallet: string): Promise<OnboardingState> {
  const owner = new PublicKey(wallet);
  const reverse = await fetchReverseRecord(connection, owner);
  await Promise.all([waitForConsentHydration(), waitForRegionHydration(), waitForWalletModeHydration()]);
  const needsConsent = CONSENT_SCREEN_READY && !useConsentStore.getState().getConsent(wallet);
  if (reverse) {
    syncProfileToUserStore(wallet, reverse.username);
    if (needsConsent) return { step: 'consent', reverse };
    migrateRegionFromMode(wallet);
    return { step: useRegionStore.getState().getRegion(wallet) ? 'home' : 'region', reverse };
  }
  // V2 (compliance fix list): consent before anything that sends the wallet address to a third party (the faucet)
  if (needsConsent) return { step: 'consent', reverse: null };
  const [balance, cost] = await Promise.all([connection.getBalance(owner, 'confirmed'), getSetupCost(connection)]);
  if (balance < cost.required) return { step: 'fund', reverse: null };
  return { step: 'profile', reverse: null };
}`
  );
});

/**
 * Walks the sign-up as the screens and /setup do: the stores are plain objects, the screens apply the draft helpers,
 * "Agree" runs commitAgreement, fund tops the balance up, profile creates the ReverseRecord.
 */
function walk(choice: 'freelancer' | 'individual' | 'business', country: string, startShort = true): AccountStep[] {
  const store = { profile: null as AccountProfile | null, agreement: null as AgreementRecord | null, reverse: false, short: startShort };
  let draft: SignupDraft = EMPTY_DRAFT;
  const seen: AccountStep[] = [];
  for (let guard = 0; guard < 12; guard++) {
    const facts: AccountFacts = { hasReverse: store.reverse, profile: store.profile, hasAgreement: !!store.agreement, short: store.short };
    const step = accountStep(facts);
    seen.push(step);
    if (step === 'home') return seen;
    if (step === 'role') {
      draft = draftWithRole(draft, choice);
      draft = countryChoice(draft, country).draft;
      seen.push('country');
      if (routeAfterCountry(draft) === '/business') {
        draft = { ...draft, business: LUMEN };
        seen.push('business');
      }
      assert.ok(draftReadyForAgreement(draft));
      seen.push('agreement');
      commitAgreement(
        {
          acceptConsent: () => {},
          setProfile: (_w, p) => (store.profile = p),
          acceptAgreement: (_w, r) => (store.agreement = r),
          setRegion: () => {},
        },
        'W',
        draftToProfile(draft, 1)!,
        1
      );
    } else if (step === 'fund') store.short = false;
    else if (step === 'profile') store.reverse = true;
    else throw new Error(`unexpected step ${step}`);
  }
  throw new Error('no home');
}

test('flag on, new wallet: freelancer and individual client take 4 screens, a business 5; agreement before fund', () => {
  assert.deepEqual(walk('freelancer', 'VN'), ['role', 'country', 'agreement', 'fund', 'profile', 'home']);
  assert.deepEqual(walk('individual', 'SG'), ['role', 'country', 'agreement', 'fund', 'profile', 'home']);
  assert.deepEqual(walk('business', 'SG'), ['role', 'country', 'business', 'agreement', 'fund', 'profile', 'home']);
  assert.deepEqual(walk('freelancer', 'DE', false), ['role', 'country', 'agreement', 'profile', 'home'], 'fund only when SOL is short');
  assert.equal(signupSteps(draftWithRole(EMPTY_DRAFT, 'business')), 5);
  assert.equal(signupSteps(draftWithRole(EMPTY_DRAFT, 'individual')), 4);
  for (const choice of ['freelancer', 'individual', 'business'] as const) {
    const s = walk(choice, choice === 'freelancer' ? 'VN' : 'SG');
    assert.ok(s.indexOf('agreement') < s.indexOf('fund'), `${choice}: agreement before fund`);
  }
});

test('the agreement always comes before fund: no complete profile or no agreement never gives fund', () => {
  const complete: AccountProfile = { version: 1, freelancer: true, client: null, country: 'SG', updatedAt: 0 };
  for (const profile of [null, complete]) {
    for (const short of [true, false]) {
      const step = accountStep({ hasReverse: false, profile, hasAgreement: false, short });
      assert.notEqual(step, 'fund');
      assert.ok(['role', 'agreement'].includes(step));
    }
  }
});

test('returning wallet (ReverseRecord) with no profile: role → country → agreement → home, no fund or profile', () => {
  assert.equal(accountStep({ hasReverse: true, profile: null, hasAgreement: false, short: true }), 'role');
  const profile: AccountProfile = { version: 1, freelancer: true, client: null, country: 'VN', updatedAt: 0 };
  assert.equal(accountStep({ hasReverse: true, profile, hasAgreement: false, short: true }), 'agreement');
  assert.equal(accountStep({ hasReverse: true, profile, hasAgreement: true, short: true }), 'home');
  const biz: AccountProfile = { version: 1, freelancer: false, client: { kind: 'business' }, country: 'SG', updatedAt: 0 };
  assert.equal(accountStep({ hasReverse: true, profile: biz, hasAgreement: true, short: false }), 'business', 'business details missing');
  const unknown: AccountProfile = { ...profile, country: 'XX' };
  assert.equal(accountStep({ hasReverse: true, profile: unknown, hasAgreement: true, short: false }), 'country');
});

test('Agree writes consent v3, then the profile, then the agreement with the text hash, then the region', () => {
  const calls: string[] = [];
  let consent: { scope: string[]; version: number } | null = null;
  let record: AgreementRecord | null = null;
  const profile = draftToProfile({ ...draftWithRole(EMPTY_DRAFT, 'business'), country: 'SG', business: LUMEN }, 5)!;
  const out = commitAgreement(
    {
      acceptConsent: (w, scope, version) => {
        calls.push(`consent:${w}`);
        consent = { scope, version };
      },
      setProfile: (w) => calls.push(`profile:${w}`),
      acceptAgreement: (w, r) => {
        calls.push(`agreement:${w}`);
        record = r;
      },
      setRegion: (w, r) => calls.push(`region:${w}:${r}`),
    },
    'W1',
    profile,
    1234
  );
  assert.deepEqual(calls, ['consent:W1', 'profile:W1', 'agreement:W1', 'region:W1:intl']);
  assert.deepEqual(consent, { scope: [...CONSENT_SCOPE_V3], version: 3 });
  assert.deepEqual(record, out);
  assert.deepEqual(out, {
    agreementVersion: AGREEMENT_VERSION,
    consentVersion: 3,
    roles: { freelancer: false, client: 'business' },
    country: 'SG',
    acceptedAt: 1234,
    textSha256: agreementHash(agreementText(profile)),
  });
});

test('a Vietnam draft with a client role cannot reach the agreement', () => {
  const client = draftWithRole(EMPTY_DRAFT, 'individual');
  const tapVN = countryChoice(client, 'VN');
  assert.equal(tapVN.askFreelancer, true, 'the "Join as a freelancer?" sheet opens');
  assert.equal(tapVN.draft.country, null, 'Vietnam is not saved for a client');
  assert.equal(draftReadyForAgreement(tapVN.draft), false);
  assert.equal(draftReadyForAgreement({ ...client, country: 'VN' }), false, 'even if forced');
  const biz = { ...draftWithRole(EMPTY_DRAFT, 'business'), country: 'SG', business: { ...LUMEN, registeredIn: 'VN' } };
  assert.equal(draftReadyForAgreement(biz), false, 'a business registered in Vietnam');
  assert.throws(() => commitAgreement({ acceptConsent() {}, setProfile() {}, acceptAgreement() {}, setRegion() {} }, 'W', { version: 1, freelancer: false, client: { kind: 'individual' }, country: 'VN', updatedAt: 0 }, 0));
  const asFreelancer = draftAsVietnamFreelancer(tapVN.draft);
  assert.deepEqual([asFreelancer.freelancer, asFreelancer.client, asFreelancer.country], [true, null, 'VN']);
  assert.equal(draftReadyForAgreement(asFreelancer), true);
});

test('getAgreement: the latest record that is not withdrawn, at the current versions', () => {
  const r = (over: Partial<AgreementRecord>): AgreementRecord => ({
    agreementVersion: AGREEMENT_VERSION,
    consentVersion: 3,
    roles: { freelancer: true, client: null },
    country: 'VN',
    acceptedAt: 1,
    textSha256: 'x',
    ...over,
  });
  assert.equal(currentAgreement(undefined, 3), null);
  assert.equal(currentAgreement([r({ withdrawnAt: 2 })], 3), null);
  assert.equal(currentAgreement([r({ acceptedAt: 1 }), r({ acceptedAt: 2 })], 3)?.acceptedAt, 2);
  assert.equal(currentAgreement([r({})], 2), null, 'flag off: consent v2 is current, a v3 record does not count');
  assert.equal(currentAgreement([r({ agreementVersion: AGREEMENT_VERSION + 1 })], 3), null);
  assert.equal(currentAgreement([r({ acceptedAt: 1 }), r({ acceptedAt: 2, withdrawnAt: 3 })], 3)?.acceptedAt, 1);
});

test('sign-out keeps the account key (agreement log); storage.ts empties its profiles', () => {
  const keys = readFileSync(new URL('../signOutKeys.ts', import.meta.url), 'utf8');
  assert.match(keys, /'@ned_account_v1'/);
  const storage = readFileSync(new URL('../storage.ts', import.meta.url), 'utf8');
  assert.match(storage, /accounts\.clearProfiles\(\)/);
});
