import AsyncStorage from '@react-native-async-storage/async-storage';
import { Connection, PublicKey } from '@solana/web3.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { createIdentityResolver } from './resolveCore';
import { computePhoneKey, normalizeVietnamPhone } from './phoneKey';
import { fetchNameRecord, fetchPhoneRecord, fetchReverseRecord, fetchReverseRecords, IDENTITY_PROGRAM_ID } from './dualPda';
import { resolveSns, reverseSns } from './sns';

export const identityConnection = new Connection(process.env.EXPO_PUBLIC_HELIUS_DEVNET_URL || 'https://api.devnet.solana.com', 'confirmed');
const resolver = createIdentityResolver({
  namespace: `devnet:${IDENTITY_PROGRAM_ID.toBase58()}`,
  storage: AsyncStorage,
  phoneKey: async input => {
    const normalized = normalizeVietnamPhone(input);
    return normalized ? bytesToHex(await computePhoneKey(normalized)) : null;
  },
  name: async username => (await fetchNameRecord(identityConnection, username))?.wallet.toBase58() ?? null,
  phone: async key => {
    const phone = await fetchPhoneRecord(identityConnection, hexToBytes(key));
    if (!phone) return null;
    const reverse = await fetchReverseRecord(identityConnection, phone.wallet);
    if (!reverse?.hasPhone) throw new Error('This phone record has no active N.E.D profile. Use a wallet address.');
    return { wallet: phone.wallet.toBase58(), username: reverse.username };
  },
  sns: resolveSns,
  reverse: async wallets => (await fetchReverseRecords(identityConnection, wallets.map(w => new PublicKey(w)))).map(r => r?.username ?? null),
  reverseSns,
});
export const { resolveRecipient, displayNameFor, displayNamesFor, clearIdentityCache } = resolver;
export { recipientLabel, shortAddress } from './resolveCore';
export type { Recipient } from './resolveCore';
