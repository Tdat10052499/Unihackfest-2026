import { useState, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { PublicKey, Transaction } from '@solana/web3.js';
import { resolveIdentityOnchain } from '../services/identity';
import {
  solanaConnection,
  USDC_DEVNET_MINT,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSplTokenTransferInstruction,
  getUsdcTokenBalance,
  getSolanaBalance,
  TOKEN_PROGRAM_ID,
} from '../services/solana';
import { useAuth } from '../services/auth';

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
 * - Tự động tra cứu tài khoản nhận từ Username/SĐT qua Anchor Identity PDA trên Solana
 * - Tự động khởi tạo Associated Token Account (ATA) cho người nhận nếu chưa có
 * - Ký xác nhận bảo mật và phát sóng trực tiếp lên Solana Devnet
 * - Bọc InteractionManager bảo vệ Main Thread và WebView trên thiết bị
 */
export function useOnchainTransfer(): UseOnchainTransferReturn {
  const { status: authStatus, walletAddress, signTransaction } = useAuth();

  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Ví nhúng Dynamic (MPC) không có trạng thái "needs-recovery"
  const needsRecovery = false;
  const isWalletReady = authStatus === 'ready' && Boolean(walletAddress);

  const transfer = useCallback(
    async (params: OnchainTransferParams): Promise<OnchainTransferResult> => {
      setError(null);
      setTransactionHash(null);

      const from = params.fromAddress || walletAddress;

      // 1. Kiểm tra phiên đăng nhập + ví đã sẵn sàng
      if (authStatus !== 'ready') {
        const err = 'Tài khoản chưa sẵn sàng. Vui lòng đăng nhập lại.';
        setError(err);
        return { success: false, error: err };
      }

      if (!from) {
        const err = 'Không tìm thấy địa chỉ tài khoản nguồn.';
        setError(err);
        return { success: false, error: err };
      }

      const inputRecipient = params.recipientAddressOrPhone.trim();
      if (!inputRecipient) {
        const err = 'Vui lòng nhập định danh hoặc tài khoản người nhận.';
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
      setStatusMessage('Đang phân giải danh tính người nhận on-chain...');

      try {
        // 3. Phân giải Username/SĐT -> Địa chỉ ví từ Solana PDA on-chain
        let finalToAddress = inputRecipient;
        const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(inputRecipient);

        if (!isSolanaBase58) {
          setStatusMessage('Đang tra cứu danh tính on-chain...');
          const resolved = await resolveIdentityOnchain(inputRecipient);
          if (!resolved.success || !resolved.walletAddress) {
            setIsTransferring(false);
            setStatusMessage('');
            const err = resolved.error || `Không tìm thấy người dùng định danh này (${inputRecipient}).`;
            setError(err);
            return { success: false, error: err };
          }
          finalToAddress = resolved.walletAddress;
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
        let [senderUsdcBal, senderSolBal] = await Promise.all([
          getUsdcTokenBalance(from).catch(() => 0),
          getSolanaBalance(from).catch(() => 0),
        ]);

        console.log(`💰 [useOnchainTransfer] Sender: ${from} | USDC Bal: ${senderUsdcBal} | SOL Bal: ${senderSolBal}`);

        const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed');
        const transaction = new Transaction();

        if (senderUsdcBal < rawAmount) {
          setIsTransferring(false);
          setStatusMessage('');
          const err = `Số dư khả dụng không đủ (Hiện có: $${senderUsdcBal.toFixed(2)}, Cần: $${rawAmount.toFixed(2)}).`;
          setError(err);
          return { success: false, error: err };
        }

        // Thực hiện chuyển SPL Token (USDC / USDT)
        let mintPubkey = USDC_DEVNET_MINT;
        let fromATA = getAssociatedTokenAddress(USDC_DEVNET_MINT, fromPubkey);
        let tokenProgramId = TOKEN_PROGRAM_ID;
        let decimals = 6;

        try {
          const [splAccounts, spl2022Accounts] = await Promise.all([
            solanaConnection.getParsedTokenAccountsByOwner(
              fromPubkey,
              { programId: TOKEN_PROGRAM_ID },
              'confirmed'
            ).catch(() => ({ value: [] })),
            solanaConnection.getParsedTokenAccountsByOwner(
              fromPubkey,
              { programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') },
              'confirmed'
            ).catch(() => ({ value: [] })),
          ]);

          const allParsed = [
            ...(splAccounts.value || []).map((v) => ({ ...v, programId: TOKEN_PROGRAM_ID })),
            ...(spl2022Accounts.value || []).map((v) => ({ ...v, programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') })),
          ];

          const matched = allParsed.find((acc) => {
            const uiAmt = acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
            return typeof uiAmt === 'number' && uiAmt >= rawAmount;
          }) || allParsed.find((acc) => {
            const uiAmt = acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
            return typeof uiAmt === 'number' && uiAmt > 0;
          });

          if (matched) {
            const info = matched.account?.data?.parsed?.info;
            if (info?.mint) {
              mintPubkey = new PublicKey(info.mint);
            }
            if (matched.pubkey) {
              fromATA = matched.pubkey;
            }
            if (typeof info?.tokenAmount?.decimals === 'number') {
              decimals = info.tokenAmount.decimals;
            }
            if (matched.programId) {
              tokenProgramId = matched.programId;
            }
          }
        } catch (scanErr) {
          console.warn('⚠️ Lỗi scan token accounts, dùng USDC Devnet mặc định:', scanErr);
        }

        const sendUnits = Math.round(rawAmount * Math.pow(10, decimals));
        const toATA = getAssociatedTokenAddress(mintPubkey, toPubkey, false, tokenProgramId);

        // Không có gas sponsorship (gói Dynamic không phải Enterprise): người gửi trả phí mạng + phí mở ATA
        const feePayerPubkey = fromPubkey;

        // Phí mở ví (Rent Exemption): người gửi trả phí tạo ATA người nhận
        const toAtaInfo = await solanaConnection.getAccountInfo(toATA, 'confirmed');
        if (!toAtaInfo) {
          console.log('ℹ️ [ATA] Khởi tạo Associated Token Account cho người nhận:', toATA.toBase58());
          transaction.add(
            createAssociatedTokenAccountInstruction(
              feePayerPubkey, // payer
              toATA,
              toPubkey,
              mintPubkey,
              tokenProgramId
            )
          );
        }

        // Bảo toàn số dư: sendUnits chính xác theo rawAmount người dùng nhập, không cộng phí gas
        transaction.add(
          createSplTokenTransferInstruction(
            fromATA,
            toATA,
            fromPubkey,
            sendUnits,
            tokenProgramId
          )
        );

        // Phí mạng (Base Fee): người gửi trả
        transaction.feePayer = feePayerPubkey;
        transaction.recentBlockhash = blockhash;

        setStatusMessage('Đang chuẩn bị xác nhận...');

        // 6. QUY TẮC SINH TỬ CHO ANDROID: Bọc trong InteractionManager + 1000ms delay giải phóng Main Thread
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => {
            setTimeout(resolve, 1000);
          });
        });

        setStatusMessage('Đang xác nhận trên thiết bị...');
        // Ký bằng ví nhúng Dynamic (MPC)
        const signedTransaction = await signTransaction(transaction);

        setStatusMessage('Đang phát sóng lên mạng lưới...');

        // Bước 2: Gửi giao dịch lên mạng qua connection.sendRawTransaction(transaction.serialize())
        const rawBroadcastBytes = signedTransaction.serialize();
        const txSignature = await solanaConnection.sendRawTransaction(rawBroadcastBytes, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
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
        console.error('❌ [useOnchainTransfer Error]:', err);
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
    [authStatus, walletAddress, signTransaction]
  );

  return {
    isTransferring,
    error,
    transactionHash,
    statusMessage,
    isWalletReady,
    needsRecovery,
    walletStatus: authStatus,
    senderAddress: walletAddress,
    transfer,
  };
}
