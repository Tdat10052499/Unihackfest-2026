import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  Commitment,
  ConfirmOptions,
} from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { IDL, type NedProgram } from '../idl/ned_program';
import { PROGRAM_ID } from '../constants/chain';
import { DEVNET_RPC_URL, connection as devnetConnection } from './chain/connection';

// Endpoint and program ID come from services/chain/connection.ts and constants/chain.ts; re-exported for old callers.
export { DEVNET_RPC_URL, PROGRAM_ID };
export const DEFAULT_PROGRAM_ID_STR = IDL.address;

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
 * Cấu hình xác nhận giao dịch mặc định
 */
export const DEFAULT_CONFIRM_OPTIONS: ConfirmOptions = {
  preflightCommitment: 'confirmed',
  commitment: 'confirmed',
};

/**
 * Kết nối devnet dùng chung; chỉ tạo Connection riêng khi truyền endpoint khác
 */
let customConnection: Connection | null = null;

export function getConnection(
  customEndpoint?: string,
  commitment: Commitment = 'confirmed'
): Connection {
  if (!customEndpoint || customEndpoint === DEVNET_RPC_URL) return devnetConnection;
  if (!customConnection || customConnection.rpcEndpoint !== customEndpoint) {
    customConnection = new Connection(customEndpoint, commitment);
  }
  return customConnection;
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

  const baseIdl = IDL;
  // Khởi tạo Program với IDL đã đồng bộ và target Program ID
  const idlWithAddress = {
    ...baseIdl,
    address: targetProgramId.toBase58(),
  } as unknown as NedProgram;

  return new Program<NedProgram>(idlWithAddress, provider);
}

// Re-export types
export { IDL };
export type { NedProgram };
