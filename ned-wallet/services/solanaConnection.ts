import { Connection, PublicKey } from '@solana/web3.js';
import { SolanaNetwork } from '../stores/useNetworkStore';
import { ATA_PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DEVNET_MINT, USDC_MAINNET_MINT } from '../constants/chain';
import { DEVNET_RPC_URL, connection as devnetConnection } from './chain/connection';
import { ata } from './chain/ata';
import { fetchUsdcUnits, usdcNumberFromUnits } from './chain/balance';

// Helius API Key — chỉ dùng cho mainnet (devnet dùng services/chain/connection.ts)
const HELIUS_API_KEY = process.env.EXPO_PUBLIC_HELIUS_API_KEY || '';

// Re-exported under the old names; the values live in constants/chain.ts.
export { USDC_DEVNET_MINT, USDC_MAINNET_MINT, TOKEN_PROGRAM_ID };
export const ASSOCIATED_TOKEN_PROGRAM_ID = ATA_PROGRAM_ID;

/**
 * Lấy địa chỉ USDC Mint tương ứng với mạng đang chọn
 */
export function getUsdcMint(network: SolanaNetwork = 'devnet'): PublicKey {
  return network === 'mainnet-beta' ? USDC_MAINNET_MINT : USDC_DEVNET_MINT;
}

/**
 * Lấy URL RPC Helius chính thức cho từng mạng (ưu tiên biến môi trường)
 */
export function getHeliusRpcUrl(network: SolanaNetwork = 'devnet'): string {
  if (network === 'mainnet-beta') {
    if (process.env.EXPO_PUBLIC_HELIUS_MAINNET_URL) {
      return process.env.EXPO_PUBLIC_HELIUS_MAINNET_URL;
    }
    if (HELIUS_API_KEY) {
      return `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    }
    return process.env.EXPO_PUBLIC_SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';
  }

  // Devnet: one URL and one Connection for the app (services/chain/connection.ts)
  return DEVNET_RPC_URL;
}

// Bộ nhớ đệm Connection instances tránh tạo lại liên tục
const connectionCache: Record<SolanaNetwork, Connection | null> = {
  devnet: devnetConnection,
  'mainnet-beta': null,
};

/**
 * getHeliusConnection: Trả về đối tượng Connection của Solana Web3.js trỏ đến Helius RPC
 * @param network 'devnet' | 'mainnet-beta'
 */
export function getHeliusConnection(network: SolanaNetwork = 'devnet'): Connection {
  if (!connectionCache[network]) {
    const rpcUrl = getHeliusRpcUrl(network);
    connectionCache[network] = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000,
    });
  }
  return connectionCache[network]!;
}

/**
 * Tính toán địa chỉ Associated Token Account (ATA) theo chuẩn Solana Program Derived Address (PDA)
 */
export function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): PublicKey {
  return ata(mint, owner, { allowOwnerOffCurve, tokenProgram: programId, ataProgram: associatedTokenProgramId });
}

/**
 * fetchUsdcBalance: số dư USDC thực tế, chỉ đọc USDC ATA của ví (B1 — không cộng token khác),
 * tính từ base units nguyên. Trả về 0 nếu chưa có ATA.
 */
export async function fetchUsdcBalance(
  walletAddress: string,
  network: SolanaNetwork = 'devnet'
): Promise<number> {
  if (!walletAddress) return 0;
  try {
    const units = await fetchUsdcUnits(getHeliusConnection(network), new PublicKey(walletAddress), getUsdcMint(network));
    return usdcNumberFromUnits(units);
  } catch (err: any) {
    console.warn(`⚠️ [fetchUsdcBalance] Lỗi truy vấn số dư USDC (${network}):`, err?.message);
    return 0;
  }
}
