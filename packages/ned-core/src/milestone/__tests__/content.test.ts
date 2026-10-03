// B1 content layer: canonical JSON, hashes, notes (encrypt, split, read back), keys and invite links, tx size.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Keypair, PublicKey, TransactionMessage, type TransactionInstruction } from '@solana/web3.js';
import * as client from '../client.ts';
import {
  briefHash,
  canonicalBrief,
  canonicalDelivery,
  contentBytes,
  deliveryEvidence,
  validateBrief,
  validateDelivery,
  type BriefDraft,
  type DeliveryDraft,
} from '../content.ts';
import {
  fromBase64Url,
  importKeyFromFragment,
  inviteLink,
  loadContentKey,
  memoryKeyStorage,
  parseInvite,
  saveContentKey,
  toBase64Url,
} from '../keys.ts';
import {
  buildPostNote,
  decryptNote,
  encryptNote,
  encryptNoteParts,
  fetchNotes,
  joinParts,
  NOTE_KIND_BRIEF,
  NOTE_KIND_DELIVERY,
  NOTE_PART_PLAINTEXT,
  readContractContent,
  splitParts,
  type NoteRecord,
} from '../notes.ts';
import { NOTE_MAX_LEN } from '../layout.ts';
import { CLIENT, FREELANCER, fund, FUND_ADDRESS, M, STRANGER } from './fixture.ts';

const sha = (s: string | Uint8Array) => new Uint8Array(createHash('sha256').update(s).digest());
const KEY = new Uint8Array(32).map((_, i) => i + 1);
const OTHER_KEY = new Uint8Array(32).fill(9);

const BRIEF: BriefDraft = {
  scope: '  Landing page for a coffee shop  ',
  references: ['https://example.com/ref', '  '],
  milestones: [
    { name: 'Wireframes', criteria: ['Mobile and desktop', ' 3 sections '] },
    { name: 'Visual design', criteria: [] },
  ],
};
const BRIEF_JSON =
  '{"v":1,"title":"Landing page","scope":"Landing page for a coffee shop","references":["https://example.com/ref"],' +
  '"milestones":[{"name":"Wireframes","criteria":["Mobile and desktop","3 sections"]},{"name":"Visual design","criteria":[]}]}';
const DELIVERY: DeliveryDraft = {
  links: ['https://figma.com/file/abc?version-id=1', 'https://github.com/x/y/tree/0123abc'],
  files: [{ name: 'logo.png', size: 1024, sha256: 'AB'.repeat(32) }],
  note: ' Two versions ',
};
const DELIVERY_JSON =
  '{"v":1,"links":["https://figma.com/file/abc?version-id=1","https://github.com/x/y/tree/0123abc"],' +
  `"files":[{"name":"logo.png","size":1024,"sha256":"${'ab'.repeat(32)}"}],"note":"Two versions"}`;

// ---- canonical JSON and hashes ----

test('canonical brief: fixed key order, trimmed strings, empty entries dropped, stable across key order', () => {
  assert.equal(canonicalBrief(' Landing page ', BRIEF), BRIEF_JSON);
  const shuffled = {
    milestones: BRIEF.milestones.map((m) => ({ criteria: m.criteria, name: m.name })),
    references: BRIEF.references,
    scope: BRIEF.scope,
  } as BriefDraft;
  assert.equal(canonicalBrief('Landing page', shuffled), BRIEF_JSON);
  // NFC: "é" as one code point or as e + combining accent hashes the same
  const a = canonicalBrief('Café', { ...BRIEF, scope: 'x' });
  const b = canonicalBrief('Café', { ...BRIEF, scope: 'x' });
  assert.equal(a, b);
});

test('hash vectors: brief_hash and evidence are SHA-256 of the canonical JSON bytes', () => {
  assert.deepEqual(briefHash('Landing page', BRIEF), sha(BRIEF_JSON));
  assert.equal(canonicalDelivery(DELIVERY), DELIVERY_JSON);
  assert.deepEqual(deliveryEvidence(DELIVERY), sha(DELIVERY_JSON));
  assert.notDeepEqual(briefHash('Landing page', { ...BRIEF, scope: 'Other' }), sha(BRIEF_JSON));
});

test('content limits', () => {
  assert.deepEqual(validateBrief(BRIEF, 2), []);
  assert.match(validateBrief(BRIEF, 3)[0].message, /milestone/);
  assert.match(validateBrief({ ...BRIEF, scope: 'x'.repeat(1501) }, 2)[0].message, /1,500/);
  assert.match(validateBrief({ ...BRIEF, references: Array(6).fill('https://a.b') }, 2)[0].message, /5 references/);
  assert.match(validateBrief({ ...BRIEF, milestones: [{ name: 'a', criteria: Array(7).fill('c') }, BRIEF.milestones[1]] }, 2)[0].message, /6 done-when/);
  assert.deepEqual(validateDelivery(DELIVERY), []);
  assert.match(validateDelivery({ links: [], files: [], note: '' })[0].message, /link or a file/);
  assert.match(validateDelivery({ ...DELIVERY, links: Array(6).fill('https://a.b') })[0].message, /5 links/);
  assert.match(validateDelivery({ ...DELIVERY, files: Array(11).fill(DELIVERY.files[0]) })[0].message, /10 files/);
  assert.match(validateDelivery({ ...DELIVERY, note: 'n'.repeat(501) })[0].message, /500/);
  assert.match(validateDelivery({ ...DELIVERY, links: ['ftp://x'] })[0].message, /https/);
});

// ---- notes ----

const header = (over: Partial<Parameters<typeof encryptNote>[1]> = {}) => ({
  fund: FUND_ADDRESS,
  kind: NOTE_KIND_BRIEF as 0 | 1,
  milestone: 0,
  setId: new Uint8Array([1, 2, 3, 4]),
  part: 0,
  parts: 1,
  ...over,
});

test('encrypt → decrypt round trip; layout version · set ID · nonce · ciphertext', () => {
  const plain = contentBytes('hello');
  const data = encryptNote(KEY, header(), plain);
  assert.equal(data[0], 1);
  assert.deepEqual(data.slice(1, 5), new Uint8Array([1, 2, 3, 4]));
  assert.equal(data.length, 1 + 4 + 24 + plain.length + 16);
  const { setId: _s, ...h } = header();
  assert.deepEqual(decryptNote(KEY, h, data), plain);
});

test('tamper, wrong key, or a part moved to another fund / kind / milestone / position → throws', () => {
  const data = encryptNote(KEY, header({ parts: 2 }), contentBytes('hello'));
  const { setId: _s, ...h } = header({ parts: 2 });
  const flipped = Uint8Array.from(data);
  flipped[40] ^= 1;
  assert.throws(() => decryptNote(KEY, h, flipped));
  assert.throws(() => decryptNote(OTHER_KEY, h, data));
  assert.throws(() => decryptNote(KEY, { ...h, fund: STRANGER }, data));
  assert.throws(() => decryptNote(KEY, { ...h, kind: NOTE_KIND_DELIVERY }, data));
  assert.throws(() => decryptNote(KEY, { ...h, milestone: 1 }, data));
  assert.throws(() => decryptNote(KEY, { ...h, part: 1 }, data));
  assert.throws(() => decryptNote(KEY, { ...h, parts: 3 }, data));
  const otherSet = Uint8Array.from(data);
  otherSet[1] ^= 1; // set ID is in the associated data
  assert.throws(() => decryptNote(KEY, h, otherSet));
});

test('parts: split/join at 899, 900, 901 bytes; encrypted part data stays ≤ 900', () => {
  for (const [n, count] of [[899, 1], [900, 1], [901, 2]] as const) {
    const bytes = new Uint8Array(n).map((_, i) => i % 251);
    const parts = splitParts(bytes, 900);
    assert.equal(parts.length, count, `${n} bytes`);
    assert.deepEqual(joinParts(parts), bytes);
  }
  assert.equal(NOTE_PART_PLAINTEXT, 855);
  const one = encryptNoteParts(KEY, FUND_ADDRESS, NOTE_KIND_BRIEF, 0, new Uint8Array(855));
  assert.equal(one.parts.length, 1);
  assert.equal(one.parts[0].length, NOTE_MAX_LEN);
  const two = encryptNoteParts(KEY, FUND_ADDRESS, NOTE_KIND_BRIEF, 0, new Uint8Array(856));
  assert.equal(two.parts.length, 2);
  assert.throws(() => encryptNoteParts(KEY, FUND_ADDRESS, NOTE_KIND_BRIEF, 0, new Uint8Array(855 * 8 + 1)), /too long/);
});

// ---- keys and invite links ----

test('invite link: …/c/<fund>#k=<base64url>, parsed from a link, a fragment or a bare key', async () => {
  const fundAddr = FUND_ADDRESS.toBase58();
  const link = inviteLink(fundAddr, KEY, 'https://unihackfest-2026.vercel.app/');
  assert.equal(link, `https://unihackfest-2026.vercel.app/c/${fundAddr}#k=${toBase64Url(KEY)}`);
  assert.doesNotMatch(link, /[+/=]$/);
  assert.deepEqual(fromBase64Url(toBase64Url(KEY)), KEY);
  assert.deepEqual(parseInvite(link), { fund: fundAddr, key: KEY });
  assert.deepEqual(parseInvite(`#k=${toBase64Url(KEY)}`), { key: KEY });
  assert.deepEqual(parseInvite(toBase64Url(KEY)), { key: KEY });
  assert.equal(parseInvite('#k=short'), null);
  assert.equal(parseInvite('https://x/c/abc'), null);

  const storage = memoryKeyStorage();
  const wallet = CLIENT.toBase58();
  assert.equal(await loadContentKey(storage, wallet, fundAddr), null);
  assert.equal(await importKeyFromFragment(storage, wallet, fundAddr, link), true);
  assert.deepEqual(await loadContentKey(storage, wallet, fundAddr), KEY);
  // A link of another contract never overwrites this contract's key
  const other = inviteLink(STRANGER.toBase58(), OTHER_KEY, 'https://w');
  assert.equal(await importKeyFromFragment(storage, wallet, fundAddr, other), false);
  assert.deepEqual(await loadContentKey(storage, wallet, fundAddr), KEY);
  // Keys are per wallet
  assert.equal(await loadContentKey(storage, FREELANCER.toBase58(), fundAddr), null);
  await saveContentKey(storage, FREELANCER.toBase58(), fundAddr, OTHER_KEY);
  assert.deepEqual(await loadContentKey(storage, FREELANCER.toBase58(), fundAddr), OTHER_KEY);
});

// ---- transaction size decision ----

test('submit: the delivery note rides in the submit transaction when it fits in 1,232 bytes, else it gets its own', async () => {
  const f = fund({ milestones: [M()] });
  const evidence = deliveryEvidence(DELIVERY);
  const small = encryptNoteParts(KEY, f.address, NOTE_KIND_DELIVERY, 0, contentBytes(canonicalDelivery(DELIVERY)));
  const inSubmit = await client.buildSubmit({ fund: f, freelancer: FREELANCER, index: 0, evidence, note: small });
  assert.equal(inSubmit.noteInSubmit, true);
  assert.equal(inSubmit.tx.instructions.length, 2);
  assert.deepEqual(inSubmit.extra, []);
  assert.ok(client.txSize(inSubmit.tx, FREELANCER) <= client.TX_MAX_BYTES);

  // A full 900-byte part still fits next to submit; a second part goes in its own transaction
  const full = encryptNoteParts(KEY, f.address, NOTE_KIND_DELIVERY, 0, new Uint8Array(NOTE_PART_PLAINTEXT * 2).fill(65));
  const two = await client.buildSubmit({ fund: f, freelancer: FREELANCER, index: 0, evidence, note: full });
  const size = client.txSize(two.tx, FREELANCER);
  console.log(`   submit + one 900-byte note part: ${size} bytes; post_note alone: ${client.txSize(two.extra[0], FREELANCER)} bytes`);
  assert.equal(two.noteInSubmit, true);
  assert.equal(two.extra.length, 1);
  assert.ok(size <= client.TX_MAX_BYTES);

  // The largest valid part (900 bytes) always fits next to submit, so the separate-transaction branch is only a guard
  assert.ok(size < client.TX_MAX_BYTES - 40, 'margin for a longer fee-payer setup');
  await assert.rejects(client.buildSubmit({ fund: f, freelancer: FREELANCER, index: 1, evidence, note: small }), /another milestone|index/);
});

// ---- reading notes back ----

let slot = 100;
/** A fake getTransactions entry for instructions signed by `payer` */
function txResponse(payer: PublicKey, ixs: TransactionInstruction[], err: unknown = null) {
  const message = new TransactionMessage({ payerKey: payer, recentBlockhash: '11111111111111111111111111111111', instructions: ixs }).compileToV0Message();
  return { slot: slot++, meta: { err, loadedAddresses: undefined }, transaction: { message } };
}
function fakeConn(txs: ReturnType<typeof txResponse>[]) {
  return {
    getSignaturesForAddress: async () => txs.map((t, i) => ({ signature: `sig${i}`, err: t.meta.err, slot: t.slot, blockTime: null, memo: null })),
    getTransactions: async (sigs: string[]) => sigs.map((s) => txs[Number(s.slice(3))] as never),
  } as never;
}
const noteIxs = (author: PublicKey, n: ReturnType<typeof encryptNoteParts>, fundKey = FUND_ADDRESS) =>
  n.parts.map((data, part) => buildPostNote({ fund: fundKey, author, kind: n.kind as 0 | 1, milestone: n.milestone, part, parts: n.parts.length, data }));

test('fetchNotes + readContractContent: only the set whose hash matches counts; failed and stranger notes are ignored', async () => {
  const title = 'Landing page';
  const json = canonicalBrief(title, BRIEF);
  const good = encryptNoteParts(KEY, FUND_ADDRESS, NOTE_KIND_BRIEF, 0, contentBytes(json));
  const newer = encryptNoteParts(KEY, FUND_ADDRESS, NOTE_KIND_BRIEF, 0, contentBytes(canonicalBrief(title, { ...BRIEF, scope: 'Changed later' })));
  const stranger = encryptNoteParts(KEY, FUND_ADDRESS, NOTE_KIND_BRIEF, 0, contentBytes(json));
  const deliveryJson = canonicalDelivery(DELIVERY);
  const delivery = encryptNoteParts(KEY, FUND_ADDRESS, NOTE_KIND_DELIVERY, 0, contentBytes(deliveryJson));
  const wrongDelivery = encryptNoteParts(KEY, FUND_ADDRESS, NOTE_KIND_DELIVERY, 1, contentBytes(canonicalDelivery({ ...DELIVERY, note: 'other' })));
  const otherFund = encryptNoteParts(KEY, STRANGER, NOTE_KIND_BRIEF, 0, contentBytes(json));
  const strangerKp = Keypair.generate();

  const records = await fetchNotes(
    FUND_ADDRESS,
    fakeConn([
      txResponse(CLIENT, noteIxs(CLIENT, good)),
      txResponse(CLIENT, noteIxs(CLIENT, newer), { InstructionError: [0, 'Custom'] }), // failed: ignored
      txResponse(strangerKp.publicKey, noteIxs(strangerKp.publicKey, stranger)), // not the client: ignored later
      txResponse(CLIENT, noteIxs(CLIENT, otherFund, STRANGER)), // another fund: ignored
      txResponse(FREELANCER, noteIxs(FREELANCER, delivery)),
      txResponse(FREELANCER, noteIxs(FREELANCER, wrongDelivery)),
    ])
  );
  assert.equal(records.length, 4, 'good brief, stranger brief, two deliveries');

  const evidence0 = deliveryEvidence(DELIVERY);
  const evidence1 = deliveryEvidence(DELIVERY); // milestone 1 evidence ≠ its note
  const f = fund({
    briefHash: briefHash(title, BRIEF),
    milestones: [M('Submitted', { evidence: evidence0, submittedAt: 1 }), M('Submitted', { evidence: evidence1, submittedAt: 1 })],
  });
  const content = readContractContent(f, records, KEY);
  assert.equal(content.contentStatus, 'ok');
  assert.equal(content.brief?.scope, 'Landing page for a coffee shop');
  assert.deepEqual(content.shownBriefHash, briefHash(title, BRIEF));
  assert.equal(content.deliveries[0].matches, true);
  assert.equal(content.deliveries[0].content?.note, 'Two versions');
  assert.deepEqual(content.deliveries[1], { matches: false });

  // A second, newer set with a different hash never replaces the matching one
  const withNewer = [...records, { ...records[0], slot: 9999, data: newer.parts[0], signature: 'late' } as NoteRecord];
  assert.equal(readContractContent(f, withNewer, KEY).brief?.scope, 'Landing page for a coffee shop');
  // Only a non-matching set → mismatch; wrong key → mismatch; no key → noKey; no notes → missing
  const onlyNewer = [{ ...records[0], data: newer.parts[0] } as NoteRecord];
  assert.equal(readContractContent(f, onlyNewer, KEY).contentStatus, 'mismatch');
  assert.equal(readContractContent(f, records, OTHER_KEY).contentStatus, 'mismatch');
  assert.equal(readContractContent(f, records, null).contentStatus, 'noKey');
  assert.equal(readContractContent(f, [], KEY).contentStatus, 'missing');
  // A brief posted by a stranger alone does not count
  const strangerOnly = records.filter((r) => !r.author.equals(CLIENT) && r.kind === NOTE_KIND_BRIEF);
  assert.equal(readContractContent(f, strangerOnly, KEY).contentStatus, 'missing');
});
