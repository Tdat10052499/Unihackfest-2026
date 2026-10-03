// Reads: contract lists by memcmp, one contract, and chain time.
import bs58 from 'bs58';
import { PublicKey, type Connection } from '@solana/web3.js';
import { getConnection, getProgramId } from '../config.ts';
import { decodeFund, FUND_DISCRIMINATOR, type FundAccount } from './decode.ts';
import { FUND_SIZE, OFFSET_CLIENT, OFFSET_FREELANCER } from './layout.ts';

type ListConnection = Pick<Connection, 'getProgramAccounts'>;

/** Contracts where `wallet` is the client (memcmp at 12) or the freelancer (memcmp at 44), newest first */
export async function listFunds(
  wallet: PublicKey | string,
  role: 'client' | 'freelancer',
  conn: ListConnection = getConnection()
): Promise<FundAccount[]> {
  const owner = typeof wallet === 'string' ? wallet : wallet.toBase58();
  const accounts = await conn.getProgramAccounts(getProgramId(), {
    commitment: 'confirmed',
    filters: [
      { dataSize: FUND_SIZE },
      { memcmp: { offset: 0, bytes: bs58.encode(FUND_DISCRIMINATOR) } },
      { memcmp: { offset: role === 'client' ? OFFSET_CLIENT : OFFSET_FREELANCER, bytes: owner } },
    ],
  });
  const funds: FundAccount[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      funds.push(decodeFund(pubkey, account.data));
    } catch (err) {
      console.warn('[milestone] skipped an account that does not decode as SharedFund', pubkey.toBase58(), err);
    }
  }
  return funds.sort((a, b) => b.createdAt - a.createdAt);
}

/** One contract; null when it does not exist (never created, or closed) */
export async function getFund(address: PublicKey | string, conn: Pick<Connection, 'getAccountInfo'> = getConnection()): Promise<FundAccount | null> {
  const key = typeof address === 'string' ? new PublicKey(address) : address;
  const info = await conn.getAccountInfo(key, 'confirmed');
  if (!info || !info.owner.equals(getProgramId())) return null;
  return decodeFund(key, info.data);
}

/** Chain time: block time of the latest confirmed slot (falls back to the device clock) */
export async function getChainNow(conn: Pick<Connection, 'getSlot' | 'getBlockTime'> = getConnection()): Promise<number> {
  try {
    const slot = await conn.getSlot('confirmed');
    const time = await conn.getBlockTime(slot);
    if (time !== null) return time;
  } catch (err) {
    console.warn('[milestone] chain time unavailable, using device time', err);
  }
  return Math.floor(Date.now() / 1000);
}
