import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fragmentOf, routeInvite } from '../invite.ts';

test('the mobile build handles every invite itself (the Workspace rule comes with C1)', () => {
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
