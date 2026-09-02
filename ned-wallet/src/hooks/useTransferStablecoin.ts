import { useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  AnchorWallet,
  getProgram,
  getConnection,
  createPrivyAnchorWallet,
} from '../utils/anchorClient';
import {
  USDC_DEVNET_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '../../services/solana';
import { useEmbeddedSolanaWallet } from '@privy-io/expo';

export interface TransferStablecoinParams {
  recipientAddress: string;
  amount: number;
  mintAddress?: string;
  decimals?: number;
}

export interface UseTransferStablecoinReturn {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  isSuccess: boolean;
  statusMessage: string;
  transfer: (params: TransferStablecoinParams) => Promise<string | null>;
  reset: () => void;
}

/**
 * Custom Hook thực thi giao dịch chuyển Stablecoin (USDC SPL Token) on-chain qua Anchor Smart Contract CPI
 * @param customWallet Tuỳ chọn truyền vào AnchorWallet, mặc định tự động lấy ví Privy
 */
export function useTransferStablecoin(customWallet?: AnchorWallet | null): UseTransferStablecoinReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  let solanaWalletState: unknown = null;
  try {
    solanaWalletState = useEmbeddedSolanaWallet();
  } catch (_e) {
    // safely ignore
  }

  const activeWallet = customWallet || createPrivyAnchorWallet(solanaWalletState);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setTxHash(null);
    setIsSuccess(false);
    setStatusMessage('');
  }, []);

  const transfer = useCallback(
    async (params: TransferStablecoinParams): Promise<string | null> => {
      const { recipientAddress, amount, mintAddress, decimals = 6 } = params;

      // 1. Kiểm tra ví người dùng
      if (!activeWallet || !activeWallet.publicKey) {
        const errMsg = 'Vui lòng kết nối ví trước khi thực hiện giao dịch.';
        setError(errMsg);
        return null;
      }

      // 2. Kiểm tra số lượng chuyển
      if (isNaN(amount) || amount <= 0) {
        const errMsg = 'Số lượng Stablecoin chuyển phải lớn hơn 0.';
        setError(errMsg);
        return null;
      }

      // 3. Kiểm tra địa chỉ ví người nhận
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipientAddress.trim());
      } catch (_err) {
        const errMsg = 'Địa chỉ ví người nhận không đúng định dạng Solana Public Key.';
        setError(errMsg);
        return null;
      }

      if (recipientPubkey.equals(activeWallet.publicKey)) {
        const errMsg = 'Bạn không thể chuyển Stablecoin đến ví của chính mình.';
        setError(errMsg);
        return null;
      }

      // 4. Xác định Mint Address của Stablecoin (mặc định Devnet USDC)
      let mintPubkey = USDC_DEVNET_MINT;
      if (mintAddress && mintAddress.trim()) {
        try {
          mintPubkey = new PublicKey(mintAddress.trim());
        } catch (_err) {
          const errMsg = 'Địa chỉ Mint của Stablecoin không hợp lệ.';
          setError(errMsg);
          return null;
        }
      }

      setIsLoading(true);
      setError(null);
      setTxHash(null);
      setIsSuccess(false);
      setStatusMessage('Đang kiểm tra tài khoản Associated Token Account...');

      try {
        const connection = getConnection();
        const program = getProgram(activeWallet);

        // 5. Tính toán địa chỉ ATA cho người gửi và người nhận
        const fromTokenAccount = getAssociatedTokenAddress(mintPubkey, activeWallet.publicKey);
        const toTokenAccount = getAssociatedTokenAddress(mintPubkey, recipientPubkey);

        // 6. Kiểm tra tài khoản ATA người gửi có tồn tại không
        const senderAtaInfo = await connection.getAccountInfo(fromTokenAccount, 'confirmed');
        if (!senderAtaInfo) {
          throw new Error('Bạn chưa có tài khoản Token Account (ATA) cho token này. Vui lòng nhận token trước khi gửi.');
        }

        // 7. Kiểm tra số dư SOL của người gửi để thanh toán phí mạng
        const senderSolBalance = await connection.getBalance(activeWallet.publicKey, 'confirmed');
        if (senderSolBalance < 0.001 * anchor.web3.LAMPORTS_PER_SOL) {
          throw new Error('Số dư SOL không đủ để thanh toán phí giao dịch (gas fee). Vui lòng nạp thêm SOL.');
        }

        // 8. Chuẩn bị pre-instructions nếu ví nhận chưa có ATA
        setStatusMessage('Đang chuẩn bị lệnh CPI chuyển token...');
        const preInstructions: anchor.web3.TransactionInstruction[] = [];
        const recipientAtaInfo = await connection.getAccountInfo(toTokenAccount, 'confirmed');
        if (!recipientAtaInfo) {
          console.log('[useTransferStablecoin] Tạo ATA tự động cho người nhận...');
          preInstructions.push(
            createAssociatedTokenAccountInstruction(
              activeWallet.publicKey,
              toTokenAccount,
              recipientPubkey,
              mintPubkey
            )
          );
        }

        // 9. Quy đổi số lượng theo số chữ số thập phân (Decimals)
        const rawAmount = Math.round(amount * Math.pow(10, decimals));
        const amountBn = new anchor.BN(rawAmount.toString());

        setStatusMessage('Đang yêu cầu xác nhận và ký giao dịch...');

        // 10. Gọi Smart Contract qua CPI transferStablecoin
        const txBuilder = program.methods
          .transferStablecoin(amountBn)
          .accounts({
            fromTokenAccount,
            toTokenAccount,
            mint: mintPubkey,
            signer: activeWallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          });

        if (preInstructions.length > 0) {
          txBuilder.preInstructions(preInstructions);
        }

        const signature = await txBuilder.rpc();

        setStatusMessage('Giao dịch đã được xác nhận on-chain!');
        setTxHash(signature);
        setIsSuccess(true);
        return signature;
      } catch (err: unknown) {
        console.error('[useTransferStablecoin] Lỗi chuyển Stablecoin:', err);

        let userFriendlyError = 'Giao dịch chuyển Stablecoin thất bại.';
        const rawMessage = err instanceof Error ? err.message : String(err);

        if (rawMessage.includes('User rejected') || rawMessage.includes('rejected')) {
          userFriendlyError = 'Người dùng đã hủy xác nhận giao dịch.';
        } else if (rawMessage.includes('0x1') || rawMessage.includes('insufficient funds')) {
          userFriendlyError = 'Số dư token hoặc SOL không đủ để thực hiện giao dịch.';
        } else if (rawMessage.includes('InvalidAmount') || rawMessage.includes('6001')) {
          userFriendlyError = 'Số lượng Stablecoin phải lớn hơn 0.';
        } else if (rawMessage) {
          userFriendlyError = rawMessage;
        }

        setError(userFriendlyError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [activeWallet]
  );

  return {
    isLoading,
    error,
    txHash,
    isSuccess,
    statusMessage,
    transfer,
    reset,
  };
}
