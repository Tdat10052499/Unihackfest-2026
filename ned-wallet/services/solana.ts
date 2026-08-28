import { Connection, PublicKey } from '@solana/web3.js';

export const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';

export const solanaConnection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');

export async function getSolanaBalance(address: string): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    const lamports = await solanaConnection.getBalance(publicKey);
    return lamports / 1000000000;
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
    throw error;
  }
}
