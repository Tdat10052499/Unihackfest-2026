// D27 (review-decision-plan.md section 3): review notes, revisions and handover; labels; rules; C4 strings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';
import {
  briefHash,
  canonicalDelivery,
  canonicalReview,
  contentBytes,
  deliveryEvidence,
  parseDelivery,
  parseReview,
  validateReview,
  type BriefDraft,
  type DeliveryDraft,
} from '../content.ts';
import { encryptNoteParts, NOTE_KIND_BRIEF, NOTE_KIND_DELIVERY, NOTE_KIND_REVIEW, readContractContent, type NoteKind, type NoteRecord } from '../notes.ts';
import { canHandover, canRequestChanges, canSendRevision } from '../rules.ts';
import { DISPUTED_STATUS_LINE, RELEASED_TO_PARTNER, toFundView } from '../view.ts';
import { CLIENT, FREELANCER, fund, FUND_ADDRESS, M, STRANGER, T0 } from './fixture.ts';
import { NAMES } from './viewCases.ts';

const KEY = new Uint8Array(32).fill(3);
const TITLE = 'Landing page design';
const BRIEF: BriefDraft = { scope: 'A landing page.', references: [], milestones: [{ name: 'Design', criteria: ['Desktop', 'Mobile'] }] };
const FIRST: DeliveryDraft = { links: ['https://drive.google.com/x'], files: [], note: 'First version' };
const c = CLIENT.toBase58();
const f = FREELANCER.toBase58();

let slot = 0;
function note(author: PublicKey, kind: NoteKind, milestone: number, json: string): NoteRecord {
  const n = encryptNoteParts(KEY, FUND_ADDRESS, kind, milestone, contentBytes(json));
  slot += 10;
  return { signature: `s${slot}`, slot, author, kind, milestone, part: 0, parts: 1, data: n.parts[0], blockTime: T0 + slot };
}
const brief = () => note(CLIENT, NOTE_KIND_BRIEF, 0, JSON.stringify({ v: 1, title: TITLE, scope: 'A landing page.', references: [], milestones: [{ name: 'Design', criteria: ['Desktop', 'Mobile'] }] }));

test('a delivery without stage hashes exactly as before D27; stage is in the JSON only when present', () => {
  assert.equal(canonicalDelivery(FIRST), '{"v":1,"links":["https://drive.google.com/x"],"files":[],"note":"First version"}');
  assert.equal(canonicalDelivery({ ...FIRST, stage: 'revision' }), '{"v":1,"links":["https://drive.google.com/x"],"files":[],"note":"First version","stage":"revision"}');
  assert.notDeepEqual(deliveryEvidence({ ...FIRST, stage: 'handover' }), deliveryEvidence(FIRST));
  assert.equal(parseDelivery(canonicalDelivery({ ...FIRST, stage: 'handover' }))?.stage, 'handover');
  assert.equal(parseDelivery('{"v":1,"links":[],"files":[],"note":"","stage":"other"}'), null);
});

test('review: canonical JSON (sorted unique indices, trimmed reason), limits, parse', () => {
  assert.equal(canonicalReview({ unmet: [2, 0, 2], reason: '  Mobile view is missing  ' }), '{"v":1,"unmet":[0,2],"reason":"Mobile view is missing"}');
  assert.deepEqual(validateReview({ unmet: [1], reason: 'x' }, 2), []);
  assert.deepEqual(validateReview({ unmet: [], reason: '' }, 2).map((p) => p.field), ['unmet']);
  assert.deepEqual(validateReview({ unmet: [2], reason: '' }, 2).map((p) => p.field), ['unmet']);
  assert.deepEqual(validateReview({ unmet: [0], reason: 'r'.repeat(501) }, 2).map((p) => p.field), ['reason']);
  assert.deepEqual(parseReview(canonicalReview({ unmet: [1], reason: 'No' })), { v: 1, unmet: [1], reason: 'No' });
  assert.equal(parseReview('{"v":1,"unmet":["a"],"reason":""}'), null);
});

test('history: first delivery, review, revision, handover in order; a note counts only from the right role', () => {
  const first = note(FREELANCER, NOTE_KIND_DELIVERY, 0, canonicalDelivery(FIRST));
  const review = note(CLIENT, NOTE_KIND_REVIEW, 0, canonicalReview({ unmet: [1], reason: 'Mobile view is missing' }));
  const fakeReview = note(FREELANCER, NOTE_KIND_REVIEW, 0, canonicalReview({ unmet: [0], reason: 'forged' }));
  const fakeDelivery = note(CLIENT, NOTE_KIND_DELIVERY, 0, canonicalDelivery({ ...FIRST, stage: 'revision', note: 'forged' }));
  const revision = note(FREELANCER, NOTE_KIND_DELIVERY, 0, canonicalDelivery({ ...FIRST, stage: 'revision', note: 'Mobile added' }));
  const stranger = note(STRANGER, NOTE_KIND_DELIVERY, 0, canonicalDelivery({ ...FIRST, stage: 'handover' }));
  const disputed = fund({ briefHash: briefHash(TITLE, BRIEF), milestones: [M('Disputed', { evidence: deliveryEvidence(FIRST), submittedAt: T0 + 1 })] });
  const content = readContractContent(disputed, [brief(), first, review, fakeReview, fakeDelivery, revision, stranger], KEY);
  const h = content.history[0];
  assert.deepEqual(h.deliveries.map((d) => [d.stage, d.content.note, d.matches]), [['first', 'First version', true], ['revision', 'Mobile added', false]]);
  assert.deepEqual(h.reviews.map((r) => r.content.reason), ['Mobile view is missing']);
  assert.equal(h.reviews[0].signature, review.signature);
  assert.equal(h.reviews[0].time, review.blockTime);
  assert.deepEqual(readContractContent(disputed, [brief(), first], null).history, {}, 'nothing without the key');
});

test('D27 labels: changes requested, revised version, handover; the Disputed status line', () => {
  const first = note(FREELANCER, NOTE_KIND_DELIVERY, 0, canonicalDelivery(FIRST));
  const review = note(CLIENT, NOTE_KIND_REVIEW, 0, canonicalReview({ unmet: [1], reason: 'Mobile view is missing' }));
  const base = { briefHash: briefHash(TITLE, BRIEF) };
  const disputed = fund({ ...base, milestones: [M('Disputed', { evidence: deliveryEvidence(FIRST), submittedAt: T0 + 1 })] });
  const view = (records: NoteRecord[], me: string, fnd = disputed) => toFundView(fnd, me, 'intl', T0, { names: NAMES, p1: true, content: readContractContent(fnd, records, KEY) });

  let v = view([brief(), first, review], c);
  assert.equal(v.milestones[0].statusLabel, 'Changes requested · waiting for @vinh');
  assert.equal(v.milestones[0].statusLine, DISPUTED_STATUS_LINE);
  assert.equal(v.nextAction, undefined, 'the client waits for a revision');
  v = view([brief(), first, review], f);
  assert.equal(v.milestones[0].statusLabel, 'Changes requested · send a revised version');
  assert.deepEqual(v.nextAction, { kind: 'sendRevision', milestone: 0, label: 'Send a revised version' });

  const revision = note(FREELANCER, NOTE_KIND_DELIVERY, 0, canonicalDelivery({ ...FIRST, stage: 'revision' }));
  v = view([brief(), first, review, revision], c);
  assert.equal(v.milestones[0].statusLabel, 'Revised version received · review it');
  assert.equal(v.nextAction?.kind, 'approve');
  assert.ok(v.milestones[0].actions.includes('requestChanges'), 'request changes again on the revision');
  assert.equal(view([brief(), first, review, revision], f).milestones[0].statusLabel, 'Revised version sent · waiting for @mia');
  // A newer review makes the revision old again
  const review2 = note(CLIENT, NOTE_KIND_REVIEW, 0, canonicalReview({ unmet: [0], reason: 'Still wrong' }));
  assert.equal(view([brief(), first, review, revision, review2], f).milestones[0].statusLabel, 'Changes requested · send a revised version');

  const released = fund({ ...base, state: 'Settled', milestones: [M('Released', { evidence: deliveryEvidence(FIRST), submittedAt: T0 + 1 })] });
  assert.equal(view([brief(), first], c, released).milestones[0].statusLabel, 'Released · waiting for final files');
  assert.equal(view([brief(), first], f, released).milestones[0].statusLabel, 'Released · hand over the final files');
  assert.equal(view([brief(), first], f, released).nextAction?.kind, 'handover');
  const handover = note(FREELANCER, NOTE_KIND_DELIVERY, 0, canonicalDelivery({ ...FIRST, stage: 'handover' }));
  assert.equal(view([brief(), first, handover], c, released).milestones[0].statusLabel, 'Final files received');
  assert.equal(view([brief(), first, handover], f, released).milestones[0].statusLabel, 'Final files handed over');
});

test('D27 rules mirror post_note v1.3', () => {
  const submitted = fund({ milestones: [M('Submitted')] });
  assert.equal(canRequestChanges(submitted, c, 0, T0), true);
  assert.equal(canRequestChanges(submitted, c, 0, T0 + 721), false, 'after review_by: no dispute');
  assert.equal(canRequestChanges(submitted, f, 0, T0), false);
  const disputed = fund({ milestones: [M('Disputed')] });
  assert.equal(canRequestChanges(disputed, c, 0, T0 + 9_999), true, 'no deadline while Disputed');
  assert.equal(canSendRevision(disputed, f, 0), true);
  assert.equal(canSendRevision(disputed, c, 0), false);
  assert.equal(canSendRevision(submitted, f, 0), false);
  const released = fund({ state: 'Settled', milestones: [M('Released')] });
  assert.equal(canHandover(released, f, 0), true);
  assert.equal(canHandover(released, c, 0), false);
  assert.equal(canHandover(fund({ milestones: [M('Refunded')] }), f, 0), false);
});

test('C4 wording and U4 countdown', () => {
  assert.equal(RELEASED_TO_PARTNER, 'Released to payout partner · VND transfer simulated in this demo');
  const v = toFundView(fund({ milestones: [M('Submitted')] }), c, 'intl', T0);
  assert.match(v.milestones[0].countdown?.label ?? '', /^Release opens in .* if not reviewed$/);
  for (const m of v.milestones) assert.doesNotMatch(`${m.statusLabel} ${m.countdown?.label ?? ''}`, /auto-release|VND payout|paid out/);
});

test('a job contract shows Move locked budget instead of Lock', () => {
  const accepted = fund({ state: 'Accepted', milestones: [M()] });
  const job = { address: 'J', state: 'Selected' as const };
  const client = toFundView(accepted, c, 'intl', T0, { job });
  assert.ok(!client.actions.includes('lock'));
  assert.deepEqual(client.nextAction, { kind: 'lockFromJob', label: 'Move locked budget' });
  assert.ok(toFundView(accepted, f, 'intl', T0, { job }).actions.includes('lockFromJob'), 'anyone may move it');
  assert.ok(!toFundView(accepted, c, 'intl', T0, { job: { ...job, state: 'Filled' } }).actions.includes('lock'), 'never the normal Lock');
  assert.ok(toFundView(accepted, c, 'intl', T0).actions.includes('lock'), 'ordinary contract unchanged');
});
