import { useState, useCallback } from 'react';
import {
  usePrivy,
  useEmbeddedSolanaWallet,
  useEmbeddedWallet,
  useRecoverEmbeddedWallet,
} from '@privy-io/expo';
import { executeSolanaTransfer, TransferResult } from '@/services/solana';

export interface TransferParams {
  fromAddress?: string;
  recipientAddressOrPhone: string;
  amountSol: number;
}

export interface UseTransferTokenReturn {
  transfer: (params: TransferParams) => Promise<TransferResult>;
  recoverWallet: (method?: 'privy' | 'google-drive') => Promise<boolean>;
  isTransferring: boolean;
  isRecovering: boolean;
  statusMessage: string;
  isWalletReady: boolean;
  needsRecovery: boolean;
  walletStatus: string;
  senderAddress: string | null;
}

/**
 * Custom hook chuẩn hóa luồng chuyển token Web3 On-chain trên Solana Devnet
 * - Đồng bộ 100% giữa Chuyển tiền tiêu chuẩn, SendModal và Shake to Split
 * - Tự động kiểm tra tính sẵn sàng (isReady, status === 'connected') và Recovery state của Privy
 * - Quản lý trạng thái loading, phục hồi ví sau khi factory reset và phản hồi người dùng mượt mà
 */
export function useTransferToken(): UseTransferTokenReturn {
  const { isReady, user, getAccessToken, logout } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const embeddedWalletState = useEmbeddedWallet();
  const { recover } = useRecoverEmbeddedWallet();

  const [isTransferring, setIsTransferring] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const status = solanaWalletState?.status || 'disconnected';
  const wallets = solanaWalletState?.wallets || [];
  const needsRecovery = Boolean(
    status === 'needs-recovery' ||
    embeddedWalletState?.status === 'needs-recovery' ||
    (solanaWalletState as any)?.needsRecovery === true ||
    (embeddedWalletState as any)?.needsRecovery === true
  );

  const isWalletReady = Boolean(
    isReady &&
    user &&
    !needsRecovery &&
    (status === 'connected' || wallets.length > 0) &&
    wallets.length > 0
  );

  const getSenderAddress = useCallback((): string | null => {
    if (!user) return null;
    if (wallets.length > 0 && wallets[0]?.address) {
      return wallets[0].address;
    }
    const linkedAccounts =
      (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const solanaAccount = linkedAccounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    return solanaAccount?.address || null;
  }, [user, wallets]);

  const transfer = useCallback(
    async (params: {
      recipientAddressOrPhone: string;
      amountSol: number;
      fromAddress?: string;
    }): Promise<TransferResult> => {
      const from = params.fromAddress || getSenderAddress();

      if (!isReady || !user) {
        return {
          success: false,
          error: 'Tài khoản chưa sẵn sàng. Vui lòng đăng nhập lại.',
        };
      }

      // 0. Bắt buộc kiểm tra Access Token hợp lệ của Privy trước khi giao dịch
      try {
        const token =
          typeof getAccessToken === 'function' ? await getAccessToken() : null;
        if (!token) {
          console.warn(
            '⚠️ [useTransferToken] Missing or expired access token, calling logout'
          );
          if (typeof logout === 'function') {
            await logout().catch((e) => console.log('Logout error ignored:', e));
          }
          return {
            success: false,
            error: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
          };
        }
      } catch (tokenErr: any) {
        console.error('⚠️ [useTransferToken] Token check failed:', tokenErr);
        if (typeof logout === 'function') {
          await logout().catch((e) => console.log('Logout error ignored:', e));
        }
        return {
          success: false,
          error: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
        };
      }

      // 1. Bắt buộc kiểm tra Embedded Wallet trong linkedAccounts
      const linkedAccounts =
        (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
      console.log(
        '🔍 [Privy LinkedAccounts]:',
        JSON.stringify(linkedAccounts, null, 2)
      );

      const hasValidPrivyWallet = linkedAccounts.some(
        (acc: any) =>
          acc.type === 'wallet' &&
          (acc.wallet_client_type === 'privy' ||
            acc.walletClientType === 'privy' ||
            acc.connector_type === 'embedded' ||
            acc.connectorType === 'embedded')
      );

      if (!hasValidPrivyWallet && wallets.length === 0) {
        return {
          success: false,
          error: 'Không tìm thấy ví hợp lệ',
        };
      }

      if (!from) {
        return {
          success: false,
          error: 'Không tìm thấy địa chỉ ví nguồn của tài khoản.',
        };
      }

      if (wallets.length === 0) {
        return {
          success: false,
          error: `Ví nhúng đang ở trạng thái (${status}). Vui lòng chờ 2-3 giây để kết nối hoàn tất!`,
        };
      }

      setIsTransferring(true);
      setStatusMessage('Đang khởi tạo giao dịch...');

      try {
        // Tạo khoảng nghỉ 800ms để WebView của Android sẵn sàng
        await new Promise((resolve) => setTimeout(resolve, 800));

        const activeWallet = wallets[0];
        const result = await executeSolanaTransfer({
          fromAddress: from,
          toAddressOrPhone: params.recipientAddressOrPhone,
          amountSol: params.amountSol,
          walletProvider: activeWallet,
          onStatusUpdate: (msg) => setStatusMessage(msg),
        });

        setIsTransferring(false);
        setStatusMessage('');
        return result;
      } catch (err: any) {
        setIsTransferring(false);
        setStatusMessage('');
        return {
          success: false,
          error: err?.message || 'Không thể hoàn tất giao dịch Web3 On-chain.',
        };
      }
    },
    [isReady, user, wallets, status, getSenderAddress]
  );

  const recoverWallet = useCallback(
    async (method: 'privy' | 'google-drive' = 'privy'): Promise<boolean> => {
      setIsRecovering(true);
      setStatusMessage('Đang khôi phục khóa ví bảo mật...');

      try {
        if (typeof recover === 'function') {
          await recover({ recoveryMethod: method });
        } else if (typeof (solanaWalletState as any)?.recover === 'function') {
          await (solanaWalletState as any).recover();
        }
        setIsRecovering(false);
        setStatusMessage('');
        return true;
      } catch (err: any) {
        console.error('Lỗi khi khôi phục ví:', err);
        setIsRecovering(false);
        setStatusMessage('');
        return false;
      }
    },
    [recover, solanaWalletState]
  );

  return {
    transfer,
    recoverWallet,
    isTransferring,
    isRecovering,
    statusMessage,
    isWalletReady,
    needsRecovery,
    walletStatus: status,
    senderAddress: getSenderAddress(),
  };
}
