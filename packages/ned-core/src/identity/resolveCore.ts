import { PublicKey } from '@solana/web3.js';

export interface Recipient {
  wallet: string;
  username?: string;
  source: 'ned' | 'sns' | 'address';
  phoneUnverified: boolean;
}
export const shortAddress = (wallet: string) => `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
export const recipientLabel = (r: Recipient) => r.username ? `@${r.username}` : shortAddress(r.wallet);

type Entry = { expires: number; value: Recipient | string };
interface Dependencies {
  namespace: string;
  storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
  phoneKey(input: string): Promise<string | null>;
  name(username: string): Promise<string | null>;
  phone(key: string): Promise<{ wallet: string; username: string } | null>;
  sns(domain: string): Promise<string>;
  reverse(wallets: string[]): Promise<(string | null)[]>;
  reverseSns(wallets: string[]): Promise<(string | undefined)[]>;
  now?: () => number;
}

/** Cache is display-only at signing time: callers MUST use fresh:true before signing.
 * Phone keys are scrypt hashes; raw phone numbers never enter persistent cache. */
export function createIdentityResolver(d: Dependencies) {
  const now = d.now ?? Date.now;
  const cache = new Map<string, Entry>();
  const storageKey = `@ned_identity_v1:${d.namespace}`;
  let hydration: Promise<void> | undefined;
  let writing = Promise.resolve();
  let generation = 0;
  const hydrate = () => hydration ??= (async () => {
    try {
      const entries: unknown = JSON.parse(await d.storage.getItem(storageKey) ?? '[]');
      if (Array.isArray(entries)) for (const pair of entries.slice(-300)) {
        if (!Array.isArray(pair) || pair.length !== 2) continue;
        const [key, entry] = pair;
        if (typeof key === 'string' && entry && typeof entry.expires === 'number' && entry.expires > now() && entry.expires <= now() + 60_000) {
          if (typeof entry.value === 'string' || validRecipient(entry.value)) cache.set(key, entry);
        }
      }
    } catch { /* Corrupt/unavailable storage must not block on-chain lookup. */ }
  })();
  function validRecipient(value: unknown): value is Recipient {
    if (!value || typeof value !== 'object') return false;
    const r = value as Recipient;
    try { new PublicKey(r.wallet); } catch { return false; }
    return ['ned', 'sns', 'address'].includes(r.source) && typeof r.phoneUnverified === 'boolean' &&
      (r.username === undefined || /^[a-z0-9_]{3,20}$/.test(r.username)) && (!r.phoneUnverified || !!r.username);
  }
  function read(key: string) {
    const entry = cache.get(key);
    if (entry && entry.expires > now()) return entry.value;
    cache.delete(key);
  }
  function persist() {
    for (const [key, entry] of cache) if (entry.expires <= now()) cache.delete(key);
    while (cache.size > 300) cache.delete(cache.keys().next().value!);
    const snapshot = JSON.stringify([...cache]);
    writing = writing.then(() => d.storage.setItem(storageKey, snapshot)).then(() => undefined).catch(() => {});
    return writing;
  }
  async function resolveRecipient(input: string, options: { fresh?: boolean } = {}): Promise<Recipient> {
    const raw = input.trim();
    if (!raw) throw new Error('Enter a phone number, @username, .sol name or Solana address.');
    let key: string;
    let lookup: () => Promise<Recipient>;
    if (raw.toLowerCase().endsWith('.sol') && !raw.startsWith('@')) {
      const domain = raw.toLowerCase();
      key = `sns:${domain}`;
      lookup = async () => ({ wallet: await d.sns(domain), source: 'sns', phoneUnverified: false });
    } else if (raw.startsWith('@') || (/^[a-zA-Z0-9_]{3,20}$/.test(raw) && !/^[0-9]+$/.test(raw))) {
      const username = raw.replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error('Use a N.E.D username with 3–20 letters, numbers or _.');
      key = `name:${username}`;
      lookup = async () => {
        const wallet = await d.name(username);
        if (!wallet) throw new Error(`No N.E.D account found for @${username}. Check the username.`);
        return { wallet, username, source: 'ned', phoneUnverified: false };
      };
    } else {
      const phoneKey = await d.phoneKey(raw);
      if (phoneKey) {
        key = `phone:${phoneKey}`;
        lookup = async () => {
          const record = await d.phone(phoneKey);
          if (!record) throw new Error('No N.E.D account is linked to this phone number.');
          return { ...record, source: 'ned', phoneUnverified: true };
        };
      } else {
        let wallet: string;
        try { wallet = new PublicKey(raw).toBase58(); }
        catch { throw new Error('Recipient not found. Check the Vietnamese phone number, @username, .sol name or full Solana address.'); }
        key = `address:${wallet}`;
        lookup = async () => ({ wallet, source: 'address', phoneUnverified: false });
      }
    }
    await hydrate();
    const cached = read(key);
    if (!options.fresh && typeof cached === 'object' && validRecipient(cached)) return { ...cached };
    const epoch = generation;
    const result = await lookup();
    if (!validRecipient(result)) throw new Error('The recipient record is invalid. Try their wallet address.');
    if (generation === epoch) { cache.set(key, { value: result, expires: now() + 60_000 }); await persist(); }
    return { ...result };
  }
  async function displayNamesFor(wallets: string[]): Promise<Record<string, string>> {
    await hydrate();
    const result: Record<string, string> = {};
    const pending: string[] = [];
    for (const wallet of new Set(wallets)) {
      const cached = read(`display:${wallet}`);
      if (typeof cached === 'string') result[wallet] = cached;
      else { try { new PublicKey(wallet); pending.push(wallet); } catch { result[wallet] = shortAddress(wallet); } }
    }
    for (let i = 0; i < pending.length; i += 100) {
      const batch = pending.slice(i, i + 100);
      // Failure is a temporary address fallback, never a cached absence.
      let names: (string | null)[];
      try { names = await d.reverse(batch); } catch { batch.forEach(w => result[w] = shortAddress(w)); continue; }
      const missing = batch.filter((_, j) => !names[j]);
      let sns: (string | undefined)[] = [];
      try { if (missing.length) sns = await d.reverseSns(missing); } catch { /* Mainnet outage must not hide N.E.D names. */ }
      batch.forEach((wallet, j) => {
        const domain = sns[missing.indexOf(wallet)];
        const label = names[j] ? `@${names[j]}` : domain || shortAddress(wallet);
        result[wallet] = label;
        if (names[j] || domain) cache.set(`display:${wallet}`, { value: label, expires: now() + 60_000 });
      });
    }
    await persist();
    return result;
  }
  return {
    resolveRecipient, displayNamesFor,
    displayNameFor: async (wallet: string) => (await displayNamesFor([wallet]))[wallet],
    clearIdentityCache: async () => { await hydrate(); generation++; cache.clear(); await persist(); },
  };
}
