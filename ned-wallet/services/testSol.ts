// Test SOL for network fees from the public devnet faucet (requestAirdrop). The Helius / Dynamic RPC may not support
// airdrops, so this always uses the public endpoint. Shared by the onboarding fund screen and Add USDC.
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export const PUBLIC_DEVNET_RPC = 'https://api.devnet.solana.com';

/** Requests `lamports` (default 1 SOL) and waits for confirmation; throws on failure */
export async function requestTestSol(wallet: string, lamports: number = LAMPORTS_PER_SOL): Promise<void> {
  const faucet = new Connection(PUBLIC_DEVNET_RPC, 'confirmed');
  const signature = await faucet.requestAirdrop(new PublicKey(wallet), lamports);
  await faucet.confirmTransaction(signature, 'confirmed');
}

/** The faucet's daily limit or an empty faucet (429, "limit", "dry") */
export const testSolBusy = (err: unknown): boolean => /429|limit|dry/i.test(err instanceof Error ? err.message : String(err));
