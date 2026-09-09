import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrivy, useLoginWithSiws, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { useRouter } from 'expo-router';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useExternalWallet } from '../src/providers/WalletProvider';
import { useUserStore } from '../stores/useUserStore';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

export interface PhantomAuthButtonProps {
  /**
   * Chế độ xác thực: 'login' (Đăng nhập) hoặc 'signup' (Đăng ký)
   * @default 'login'
   */
  mode?: 'login' | 'signup';
  /** Callback tùy chọn khi xác thực SIWS thành công */
  onSuccess?: (user: any, isNewUser?: boolean) => void;
  /** Callback đầy đủ kiểu onComplete(user, isNewUser, wasAlreadyAuthenticated) */
  onComplete?: (user: any, isNewUser?: boolean, wasAlreadyAuthenticated?: boolean) => void;
  /** Callback tùy chọn khi gặp lỗi */
  onError?: (error: Error) => void;
  /** Style tùy biến cho nút bấm */
  style?: StyleProp<ViewStyle>;
  /** Vô hiệu hóa nút bấm */
  disabled?: boolean;
}

/**
 * Component đóng gói độc lập (Hộp đen) toàn bộ logic Phase 1 -> Phase 4 của Phantom SIWS
 * - Phantom: Chỉ dùng làm phương thức xác thực quyền sở hữu (SIWS).
 * - Privy: Kích hoạt / Khởi tạo Ví nhúng (Embedded Wallet) trên Solana làm wallet_address chính.
 */
export const PhantomAuthButton: React.FC<PhantomAuthButtonProps> = ({
  mode = 'login',
  onSuccess,
  onComplete,
  onError,
  style,
  disabled = false,
}) => {
  const router = useRouter();
  const privy = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const { connect, signMessage } = useExternalWallet();
  const siwsAuth = useLoginWithSiws();

  const [isSigning, setIsSigning] = useState<boolean>(false);
  const savedSiwsMessage = useRef<string | null>(null);
  const savedSignature = useRef<string | null>(null);

  const handlePhantomAuth = async () => {
    try {
      setIsSigning(true);
      console.log(`🟢 [PhantomAuthButton - ${mode.toUpperCase()}] Người dùng bấm nút kết nối Phantom`);

      // 1. Dọn dẹp session cũ nếu có
      if (privy?.logout) {
        try {
          await privy.logout();
        } catch {}
      }

      // 2. Giai đoạn 2: Handshake kết nối ví Phantom
      const userPub = await connect('phantom');
      if (!userPub) {
        console.log('⚠️ [Phase 2] Kết nối ví thất bại hoặc người dùng hủy thao tác.');
        setIsSigning(false);
        return;
      }
      const phantomAddress = userPub.toBase58();
      console.log('🎯 [Phase 2] Handshake thành công. Phantom Address:', phantomAddress);

      // Lưu địa chỉ Phantom làm ví ngoài liên kết (Reference Only)
      useUserStore.getState().setLinkedExternalWallet(phantomAddress);
      await AsyncStorage.setItem('@ned_wallet_linked_external_wallet', phantomAddress);

      // 3. Giai đoạn 3: Sinh thông điệp SIWS từ Privy SDK
      if (!siwsAuth || typeof siwsAuth.generateMessage !== 'function') {
        throw new Error('Hệ thống xác thực SIWS chưa sẵn sàng.');
      }

      const { message: rawMessage } = await siwsAuth.generateMessage({
        wallet: {
          address: phantomAddress,
        },
        from: {
          domain: 'com.anonymous.nedwallet', // Định danh Mobile đã đăng ký trên Privy
          uri: 'nedwallet://',               // Scheme di động
        },
      });

      savedSiwsMessage.current = rawMessage;
      console.log('📝 [Phase 3] Thông điệp SIWS sinh ra:\n', rawMessage);

      // Thêm khoảng đệm nhỏ để thiết bị chuyển cảnh mượt mà
      await new Promise((res) => setTimeout(res, 500));

      // 4. Gửi yêu cầu ký thông điệp sang Phantom
      const signature = await signMessage(rawMessage);
      savedSignature.current = signature;
      console.log('✅ [Phase 3] Nhận chữ ký Base58 thành công:', signature);

      // 4.5 Xác thực chữ ký cục bộ (Local Verification)
      try {
        const messageBuffer = Buffer.from(rawMessage);
        const signatureBytes = bs58.decode(signature);
        const pubKeyBytes = userPub.toBytes();
        const verified = nacl.sign.detached.verify(messageBuffer, signatureBytes, pubKeyBytes);
        console.log('🔍 [Phase 3.5] Local Verification Result:', verified);
        if (!verified) {
          console.warn('⚠️ [Phase 3.5] Cảnh báo: Chữ ký không khớp với khóa công khai.');
        }
      } catch (verErr) {
        console.warn('⚠️ [Phase 3.5] Local verification warning:', verErr);
      }

      // 5. Giai đoạn 4: Xác thực Backend Privy (loginWithSiws)
      console.log('⏳ [Phase 4] Đang gửi xác thực SIWS lên hệ thống Privy...');
      const signatureBytes = bs58.decode(signature);
      const signatureBase64 = Buffer.from(signatureBytes).toString('base64');

      const loggedInUser = await siwsAuth.login({
        message: rawMessage,
        signature: signatureBase64,
      });

      console.log('🎉 [Phase 4] Đăng nhập Privy SIWS thành công! User ID:', loggedInUser.id);

      // 6. Khởi tạo / Đồng bộ Ví Nhúng (Privy Embedded Solana Wallet)
      let embeddedAddress: string | null = null;
      const currentWallets = solanaWalletState?.wallets || [];
      if (currentWallets.length > 0 && currentWallets[0]?.address) {
        embeddedAddress = currentWallets[0].address;
      } else if (typeof (solanaWalletState as any)?.create === 'function') {
        try {
          console.log('🔄 [PhantomAuthButton] Khởi tạo Embedded Solana Wallet cho tài khoản...');
          const created = await (solanaWalletState as any).create();
          if (created?.address) {
            embeddedAddress = created.address;
          } else if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
            embeddedAddress = solanaWalletState.wallets[0].address;
          }
        } catch (createErr) {
          console.warn('⚠️ [PhantomAuthButton] create embedded wallet warning:', createErr);
        }
      }

      // Fallback kiểm tra trong linked_accounts của loggedInUser
      if (!embeddedAddress) {
        const linked = (loggedInUser as any)?.linked_accounts || (loggedInUser as any)?.linkedAccounts || [];
        const solEmbedded = linked.find(
          (acc: any) =>
            acc.type === 'wallet' &&
            (acc.chain_type === 'solana' || acc.chainType === 'solana') &&
            acc.wallet_client_type === 'privy'
        ) || linked.find(
          (acc: any) =>
            acc.type === 'wallet' &&
            (acc.chain_type === 'solana' || acc.chainType === 'solana')
        );
        if (solEmbedded?.address) {
          embeddedAddress = solEmbedded.address;
        }
      }

      if (embeddedAddress) {
        console.log('🔑 [PhantomAuthButton] Đã gán Ví nhúng (Embedded Wallet) chính:', embeddedAddress);
        useUserStore.getState().setWalletAddress(embeddedAddress);
        await AsyncStorage.setItem('@ned_wallet_address', embeddedAddress);
      }

      const isNewUser =
        mode === 'signup' ||
        Boolean((loggedInUser as any)?.isNewUser) ||
        Boolean((loggedInUser as any)?.is_new_user) ||
        (loggedInUser && 'createdAt' in loggedInUser && Date.now() - new Date((loggedInUser as any).createdAt).getTime() < 60000) ||
        (loggedInUser && 'created_at' in loggedInUser && Date.now() - new Date((loggedInUser as any).created_at).getTime() < 60000);

      if (onComplete) {
        onComplete(loggedInUser, isNewUser, false);
      }
      if (onSuccess) {
        onSuccess(loggedInUser, isNewUser);
      }
      if (!onComplete && !onSuccess) {
        if (isNewUser) {
          router.replace('/(onboarding)/phone');
        } else {
          router.replace('/home');
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.warn('⚠️ [PhantomAuthButton Error]:', errorMsg);

      if (onError && err instanceof Error) {
        onError(err);
      } else {
        Alert.alert(
          mode === 'signup' ? 'Đăng ký ví thất bại' : 'Đăng nhập ví thất bại',
          errorMsg || 'Không thể xác thực ví với hệ thống Privy. Vui lòng thử lại.'
        );
      }
    } finally {
      savedSiwsMessage.current = null;
      savedSignature.current = null;
      setIsSigning(false);
    }
  };

  const buttonText = isSigning
    ? 'Đang xử lý kết nối...'
    : mode === 'signup'
    ? 'Đăng ký bằng ví Phantom'
    : 'Đăng nhập bằng ví Phantom';

  return (
    <TouchableOpacity
      style={[
        styles.walletLoginBtn,
        (disabled || isSigning) && styles.walletBtnDisabled,
        style,
      ]}
      onPress={handlePhantomAuth}
      disabled={disabled || isSigning}
      activeOpacity={0.85}
    >
      <View style={styles.walletBtnInner}>
        {isSigning ? (
          <ActivityIndicator size="small" color="#AB9FF2" />
        ) : (
          <View style={styles.walletIconBox}>
            <Ionicons name="wallet-outline" size={20} color="#AB9FF2" />
          </View>
        )}
        <Text style={styles.walletBtnText}>{buttonText}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  walletLoginBtn: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  walletBtnDisabled: {
    opacity: 0.7,
  },
  walletBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  walletIconBox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4338CA',
  },
});
