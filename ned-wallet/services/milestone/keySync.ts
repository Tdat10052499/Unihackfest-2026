// Key sync on the phone (decision D22, key-sync-plan.md Plan C). Silent: register this device's key once per wallet,
// recover a contract key from the fund's key notes, and re-wrap a key this device has for sibling devices that lack
// one. Each runs at most once per wallet / contract per app session; failures (no SOL yet, RPC) just retry later.
// Never log a key.
import '../../services/coreInit.ts';
import type { Transaction } from '@solana/web3.js';
import { recoverContentKey, runRegisterDevice, runShareKey, type ActionEnv } from '@ned/core/actions.ts';
import { chainNowSeconds } from '../../hooks/useChainTime';
import type { FundAccount } from './decode';
import { contractKeyStorage } from './keyStore';
import type { fetchNotes } from './notes';

export interface KeySigner {
  walletAddress: string | null | undefined;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

const env = (signer: KeySigner): ActionEnv => ({ signer, now: chainNowSeconds, keys: contractKeyStorage });

const registered = new Map<string, Promise<boolean>>();
/** Registers this device for the wallet (one small transaction the first time on this device) */
export function ensureDeviceRegistered(signer: KeySigner): Promise<boolean> {
  const wallet = signer.walletAddress;
  if (!wallet) return Promise.resolve(false);
  let job = registered.get(wallet);
  if (!job) {
    job = runRegisterDevice(env(signer))
      .then(() => true)
      .catch((err) => {
        registered.delete(wallet); // retry on the next call (for example once the wallet has SOL)
        console.warn('[keySync] device registration failed', err instanceof Error ? err.message : err);
        return false;
      });
    registered.set(wallet, job);
  }
  return job;
}

/** K from the fund's key notes for this device; saved on the device when found */
export async function recoverKey(wallet: string, fund: FundAccount, records: Awaited<ReturnType<typeof fetchNotes>>): Promise<Uint8Array | null> {
  try {
    return await recoverContentKey(contractKeyStorage, wallet, fund, records);
  } catch {
    return null;
  }
}

const shared = new Set<string>();
/** Wraps K for every registered device of both parties that has none yet (once per contract per session) */
export async function shareKeyOnce(signer: KeySigner, fund: string): Promise<void> {
  const id = `${signer.walletAddress}:${fund}`;
  if (!signer.walletAddress || shared.has(id)) return;
  shared.add(id);
  try {
    await ensureDeviceRegistered(signer);
    await runShareKey(env(signer), fund);
  } catch (err) {
    shared.delete(id);
    console.warn('[keySync] key share failed', err instanceof Error ? err.message : err);
  }
}
