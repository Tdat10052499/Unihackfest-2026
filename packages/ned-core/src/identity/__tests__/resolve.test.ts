import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import { createIdentityResolver, shortAddress } from '../resolveCore.ts';

const wallet = Keypair.generate().publicKey.toBase58();
const second = Keypair.generate().publicKey.toBase58();
function fixture() {
  let now = 1_000;
  let owner = wallet;
  let nameReads = 0;
  const storage = new Map<string, string>();
  const batches: number[] = [];
  const snsReads: string[] = [];
  const deps = {
    namespace: 'test', now: () => now,
    storage: { getItem: async (key: string) => storage.get(key) ?? null, setItem: async (key: string, value: string) => { storage.set(key, value); } },
    phoneKey: async (raw: string) => raw === '0901234567' ? 'scrypt-key' : null,
    name: async (name: string) => { nameReads++; return name === 'alice' ? owner : null; },
    phone: async () => ({ wallet: owner, username: 'alice' }),
    sns: async (domain: string) => { snsReads.push(domain); return second; },
    reverse: async (wallets: string[]) => { batches.push(wallets.length); return wallets.map(w => w === wallet ? 'alice' : null); },
    reverseSns: async (wallets: string[]) => wallets.map(w => w === second ? 'real.sol' : undefined),
  };
  return { deps, resolver: createIdentityResolver(deps), storage, batches, snsReads, change: () => { owner = second; }, expire: () => { now += 60_001; }, reads: () => nameReads };
}

test('SNS is distinct from N.E.D; base58 case is preserved; errors are explicit', async () => {
  const f = fixture();
  assert.equal((await f.resolver.resolveRecipient('@ALICE')).wallet, wallet);
  assert.equal((await f.resolver.resolveRecipient('alice.sol')).source, 'sns');
  assert.deepEqual(f.snsReads, ['alice.sol']);
  assert.equal((await f.resolver.resolveRecipient(wallet)).wallet, wallet);
  await assert.rejects(f.resolver.resolveRecipient('@absent'), /No N.E.D account/);
  await assert.rejects(f.resolver.resolveRecipient('bad input'), /Recipient not found/);
  await assert.rejects(f.resolver.resolveRecipient(''), /Enter/);
});
test('cache TTL and fresh reads prevent stale recipients at signing', async () => {
  const f = fixture();
  await f.resolver.resolveRecipient('@alice'); f.change();
  assert.equal((await f.resolver.resolveRecipient('@alice')).wallet, wallet);
  assert.equal(f.reads(), 1);
  assert.equal((await f.resolver.resolveRecipient('@alice', { fresh: true })).wallet, second);
  f.expire(); await f.resolver.resolveRecipient('@alice'); assert.equal(f.reads(), 3);
});
test('phone warnings survive persistent cache; raw phone never persists', async () => {
  const f = fixture();
  assert.equal((await f.resolver.resolveRecipient('0901234567')).phoneUnverified, true);
  assert.ok(!JSON.stringify([...f.storage]).includes('0901234567'));
  const restored = createIdentityResolver(f.deps);
  const result = await restored.resolveRecipient('0901234567');
  assert.equal(result.phoneUnverified, true); assert.equal(result.username, 'alice');
  f.change(); await restored.clearIdentityCache();
  assert.equal((await restored.resolveRecipient('0901234567')).wallet, second);
});
test('display lookup uses ReverseRecord before SNS, batches <=100 and deduplicates', async () => {
  const f = fixture();
  const wallets = [wallet, second, ...Array.from({ length: 101 }, () => Keypair.generate().publicKey.toBase58())];
  const result = await f.resolver.displayNamesFor([...wallets, wallet]);
  assert.deepEqual(f.batches, [100, 3]);
  assert.equal(result[wallet], '@alice'); assert.equal(result[second], 'real.sol');
  assert.equal(result[wallets[2]], shortAddress(wallets[2]));
});
test('RPC outages never become cached not-found results', async () => {
  const f = fixture();
  let fail = true;
  const resolver = createIdentityResolver({ ...f.deps, reverse: async () => { if (fail) throw Error('offline'); return ['alice']; } });
  assert.equal(await resolver.displayNameFor(wallet), shortAddress(wallet));
  fail = false; assert.equal(await resolver.displayNameFor(wallet), '@alice');
});
test('corrupt persistent cache is ignored', async () => {
  const f = fixture(); f.storage.set('@ned_identity_v1:test', 'bad json');
  assert.equal((await f.resolver.resolveRecipient('@alice')).wallet, wallet);
});
