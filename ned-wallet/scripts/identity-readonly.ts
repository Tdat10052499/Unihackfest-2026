/** Read-only T1.7 smoke test: no keypair access or transactions. */
/* eslint-disable import/first */
import { config } from 'dotenv';
config({ path: '.env', quiet: true });
import assert from 'node:assert/strict';
import { Connection, PublicKey } from '@solana/web3.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { createIdentityResolver } from '../services/identity/resolveCore';
import { fetchNameRecord, fetchPhoneRecord, fetchReverseRecord, fetchReverseRecords } from '../services/identity/dualPda';
import { normalizeVietnamPhone, computePhoneKey } from '../services/identity/phoneKey';
import { resolveSns, reverseSns } from '../services/identity/sns';
const c = new Connection(process.env.EXPO_PUBLIC_HELIUS_DEVNET_URL!, 'confirmed');
const cache = new Map<string, string>();
const resolver = createIdentityResolver({
  namespace: 'readonly', storage: { getItem: async key => cache.get(key) ?? null, setItem: async (key, value) => { cache.set(key, value); } },
  phoneKey: async input => { const phone = normalizeVietnamPhone(input); return phone ? bytesToHex(await computePhoneKey(phone)) : null; },
  name: async name => (await fetchNameRecord(c, name))?.wallet.toBase58() ?? null,
  phone: async key => { const record = await fetchPhoneRecord(c, hexToBytes(key)); if (!record) return null; const reverse = await fetchReverseRecord(c, record.wallet); assert.ok(reverse?.hasPhone); return { wallet: record.wallet.toBase58(), username: reverse.username }; },
  reverse: async wallets => (await fetchReverseRecords(c, wallets.map(w => new PublicKey(w)))).map(r => r?.username ?? null),
  sns: resolveSns, reverseSns,
});
async function main() {
  const phoneWallet = '8wC8V6ZKabTn4Hc8q6jWA4CELuMvyX4VxiAZMGX6VyH';
  const bareWallet = '4HkvkahZoJhYxoTVJKAiy11TiihdWWCsWGg3Cmmt8EuT';
  assert.equal((await resolver.resolveRecipient('@t17_0_8wc8v6zk')).wallet, phoneWallet);
  assert.equal((await resolver.resolveRecipient('@t17_1_4hkvkahz')).wallet, bareWallet);
  const phone = await resolver.resolveRecipient('+84995141202');
  assert.equal(phone.wallet, phoneWallet); assert.equal(phone.phoneUnverified, true); assert.equal(phone.username, 't17_0_8wc8v6zk');
  assert.equal((await resolver.resolveRecipient(bareWallet)).wallet, bareWallet);
  assert.deepEqual(await resolver.displayNamesFor([phoneWallet, bareWallet]), { [phoneWallet]: '@t17_0_8wc8v6zk', [bareWallet]: '@t17_1_4hkvkahz' });
  const sns = await resolver.resolveRecipient('sns.sol');
  assert.equal(sns.source, 'sns');
  console.log('PASS: both usernames, phone + warning, address, batch reverse; sns.sol =', sns.wallet);
  console.log('SNS reverse:', await reverseSns([sns.wallet]));
}
main().catch(() => { console.error('Read-only identity check failed; check RPC configuration and fixture availability.'); process.exitCode = 1; });
