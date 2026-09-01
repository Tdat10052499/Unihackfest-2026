import { Connection, PublicKey } from '@solana/web3.js';
import { SolanaNetwork } from '../stores/useNetworkStore';

// Helius API Key (ưu tiên từ biến môi trường)
const HELIUS_API_KEY = process.env.EXPO_PUBLIC_HELIUS_API_KEY || '';

// USDC Mint chuẩn trên các cụm mạng Solana
export const USDC_DEVNET_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const USDC_MAINNET_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

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

  // Devnet
  if (process.env.EXPO_PUBLIC_HELIUS_DEVNET_URL) {
    return process.env.EXPO_PUBLIC_HELIUS_DEVNET_URL;
  }
  if (HELIUS_API_KEY) {
    return `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  }
  return process.env.EXPO_PUBLIC_SOLANA_DEVNET_RPC || process.env.EXPO_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
}

// Bộ nhớ đệm Connection instances tránh tạo lại liên tục
const connectionCache: Record<SolanaNetwork, Connection | null> = {
  devnet: null,
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
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
    throw new Error('Owner must be on curve');
  }

  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId
  );

  return address;
}

/**
 * fetchUsdcBalance: Truy xuất chính xác số dư USDC thực tế từ on-chain qua Helius RPC
 * - Hoàn toàn không phụ thuộc vào số dư Native SOL hay quy đổi ảo.
 * - Trả về 0 nếu tài khoản chưa có ATA hoặc số dư là 0.
 */
export async function fetchUsdcBalance(
  walletAddress: string,
  network: SolanaNetwork = 'devnet'
): Promise<number> {
  if (!walletAddress) return 0;
  try {
    const connection = getHeliusConnection(network);
    const ownerPubkey = new PublicKey(walletAddress);
    const usdcMint = getUsdcMint(network);

    // 1. Tính toán địa chỉ ATA
    const ataAddress = getAssociatedTokenAddress(usdcMint, ownerPubkey);

    // 2. Thử truy vấn số dư ATA trực tiếp
    try {
      const balanceResponse = await connection.getTokenAccountBalance(ataAddress, 'confirmed');
      if (balanceResponse?.value?.uiAmount !== null && balanceResponse?.value?.uiAmount !== undefined) {
        return balanceResponse.value.uiAmount;
      }
    } catch (ataErr: any) {
      const msg = ataErr?.message || '';
      if (msg.includes('could not find account') || msg.includes('Invalid param') || msg.includes('AccountNotFound')) {
        return 0;
      }
    }

    // 3. Fallback: Lấy danh sách parsed token accounts theo mint
    const parsedAccounts = await connection.getParsedTokenAccountsByOwner(
      ownerPubkey,
      { mint: usdcMint },
      'confirmed'
    );

    if (parsedAccounts.value && parsedAccounts.value.length > 0) {
      const tokenAmount = parsedAccounts.value[0].account.data.parsed.info.tokenAmount;
      return tokenAmount.uiAmount || 0;
    }

    return 0;
  } catch (err: any) {
    console.warn(`⚠️ [fetchUsdcBalance] Lỗi truy vấn số dư USDC (${network}):`, err?.message);
    return 0;
  }
}
