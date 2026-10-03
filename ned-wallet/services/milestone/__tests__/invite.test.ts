import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fragmentOf, routeInvite } from '../invite.ts';
import { inviteLink } from '../keys.ts';

test('the mobile build handles every invite itself (the Workspace router splits by device first)', () => {
  for (const width of [390, 1440]) {
    assert.deepEqual(routeInvite({ fund: 'F', hash: '#k=abc', width, host: 'tdat10052499.github.io' }), { kind: 'here' });
  }
});

test('fragmentOf keeps only the part after #', () => {
  assert.equal(fragmentOf('https://x/c/F#k=abc'), '#k=abc');
  assert.equal(fragmentOf('#k=abc'), '#k=abc');
  assert.equal(fragmentOf('https://x/c/F'), '');
  assert.equal(fragmentOf(null), '');
});

test('without EXPO_PUBLIC_WORKSPACE_ORIGIN, invite links go through the production Workspace router', () => {
  delete process.env.EXPO_PUBLIC_WORKSPACE_ORIGIN;
  const link = inviteLink('8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh', new Uint8Array(32));
  assert.match(link, /^https:\/\/unihackfest-2026\.vercel\.app\/c\/8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh#k=A{43}$/);
});
