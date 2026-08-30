import { useState, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { usePrivy, useEmbeddedSolanaWallet, useEmbeddedWallet } from '@privy-io/expo';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { lookupWalletByPhone } from '../services/supabase';

export const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';

export const solanaConnection = new Connection(SOLANA_DEVNET_RPC, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 30000,
});

export interface OnchainTransferParams {
  recipientAddressOrPhone: string;
  amountSol: number;
  fromAddress?: string;
}

export interface OnchainTransferResult {
  success: boolean;
  transactionHash?: string;
  recipientAddress?: string;
  error?: string;
}

export interface UseOnchainTransferReturn {
  isTransferring: boolean;
  error: string | null;
  transactionHash: string | null;
  statusMessage: string;
  isWalletReady: boolean;
  needsRecovery: boolean;
  walletStatus: string;
  senderAddress: string | null;
  transfer: (params: OnchainTransferParams) => Promise<OnchainTransferResult>;
}

/**
 * Custom Hook Giao Dịch Core 100% On-chain trên Solana Devnet
 * - Hỗ trợ cả Chuyển tiền tiêu chuẩn, Transfer Hub và Shake to Split
 * - Tự động phân giải SĐT -> Địa chỉ ví Solana từ Supabase
 * - Bọc InteractionManager + 1000ms delay bảo vệ Main Thread và WebView trên Android
 */
export function useOnchainTransfer(): UseOnchainTransferReturn {
  const { isReady, user, getAccessToken, logout } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const embeddedWalletState = useEmbeddedWallet();

  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
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
    async (params: OnchainTransferParams): Promise<OnchainTransferResult> => {
      setError(null);
      setTransactionHash(null);

      const from = params.fromAddress || getSenderAddress();

      // 1. Kiểm tra tính sẵn sàng của phiên người dùng
      if (!isReady || !user) {
        const err = 'Tài khoản chưa sẵn sàng. Vui lòng đăng nhập lại.';
        setError(err);
        return { success: false, error: err };
      }

      // 2. Bắt buộc kiểm tra Access Token hợp lệ của Privy trước khi ký
      try {
        const token =
          typeof getAccessToken === 'function' ? await getAccessToken() : null;
        if (!token) {
          console.warn('⚠️ [useOnchainTransfer] Missing access token, calling logout...');
          if (typeof logout === 'function') {
            await logout().catch((e) => console.log('Logout error ignored:', e));
          }
          const err = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
          setError(err);
          return { success: false, error: err };
        }
      } catch (tokenErr: any) {
        console.error('⚠️ [useOnchainTransfer] Token check failed:', tokenErr);
        if (typeof logout === 'function') {
          await logout().catch((e) => console.log('Logout error ignored:', e));
        }
        const err = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
        setError(err);
        return { success: false, error: err };
      }

      if (!from) {
        const err = 'Không tìm thấy địa chỉ ví nguồn của tài khoản.';
        setError(err);
        return { success: false, error: err };
      }

      if (wallets.length === 0) {
        const err = `Ví nhúng đang ở trạng thái (${status}). Vui lòng chờ vài giây để kết nối hoàn tất!`;
        setError(err);
        return { success: false, error: err };
      }

      const inputRecipient = params.recipientAddressOrPhone.trim();
      if (!inputRecipient) {
        const err = 'Vui lòng nhập địa chỉ ví hoặc số điện thoại người nhận.';
        setError(err);
        return { success: false, error: err };
      }

      const amountSol = params.amountSol;
      if (isNaN(amountSol) || amountSol <= 0) {
        const err = 'Số lượng SOL chuyển phải lớn hơn 0.';
        setError(err);
        return { success: false, error: err };
      }

      setIsTransferring(true);
      setStatusMessage('Đang phân giải địa chỉ người nhận...');

      try {
        // 3. Phân giải SĐT -> Địa chỉ ví Solana từ Supabase nếu cần
        let finalToAddress = inputRecipient;
        const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(inputRecipient);

        if (!isSolanaBase58) {
          setStatusMessage('Đang tra cứu ví từ số điện thoại...');
          const lookedUp = await lookupWalletByPhone(inputRecipient);
          if (!lookedUp) {
            setIsTransferring(false);
            setStatusMessage('');
            const err = `Không tìm thấy ví nào liên kết với số điện thoại ${inputRecipient}.`;
            setError(err);
            return { success: false, error: err };
          }
          finalToAddress = lookedUp;
        }

        // 4. Validate PublicKeys
        let fromPubkey: PublicKey;
        let toPubkey: PublicKey;
        try {
          fromPubkey = new PublicKey(from);
          toPubkey = new PublicKey(finalToAddress);
        } catch (e: any) {
          setIsTransferring(false);
          setStatusMessage('');
          const err = 'Địa chỉ ví Solana không hợp lệ.';
          setError(err);
          return { success: false, error: err };
        }

        setStatusMessage('Đang khởi tạo giao dịch On-chain...');

        // 5. Xây dựng giao dịch On-chain tiêu chuẩn
        const sendLamports = Math.round(amountSol * LAMPORTS_PER_SOL);
        const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed');

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: sendLamports,
          })
        );
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        setStatusMessage('Đang chuẩn bị ký giao dịch bảo mật...');

        // 6. QUY TẮC SINH TỬ CHO ANDROID: Bọc trong InteractionManager + 1000ms delay giải phóng Main Thread
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => {
            setTimeout(resolve, 1000);
          });
        });

        setStatusMessage('Đang ký giao dịch trên ví bảo mật...');
        const activeWallet = wallets[0];
        let activeProvider: any = null;
        if (typeof (solanaWalletState as any)?.getProvider === 'function') {
          try {
            activeProvider = await (solanaWalletState as any).getProvider();
          } catch (e) {
            console.log('solanaWalletState.getProvider fallback to activeWallet:', e);
          }
        }
        if (!activeProvider && typeof (activeWallet as any)?.getProvider === 'function') {
          activeProvider = await (activeWallet as any).getProvider();
        }
        if (!activeProvider) {
          activeProvider = activeWallet;
        }

        if (!activeProvider || typeof activeProvider.request !== 'function') {
          throw new Error('Không thể khởi tạo provider ví Solana để ký giao dịch.');
        }

        let signResult: any = null;
        try {
          signResult = await activeProvider.request({
            method: 'signTransaction',
            params: { transaction },
          });
        } catch (signErr: any) {
          console.warn('⚠️ Lần ký thứ nhất gặp sự cố, thử lại:', signErr?.message);
          if (
            signErr?.message?.includes('timeout') ||
            signErr?.message?.includes('user-signer') ||
            signErr?.message?.includes('WebView') ||
            signErr?.message?.includes('ready')
          ) {
            await new Promise((r) => setTimeout(r, 1200));
            if (typeof (solanaWalletState as any)?.getProvider === 'function') {
              try {
                activeProvider = await (solanaWalletState as any).getProvider();
              } catch (_) {}
            }
            if (!activeProvider && typeof (activeWallet as any)?.getProvider === 'function') {
              activeProvider = await (activeWallet as any).getProvider();
            }
            const freshBlock = await solanaConnection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = freshBlock.blockhash;
            signResult = await activeProvider.request({
              method: 'signTransaction',
              params: { transaction },
            });
          } else {
            throw signErr;
          }
        }

        const signedTransaction = signResult?.signedTransaction;
        if (!signedTransaction) {
          throw new Error('Không nhận được chữ ký giao dịch từ ví.');
        }

        setStatusMessage('Đang phát sóng lên mạng Solana Devnet...');
        const rawTx = signedTransaction.serialize();
        const txSignature = await solanaConnection.sendRawTransaction(rawTx, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        console.log('⚡ [On-chain Broadcasted] TxSignature:', txSignature);

        setStatusMessage('Đang chờ Solana xác nhận giao dịch...');
        await solanaConnection.confirmTransaction(txSignature, 'confirmed');
        console.log('✅ [On-chain Confirmed] Receipt confirmed on Solana Devnet:', txSignature);

        setTransactionHash(txSignature);
        setIsTransferring(false);
        setStatusMessage('');

        return {
          success: true,
          transactionHash: txSignature,
          recipientAddress: finalToAddress,
        };
      } catch (err: any) {
        setIsTransferring(false);
        setStatusMessage('');
        const errStr = err?.message || 'Giao dịch on-chain không thành công.';
        setError(errStr);
        return {
          success: false,
          error: errStr,
        };
      }
    },
    [isReady, user, wallets, status, getSenderAddress, getAccessToken, logout]
  );

  return {
    isTransferring,
    error,
    transactionHash,
    statusMessage,
    isWalletReady,
    needsRecovery,
    walletStatus: status,
    senderAddress: getSenderAddress(),
    transfer,
  };
}
