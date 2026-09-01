import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { useNetworkStore, SolanaNetwork } from '../stores/useNetworkStore';
import {
  MwaRequest,
  MwaResponse,
  MwaAuthorizeResponse,
  MwaSignTransactionsResponse,
  MWA_ERROR_CODES,
} from '../services/mwa/mwaProtocol';
import { validateClusterGuard } from '../services/mwa/clusterGuard';
import { MwaRequestModal } from '../components/mwa/MwaRequestModal';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';

interface MwaContextValue {
  pendingRequest: MwaRequest | null;
  activeNetwork: SolanaNetwork;
  simulateIncomingMwaRequest: <T = any>(request: MwaRequest) => Promise<MwaResponse<T>>;
  approveRequest: (request: MwaRequest) => Promise<void>;
  rejectRequest: (request: MwaRequest, reason?: string) => void;
}

const MwaContext = createContext<MwaContextValue | null>(null);

export function useMwa(): MwaContextValue {
  const ctx = useContext(MwaContext);
  if (!ctx) {
    throw new Error('useMwa must be used within a MwaProvider');
  }
  return ctx;
}

interface MwaProviderProps {
  children: ReactNode;
}

export const MwaProvider: React.FC<MwaProviderProps> = ({ children }) => {
  const { activeNetwork } = useNetworkStore();
  const [pendingRequest, setPendingRequest] = useState<MwaRequest | null>(null);
  const [resolverMap, setResolverMap] = useState<
    Map<string, { resolve: (res: MwaResponse) => void; reject: (err: any) => void }>
  >(new Map());

  let privy: any = null;
  try {
    privy = usePrivy();
  } catch {}
  const user = privy?.user || null;

  let solanaWalletState: any = null;
  try {
    solanaWalletState = useEmbeddedSolanaWallet();
  } catch {}

  const getSolanaAddress = (): string => {
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
    }
    const linkedAccounts = (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const solAccount = linkedAccounts.find(
      (acc: any) => acc.type === 'wallet' && (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    return solAccount?.address || '11111111111111111111111111111111';
  };

  /**
   * simulateIncomingMwaRequest: Cho phép các MiniApp bên trong gọi MWA bridge
   */
  const simulateIncomingMwaRequest = useCallback(
    <T = any>(request: MwaRequest): Promise<MwaResponse<T>> => {
      return new Promise((resolve, reject) => {
        // 1. Kiểm tra Cluster Guard trước khi hiển thị Modal
        const clusterCheck = validateClusterGuard(request.cluster, activeNetwork);

        if (!clusterCheck.isValid) {
          // Lập tức từ chối và trả về mã lỗi Cluster Mismatch
          resolve({
            id: request.id,
            success: false,
            error: clusterCheck.error,
          });
          return;
        }

        setResolverMap((prev) => {
          const updated = new Map(prev);
          updated.set(request.id, { resolve, reject });
          return updated;
        });

        setPendingRequest(request);
      });
    },
    [activeNetwork]
  );

  /**
   * approveRequest: Chấp nhận yêu cầu MWA và trả về kết quả
   */
  const approveRequest = useCallback(
    async (request: MwaRequest) => {
      const walletAddress = getSolanaAddress();
      const handler = resolverMap.get(request.id);

      if (request.type === 'authorize') {
        const authResponse: MwaAuthorizeResponse = {
          auth_token: `ned_auth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          accounts: [
            {
              address: walletAddress,
              label: 'N.E.D Main Wallet',
            },
          ],
          wallet_icon: 'https://ned.finance/icon.png',
        };

        if (handler) {
          handler.resolve({
            id: request.id,
            success: true,
            result: authResponse,
          });
        }
      } else if (
        request.type === 'sign_transactions' ||
        request.type === 'sign_and_send_transactions'
      ) {
        // Giả lập kết quả ký giao dịch
        const signResponse: MwaSignTransactionsResponse = {
          signed_payloads: (request as any).payloads || [],
        };

        if (handler) {
          handler.resolve({
            id: request.id,
            success: true,
            result: signResponse,
          });
        }
      } else {
        if (handler) {
          handler.resolve({
            id: request.id,
            success: true,
            result: { signed_payloads: (request as any).payloads || [] },
          });
        }
      }

      setResolverMap((prev) => {
        const updated = new Map(prev);
        updated.delete(request.id);
        return updated;
      });
      setPendingRequest(null);
    },
    [resolverMap, user, solanaWalletState]
  );

  /**
   * rejectRequest: Người dùng từ chối yêu cầu
   */
  const rejectRequest = useCallback(
    (request: MwaRequest, reason: string = 'User rejected request') => {
      const handler = resolverMap.get(request.id);
      if (handler) {
        handler.resolve({
          id: request.id,
          success: false,
          error: {
            code: MWA_ERROR_CODES.ERROR_USER_REJECTED,
            message: reason,
            activeNetwork,
            cluster: request.cluster,
          },
        });
      }

      setResolverMap((prev) => {
        const updated = new Map(prev);
        updated.delete(request.id);
        return updated;
      });
      setPendingRequest(null);
    },
    [resolverMap, activeNetwork]
  );

  // Lắng nghe Deep Linking cho MWA URL schemes (solana-wallet://, mwa://)
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        const parsed = Linking.parse(event.url);
        if (parsed.scheme === 'solana-wallet' || parsed.scheme === 'mwa' || parsed.path?.includes('mwa')) {
          console.log('⚡ [MWA Provider] Nhận được Deep Link MWA:', event.url);
          // Phân tích tham số MWA nếu có
          const clusterParam = (parsed.queryParams?.cluster as string) || 'devnet';
          const actionParam = (parsed.queryParams?.action as string) || 'authorize';
          const nameParam = (parsed.queryParams?.name as string) || 'External Solana dApp';

          simulateIncomingMwaRequest({
            id: `mwa_deeplink_${Date.now()}`,
            type: actionParam as any,
            cluster: clusterParam,
            identity: {
              name: nameParam,
              uri: (parsed.queryParams?.uri as string) || undefined,
            },
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.warn('⚠️ [MWA Provider] Lỗi xử lý Deep Link:', e);
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => sub.remove();
  }, [simulateIncomingMwaRequest]);

  return (
    <MwaContext.Provider
      value={{
        pendingRequest,
        activeNetwork,
        simulateIncomingMwaRequest,
        approveRequest,
        rejectRequest,
      }}
    >
      {children}

      {/* Modal Xử Lý Yêu Cầu MWA & Cluster Guard Filter */}
      <MwaRequestModal
        visible={pendingRequest !== null}
        request={pendingRequest}
        activeNetwork={activeNetwork}
        onApprove={approveRequest}
        onReject={rejectRequest}
      />
    </MwaContext.Provider>
  );
};
