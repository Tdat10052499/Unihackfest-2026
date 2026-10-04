import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, PublicKey } from '@solana/web3.js';
import { IDL_PROGRAM_ID as PROGRAM_ID } from '../../constants.ts';
import { coder } from '../decode.ts';
import {
  buildKeyNotes,
  buildRegisterDevice,
  contentKeyFromNotes,
  decodeDeviceKeys,
  deviceKeysPda,
  fetchDeviceKeys,
  loadDeviceKey,
  loadOrCreateDeviceKey,
  NOTE_KIND_KEY,
  unwrapContentKey,
  WRAP_BYTES,
  wrapContentKey,
  wrappedRecipients,
} from '../devicekeys.ts';
import { memoryKeyStorage } from '../keys.ts';
import type { NoteRecord } from '../notes.ts';
import { CLIENT, FREELANCER, fund, FUND_ADDRESS, M, STRANGER } from './fixture.ts';

const K = new Uint8Array(32).fill(7);
const W = Keypair.generate().publicKey.toBase58();

test('device key: created once, then the same key comes back; loadDeviceKey never creates', async () => {
  const storage = memoryKeyStorage();
  assert.equal(await loadDeviceKey(storage, W), null);
  const a = await loadOrCreateDeviceKey(storage, W);
  const b = await loadOrCreateDeviceKey(storage, W);
  assert.deepEqual(a.publicKey, b.publicKey);
  assert.equal(a.publicKey.length, 32);
  assert.deepEqual((await loadDeviceKey(storage, W))?.publicKey, a.publicKey);
  assert.notDeepEqual((await loadOrCreateDeviceKey(storage, 'other-wallet')).publicKey, a.publicKey);
});

test('wrap → unwrap for the recipient only; bound to the fund and the recipient', async () => {
  const mine = await loadOrCreateDeviceKey(memoryKeyStorage(), W);
  const other = await loadOrCreateDeviceKey(memoryKeyStorage(), W);
  const wrap = wrapContentKey(K, FUND_ADDRESS, mine.publicKey);
  assert.equal(wrap.length, WRAP_BYTES);
  assert.deepEqual(unwrapContentKey(wrap, FUND_ADDRESS, mine), K);
  assert.equal(unwrapContentKey(wrap, FUND_ADDRESS, other), null, 'another device');
  assert.equal(unwrapContentKey(wrap, Keypair.generate().publicKey, mine), null, 'moved to another contract');
  const tampered = Uint8Array.from(wrap);
  tampered[WRAP_BYTES - 1] ^= 1;
  assert.equal(unwrapContentKey(tampered, FUND_ADDRESS, mine), null, 'tampered');
  // several wraps in one part: the right one is found
  const both = new Uint8Array([...wrapContentKey(K, FUND_ADDRESS, other.publicKey), ...wrap]);
  assert.deepEqual(unwrapContentKey(both, FUND_ADDRESS, mine), K);
});

test('key notes: 6 wraps per part, duplicates dropped; read back only from the parties', async () => {
  const devices = await Promise.all(Array.from({ length: 7 }, (_, i) => loadOrCreateDeviceKey(memoryKeyStorage(), `w${i}`)));
  const txs = buildKeyNotes({ fund: FUND_ADDRESS, author: CLIENT, contentKey: K, recipients: [...devices.map((d) => d.publicKey), devices[0].publicKey] });
  assert.equal(txs.length, 2);
  const records: NoteRecord[] = txs.map((t, slot) => {
    const decoded = coder.instruction.decode(Buffer.from(t.instructions[0].data)) as { name: string; data: { kind: number; milestone: number; part: number; parts: number; data: Uint8Array } };
    assert.equal(decoded.name, 'post_note');
    assert.equal(t.instructions[0].programId.toBase58(), PROGRAM_ID.toBase58());
    const a = decoded.data;
    return { signature: `s${slot}`, slot, author: CLIENT, kind: a.kind, milestone: a.milestone, part: a.part, parts: a.parts, data: Uint8Array.from(a.data) };
  });
  assert.deepEqual(records.map((r) => [r.kind, r.milestone, r.part, r.parts, r.data.length]), [
    [NOTE_KIND_KEY, 0, 0, 2, 6 * WRAP_BYTES],
    [NOTE_KIND_KEY, 0, 1, 2, WRAP_BYTES],
  ]);
  assert.equal(wrappedRecipients(records).size, 7);
  const f = fund({ milestones: [M()] });
  assert.deepEqual(contentKeyFromNotes(f, records, devices[6]), K);
  const fromStranger = records.map((r) => ({ ...r, author: STRANGER }));
  assert.equal(contentKeyFromNotes(f, fromStranger, devices[6]), null, 'a third wallet cannot inject wraps');
  assert.equal(buildKeyNotes({ fund: FUND_ADDRESS, author: CLIENT, contentKey: K, recipients: [] }).length, 0);
});

test('registry: PDA, init + add on first use, add only after; decode and fetch', async () => {
  const w = FREELANCER;
  const pda = deviceKeysPda(w);
  assert.ok(pda.equals(PublicKey.findProgramAddressSync([Buffer.from('device_keys'), w.toBuffer()], PROGRAM_ID)[0]));
  const first = buildRegisterDevice({ wallet: w, publicKey: new Uint8Array(32).fill(1), listExists: false });
  assert.deepEqual(first.map((ix) => (coder.instruction.decode(Buffer.from(ix.data)) as { name: string }).name), ['init_device_keys', 'add_device_key']);
  assert.equal(buildRegisterDevice({ wallet: w, publicKey: new Uint8Array(32).fill(1), listExists: true }).length, 1);

  const keys = [Array(32).fill(1), Array(32).fill(2), ...Array.from({ length: 3 }, () => Array(32).fill(0))];
  const data = await coder.accounts.encode('DeviceKeys', { wallet: w, count: 2, keys, bump: 255 });
  assert.deepEqual(decodeDeviceKeys(data).keys.map((k) => k[0]), [1, 2]);
  const conn = {
    getMultipleAccountsInfo: async (addresses: PublicKey[]) => addresses.map((a) => (a.equals(pda) ? { owner: PROGRAM_ID, data } : null)),
  };
  const map = await fetchDeviceKeys([w, CLIENT], conn as never);
  assert.equal(map.get(w.toBase58())?.length, 2);
  assert.deepEqual(map.get(CLIENT.toBase58()), []);
});
