import { PublicKey, Transaction, type Connection } from '@solana/web3.js';

export async function prepareTransactionCost(connection: Connection, tx: Transaction, wallet: string, rent = 0, refund = 0) {
  const latest = await connection.getLatestBlockhash('confirmed');
  tx.feePayer = new PublicKey(wallet);
  tx.recentBlockhash = latest.blockhash;
  const fee = (await connection.getFeeForMessage(tx.compileMessage(), 'confirmed')).value;
  if (fee === null) throw new Error('Network fee unavailable. Please retry.');
  return { tx, fee, rent, refund, total: fee + rent, ...latest };
}
export const solAmount = (lamports: number) => (lamports / 1e9).toFixed(9).replace(/0+$/, '').replace(/\.$/, '') || '0';
