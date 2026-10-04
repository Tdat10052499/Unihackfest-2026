// Key sync on the Workspace (decision D22, key-sync-plan.md Plan C), same rules as the phone: register this computer's
// key once per wallet, recover a contract key from the fund's key notes, re-wrap for sibling devices. Silent; failures
// retry later. Never log a key.
import type { Transaction } from '@solana/web3.js';
import { recoverContentKey, runRegisterDevice, runShareKey, type ActionEnv } from '@ned/core/actions.ts';
import type { FundAccount } from '@ned/core/milestone/decode.ts';
import type { NoteRecord } from '@ned/core/milestone/notes.ts';
import { contractKeyStorage } from './keyStore.ts';
import { chainNowSeconds } from './useChainTime.ts';

export interface KeySigner {
  walletAddress: string | null | undefined;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

const env = (signer: KeySigner): ActionEnv => ({ signer, now: chainNowSeconds, keys: contractKeyStorage });

const registered = new Map<string, Promise<boolean>>();
export function ensureDeviceRegistered(signer: KeySigner): Promise<boolean> {
  const wallet = signer.walletAddress;
  if (!wallet) return Promise.resolve(false);
  let job = registered.get(wallet);
  if (!job) {
    job = runRegisterDevice(env(signer))
      .then(() => true)
      .catch((err) => {
        registered.delete(wallet);
        console.warn('[keySync] device registration failed', err instanceof Error ? err.message : err);
        return false;
      });
    registered.set(wallet, job);
  }
  return job;
}

export async function recoverKey(wallet: string, fund: FundAccount, records: NoteRecord[]): Promise<Uint8Array | null> {
  try {
    return await recoverContentKey(contractKeyStorage, wallet, fund, records);
  } catch {
    return null;
  }
}

const shared = new Set<string>();
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
