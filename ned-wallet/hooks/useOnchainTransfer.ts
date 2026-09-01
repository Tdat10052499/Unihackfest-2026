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
import { Buffer } from 'buffer';
import { lookupWalletByPhone } from '../services/identity';
import {
  solanaConnection,
  USDC_DEVNET_MINT,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSplTokenTransferInstruction,
  getUsdcTokenBalance,
  getSolanaBalance,
} from '../services/solana';

export interface OnchainTransferParams {
  recipientAddressOrPhone: string;
  amountUsd?: number;
  amountSol?: number;
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
 * Custom Hook Giao Dịch Core 100% On-chain:
 * - Tự động phát hiện tài sản (USDC SPL Token hoặc SOL Devnet)
 * - Tự động tra cứu tài khoản nhận từ số điện thoại qua Supabase
 * - Tự động khởi tạo Associated Token Account (ATA) cho người nhận nếu chưa có
 * - Ký xác nhận bảo mật và phát sóng trực tiếp lên Solana Devnet
 * - Bọc InteractionManager bảo vệ Main Thread và WebView trên thiết bị
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
        const err = 'Không tìm thấy địa chỉ tài khoản nguồn.';
        setError(err);
        return { success: false, error: err };
      }

      if (wallets.length === 0) {
        const err = `Tài khoản đang ở trạng thái (${status}). Vui lòng chờ vài giây để hoàn tất kết nối!`;
        setError(err);
        return { success: false, error: err };
      }

      const inputRecipient = params.recipientAddressOrPhone.trim();
      if (!inputRecipient) {
        const err = 'Vui lòng nhập số điện thoại hoặc tài khoản người nhận.';
        setError(err);
        return { success: false, error: err };
      }

      const rawAmount = params.amountUsd ?? params.amountSol ?? 0;
      if (isNaN(rawAmount) || rawAmount <= 0) {
        const err = 'Số tiền chuyển phải lớn hơn 0.';
        setError(err);
        return { success: false, error: err };
      }

      setIsTransferring(true);
      setStatusMessage('Đang phân giải thông tin người nhận...');

      try {
        // 3. Phân giải SĐT -> Địa chỉ ví từ Supabase nếu cần
        let finalToAddress = inputRecipient;
        const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(inputRecipient);

        if (!isSolanaBase58) {
          setStatusMessage('Đang tra cứu tài khoản qua số điện thoại...');
          const lookedUp = await lookupWalletByPhone(inputRecipient);
          if (!lookedUp) {
            setIsTransferring(false);
            setStatusMessage('');
            const err = `Không tìm thấy tài khoản nào liên kết với số điện thoại ${inputRecipient}.`;
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
          const err = 'Địa chỉ tài khoản nhận không hợp lệ.';
          setError(err);
          return { success: false, error: err };
        }

        // Chặn tự chuyển tiền cho chính mình
        if (from === finalToAddress || fromPubkey.equals(toPubkey)) {
          setIsTransferring(false);
          setStatusMessage('');
          const err = 'Bạn không thể chuyển tiền đến tài khoản của chính mình.';
          setError(err);
          return { success: false, error: err };
        }

        setStatusMessage('Đang chuẩn bị lệnh chuyển On-chain...');

        // 5. Kiểm tra số dư on-chain của người gửi (USDC token vs SOL)
        const [senderUsdcBal, senderSolBal] = await Promise.all([
          getUsdcTokenBalance(from).catch(() => 0),
          getSolanaBalance(from).catch(() => 0),
        ]);

        const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed');
        const transaction = new Transaction();

        if (senderUsdcBal > 0 && senderUsdcBal >= rawAmount) {
          // Trường hợp 1: Người gửi có số dư token USDC -> Chuyển SPL Token USDC
          const sendUnits = Math.round(rawAmount * 1_000_000);
          const fromATA = getAssociatedTokenAddress(USDC_DEVNET_MINT, fromPubkey);
          const toATA = getAssociatedTokenAddress(USDC_DEVNET_MINT, toPubkey);

          const toAtaInfo = await solanaConnection.getAccountInfo(toATA, 'confirmed');
          if (!toAtaInfo) {
            console.log('ℹ️ [ATA] Tạo Associated Token Account cho người nhận...');
            transaction.add(
              createAssociatedTokenAccountInstruction(
                fromPubkey,
                toATA,
                toPubkey,
                USDC_DEVNET_MINT
              )
            );
          }

          transaction.add(
            createSplTokenTransferInstruction(
              fromATA,
              toATA,
              fromPubkey,
              sendUnits
            )
          );
        } else {
          // Trường hợp 2: Chuyển Native SOL tương đương
          const solToSend = params.amountSol !== undefined ? params.amountSol : (rawAmount / 150);
          const sendLamports = Math.round(solToSend * LAMPORTS_PER_SOL);

          if (senderSolBal < solToSend) {
            setIsTransferring(false);
            setStatusMessage('');
            const err = 'Số dư tài khoản không đủ để thực hiện chuyển tiền.';
            setError(err);
            return { success: false, error: err };
          }

          transaction.add(
            SystemProgram.transfer({
              fromPubkey,
              toPubkey,
              lamports: sendLamports,
            })
          );
        }

        transaction.feePayer = fromPubkey;
        transaction.recentBlockhash = blockhash;

        setStatusMessage('Đang chuẩn bị xác nhận...');

        // 6. QUY TẮC SINH TỬ CHO ANDROID: Bọc trong InteractionManager + 1000ms delay giải phóng Main Thread
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => {
            setTimeout(resolve, 1000);
          });
        });

        setStatusMessage('Đang xác nhận trên thiết bị...');
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
          throw new Error('Không thể khởi tạo provider để xác nhận giao dịch.');
        }

        // 7. Người dùng ký xác nhận giao dịch
        let signResult: any = null;
        try {
          signResult = await activeProvider.request({
            method: 'signTransaction',
            params: { transaction },
          });
        } catch (signErr: any) {
          console.warn('⚠️ Lần xác nhận thứ nhất gặp sự cố, thử lại:', signErr?.message);
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
          throw new Error('Không nhận được chữ ký xác nhận từ tài khoản.');
        }

        setStatusMessage('Đang phát sóng lên mạng lưới...');

        // 8. Phát sóng On-chain trực tiếp lên Solana Devnet
        const rawTx = signedTransaction.serialize();
        const txSignature = await solanaConnection.sendRawTransaction(rawTx, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        console.log('⚡ [On-chain Broadcasted] TxSignature:', txSignature);

        setStatusMessage('Đang chờ xác nhận giao dịch...');
        await solanaConnection.confirmTransaction(txSignature, 'confirmed');
        console.log('✅ [On-chain Confirmed] TxSignature:', txSignature);

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
        const errStr = err?.message || 'Chuyển tiền không thành công.';
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
