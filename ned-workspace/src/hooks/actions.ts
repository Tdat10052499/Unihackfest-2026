// The Workspace side of the core action pipeline (@ned/core actions.ts): signer from useAuth, chain clock, this
// computer's contract-key storage, and the send status for the page. Screens call run*(env, …) with this env.
import { useMemo, useState } from 'react';
import type { Transaction } from '@solana/web3.js';
import type { ActionEnv } from '@ned/core/actions.ts';
import type { SendStatus } from '@ned/core/chain/send.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { contractKeyStorage } from './keyStore.ts';
import { chainNowSeconds } from './useChainTime.ts';

export function useActionEnv(): { env: ActionEnv; status: SendStatus | '' } {
  const { walletAddress, signTransaction } = useAuth();
  const [status, setStatus] = useState<SendStatus | ''>('');
  const env = useMemo<ActionEnv>(
    () => ({
      signer: { walletAddress, signTransaction: (tx: Transaction) => signTransaction(tx) },
      now: chainNowSeconds,
      onStatus: setStatus,
      keys: contractKeyStorage,
    }),
    [walletAddress, signTransaction]
  );
  return { env, status };
}
