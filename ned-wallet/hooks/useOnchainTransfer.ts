import { useState, useCallback, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
import { sendAndConfirm } from '../services/chain/send';
import { prepareUsdcTransfer, type PreparedUsdcTransfer } from '../services/p2pTransfer';
import { useAuth } from '../services/auth';

export interface OnchainTransferParams {
  recipientAddressOrPhone: string;
  amountUsdc?: number;
  prepared?: PreparedUsdcTransfer;
  fromAddress?: string;
}
export interface OnchainTransferResult { success: boolean; transactionHash?: string; recipientAddress?: string; error?: string }
export function useOnchainTransfer() {
  const { status, walletAddress, signTransaction } = useAuth();
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const busy = useRef(false);
  const transfer = useCallback(async (params: OnchainTransferParams): Promise<OnchainTransferResult> => {
    if (busy.current) return { success: false, error: 'A transfer is already in progress.' };
    busy.current = true;
    setIsTransferring(true); setError(null); setTransactionHash(null);
    try {
      if (status !== 'ready' || !walletAddress) throw new Error('Sign in before sending.');
      if (params.fromAddress && params.fromAddress !== walletAddress) throw new Error('The sender does not match the signed-in wallet.');
      // UI resolves and explicitly confirms phone recipients before this signing boundary.
      const recipient = new PublicKey(params.recipientAddressOrPhone).toBase58();
      setStatusMessage('Preparing USDC transfer…');
      const prepared = params.prepared ?? await prepareUsdcTransfer(walletAddress, recipient, params.amountUsdc ?? 0);
      if (!prepared.tx.feePayer?.equals(new PublicKey(walletAddress))) throw new Error('Prepared transfer wallet mismatch. Review the recipient again.');
      const { signature } = await sendAndConfirm(prepared.tx, { walletAddress, signTransaction }, { prepared, onStatus: setStatusMessage });
      setTransactionHash(signature);
      return { success: true, transactionHash: signature, recipientAddress: recipient };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transfer failed. Please retry.';
      setError(message); return { success: false, error: message };
    } finally { busy.current = false; setIsTransferring(false); setStatusMessage(''); }
  }, [status, walletAddress, signTransaction]);
  return { isTransferring, error, transactionHash, statusMessage, isWalletReady: status === 'ready' && !!walletAddress, needsRecovery: false, walletStatus: status, senderAddress: walletAddress, transfer };
}
