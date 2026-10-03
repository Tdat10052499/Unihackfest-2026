// Freelancer lookup for the Workspace (W3): the core resolver (resolveCore) with on-chain reads from core dualPda and
// a per-tab cache. Always called with fresh: true before signing. Only @username and wallet addresses here: phone
// numbers and .sol names stay on the phone app (ned-wallet/services/identity/resolve.ts, mobile only).
import { PublicKey } from '@solana/web3.js';
import { getConnection } from '@ned/core/config.ts';
import { fetchNameRecord, fetchReverseRecords, identityProgramId } from '@ned/core/identity/dualPda.ts';
import { createIdentityResolver, type Recipient } from '@ned/core/identity/resolveCore.ts';

const ONLY = 'Enter the freelancer’s @username or Solana wallet address.';

const storage = {
  getItem: async (key: string) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // no session storage: lookups simply are not cached
    }
  },
};

let resolver: ReturnType<typeof createIdentityResolver> | null = null;
function get() {
  resolver ??= createIdentityResolver({
    namespace: `workspace:devnet:${identityProgramId().toBase58()}`,
    storage,
    phoneKey: async () => null,
    name: async (username) => (await fetchNameRecord(getConnection(), username))?.wallet.toBase58() ?? null,
    phone: async () => null,
    sns: async () => {
      throw new Error(ONLY);
    },
    reverse: async (wallets) => (await fetchReverseRecords(getConnection(), wallets.map((w) => new PublicKey(w)))).map((r) => r?.username ?? null),
    reverseSns: async (wallets) => wallets.map(() => undefined),
  });
  return resolver;
}

/** @username or wallet → wallet, read from the chain now (never from a cache) */
export async function resolveFreelancer(input: string): Promise<Recipient> {
  const raw = input.trim();
  if (/^\+?[0-9 ]{6,}$/.test(raw) || raw.toLowerCase().endsWith('.sol')) throw new Error(ONLY);
  const r = await get().resolveRecipient(raw, { fresh: true });
  // A bare address: show its @username when it has one
  if (!r.username) {
    const record = (await fetchReverseRecords(getConnection(), [new PublicKey(r.wallet)]))[0];
    if (record?.username) return { ...r, username: record.username };
  }
  return r;
}
