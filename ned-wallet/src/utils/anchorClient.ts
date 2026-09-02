import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  Commitment,
  ConfirmOptions,
} from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import nedProgramIdl, { IDL, NedProgram, UserProfileData } from '../idl/ned_program';

/**
 * Endpoint mặc định kết nối Solana Devnet
 * Ưu tiên Helius Devnet RPC từ biến môi trường, fallback về public devnet RPC
 */
export const DEVNET_RPC_URL: string =
  process.env.EXPO_PUBLIC_HELIUS_DEVNET_URL ||
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL ||
  'https://api.devnet.solana.com';

/**
 * Program ID của Smart Contract `ned_program`
 * Đọc linh hoạt từ EXPO_PUBLIC_ANCHOR_PROGRAM_ID với fallback là địa chỉ đã deploy
 */
export const DEFAULT_PROGRAM_ID_STR = '8tTSP75q3ggaxQiZdeC4LShcyjHN5yWJY4NnZeE3JaEi';

function resolveProgramId(): PublicKey {
  const envProgramId = process.env.EXPO_PUBLIC_ANCHOR_PROGRAM_ID;
  if (!envProgramId) {
    console.warn(
      `[AnchorClient] Cảnh báo: Biến EXPO_PUBLIC_ANCHOR_PROGRAM_ID chưa được định nghĩa trong .env. Sử dụng mặc định: ${DEFAULT_PROGRAM_ID_STR}`
    );
  }
  const idStr = envProgramId?.trim() || DEFAULT_PROGRAM_ID_STR;
  try {
    return new PublicKey(idStr);
  } catch (error) {
    console.error(
      `[AnchorClient] Lỗi: Địa chỉ Program ID "${idStr}" không hợp lệ. Fallback về ${DEFAULT_PROGRAM_ID_STR}`
    );
    return new PublicKey(DEFAULT_PROGRAM_ID_STR);
  }
}

export const PROGRAM_ID: PublicKey = resolveProgramId();

/**
 * Interface chuẩn cho ví tương thích Anchor trong môi trường Mobile
 */
export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

/**
 * Ví Read-Only phục vụ truy vấn dữ liệu on-chain khi người dùng chưa kết nối ví
 */
export class ReadOnlyWallet implements AnchorWallet {
  public publicKey: PublicKey;

  constructor(publicKey?: PublicKey) {
    this.publicKey = publicKey ?? PublicKey.default;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(_tx: T): Promise<T> {
    throw new Error('[AnchorClient] ReadOnlyWallet không thể ký transaction. Vui lòng kết nối ví.');
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(_txs: T[]): Promise<T[]> {
    throw new Error('[AnchorClient] ReadOnlyWallet không thể ký transactions. Vui lòng kết nối ví.');
  }
}

/**
 * Helper: Chuyển đổi trạng thái ví Solana của Privy thành AnchorWallet
 */
export function createPrivyAnchorWallet(solanaWalletState: any): AnchorWallet | null {
  const wallets = solanaWalletState?.wallets || [];
  if (wallets.length === 0) return null;
  const activeWallet = wallets[0];
  if (!activeWallet?.address) return null;

  try {
    const publicKey = new PublicKey(activeWallet.address);

    const anchorWallet: AnchorWallet = {
      publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
        let activeProvider: any = null;
        if (typeof solanaWalletState?.getProvider === 'function') {
          try {
            activeProvider = await solanaWalletState.getProvider();
          } catch (e) {}
        }
        if (!activeProvider && typeof activeWallet?.getProvider === 'function') {
          activeProvider = await activeWallet.getProvider();
        }
        if (!activeProvider) {
          activeProvider = activeWallet;
        }

        if (typeof activeProvider?.request === 'function') {
          const signResult = await activeProvider.request({
            method: 'signTransaction',
            params: { transaction: tx },
          });
          return (signResult?.signedTransaction || tx) as T;
        }

        if (typeof activeWallet?.signTransaction === 'function') {
          return (await activeWallet.signTransaction(tx)) as T;
        }

        throw new Error('Không thể khởi tạo provider để ký giao dịch.');
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
        const signed: T[] = [];
        for (const tx of txs) {
          signed.push(await anchorWallet.signTransaction(tx));
        }
        return signed;
      },
    };

    return anchorWallet;
  } catch (err) {
    console.error('[createPrivyAnchorWallet] Lỗi tạo AnchorWallet:', err);
    return null;
  }
}

/**
 * Cấu hình xác nhận giao dịch mặc định
 */
export const DEFAULT_CONFIRM_OPTIONS: ConfirmOptions = {
  preflightCommitment: 'confirmed',
  commitment: 'confirmed',
};

/**
 * Khởi tạo kết nối Solana Connection đơn lẻ (Singleton-friendly)
 */
let cachedConnection: Connection | null = null;

export function getConnection(
  customEndpoint?: string,
  commitment: Commitment = 'confirmed'
): Connection {
  const endpoint = customEndpoint || DEVNET_RPC_URL;
  if (!cachedConnection || cachedConnection.rpcEndpoint !== endpoint) {
    cachedConnection = new Connection(endpoint, commitment);
  }
  return cachedConnection;
}

/**
 * Khởi tạo AnchorProvider
 * @param wallet Ví người dùng (hoặc ReadOnlyWallet nếu chỉ đọc)
 * @param connection Kết nối Solana tùy chọn
 * @param opts Cấu hình confirm
 */
export function getAnchorProvider(
  wallet?: AnchorWallet,
  connection?: Connection,
  opts: ConfirmOptions = DEFAULT_CONFIRM_OPTIONS
): AnchorProvider {
  const activeConnection = connection || getConnection();
  const activeWallet = wallet || new ReadOnlyWallet();
  return new AnchorProvider(activeConnection, activeWallet, opts);
}

/**
 * Khởi tạo Program Client cho `ned_program`
 * @param providerOrWallet AnchorProvider hoặc AnchorWallet
 * @param customProgramId Program ID tùy chỉnh (nếu có)
 */
export function getProgram(
  providerOrWallet?: AnchorProvider | AnchorWallet,
  customProgramId?: PublicKey
): Program<NedProgram> {
  const targetProgramId = customProgramId || PROGRAM_ID;
  let provider: AnchorProvider;

  if (providerOrWallet instanceof AnchorProvider) {
    provider = providerOrWallet;
  } else {
    provider = getAnchorProvider(providerOrWallet);
  }

  const baseIdl = IDL || nedProgramIdl;
  // Khởi tạo Program với IDL đã đồng bộ và target Program ID
  const idlWithAddress: NedProgram = {
    ...baseIdl,
    address: targetProgramId.toBase58(),
  };

  return new Program<NedProgram>(idlWithAddress, provider);
}

/**
 * Helper: Tính toán địa chỉ PDA cho `UserProfile`
 * Seeds: [b"profile", owner.key()]
 */
export function deriveUserProfilePda(
  owner: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('profile'), owner.toBuffer()],
    programId
  );
}

// Re-export types
export { nedProgramIdl as IDL };
export type { NedProgram, UserProfileData };
