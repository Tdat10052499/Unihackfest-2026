import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contractNotice } from '../notices.ts';
import type { ContractEvent } from '../events.ts';

const base: ContractEvent = {
  id: 'contract:F:created',
  kind: 'created',
  fund: 'F',
  title: 'Landing page design',
  counterparty: 'C',
  amountUnits: 10_000_000n,
  viaPartner: true,
};

test('each kind has a title and a message in ≈ VND (Vietnam view) or USDC, without banned words', () => {
  const kinds: ContractEvent[] = [
    base,
    { ...base, kind: 'locked' },
    { ...base, kind: 'submitted', index: 0, reviewBy: 1_759_500_000 },
    { ...base, kind: 'released', index: 1 },
    { ...base, kind: 'released', index: 0, viaPartner: false },
  ];
  for (const e of kinds) {
    const vn = contractNotice(e, true, '@mia');
    const intl = contractNotice(e, false, '@mia');
    assert.ok(vn.title && vn.message && intl.message);
    assert.match(vn.message, /VND|submitted work/);
    assert.doesNotMatch(vn.message, /USDC/);
    for (const text of [vn.title, vn.message, intl.title, intl.message]) assert.doesNotMatch(text, /\bpay(ment)?\b|escrow|safe|free|invest|#k=/i);
  }
  assert.equal(contractNotice(kinds[3], true, '@mia').title, 'Milestone 2 released to payout partner · hand over the final files');
  assert.match(contractNotice(kinds[3], true, '@mia').message, /payout partner \(VND transfer simulated in this demo\)\. Hand over the final files\.$/);
  assert.match(contractNotice(kinds[4], false, '@mia').message, /^Milestone 1: 10\.00 USDC .* your N\.E\.D account\. Hand over the final files\.$/);
});
