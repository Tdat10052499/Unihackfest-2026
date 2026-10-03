// Generic sign → send → confirm for every app transaction (non-ui-plan N1; flow from useOnchainTransfer, fixes B3).
import { PublicKey, type Connection, type Transaction } from '@solana/web3.js';
import { prepareTransactionCost } from '../identity/transactionCost.ts';
import { getConnection } from '../config.ts';
import { TxFailedError, UserFacingError } from './errors.ts';

export type SendStatus = 'Confirm in your wallet…' | 'Waiting for confirmation…';

export interface SendAuth {
  walletAddress: string | null | undefined;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

/** Output of prepareTransactionCost, when the caller already prepared (and showed) the cost. */
export interface PreparedCost {
  fee: number;
  rent: number;
  total: number;
  blockhash: string;
  lastValidBlockHeight: number;
}

export interface SendOptions {
  /** Lamports of rent the transaction creates (accounts it opens). Ignored when `prepared` is given. */
  rent?: number;
  onStatus?: (status: SendStatus) => void;
  /** Skip step 1 and reuse this blockhash and cost. */
  prepared?: PreparedCost;
  connection?: Connection;
}

export interface SendResult {
  signature: string;
  fee: number;
  rent: number;
}

/** Wallets with a transaction between sign and confirm; blocks a double submit. */
const inFlight = new Set<string>();

export async function sendAndConfirm(tx: Transaction, auth: SendAuth, opts: SendOptions = {}): Promise<SendResult> {
  const { walletAddress, signTransaction } = auth;
  if (!walletAddress) throw new UserFacingError('Sign in before sending.');
  if (inFlight.has(walletAddress)) throw new UserFacingError('Another transaction is still in progress.');
  inFlight.add(walletAddress);
  const conn = opts.connection ?? getConnection();
  try {
    // 1. Blockhash, fee payer and real fee
    const cost = opts.prepared ?? (await prepareTransactionCost(conn, tx, walletAddress, opts.rent ?? 0));
    // 2. SOL for fee + rent
    const sol = await conn.getBalance(new PublicKey(walletAddress), 'confirmed');
    if (sol < cost.total) throw new UserFacingError('Not enough devnet SOL for network fee and account rent.');
    // 3. Sign
    opts.onStatus?.('Confirm in your wallet…');
    const signed = await signTransaction(tx);
    // 4. Send
    const signature = await conn.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
    // 5. Confirm against the blockhash the transaction was signed with
    opts.onStatus?.('Waiting for confirmation…');
    const confirmation = await conn.confirmTransaction(
      { signature, blockhash: cost.blockhash, lastValidBlockHeight: cost.lastValidBlockHeight },
      'confirmed'
    );
    // 6. A confirmed transaction can still have failed
    if (confirmation.value.err) throw new TxFailedError(signature, confirmation.value.err);
    return { signature, fee: cost.fee, rent: cost.rent };
  } finally {
    inFlight.delete(walletAddress);
  }
}
