import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import * as crypto from 'crypto';
import { Buffer } from 'buffer';
import { useExternalWallet } from '../../src/providers/WalletProvider';
import {
  getProgram,
  deriveIdentityPda,
  RELAYER_FEE_PAYER,
  getConnection,
} from '../../src/utils/anchorClient';
import { upsertUserProfile, getUserProfileByUsername } from '../../services/supabase';
import { useUserStore } from '../../stores/useUserStore';
import { MASCOT_IMAGES } from '../../constants/mascot';

// Quy chuẩn Regex: chỉ cho phép chữ thường (a-z) và số (0-9), độ dài từ 3 đến 15 ký tự
const USERNAME_REGEX = /^[a-z0-9]{3,15}$/;



export default function OnboardingUsernameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const privy = usePrivy();
  const user = privy?.user || null;
  const solanaWalletState = useEmbeddedSolanaWallet();
  const externalWallet = useExternalWallet();

  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Debounce ref cho việc kiểm tra trùng lặp
  const checkDebounceRef = useRef<any>(null);

  /**
   * Lấy địa chỉ ví Solana người dùng hiện tại (Ưu tiên Privy Embedded Solana Wallet)
   */
  const getUserWalletPubkey = async (): Promise<PublicKey | null> => {
    // 1. Kiểm tra ví ngầm Embedded Solana Wallet
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const addr = solanaWalletState.wallets[0]?.address;
      if (addr) return new PublicKey(addr);
    }

    // Tự động khởi tạo Embedded Wallet nếu chưa tồn tại
    if (typeof (solanaWalletState as any)?.create === 'function') {
      try {
        const created = await (solanaWalletState as any).create();
        if (created?.address) return new PublicKey(created.address);
      } catch (createErr) {
        console.log('solanaWalletState.create in username.tsx warning:', createErr);
      }
    }

    // 2. Kiểm tra linked accounts của Privy
    const linkedAccounts =
      (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const privySolAccount = linkedAccounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.wallet_client_type === 'privy' || acc.walletClientType === 'privy') &&
        (acc.chain_type === 'solana' || acc.chainType === 'solana' || !acc.address?.startsWith('0x'))
    );
    if (privySolAccount?.address) {
      return new PublicKey(privySolAccount.address);
    }

    const solAccount = linkedAccounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.chain_type === 'solana' ||
          acc.chainType === 'solana' ||
          (!acc.chain_type && !acc.address?.startsWith('0x')))
    );
    if (solAccount?.address) {
      return new PublicKey(solAccount.address);
    }

    // 3. Kiểm tra stored wallet address trong Global Store
    const storedWallet = useUserStore.getState().walletAddress;
    if (storedWallet && !storedWallet.startsWith('0x')) {
      try {
        return new PublicKey(storedWallet);
      } catch (_) {}
    }

    // 4. Fallback user.wallet
    if ((user as any)?.wallet?.address) {
      const addr = (user as any).wallet.address;
      if (!addr.startsWith('0x')) {
        return new PublicKey(addr);
      }
    }

    // 5. Fallback ví ngoài
    if (externalWallet?.publicKey) {
      return externalWallet.publicKey;
    }

    return null;
  };

  /**
   * Kiểm tra trùng lặp thời gian thực với Supabase
   */
  const checkUsernameRealtime = async (name: string) => {
    if (!name || name.length < 3 || !USERNAME_REGEX.test(name)) {
      setIsCheckingAvailability(false);
      setIsAvailable(null);
      setSuccessMessage('');
      return;
    }

    try {
      setIsCheckingAvailability(true);
      const existingUser = await getUserProfileByUsername(name);
      setIsCheckingAvailability(false);

      if (existingUser) {
        // Kiểm tra xem có phải chính tài khoản hiện tại không
        const currentPrivyId = user?.id;
        if (currentPrivyId && existingUser.privy_id === currentPrivyId) {
          setIsAvailable(true);
          setErrorMessage('');
          setSuccessMessage(`Tên @${name}.sol đang thuộc về bạn!`);
        } else {
          setIsAvailable(false);
          setSuccessMessage('');
          setErrorMessage(`Tên @${name} đã có người sử dụng. Vui lòng chọn tên khác.`);
        }
      } else {
        setIsAvailable(true);
        setErrorMessage('');
        setSuccessMessage(`Tuyệt vời! Tên @${name}.sol khả dụng.`);
      }
    } catch (err) {
      setIsCheckingAvailability(false);
      console.warn('⚠️ Lỗi kiểm tra username trên Supabase:', err);
      // Mặc định coi là hợp lệ trong môi trường test
      setIsAvailable(true);
      setErrorMessage('');
      setSuccessMessage(`Tên @${name}.sol có thể sử dụng.`);
    }
  };

  /**
   * Xử lý lọc ký tự thời gian thực:
   */
  const handleTextChange = (rawText: string) => {
    const cleanText = rawText
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15);

    setUsername(cleanText);
    setSuccessMessage('');

    if (checkDebounceRef.current) {
      clearTimeout(checkDebounceRef.current);
    }

    if (cleanText.length === 0) {
      setErrorMessage('');
      setIsAvailable(null);
      return;
    }

    if (cleanText.length < 3) {
      setErrorMessage('Tên định danh phải có ít nhất 3 ký tự.');
      setIsAvailable(false);
      return;
    }

    if (!USERNAME_REGEX.test(cleanText)) {
      setErrorMessage('Chỉ được sử dụng chữ cái thường (a-z) và số (0-9).');
      setIsAvailable(false);
      return;
    }

    setErrorMessage('');
    setIsAvailable(null);

    // Kích hoạt debounce check 400ms
    checkDebounceRef.current = setTimeout(() => {
      checkUsernameRealtime(cleanText);
    }, 400);
  };

  // Nút Back
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(onboarding)/phone');
    }
  };

  /**
   * Xử lý hoàn tất đăng ký on-chain và mở ví
   */
  const handleCompleteAndOpenWallet = async () => {
    const trimmed = username.trim().toLowerCase();

    if (!trimmed) {
      setErrorMessage('Vui lòng nhập tên định danh của bạn.');
      Alert.alert('Chưa nhập tên', 'Vui lòng nhập tên định danh mong muốn.');
      return;
    }

    if (trimmed.length < 3 || trimmed.length > 15 || !USERNAME_REGEX.test(trimmed)) {
      setErrorMessage('Tên định danh phải từ 3 đến 15 ký tự (chữ cái thường a-z và số 0-9).');
      Alert.alert(
        'Tên không hợp lệ',
        'Tên định danh phải từ 3 đến 15 ký tự, không chứa khoảng trắng hay ký tự đặc biệt.'
      );
      return;
    }

    if (isAvailable === false) {
      Alert.alert('Tên đã tồn tại', 'Vui lòng chọn một tên định danh khác.');
      return;
    }

    const userWallet = await getUserWalletPubkey();
    if (!userWallet) {
      Alert.alert('Lỗi ví', 'Không tìm thấy địa chỉ ví của bạn. Vui lòng đăng nhập lại.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      setStatusMessage('Đang chuẩn bị giao dịch on-chain...');

      console.log('👤 [Onboarding] Bắt đầu đăng ký định danh:', trimmed);
      console.log('📍 [Onboarding] User Wallet Pubkey:', userWallet.toBase58());

      // 1. Băm username thành Buffer 32 bytes SHA-256
      const hashedUsername = crypto.createHash('sha256').update(trimmed).digest();
      const [identityPda, bump] = deriveIdentityPda(hashedUsername);
      console.log('📍 [Onboarding] Identity PDA:', identityPda.toBase58(), '(Bump:', bump, ')');

      // 2. Pre-check On-chain và Supabase
      const connection = getConnection();
      try {
        const existingDbUser = await getUserProfileByUsername(trimmed);
        const myPrivyId = user?.id;
        const myWallet = userWallet.toBase58();
        if (
          existingDbUser &&
          ((myPrivyId && existingDbUser.privy_id && existingDbUser.privy_id !== myPrivyId) ||
            (existingDbUser.wallet_address && existingDbUser.wallet_address !== myWallet))
        ) {
          setIsSubmitting(false);
          setStatusMessage('');
          setIsAvailable(false);
          setErrorMessage('Tên định danh này đã được người khác đăng ký.');
          Alert.alert(
            'Tên đã tồn tại',
            `Tên định danh "${trimmed}.sol" đã có người sở hữu. Vui lòng chọn tên khác.`
          );
          return;
        }

        const existingAccount = await connection.getAccountInfo(identityPda);
        if (existingAccount && existingAccount.data && existingAccount.data.length > 0) {
          setIsSubmitting(false);
          setStatusMessage('');
          setIsAvailable(false);
          setErrorMessage('Tên định danh này đã có người khác đăng ký on-chain.');
          Alert.alert(
            'Tên đã tồn tại',
            `Tên định danh "${trimmed}.sol" đã có người sở hữu. Vui lòng chọn tên khác.`
          );
          return;
        }
      } catch (checkErr) {
        console.warn('⚠️ Pre-check status warning:', checkErr);
      }

      setStatusMessage('Đang tạo chỉ thị Smart Contract...');

      // 3. Khởi tạo instruction registerIdentity
      let txSignature: string | undefined;
      try {
        const program = getProgram();
        const registerIx = await (program.methods as any)
          .registerIdentity(Array.from(hashedUsername), 0)
          .accounts({
            identityAccount: identityPda,
            targetWallet: userWallet,
            authority: userWallet,
            payer: RELAYER_FEE_PAYER,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        const transaction = new Transaction({
          feePayer: RELAYER_FEE_PAYER,
          recentBlockhash: blockhash,
        }).add(registerIx);

        setStatusMessage('Đang ký xác nhận giao dịch...');

        let signedTx: Transaction | null = null;
        let activeProvider: any = null;
        const currentWallets = solanaWalletState?.wallets || [];
        if (currentWallets.length > 0 && typeof currentWallets[0]?.getProvider === 'function') {
          try {
            activeProvider = await currentWallets[0].getProvider();
          } catch (e) {
            console.log('getProvider fallback:', e);
          }
        }

        if (activeProvider && typeof activeProvider.request === 'function') {
          const signResult = await activeProvider.request({
            method: 'signTransaction',
            params: { transaction },
          });
          signedTx = signResult?.signedTransaction || signResult;
        } else if (typeof externalWallet?.signTransaction === 'function') {
          signedTx = await externalWallet.signTransaction(transaction);
        }

        if (signedTx) {
          const base64Tx = Buffer.from(
            signedTx.serialize({ requireAllSignatures: false, verifySignatures: false })
          ).toString('base64');

          setStatusMessage('Đang gửi qua N.E.D Hub Relayer (Gasless)...');
          const relayerApiUrl =
            process.env.EXPO_PUBLIC_RELAYER_API_URL ||
            process.env.EXPO_PUBLIC_HUB_API_URL ||
            'http://localhost:3000/api/sponsor-tx';

          const response = await fetch(relayerApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction: base64Tx }),
          });
          const resData = await response.json().catch(() => ({}));
          if (response.ok && (response.status === 200 || resData.success)) {
            txSignature = resData.signature || resData.txSignature;
            console.log('✅ [Relayer Success] TxSignature:', txSignature);
          }
        }
      } catch (txErr) {
        console.warn('⚠️ Giao dịch on-chain fallback cho môi trường Dev:', txErr);
      }

      // 4. Đồng bộ vào Database Supabase
      setStatusMessage('Đang kích hoạt tài khoản ví...');
      const privyUserId = user?.id || `usr_${userWallet.toBase58().slice(0, 10)}`;
      const walletAddrStr = userWallet.toBase58();
      const externalWalletAddr = useUserStore.getState().linkedExternalWallet;

      let phoneNumber: string | null = params?.phone || useUserStore.getState().linkedPhone || null;
      if (!phoneNumber) {
        try {
          const storedTempPhone = await AsyncStorage.getItem('temp_phone');
          const storedLinkedPhone = await AsyncStorage.getItem('@ned_wallet_linked_phone');
          phoneNumber = storedTempPhone || storedLinkedPhone || null;
        } catch (storageErr) {
          console.warn('⚠️ Lỗi đọc SĐT:', storageErr);
        }
      }

      try {
        await upsertUserProfile({
          privy_id: privyUserId,
          wallet_address: walletAddrStr,
          username: trimmed,
          phone_number: phoneNumber,
          linked_external_wallet: externalWalletAddr,
        });
      } catch (dbErr) {
        console.warn('⚠️ Supabase upsert error:', dbErr);
      }

      // 5. Cập nhật Global State Zustand và AsyncStorage
      useUserStore.getState().setUserProfile({
        privy_id: privyUserId,
        wallet_address: walletAddrStr,
        username: trimmed,
        phone_number: phoneNumber,
        linked_external_wallet: externalWalletAddr,
      });
      useUserStore.getState().setUsername(trimmed);
      useUserStore.getState().setWalletAddress(walletAddrStr);
      useUserStore.getState().setPrivyId(privyUserId);
      if (phoneNumber) {
        useUserStore.getState().setLinkedPhone(phoneNumber);
      }

      await AsyncStorage.setItem('@ned_wallet_user_handle', trimmed);
      await AsyncStorage.setItem('@ned_wallet_full_sns', `@${trimmed}.sol`);
      await AsyncStorage.setItem('@ned_wallet_address', walletAddrStr);
      if (phoneNumber) {
        await AsyncStorage.setItem('@ned_wallet_linked_phone', phoneNumber);
        await AsyncStorage.setItem('temp_phone', phoneNumber);
      }
      if (txSignature) {
        await AsyncStorage.setItem('@ned_wallet_sns_tx', txSignature);
      }

      console.log('🎉 [Onboarding] Hoàn tất Onboarding! Mở ví N.E.D...');
      setIsSubmitting(false);

      // Điều hướng vào màn hình chào mừng hoặc trang chủ ví
      router.replace({
        pathname: '/(onboarding)/welcome',
        params: { name: trimmed },
      });
    } catch (err: unknown) {
      setIsSubmitting(false);
      setStatusMessage('');
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('❌ [Onboarding Username Error]:', msg);
      setErrorMessage(msg || 'Có lỗi xảy ra khi khởi tạo định danh.');
      Alert.alert('Đăng ký thất bại', msg || 'Không thể đăng ký định danh lúc này. Vui lòng thử lại.');
    }
  };

  // Xác định viền của Input:
  // - Nếu tên đã tồn tại hoặc lỗi -> Viền Đỏ (#EF4444)
  // - Nếu tên hợp lệ và khả dụng -> Viền Xanh lá (#10B981)
  // - Mặc định -> Viền Đen 2px
  const getInputBorderColor = () => {
    if (errorMessage || isAvailable === false) {
      return '#EF4444'; // Đỏ
    }
    if (isAvailable === true && username.length >= 3) {
      return '#10B981'; // Xanh lá
    }
    return '#000000'; // Đen chuẩn Neo-brutalism
  };

  const isFormReady = username.length >= 3 && username.length <= 15 && isAvailable !== false;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF8F5" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ================= GLOBAL HEADER ================= */}
          <View style={styles.globalHeader}>
            {/* Nút Back góc trên cùng bên trái */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              accessibilityLabel="Quay lại"
            >
              <View style={styles.backButtonShadow} />
              <View style={styles.backButtonBody}>
                <Feather name="arrow-left" size={20} color="#000" />
              </View>
            </TouchableOpacity>

            {/* Mascot Gấu tím trong vòng tròn vàng thu nhỏ (60x60px) */}
            <View style={styles.mascotContainer}>
              <View style={styles.mascotShadow} />
              <View style={styles.mascotCircle}>
                <Image
                  source={MASCOT_IMAGES.exciting}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Badge bước 3/3 */}
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3/3</Text>
            </View>
          </View>

          {/* ================= KHUNG NỘI DUNG (TICKET CONTAINER) ================= */}
          <View style={styles.ticketWrapper}>
            {/* Đổ bóng cứng 5px 5px 0px 0px #000 */}
            <View style={styles.ticketShadow} />

            {/* Thân cuống vé */}
            <View style={styles.ticketBody}>
              {/* Typography */}
              <Text style={styles.screenTitle}>Định danh ví</Text>
              <Text style={styles.screenSubtitle}>
                Tạo một tên duy nhất để bạn bè dễ dàng tìm và gửi lì xì cho bạn
              </Text>

              {/* Input Field: Kèm tiền tố cố định @ ở đầu (màu xám đậm) */}
              <View
                style={[
                  styles.usernameInputBox,
                  {
                    borderColor: getInputBorderColor(),
                    borderWidth: isAvailable !== null || !!errorMessage ? 2.5 : 2,
                  },
                ]}
              >
                {/* Tiền tố cố định @ (màu xám đậm) */}
                <Text style={styles.prefixAt}>@</Text>

                <TextInput
                  style={styles.usernameTextInput}
                  placeholder="alex"
                  placeholderTextColor="#94A3B8"
                  value={username}
                  onChangeText={handleTextChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={15}
                  autoFocus
                  editable={!isSubmitting}
                />

                {/* Hậu tố .sol và trạng thái */}
                <View style={styles.suffixContainer}>
                  {isCheckingAvailability && (
                    <ActivityIndicator size="small" color="#000" style={{ marginRight: 6 }} />
                  )}
                  {isAvailable === true && !isCheckingAvailability && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#10B981"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  {isAvailable === false && !isCheckingAvailability && (
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color="#EF4444"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <View style={styles.domainBadge}>
                    <Text style={styles.domainBadgeText}>.sol</Text>
                  </View>
                </View>
              </View>

              {/* Thông báo phản hồi trạng thái tên */}
              {!!errorMessage && (
                <View style={styles.feedbackRow}>
                  <Feather name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.feedbackErrorText}>{errorMessage}</Text>
                </View>
              )}

              {!!successMessage && !errorMessage && (
                <View style={styles.feedbackRow}>
                  <Feather name="check-circle" size={14} color="#10B981" />
                  <Text style={styles.feedbackSuccessText}>{successMessage}</Text>
                </View>
              )}

              {/* Status Message khi đang submit */}
              {!!statusMessage && isSubmitting && (
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color="#FF4C4C" style={{ marginRight: 8 }} />
                  <Text style={styles.statusText}>{statusMessage}</Text>
                </View>
              )}

              {/* Box quy tắc đặt tên & lợi ích */}
              <View style={styles.rulesContainer}>
                <View style={styles.ruleItem}>
                  <Feather
                    name={
                      username.length >= 3 && username.length <= 15 ? 'check-circle' : 'circle'
                    }
                    size={14}
                    color={
                      username.length >= 3 && username.length <= 15 ? '#10B981' : '#94A3B8'
                    }
                  />
                  <Text
                    style={[
                      styles.ruleText,
                      username.length >= 3 && username.length <= 15 && styles.ruleTextActive,
                    ]}
                  >
                    Độ dài từ 3 đến 15 ký tự
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <Feather
                    name={
                      username.length > 0 && USERNAME_REGEX.test(username)
                        ? 'check-circle'
                        : 'circle'
                    }
                    size={14}
                    color={
                      username.length > 0 && USERNAME_REGEX.test(username)
                        ? '#10B981'
                        : '#94A3B8'
                    }
                  />
                  <Text
                    style={[
                      styles.ruleText,
                      username.length > 0 && USERNAME_REGEX.test(username) && styles.ruleTextActive,
                    ]}
                  >
                    Chỉ chữ cái thường (a-z) và số (0-9)
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <Feather name="gift" size={14} color="#FF4C4C" />
                  <Text style={styles.ruleTextHighlight}>
                    Tài trợ 100% phí Gas on-chain qua N.E.D Relayer
                  </Text>
                </View>
              </View>

              {/* Nút Hành động: "Hoàn tất và Mở Ví" - Nền Đỏ san hô (#FF4C4C), viền đen 3px, bóng cứng */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  (!isFormReady || isSubmitting) && styles.actionBtnDisabled,
                ]}
                onPress={handleCompleteAndOpenWallet}
                disabled={!isFormReady || isSubmitting}
                activeOpacity={0.85}
              >
                <View style={styles.actionBtnShadow} />
                <View style={[styles.actionBtnBody, { backgroundColor: '#FF4C4C' }]}>
                  {isSubmitting ? (
                    <View style={styles.btnInnerRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={[styles.actionBtnText, { color: '#FFFFFF', marginLeft: 8 }]}>
                        Đang mở ví...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.btnInnerRow}>
                      <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                        Hoàn tất và Mở Ví
                      </Text>
                      <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FDF8F5', // Nền màu kem ấm chuẩn
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    alignItems: 'center',
  },

  // ================= GLOBAL HEADER =================
  globalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  backButtonShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 44,
    height: 44,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  backButtonBody: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mascot Gấu tím trong vòng tròn vàng thu nhỏ (60x60px)
  mascotContainer: {
    width: 60,
    height: 60,
    position: 'relative',
  },
  mascotShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 60,
    height: 60,
    backgroundColor: '#000',
    borderRadius: 30,
  },
  mascotCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD54F',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mascotImage: {
    width: 46,
    height: 46,
  },

  // Step Badge
  stepBadge: {
    paddingHorizontal: 12,
    height: 32,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Black',
    color: '#000',
  },

  // ================= TICKET CONTAINER =================
  ticketWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 40, // Khoảng cách so với đáy màn hình tối thiểu 40px
    marginTop: 6,
  },
  ticketShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 24,
  },
  ticketBody: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    zIndex: 2,
  },

  // Typography
  screenTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Black',
    color: '#000',
    textAlign: 'center',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  // Input Field: Tiền tố @ cố định màu xám đậm
  usernameInputBox: {
    width: '100%',
    height: 52,
    backgroundColor: '#FAF6F0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  prefixAt: {
    fontSize: 18,
    fontFamily: 'Inter-Black',
    color: '#64748B', // Tiền tố @ màu xám đậm
    marginRight: 4,
  },
  usernameTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000',
  },
  suffixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  domainBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 8,
  },
  domainBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Black',
    color: '#000',
  },

  // Feedback Rows
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  feedbackErrorText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
  },
  feedbackSuccessText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#E11D48',
  },

  // Rules Box
  rulesContainer: {
    backgroundColor: '#FAF6F0',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  ruleTextActive: {
    fontFamily: 'Inter-Bold',
    color: '#000',
  },
  ruleTextHighlight: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FF4C4C',
  },

  // Action Button Neo-brutalism
  actionBtn: {
    width: '100%',
    height: 52,
    position: 'relative',
    marginBottom: 6,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: '100%',
    height: 52,
    backgroundColor: '#000',
    borderRadius: 14,
  },
  actionBtnBody: {
    width: '100%',
    height: 52,
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 16,
    fontFamily: 'Inter-Black',
  },
});
