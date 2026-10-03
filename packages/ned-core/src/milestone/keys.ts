// Per-contract content key K (build-plan B1). The client's app makes a random 32-byte K for each contract. K travels
// only in the invite-link fragment (…/c/<fund>#k=<base64url>), which browsers never send to a server, and is kept per
// wallet on the device. Never log K or put it in an error, a notification or analytics.
import { PublicKey } from '@solana/web3.js';
import { getMobileOrigin, getWorkspaceOrigin } from '../config.ts';

export const CONTENT_KEY_BYTES = 32;
export const KEY_STORAGE_PREFIX = '@ned_contract_keys_v1:';

/** AsyncStorage (mobile) and localStorage (Workspace) both fit this shape */
export interface KeyStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}

export function generateContentKey(): Uint8Array {
  const key = new Uint8Array(CONTENT_KEY_BYTES);
  globalThis.crypto.getRandomValues(key);
  return key;
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

const storageKey = (wallet: string) => `${KEY_STORAGE_PREFIX}${wallet}`;

async function readMap(storage: KeyStorage, wallet: string): Promise<Record<string, string>> {
  try {
    const raw = await storage.getItem(storageKey(wallet));
    const map = raw ? JSON.parse(raw) : {};
    return map && typeof map === 'object' ? map : {};
  } catch {
    return {};
  }
}

/** K of `fund` on this device for `wallet`, or null */
export async function loadContentKey(storage: KeyStorage, wallet: string, fund: string): Promise<Uint8Array | null> {
  const text = (await readMap(storage, wallet))[fund];
  const key = text ? fromBase64Url(text) : null;
  return key && key.length === CONTENT_KEY_BYTES ? key : null;
}

export async function saveContentKey(storage: KeyStorage, wallet: string, fund: string, key: Uint8Array): Promise<void> {
  if (key.length !== CONTENT_KEY_BYTES) throw new Error('A contract key has 32 bytes.');
  const map = await readMap(storage, wallet);
  map[fund] = toBase64Url(key);
  await storage.setItem(storageKey(wallet), JSON.stringify(map));
}

/** Where invite links point: the Workspace (it sends phones on to the mobile build); the mobile origin until it is set */
export const inviteOrigin = () => getWorkspaceOrigin() || getMobileOrigin();

/** `…/c/<fund>#k=<base64url K>` */
export function inviteLink(fund: string, key: Uint8Array, origin = inviteOrigin()): string {
  return `${origin.replace(/\/+$/, '')}/c/${fund}#k=${toBase64Url(key)}`;
}

export interface ParsedInvite {
  /** Present when a full link was pasted */
  fund?: string;
  key: Uint8Array;
}

const isFund = (s: string) => {
  try {
    return new PublicKey(s).toBase58() === s;
  } catch {
    return false;
  }
};

/** Accepts '#k=…', 'k=…', a bare key, or a pasted contract link `…/c/<fund>#k=…`; null if no valid key is in it */
export function parseInvite(input: string): ParsedInvite | null {
  const text = String(input ?? '').trim();
  if (!text) return null;
  const hash = text.includes('#') ? text.slice(text.indexOf('#') + 1) : text;
  const params = new URLSearchParams(hash);
  const k = params.get('k') ?? (/^[A-Za-z0-9_-]{43}$/.test(hash) ? hash : null);
  const key = k ? fromBase64Url(k) : null;
  if (!key || key.length !== CONTENT_KEY_BYTES) return null;
  const path = text.includes('#') ? text.slice(0, text.indexOf('#')) : '';
  const fund = /\/c\/([1-9A-HJ-NP-Za-km-z]{32,44})\/?$/.exec(path)?.[1];
  return fund && isFund(fund) ? { fund, key } : { key };
}

/**
 * Stores the key from a fragment or a pasted link for `fund`. Returns false when there is no valid key, or when the
 * pasted link belongs to another contract (so one contract's link never overwrites another's key).
 */
export async function importKeyFromFragment(storage: KeyStorage, wallet: string, fund: string, input: string): Promise<boolean> {
  const parsed = parseInvite(input);
  if (!parsed || (parsed.fund && parsed.fund !== fund)) return false;
  await saveContentKey(storage, wallet, fund, parsed.key);
  return true;
}

/** In-memory storage for scripts and tests */
export function memoryKeyStorage(): KeyStorage {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}
