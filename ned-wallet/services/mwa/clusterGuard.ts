import { SolanaNetwork } from '../../stores/useNetworkStore';
import { MWA_ERROR_CODES, MwaError } from './mwaProtocol';

/**
 * Chuẩn hóa tên cluster từ yêu cầu MWA (hỗ trợ cả chuẩn CAIP-2 solana:...)
 */
export function normalizeCluster(clusterStr?: string): SolanaNetwork | 'unsupported' {
  if (!clusterStr) return 'devnet';

  const lower = clusterStr.trim().toLowerCase();

  if (
    lower === 'devnet' ||
    lower === 'solana:devnet' ||
    lower === 'solana:etG7nnGGrRtqPnbfVQcD4BDo5s973dGeo'
  ) {
    return 'devnet';
  }

  if (
    lower === 'mainnet-beta' ||
    lower === 'mainnet' ||
    lower === 'solana:mainnet' ||
    lower === 'solana:mainnet-beta' ||
    lower === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
  ) {
    return 'mainnet-beta';
  }

  return 'unsupported';
}

export interface ClusterValidationResult {
  isValid: boolean;
  normalizedCluster?: SolanaNetwork;
  error?: MwaError;
}

/**
 * validateClusterGuard: Bộ lọc kiểm tra tính toàn vẹn của cụm mạng MWA
 * - Chặn ngay lập tức nếu MiniApp yêu cầu cụm mạng khác với `activeNetwork` hiện tại của ví.
 * - Cung cấp mã lỗi và thông báo trực quan cho người dùng.
 */
export function validateClusterGuard(
  requestedCluster: string | undefined,
  currentActiveNetwork: SolanaNetwork
): ClusterValidationResult {
  const normalized = normalizeCluster(requestedCluster);

  if (normalized === 'unsupported') {
    return {
      isValid: false,
      error: {
        code: MWA_ERROR_CODES.ERROR_CLUSTER_NOT_SUPPORTED,
        message: `Cụm mạng "${requestedCluster}" không được hỗ trợ bởi ví N.E.D. Chỉ hỗ trợ Devnet và Mainnet-Beta.`,
        cluster: requestedCluster,
        activeNetwork: currentActiveNetwork,
      },
    };
  }

  if (normalized !== currentActiveNetwork) {
    return {
      isValid: false,
      normalizedCluster: normalized,
      error: {
        code: MWA_ERROR_CODES.ERROR_CLUSTER_MISMATCH,
        message: `Môi trường mạng không khớp! Ví N.E.D đang hoạt động ở [${currentActiveNetwork.toUpperCase()}], nhưng MiniApp yêu cầu [${normalized.toUpperCase()}]. Vui lòng chuyển mạng trong Cài đặt để tiếp tục.`,
        cluster: requestedCluster,
        activeNetwork: currentActiveNetwork,
      },
    };
  }

  return {
    isValid: true,
    normalizedCluster: normalized,
  };
}
