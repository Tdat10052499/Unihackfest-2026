// Key sync, Plan C (decision D22, docs/09-milestone-lock/key-sync-plan.md, program v1.2).
// Every device keeps its own X25519 key pair; the public half is listed on-chain in the wallet's DeviceKeys account.
// The contract key K travels to each registered device as a "wrap" inside post_note kind 2:
//   wrap = recipient public (32) ‖ ephemeral public (32) ‖ nonce (24) ‖ XChaCha20-Poly1305(K) (32 + 16) = 136 bytes
//   wrap key = HKDF-SHA256(X25519(ephemeral, recipient), salt = fund, info = "ned-key-wrap-v1" ‖ recipient)
//   associated data = fund ‖ recipient, so a wrap cannot be moved to another contract or device.
// The device's private key never leaves the device: never log it, never put it in a URL, an error or a notification.
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { PublicKey, Transaction, type Connection, type TransactionInstruction } from '@solana/web3.js';
import idl from '../idl/ned_program.json' with { type: 'json' };
import { buildIx, encodeIx } from '../chain/idl.ts';
import { getConnection, getProgramId } from '../config.ts';
import { coder, type FundAccount } from './decode.ts';
import { fromBase64Url, toBase64Url, type KeyStorage } from './keys.ts';
import { NOTE_MAX_LEN, NOTE_MAX_PARTS } from './layout.ts';
import type { NoteRecord } from './notes.ts';

export const DEVICE_KEYS_SEED = 'device_keys';
export const MAX_DEVICE_KEYS = 5;
export const NOTE_KIND_KEY = 2;
export const WRAP_BYTES = 32 + 32 + 24 + 48;
/** Whole wraps per post_note part (816 of 900 bytes) */
export const WRAPS_PER_PART = Math.floor(NOTE_MAX_LEN / WRAP_BYTES);
export const DEVICE_KEY_PREFIX = '@ned_device_key_v1:';

const encoder = new TextEncoder();
const INFO = encoder.encode('ned-key-wrap-v1');
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
const random = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

// ---- this device's key ----

export interface DeviceKey {
  secret: Uint8Array;
  publicKey: Uint8Array;
}

/** This device's key for `wallet`, created on first use and kept in `storage` (AsyncStorage / localStorage) */
export async function loadOrCreateDeviceKey(storage: KeyStorage, wallet: string): Promise<DeviceKey> {
  const name = DEVICE_KEY_PREFIX + wallet;
  const saved = await storage.getItem(name);
  const secret = saved ? fromBase64Url(saved) : null;
  if (secret && secret.length === 32) return { secret, publicKey: x25519.getPublicKey(secret) };
  const fresh = x25519.utils.randomSecretKey();
  await storage.setItem(name, toBase64Url(fresh));
  return { secret: fresh, publicKey: x25519.getPublicKey(fresh) };
}

/** This device's key if it already exists (never creates one) */
export async function loadDeviceKey(storage: KeyStorage, wallet: string): Promise<DeviceKey | null> {
  const saved = await storage.getItem(DEVICE_KEY_PREFIX + wallet);
  const secret = saved ? fromBase64Url(saved) : null;
  return secret && secret.length === 32 ? { secret, publicKey: x25519.getPublicKey(secret) } : null;
}

// ---- on-chain registry ----

export function deviceKeysPda(wallet: PublicKey, programId: PublicKey = getProgramId()): PublicKey {
  return PublicKey.findProgramAddressSync([encoder.encode(DEVICE_KEYS_SEED), wallet.toBuffer()], programId)[0];
}

export interface DeviceKeysAccount {
  wallet: PublicKey;
  keys: Uint8Array[];
}

export function decodeDeviceKeys(data: Uint8Array): DeviceKeysAccount {
  const raw = coder.accounts.decode<{ wallet: PublicKey; count: number; keys: number[][] }>('DeviceKeys', Buffer.from(data));
  return { wallet: raw.wallet, keys: raw.keys.slice(0, raw.count).map((k) => Uint8Array.from(k)) };
}

/** Registered device keys per wallet (an empty list when the wallet has none) */
export async function fetchDeviceKeys(
  wallets: PublicKey[],
  conn: Pick<Connection, 'getMultipleAccountsInfo'> = getConnection()
): Promise<Map<string, Uint8Array[]>> {
  const infos = await conn.getMultipleAccountsInfo(wallets.map((w) => deviceKeysPda(w)), 'confirmed');
  const out = new Map<string, Uint8Array[]>();
  wallets.forEach((w, i) => {
    const info = infos[i];
    let keys: Uint8Array[] = [];
    if (info && info.owner.equals(getProgramId())) {
      try {
        keys = decodeDeviceKeys(info.data).keys;
      } catch {
        keys = [];
      }
    }
    out.set(w.toBase58(), keys);
  });
  return out;
}

/** Instructions that register `publicKey` for `wallet` (init first when the list does not exist yet) */
export function buildRegisterDevice(p: { wallet: PublicKey; publicKey: Uint8Array; listExists: boolean }): TransactionInstruction[] {
  const accounts = { wallet: p.wallet, device_keys: deviceKeysPda(p.wallet) };
  const add = buildIx(idl, getProgramId(), 'add_device_key', accounts, encodeIx(coder, 'add_device_key', { key: Array.from(p.publicKey) }));
  if (p.listExists) return [add];
  const init = buildIx(idl, getProgramId(), 'init_device_keys', accounts, encodeIx(coder, 'init_device_keys', {}));
  return [init, add];
}

export function buildRemoveDevice(p: { wallet: PublicKey; publicKey: Uint8Array }): TransactionInstruction {
  return buildIx(
    idl,
    getProgramId(),
    'remove_device_key',
    { wallet: p.wallet, device_keys: deviceKeysPda(p.wallet) },
    encodeIx(coder, 'remove_device_key', { key: Array.from(p.publicKey) })
  );
}

// ---- wraps ----

function wrapKey(shared: Uint8Array, fund: PublicKey, recipient: Uint8Array): Uint8Array {
  return hkdf(sha256, shared, fund.toBytes(), concat(INFO, recipient), 32);
}

/** One wrap of the contract key for one device */
export function wrapContentKey(contentKey: Uint8Array, fund: PublicKey, recipient: Uint8Array, ephemeralSecret: Uint8Array = x25519.utils.randomSecretKey()): Uint8Array {
  if (contentKey.length !== 32 || recipient.length !== 32) throw new Error('Invalid key length');
  const ephemeralPublic = x25519.getPublicKey(ephemeralSecret);
  const key = wrapKey(x25519.getSharedSecret(ephemeralSecret, recipient), fund, recipient);
  const nonce = random(24);
  const sealed = xchacha20poly1305(key, nonce, concat(fund.toBytes(), recipient)).encrypt(contentKey);
  return concat(recipient, ephemeralPublic, nonce, sealed);
}

/** The contract key from the first wrap in `data` addressed to `device`; null if none opens */
export function unwrapContentKey(data: Uint8Array, fund: PublicKey, device: DeviceKey): Uint8Array | null {
  for (let at = 0; at + WRAP_BYTES <= data.length; at += WRAP_BYTES) {
    const wrap = data.subarray(at, at + WRAP_BYTES);
    const recipient = wrap.subarray(0, 32);
    if (!equal(recipient, device.publicKey)) continue;
    try {
      const key = wrapKey(x25519.getSharedSecret(device.secret, wrap.subarray(32, 64)), fund, recipient);
      const opened = xchacha20poly1305(key, wrap.subarray(64, 88), concat(fund.toBytes(), recipient)).decrypt(wrap.subarray(88));
      if (opened.length === 32) return opened;
    } catch {
      // a wrap that does not open is ignored (wrong key or tampered)
    }
  }
  return null;
}

/** Device public keys that already have a wrap in the fund's key notes */
export function wrappedRecipients(records: NoteRecord[]): Set<string> {
  const out = new Set<string>();
  for (const r of records) {
    if (r.kind !== NOTE_KIND_KEY) continue;
    for (let at = 0; at + WRAP_BYTES <= r.data.length; at += WRAP_BYTES) out.add(toBase64Url(r.data.subarray(at, at + 32)));
  }
  return out;
}

/** The contract key from the fund's key notes for this device (only parts by the client or the freelancer count) */
export function contentKeyFromNotes(fund: FundAccount, records: NoteRecord[], device: DeviceKey): Uint8Array | null {
  for (const r of records) {
    if (r.kind !== NOTE_KIND_KEY) continue;
    if (!r.author.equals(fund.client) && !r.author.equals(fund.freelancer)) continue;
    const key = unwrapContentKey(r.data, fund.address, device);
    if (key) return key;
  }
  return null;
}

/** post_note kind 2 transactions with wraps of `contentKey` for `recipients` (whole wraps per part, ≤ 8 parts) */
export function buildKeyNotes(p: { fund: PublicKey; author: PublicKey; contentKey: Uint8Array; recipients: Uint8Array[] }): Transaction[] {
  const unique = p.recipients.filter((r, i) => p.recipients.findIndex((x) => equal(x, r)) === i);
  if (!unique.length) return [];
  const wraps = unique.map((r) => wrapContentKey(p.contentKey, p.fund, r));
  const parts: Uint8Array[] = [];
  for (let i = 0; i < wraps.length; i += WRAPS_PER_PART) parts.push(concat(...wraps.slice(i, i + WRAPS_PER_PART)));
  if (parts.length > NOTE_MAX_PARTS) throw new Error('Too many devices for one key note');
  return parts.map((data, part) =>
    new Transaction().add(
      buildIx(
        idl,
        getProgramId(),
        'post_note',
        { fund: p.fund, author: p.author },
        encodeIx(coder, 'post_note', { kind: NOTE_KIND_KEY, milestone: 0, part, parts: parts.length, data: Buffer.from(data) })
      )
    )
  );
}
