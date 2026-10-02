import { PublicKey, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createSplTokenTransferInstruction } from './solana';
import { USDC_DEVNET_MINT } from '../constants/chain';
import { connection as solanaConnection } from './chain/connection';
import { ata } from './chain/ata';
import { prepareTransactionCost } from './identity/transactionCost';

export type PreparedUsdcTransfer = Awaited<ReturnType<typeof prepareUsdcTransfer>>;

/** P2P is strictly USDC devnet. Never substitute an unrelated token account. */
export async function prepareUsdcTransfer(from: string, to: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 1e6))) throw new Error('Enter a valid USDC amount.');
  const owner = new PublicKey(from), recipient = new PublicKey(to);
  if (owner.equals(recipient)) throw new Error('You cannot send to your own wallet.');
  const source = ata(USDC_DEVNET_MINT, owner);
  const destination = ata(USDC_DEVNET_MINT, recipient);
  const [balance, target] = await Promise.all([
    solanaConnection.getTokenAccountBalance(source, 'confirmed'),
    solanaConnection.getAccountInfo(destination, 'confirmed'),
  ]);
  const units = Math.round(amount * 1e6);
  if (BigInt(balance.value.amount) < BigInt(units)) throw new Error('Not enough USDC.');
  const tx = new Transaction();
  let rent = 0;
  if (!target) {
    rent = await solanaConnection.getMinimumBalanceForRentExemption(165);
    tx.add(createAssociatedTokenAccountInstruction(owner, destination, recipient, USDC_DEVNET_MINT));
  }
  tx.add(createSplTokenTransferInstruction(source, destination, owner, units));
  return prepareTransactionCost(solanaConnection, tx, from, rent);
}
