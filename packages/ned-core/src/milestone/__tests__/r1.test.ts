// R1 (review and preview): delivery needs a preview link, review without done-when points, done-when required in
// drafts, preview embeds. Old content still decodes and still matches its on-chain fingerprint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  canonicalDelivery,
  DONE_WHEN_NEEDED,
  deliveryEvidence,
  parseBrief,
  parseDelivery,
  PREVIEW_LINK_NEEDED,
  REVIEW_REASON_NEEDED,
  FINALS_NEEDED,
  HANDOVER_LINK_NEEDED,
  validateBrief,
  validateDelivery,
  validateReview,
  type BriefDraft,
  type DeliveryDraft,
} from '../content.ts';
import { PREVIEW_FRAME_HOSTS, previewEmbed } from '../embed.ts';
import * as core from '../../index.ts';
import { validateJobDraft, type JobDraft } from '../../jobs/rules.ts';

const FILE = { name: 'logo-final.svg', size: 2048, sha256: 'a'.repeat(64) };
const messages = (p: { message: string }[]) => p.map((x) => x.message);

test('validateDelivery: first delivery and revision need a preview link (R1); F1 adds the promised list and the hand-over link', () => {
  const filesOnly: DeliveryDraft = { links: [], files: [FILE], note: '' };
  // F1: without a fixed-version link the promised list is also required
  assert.deepEqual(messages(validateDelivery(filesOnly)), [PREVIEW_LINK_NEEDED, FINALS_NEEDED]);
  assert.deepEqual(messages(validateDelivery({ ...filesOnly, stage: 'revision' })), [PREVIEW_LINK_NEEDED, FINALS_NEEDED]);
  // F1 (amends R1): the hand-over needs the link where the client downloads
  assert.deepEqual(messages(validateDelivery({ ...filesOnly, stage: 'handover' })), [HANDOVER_LINK_NEEDED('the client')]);
  assert.deepEqual(validateDelivery({ links: ['https://drive.google.com/drive/folders/final'], files: [FILE], note: '', stage: 'handover' }), []);
  assert.deepEqual(validateDelivery({ links: ['https://drive.google.com/file/d/abc/view'], files: [], note: '', finals: [{ ...FILE, sha256: 'b'.repeat(64) }] }), []);
  assert.deepEqual(validateDelivery({ links: ['https://www.figma.com/design/k3y/x?version-id=7'], files: [FILE], note: '', stage: 'revision' }), []);
});

test('an old files-only delivery still decodes and matches its on-chain fingerprint', () => {
  const old: DeliveryDraft = { links: [], files: [FILE], note: 'Final files' };
  const json = canonicalDelivery(old);
  // The canonical JSON written before R1, pinned: R1 changes only the draft check
  assert.equal(json, `{"v":1,"links":[],"files":[{"name":"logo-final.svg","size":2048,"sha256":"${'a'.repeat(64)}"}],"note":"Final files"}`);
  const onChain = createHash('sha256').update(json, 'utf8').digest();
  assert.deepEqual(Buffer.from(deliveryEvidence(old)), onChain);
  const decoded = parseDelivery(json);
  assert.ok(decoded);
  assert.deepEqual(decoded.files, old.files);
  assert.deepEqual(Buffer.from(deliveryEvidence(decoded)), onChain);
});

test('validateReview: with done-when points unchanged; without, a reason of 10–500 characters', () => {
  assert.deepEqual(validateReview({ unmet: [1], reason: '' }, 3), []);
  assert.deepEqual(messages(validateReview({ unmet: [], reason: 'Missing colours' }, 3)), ['Choose at least one done-when point that is not met.']);
  assert.deepEqual(messages(validateReview({ unmet: [3], reason: '' }, 3)), ['A done-when point is not valid.']);
  assert.deepEqual(messages(validateReview({ unmet: [0], reason: 'x'.repeat(501) }, 3)), ['Keep the reason under 500 characters.']);
  assert.deepEqual(validateReview({ unmet: [], reason: 'The cup icon is missing; add it in two sizes.' }, 0), []);
  assert.deepEqual(messages(validateReview({ unmet: [], reason: '  too short  ' }, 0)), [REVIEW_REASON_NEEDED]);
  assert.deepEqual(messages(validateReview({ unmet: [], reason: '' }, 0)), [REVIEW_REASON_NEEDED]);
  assert.deepEqual(validateReview({ unmet: [], reason: '  ten chars!  ' }, 0), []);
  assert.deepEqual(messages(validateReview({ unmet: [0], reason: 'Something is missing here.' }, 0)), ['A done-when point is not valid.']);
  assert.deepEqual(messages(validateReview({ unmet: [], reason: 'x'.repeat(501) }, 0)), ['Keep the reason under 500 characters.']);
});

const brief = (criteria: string[]): BriefDraft => ({ scope: 'A logo refresh.', references: [], milestones: [{ name: 'Concepts', criteria }] });

test('validateBrief and validateJobDraft: every milestone needs a done-when point; old briefs still decode', () => {
  assert.deepEqual(messages(validateBrief(brief([]), 1)), [DONE_WHEN_NEEDED]);
  assert.deepEqual(messages(validateBrief(brief(['  ', '']), 1)), [DONE_WHEN_NEEDED]);
  assert.deepEqual(validateBrief(brief(['Two concepts']), 1), []);
  const now = 1_800_000_000;
  const job: JobDraft = { title: 'Logo', summary: 'A logo.', category: 0, skills: [0], milestones: [{ amountUsdc: '10', workSecs: 86_400, reviewSecs: 86_400 }], brief: brief([]), applyBy: now + 3_600, selectBy: now + 7_200 };
  assert.deepEqual(messages(validateJobDraft(job, now)), [DONE_WHEN_NEEDED]);
  assert.deepEqual(validateJobDraft({ ...job, brief: brief(['Two concepts']) }, now), []);
  const old = parseBrief(JSON.stringify({ v: 1, title: 'Logo', scope: 'A logo refresh.', references: [], milestones: [{ name: 'Concepts', criteria: [] }] }));
  assert.ok(old, 'a brief on Solana with an empty done-when list still decodes');
  assert.deepEqual(old.milestones[0].criteria, []);
});

test('previewEmbed: Google Drive and Docs', () => {
  for (const u of ['https://drive.google.com/file/d/1AbC-d_9/view', 'https://drive.google.com/file/d/1AbC-d_9/edit?usp=sharing', 'https://drive.google.com/file/d/1AbC-d_9', 'https://drive.google.com/open?id=1AbC-d_9'])
    assert.deepEqual(previewEmbed(u), { kind: 'frame', provider: 'Google Drive', src: 'https://drive.google.com/file/d/1AbC-d_9/preview' }, u);
  assert.deepEqual(previewEmbed('https://docs.google.com/document/d/DOC1/edit'), { kind: 'frame', provider: 'Google Docs', src: 'https://docs.google.com/document/d/DOC1/preview' });
  assert.deepEqual(previewEmbed('https://docs.google.com/presentation/d/P1/edit#slide=id.p'), { kind: 'frame', provider: 'Google Slides', src: 'https://docs.google.com/presentation/d/P1/preview' });
  assert.deepEqual(previewEmbed('https://docs.google.com/spreadsheets/d/S1/view'), { kind: 'frame', provider: 'Google Sheets', src: 'https://docs.google.com/spreadsheets/d/S1/preview' });
  assert.deepEqual(previewEmbed('https://docs.google.com/forms/d/F1/viewform'), { kind: 'link' });
});

test('previewEmbed: Figma, YouTube, Loom, images', () => {
  const f = 'https://www.figma.com/design/AbC123/Logo?node-id=1-2&version-id=2214';
  assert.deepEqual(previewEmbed(f), { kind: 'frame', provider: 'Figma', src: `https://www.figma.com/embed?embed_host=ned&url=${encodeURIComponent(f)}` });
  for (const u of ['https://figma.com/file/AbC123/Logo', 'https://www.figma.com/proto/AbC123/Logo']) assert.equal(previewEmbed(u).kind, 'frame', u);
  assert.deepEqual(previewEmbed('https://www.figma.com/community/file/1'), { kind: 'link' });
  for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?si=x', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ'])
    assert.deepEqual(previewEmbed(u), { kind: 'frame', provider: 'YouTube', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' }, u);
  assert.deepEqual(previewEmbed('https://www.youtube.com/watch?v=short'), { kind: 'link' });
  assert.deepEqual(previewEmbed('https://www.loom.com/share/0f1e2d3c4b5a69788796a5b4c3d2e1f0'), { kind: 'frame', provider: 'Loom', src: 'https://www.loom.com/embed/0f1e2d3c4b5a69788796a5b4c3d2e1f0' });
  for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'gif', 'PNG']) assert.deepEqual(previewEmbed(`https://cdn.example.com/a/preview.${ext}?w=1200`), { kind: 'image', src: `https://cdn.example.com/a/preview.${ext}?w=1200` }, ext);
  assert.deepEqual(previewEmbed('https://cdn.example.com/a/preview.svg'), { kind: 'link' });
});

test('previewEmbed: http, malformed, look-alike hosts and tricks are plain links', () => {
  for (const u of [
    'http://drive.google.com/file/d/abc/view',
    'http://cdn.example.com/a.png',
    'not a url',
    '',
    'javascript:alert(1)//.png',
    'data:image/png;base64,AAAA',
    'https://drive.google.com.evil.com/file/d/abc/view',
    'https://evil.com/drive.google.com/file/d/abc/view',
    'https://drive.google.com@evil.com/file/d/abc/view',
    'https://user:pass@drive.google.com/file/d/abc/view',
    'https://drive.google.com:8443/file/d/abc/view',
    'https://notdrive.google.com/file/d/abc/view',
    'https://figma.com.evil.com/design/AbC/x',
    'https://evilfigma.com/design/AbC/x',
    'https://youtu.be.evil.com/dQw4w9WgXcQ',
    'https://www.youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
    'https://loom.com.evil.com/share/abc',
    'https://drive.google.com/file/d/ab"c<script>/view',
    'https://drive.google.com/drive/folders/abc',
  ])
    assert.deepEqual(previewEmbed(u), { kind: 'link' }, u);
});

test('PREVIEW_FRAME_HOSTS covers every frame src; exported from @ned/core', () => {
  const srcs = ['https://drive.google.com/file/d/a/view', 'https://docs.google.com/document/d/a/edit', 'https://figma.com/file/a/b', 'https://youtu.be/dQw4w9WgXcQ', 'https://loom.com/share/a'].map((u) => previewEmbed(u));
  for (const e of srcs) {
    assert.equal(e.kind, 'frame');
    if (e.kind === 'frame') assert.ok((PREVIEW_FRAME_HOSTS as readonly string[]).includes(new URL(e.src).origin), e.src);
  }
  assert.equal(typeof core.previewEmbed, 'function');
  assert.ok(core.PREVIEW_FRAME_HOSTS.length === 5);
});
