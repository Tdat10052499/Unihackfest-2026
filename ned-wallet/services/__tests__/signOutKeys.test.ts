import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keysToClearOnSignOut, KEEP_ON_SIGN_OUT } from '../signOutKeys.ts';

test('P1: sign-out keeps the consent log and clears the rest', () => {
  assert.deepEqual(keysToClearOnSignOut(['@ned_consent_v1', '@ned_region_v1', 'user-store', 'dynamic-session']), ['@ned_region_v1', 'user-store', 'dynamic-session']);
});

test('the kept key is the consent store key', () => {
  const store = readFileSync(new URL('../../stores/useConsentStore.ts', import.meta.url), 'utf8');
  assert.match(store, new RegExp(`CONSENT_STORAGE_KEY = '${KEEP_ON_SIGN_OUT[0]}'`));
});

test('D30: sign-out keeps the account key (the agreement log); the profiles in it are emptied by storage.ts', () => {
  assert.deepEqual(keysToClearOnSignOut(['@ned_consent_v1', '@ned_account_v1', '@ned_region_v1']), ['@ned_region_v1']);
  const store = readFileSync(new URL('../../stores/useAccountStore.ts', import.meta.url), 'utf8');
  assert.match(store, new RegExp(`ACCOUNT_STORAGE_KEY = '${KEEP_ON_SIGN_OUT[1]}'`));
  const storage = readFileSync(new URL('../storage.ts', import.meta.url), 'utf8');
  assert.match(storage, /accounts\.clearProfiles\(\)/);
  assert.doesNotMatch(storage, /agreements: \{\}/, 'the agreement log is never emptied on sign-out');
});
