import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideInvite } from '../invite.ts';

const base = {
  fund: 'GQURiimvB6SkNevzMDcsQgaaKonvGFT89hY7GFGkxgpZ',
  validFund: true,
  hash: '#k=AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA',
  mobileOrigin: 'https://tdat10052499.github.io/Unihackfest-2026',
  auth: 'ready' as const,
  signedIn: true,
};

test('a phone-sized screen goes to the mobile build with the fragment intact, whatever the sign-in state', () => {
  for (const auth of ['ready', 'initializing', 'signed-out'] as const) {
    const d = decideInvite({ ...base, width: 390, auth, signedIn: auth === 'ready' });
    assert.deepEqual(d, { kind: 'phone', url: `${base.mobileOrigin}/c/${base.fund}${base.hash}` });
  }
  assert.equal(decideInvite({ ...base, width: 899 }).kind, 'phone');
});

test('a computer imports the key when signed in, waits while auth starts, or keeps it for after sign-in', () => {
  assert.deepEqual(decideInvite({ ...base, width: 900 }), { kind: 'import', fragment: base.hash, then: `/contract/${base.fund}` });
  assert.deepEqual(decideInvite({ ...base, width: 1440, auth: 'initializing' }), { kind: 'wait' });
  assert.deepEqual(decideInvite({ ...base, width: 1440, auth: 'signed-out', signedIn: false }), { kind: 'signIn', fragment: base.hash });
});

test('an invalid fund address goes nowhere', () => {
  assert.deepEqual(decideInvite({ ...base, width: 390, validFund: false }), { kind: 'invalid' });
});
