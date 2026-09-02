import { useState, useCallback } from 'react';
import { SystemProgram, PublicKey } from '@solana/web3.js';
import {
  AnchorWallet,
  getProgram,
  deriveUserProfilePda,
  PROGRAM_ID,
  UserProfileData,
} from '../utils/anchorClient';

export interface UseInitProfileReturn {
  isLoading: boolean;
  error: string | null;
  txSignature: string | null;
  isSuccess: boolean;
  profileData: UserProfileData | null;
  profilePda: PublicKey | null;
  initialize: (fiatCurrency?: string) => Promise<string | null>;
  fetchProfile: () => Promise<UserProfileData | null>;
  reset: () => void;
}

/**
 * Custom Hook khởi tạo và quản lý hồ sơ người dùng Web3 (UserProfile) on-chain qua Anchor
 * @param wallet Ví ký giao dịch (AnchorWallet tương thích Privy hoặc Keypair)
 */
export function useInitProfile(wallet?: AnchorWallet | null): UseInitProfileReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);

  // Tính toán trước địa chỉ PDA nếu ví đã kết nối
  const profilePda = wallet?.publicKey
    ? deriveUserProfilePda(wallet.publicKey, PROGRAM_ID)[0]
    : null;

  /**
   * Reset trạng thái giao dịch
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setTxSignature(null);
    setIsSuccess(false);
  }, []);

  /**
   * Truy vấn dữ liệu hồ sơ UserProfile từ on-chain
   */
  const fetchProfile = useCallback(async (): Promise<UserProfileData | null> => {
    if (!wallet?.publicKey || !profilePda) {
      return null;
    }

    try {
      const program = getProgram(wallet);
      const data = await program.account.userProfile.fetch(profilePda);
      const parsed: UserProfileData = {
        owner: data.owner,
        activeFiat: data.activeFiat,
      };
      setProfileData(parsed);
      return parsed;
    } catch (err: unknown) {
      // Nếu chưa khởi tạo thì trả về null bình thường
      setProfileData(null);
      return null;
    }
  }, [wallet, profilePda]);

  /**
   * Thực thi giao dịch khởi tạo hồ sơ người dùng trên Smart Contract
   * @param fiatCurrency Mã tiền tệ mặc định (ví dụ: "VND", "USD")
   */
  const initialize = useCallback(
    async (fiatCurrency: string = 'VND'): Promise<string | null> => {
      // 1. Kiểm tra tính sẵn sàng của ví
      if (!wallet || !wallet.publicKey) {
        const errMsg = 'Vui lòng kết nối ví trước khi thực hiện giao dịch.';
        setError(errMsg);
        return null;
      }

      // 2. Validate độ dài chuỗi tiền tệ (tối đa 10 ký tự theo quy chuẩn smart contract)
      const cleanFiat = fiatCurrency.trim().toUpperCase();
      if (!cleanFiat) {
        const errMsg = 'Mã tiền tệ không được để trống.';
        setError(errMsg);
        return null;
      }

      if (cleanFiat.length > 10) {
        const errMsg = 'Mã tiền tệ không được vượt quá 10 ký tự.';
        setError(errMsg);
        return null;
      }

      setIsLoading(true);
      setError(null);
      setTxSignature(null);
      setIsSuccess(false);

      try {
        // 3. Khởi tạo program instance và tính toán PDA
        const program = getProgram(wallet);
        const [pda] = deriveUserProfilePda(wallet.publicKey, PROGRAM_ID);

        // 4. Gửi giao dịch lên Solana Devnet
        const txHash = await program.methods
          .initializeProfile(cleanFiat)
          .accounts({
            userProfile: pda,
            signer: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        // 5. Cập nhật state thành công
        setTxSignature(txHash);
        setIsSuccess(true);
        setProfileData({
          owner: wallet.publicKey,
          activeFiat: cleanFiat,
        });

        return txHash;
      } catch (err: unknown) {
        console.error('[useInitProfile] Lỗi khởi tạo hồ sơ:', err);

        let userFriendlyError = 'Giao dịch thất bại. Vui lòng thử lại.';
        const rawMessage = err instanceof Error ? err.message : String(err);

        if (rawMessage.includes('User rejected') || rawMessage.includes('rejected')) {
          userFriendlyError = 'Người dùng đã hủy xác nhận giao dịch.';
        } else if (rawMessage.includes('already in use') || rawMessage.includes('0x0')) {
          userFriendlyError = 'Hồ sơ Web3 của tài khoản này đã được khởi tạo trước đó.';
        } else if (rawMessage.includes('FiatCurrencyTooLong')) {
          userFriendlyError = 'Mã tiền tệ quá dài (tối đa 10 ký tự).';
        } else if (rawMessage.includes('insufficient funds') || rawMessage.includes('0x1')) {
          userFriendlyError = 'Số dư SOL không đủ để thanh toán phí giao dịch (gas fee).';
        } else if (rawMessage) {
          userFriendlyError = rawMessage;
        }

        setError(userFriendlyError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet]
  );

  return {
    isLoading,
    error,
    txSignature,
    isSuccess,
    profileData,
    profilePda,
    initialize,
    fetchProfile,
    reset,
  };
}
