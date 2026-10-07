// F1 (final files): the promised list, the hand-over check, the accepted version, the hand-over status, the receipt
// and the close warning. Older deliveries keep their canonical JSON and their on-chain fingerprint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  canonicalDelivery,
  checkDownload,
  compareHandover,
  contentBytes,
  DELIVERY_MAX_BYTES,
  deliveryEvidence,
  FINALS_NEEDED,
  HANDOVER_CHANGE_NOTE,
  HANDOVER_LINK_NEEDED,
  parseDelivery,
  PREVIEW_IS_FINAL,
  validateDelivery,
  type DeliveryDraft,
  type FileFingerprint,
} from '../content.ts';
import { acceptedVersion, buildReceipt, closeWarnings, HANDOVER_SOFT_SECS, handoverStatus, RECEIPT_LINE, releaseOf } from '../handover.ts';
import { NOTE_MAX_PLAINTEXT, type DeliveryEntry, type MilestoneHistory } from '../notes.ts';
import { fund, M, T0 } from './fixture.ts';
import * as core from '../../index.ts';

const fp = (name: string, c: string, size = 100): FileFingerprint => ({ name, size, sha256: c.repeat(64) });
const PREVIEW = fp('logo-preview.png', 'a');
const SVG = fp('logo.svg', 'b');
const PNG = fp('logo@2x.png', 'c');
const DRIVE = 'https://drive.google.com/file/d/abc/view';
const msg = (p: { message: string }[]) => p.map((x) => x.message);

test('old deliveries, with and without files, keep their canonical JSON and evidence hash', () => {
  const linksOnly: DeliveryDraft = { links: [DRIVE], files: [], note: 'Two concepts' };
  const withFiles: DeliveryDraft = { links: [DRIVE], files: [PREVIEW], note: '' };
  assert.equal(canonicalDelivery(linksOnly), `{"v":1,"links":["${DRIVE}"],"files":[],"note":"Two concepts"}`);
  assert.equal(canonicalDelivery(withFiles), `{"v":1,"links":["${DRIVE}"],"files":[{"name":"logo-preview.png","size":100,"sha256":"${'a'.repeat(64)}"}],"note":""}`);
  for (const d of [linksOnly, withFiles, { ...withFiles, finals: [] }]) {
    const json = canonicalDelivery(d);
    assert.ok(!json.includes('finals'));
    assert.deepEqual(Buffer.from(deliveryEvidence(d)), createHash('sha256').update(json, 'utf8').digest());
    assert.deepEqual(Buffer.from(deliveryEvidence(parseDelivery(json)!)), Buffer.from(deliveryEvidence(d)));
  }
  const promised: DeliveryDraft = { ...withFiles, finals: [SVG] };
  const json = canonicalDelivery(promised);
  assert.match(json, /"files":\[.*\],"finals":\[\{"name":"logo.svg"/);
  assert.deepEqual(parseDelivery(json)?.finals, [SVG]);
  assert.equal(parseDelivery(json.replace('"finals":[', '"finals":{"x":[').replace(']}],"note"', ']}},"note"')), null);
});

test('validateDelivery: promised list for a first delivery and a revision; a fixed-version link is enough', () => {
  assert.deepEqual(msg(validateDelivery({ links: [DRIVE], files: [PREVIEW], note: '' })), [FINALS_NEEDED]);
  assert.deepEqual(msg(validateDelivery({ links: [DRIVE], files: [PREVIEW], note: '', stage: 'revision' })), [FINALS_NEEDED]);
  assert.deepEqual(validateDelivery({ links: [DRIVE], files: [PREVIEW], note: '', finals: [SVG, PNG] }), []);
  assert.deepEqual(validateDelivery({ links: ['https://www.figma.com/design/k3y/Logo?version-id=2214'], files: [], note: '' }), []);
  assert.deepEqual(validateDelivery({ links: ['https://github.com/a/b/commit/0123abcd'], files: [], note: '' }), []);
  assert.deepEqual(msg(validateDelivery({ links: [DRIVE], files: [PREVIEW], note: '', finals: [PREVIEW] })), [PREVIEW_IS_FINAL]);
  assert.deepEqual(msg(validateDelivery({ links: [DRIVE], files: [], note: '', finals: [SVG, { ...SVG, name: 'copy.svg' }] })), ['A final file is listed twice.']);
  assert.deepEqual(msg(validateDelivery({ links: [DRIVE], files: [], note: '', finals: Array.from({ length: 11 }, (_, i) => fp(`f${i}`, i.toString(16))) })), ['List up to 10 final files.']);
  assert.deepEqual(msg(validateDelivery({ links: [DRIVE], files: [], note: '', finals: [{ ...SVG, name: 'x'.repeat(121) }] })), ['A file name is missing or too long.']);
  assert.deepEqual(msg(validateDelivery({ links: [DRIVE], files: [], note: '', finals: [{ ...SVG, name: '  ' }] })), ['A file name is missing or too long.']);
});

test('the largest promised list still fits one encrypted note', () => {
  assert.equal(DELIVERY_MAX_BYTES, NOTE_MAX_PLAINTEXT);
  const finals = Array.from({ length: 10 }, (_, i) => ({ name: `${i}`.padEnd(120, 'n'), size: 999_999_999, sha256: i.toString(16).repeat(64) }));
  const d: DeliveryDraft = { links: Array(5).fill(0).map((_, i) => `${DRIVE}?v=${i}`), files: [PREVIEW], note: 'n'.repeat(500), finals };
  assert.deepEqual(validateDelivery(d), []);
  assert.ok(contentBytes(canonicalDelivery(d)).length <= DELIVERY_MAX_BYTES);
});

test('validateDelivery hand-over: a download link; a changed set needs a note of 10+ characters', () => {
  assert.deepEqual(msg(validateDelivery({ links: [], files: [SVG], note: '', stage: 'handover' }, [SVG], '@mia')), [HANDOVER_LINK_NEEDED('@mia')]);
  assert.equal(HANDOVER_LINK_NEEDED('@mia'), 'Add the link where @mia can download the final files.');
  const link = 'https://drive.google.com/drive/folders/final';
  assert.deepEqual(validateDelivery({ links: [link], files: [SVG, PNG], note: '', stage: 'handover' }, [SVG, PNG]), []);
  assert.deepEqual(msg(validateDelivery({ links: [link], files: [SVG], note: '', stage: 'handover' }, [SVG, PNG])), [HANDOVER_CHANGE_NOTE]);
  assert.deepEqual(msg(validateDelivery({ links: [link], files: [SVG, PNG, PREVIEW], note: 'short', stage: 'handover' }, [SVG, PNG])), [HANDOVER_CHANGE_NOTE]);
  assert.deepEqual(validateDelivery({ links: [link], files: [SVG], note: 'PNG exported as WebP, same artwork.', stage: 'handover' }, [SVG, PNG]), []);
  // without the accepted finals, or with an empty list, only the link is checked
  assert.deepEqual(validateDelivery({ links: [link], files: [SVG], note: '', stage: 'handover' }, []), []);
  assert.deepEqual(validateDelivery({ links: [link], files: [], note: '', stage: 'handover' }), []);
});

test('compareHandover and checkDownload: same, missing, extra and different (by fingerprint)', () => {
  const extra = fp('notes.txt', 'd');
  assert.deepEqual(
    compareHandover([SVG, PNG], [SVG, extra]).map((r) => [r.state, r.file.name]),
    [['same', 'logo.svg'], ['missing', 'logo@2x.png'], ['extra', 'notes.txt']],
  );
  // a renamed file with the same fingerprint is the same file
  assert.deepEqual(compareHandover([SVG], [{ ...SVG, name: 'renamed.svg' }]).map((r) => r.state), ['same']);
  const edited = fp('logo@2x.png', 'e');
  const results = checkDownload([SVG, PNG], [SVG, edited, extra]);
  assert.deepEqual(results.map((r) => [r.state, r.file.name]), [['same', 'logo.svg'], ['different', 'logo@2x.png'], ['extra', 'notes.txt']]);
  assert.equal(results[1].received?.sha256, 'e'.repeat(64));
  assert.deepEqual(checkDownload([SVG, PNG], []).map((r) => r.state), ['missing', 'missing']);
});

const entry = (stage: DeliveryEntry['stage'], content: DeliveryDraft, slot: number, time?: number): DeliveryEntry => ({
  signature: `sig${slot}`,
  slot,
  ...(time ? { time } : {}),
  content: { v: 1, ...content },
  stage,
  matches: stage === 'first',
});
const V1 = entry('first', { links: [DRIVE], files: [PREVIEW], note: '', finals: [SVG] }, 1, T0 + 10);
const V2 = entry('revision', { links: [`${DRIVE}?v=2`], files: [], note: 'Dark version', finals: [SVG, PNG], stage: 'revision' }, 3, T0 + 50);
const HO = entry('handover', { links: ['https://drive.google.com/drive/folders/final'], files: [SVG, PNG], note: '', stage: 'handover' }, 5, T0 + 200);

test('acceptedVersion: the last delivery that is not a hand-over, with its Version number', () => {
  assert.equal(acceptedVersion(undefined), null);
  assert.equal(acceptedVersion({ deliveries: [V1], reviews: [] })?.index, 1);
  const a = acceptedVersion({ deliveries: [V1, V2, HO], reviews: [] })!;
  assert.equal(a.index, 2);
  assert.equal(a.time, T0 + 50);
  assert.deepEqual(a.content.finals, [SVG, PNG]);
});

test('handoverStatus: not-due, waiting, late after 48 h, handed-over, not-applicable; Release now the same', () => {
  const f = fund({ state: 'Funded', milestones: [M('Released'), M('Submitted'), M('Refunded'), M('Cancelled'), M('Released')] });
  const released = { deliveries: [V1], reviews: [] } as MilestoneHistory;
  const rt = T0 + 1_000;
  assert.equal(handoverStatus(f, 1, released, undefined, rt), 'not-due');
  assert.equal(handoverStatus(f, 0, released, rt, rt + 60), 'waiting');
  assert.equal(handoverStatus(f, 0, released, rt, rt + HANDOVER_SOFT_SECS - 1), 'waiting');
  assert.equal(handoverStatus(f, 0, released, rt, rt + HANDOVER_SOFT_SECS), 'late');
  assert.equal(handoverStatus(f, 0, released, undefined, rt + 10 * HANDOVER_SOFT_SECS), 'waiting', 'no release time: no countdown');
  assert.equal(handoverStatus(f, 0, { deliveries: [V1, HO], reviews: [] }, rt, rt + 10 * HANDOVER_SOFT_SECS), 'handed-over');
  assert.equal(handoverStatus(f, 2, released, rt, rt), 'not-applicable');
  assert.equal(handoverStatus(f, 3, released, rt, rt), 'not-applicable');
  assert.equal(handoverStatus(f, 9, released, rt, rt), 'not-applicable');
  // Release now (release_after_review) opens the hand-over just like approve
  const records = [{ id: 'x:4', fund: 'x', index: 4, title: '', client: '', amountUnits: '1', releasedAt: rt, signature: 'S', destination: 'ownWallet' as const, by: 'releaseNow' as const }];
  const r = releaseOf(records, 'x', 4)!;
  assert.equal(r.by, 'releaseNow');
  assert.equal(handoverStatus(f, 4, released, r.releasedAt, rt + HANDOVER_SOFT_SECS + 1), 'late');
  assert.equal(releaseOf(records, 'x', 0), undefined);
});

test('buildReceipt: contract, accepted version, promised list, hand-over, release, check, program, line', () => {
  const accepted = acceptedVersion({ deliveries: [V1, V2, HO], reviews: [] })!;
  const receipt = buildReceipt({
    fund: 'Fund1',
    title: 'Logo refresh',
    index: 0,
    milestoneName: 'Concepts',
    accepted,
    handover: HO,
    release: { releasedAt: T0 + 100, signature: 'RelSig', by: 'approve' },
    check: { at: T0 + 300, results: checkDownload([SVG, PNG], [SVG, PNG]) },
    programId: '8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh',
    cluster: 'devnet',
  });
  assert.deepEqual(Object.keys(receipt), ['contract', 'acceptedVersion', 'promised', 'handover', 'release', 'check', 'program', 'note']);
  assert.deepEqual(receipt.contract, { address: 'Fund1', title: 'Logo refresh', milestone: 1, milestoneName: 'Concepts' });
  assert.deepEqual(receipt.acceptedVersion, { version: 2, time: T0 + 50, signature: 'sig3', previewLinks: [`${DRIVE}?v=2`] });
  assert.deepEqual(receipt.promised, [SVG, PNG]);
  assert.equal(receipt.handover?.signature, 'sig5');
  assert.deepEqual(receipt.release, { time: T0 + 100, signature: 'RelSig', by: 'approve' });
  assert.deepEqual(receipt.check?.results.map((r) => r.state), ['same', 'same']);
  assert.deepEqual(receipt.program, { id: '8azx4HdoXQ8VQFn5QWaoBU2PMg3RX99Z2agrWyMbX5Wh', cluster: 'devnet' });
  assert.equal(receipt.note, RECEIPT_LINE);
  assert.equal(RECEIPT_LINE, 'Built on this device. Not legal advice.');
  assert.doesNotThrow(() => JSON.stringify(receipt));
  const bare = buildReceipt({ fund: 'F', title: 'T', index: 1, accepted, programId: 'P', cluster: 'devnet' });
  assert.equal(bare.handover, null);
  assert.equal(bare.release, null);
  assert.equal(bare.check, null);
});

test('closeWarnings: released milestones with no hand-over; exported from @ned/core', () => {
  const f = fund({ state: 'Settled', milestones: [M('Released'), M('Released'), M('Refunded')] });
  assert.deepEqual(closeWarnings(f, { 0: { deliveries: [V1, HO], reviews: [] }, 1: { deliveries: [V1], reviews: [] } }), [1]);
  assert.deepEqual(closeWarnings(f, {}), [0, 1]);
  for (const name of ['acceptedVersion', 'handoverStatus', 'buildReceipt', 'closeWarnings', 'compareHandover', 'checkDownload']) assert.equal(typeof (core as Record<string, unknown>)[name], 'function', name);
});
