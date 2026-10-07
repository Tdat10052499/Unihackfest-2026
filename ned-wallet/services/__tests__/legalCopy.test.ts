import { test } from 'node:test';
import assert from 'node:assert/strict';
import { disputeDisclosure, GUIDE, PRIVACY, TERMS } from '../legalCopy.ts';

const all = (s: { title: string; body: string[] }[]) => s.map((x) => `${x.title} ${x.body.join(' ')}`).join(' ');

test('P3 Terms: refund line, funded-jobs line, no "marketplace" claim', () => {
  const t = all(TERMS);
  assert.match(t, /or refund it to the client after a missed deadline/);
  assert.match(t, /N\.E\.D shows job listings that businesses post with a budget locked in the program\. N\.E\.D does not choose, vet or employ anyone and is not a party to the work\./);
  assert.doesNotMatch(t, /marketplace/i);
});

test('P3 Privacy (A12): Ably through Dynamic, Vercel / GitHub Pages logs, Helius, consent record', () => {
  const p = all(PRIVACY);
  for (const s of [/Ably/, /Dynamic/, /Helius/, /Vercel and GitHub Pages/, /request logs/, /record of when you gave or withdrew consent/]) assert.match(p, s);
});

test('C2: the disclosure follows FEATURES.dispute', () => {
  assert.equal(disputeDisclosure(false).title, 'No disputes in this demo');
  assert.match(disputeDisclosure(false).body, /cannot open a dispute/);
  assert.equal(disputeDisclosure(true).title, 'No neutral arbiter');
  assert.match(disputeDisclosure(true).body, /request changes instead of releasing/);
});

test('copy rules: no payment, escrow, safe, guaranteed or licensed partner', () => {
  const text = [all(TERMS), all(PRIVACY), all(GUIDE), disputeDisclosure(true).body, disputeDisclosure(false).body].join(' ');
  assert.doesNotMatch(text, /\bpay\b|escrow|\bsafe\b|guaranteed|licensed partner/i);
  // "payment" appears only in "not a payment service"
  assert.deepEqual(text.match(/payment\w*/gi), ['payment']);
  assert.match(all(TERMS), /not a payment service/);
});
