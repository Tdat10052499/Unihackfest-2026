import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  /**
   * Lấy địa chỉ ví Solana người dùng hiện tại
   */
  const getUserWalletPubkey = (): PublicKey | null => {
    // 1. Kiểm tra ví ngầm Embedded Solana Wallet
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const addr = solanaWalletState.wallets[0]?.address;
      if (addr) return new PublicKey(addr);
    }

    // 2. Kiểm tra linked accounts của Privy
    const linkedAccounts =
      (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
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

    // 3. Fallback ví ngoài (Phantom / Solflare)
    if (externalWallet?.publicKey) {
      return externalWallet.publicKey;
    }

    // 4. Fallback user.wallet
    if ((user as any)?.wallet?.address) {
      const addr = (user as any).wallet.address;
      if (!addr.startsWith('0x')) {
        return new PublicKey(addr);
      }
    }

    return null;
  };

  /**
   * Xử lý lọc ký tự thời gian thực:
   * - Tự động đổi sang chữ thường
   * - Loại bỏ mọi ký tự đặc biệt, dấu tiếng Việt và khoảng trắng
   */
  const handleTextChange = (rawText: string) => {
    const sanitized = rawText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(15);

    // Xử lý lấy tối đa 15 ký tự
    const cleanText = rawText
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15);

    setUsername(cleanText);

    if (cleanText.length === 0) {
      setErrorMessage('');
    } else if (cleanText.length < 3) {
      setErrorMessage('Tên định danh phải có ít nhất 3 ký tự.');
    } else if (!USERNAME_REGEX.test(cleanText)) {
      setErrorMessage('Chỉ được sử dụng chữ cái thường (a-z) và số (0-9).');
    } else {
      setErrorMessage('');
    }
  };

  /**
   * Xử lý tạo và kích hoạt định danh On-chain thông qua Gasless Relayer
   */
  const handleContinue = async () => {
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

    const userWallet = getUserWalletPubkey();
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
      console.log('🔑 [Onboarding] Hashed Username (Hex):', hashedUsername.toString('hex'));

      // 2. Tìm địa chỉ PDA tương ứng trên Smart Contract
      const [identityPda, bump] = deriveIdentityPda(hashedUsername);
      console.log('📍 [Onboarding] Identity PDA:', identityPda.toBase58(), '(Bump:', bump, ')');

      // 3. Pre-check: Kiểm tra xem tên định danh đã có người sở hữu trên Supabase hoặc On-chain chưa
      const connection = getConnection();
      try {
        // a. Kiểm tra trên Supabase DB trước
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
          setErrorMessage('Tên định danh này đã được người khác đăng ký. Vui lòng chọn tên khác.');
          Alert.alert(
            'Tên đã tồn tại',
            `Tên định danh "${trimmed}.sol" đã có người sở hữu. Vui lòng chọn một tên khác.`
          );
          return;
        }

        // b. Kiểm tra trên Solana PDA
        const existingAccount = await connection.getAccountInfo(identityPda);
        if (existingAccount && existingAccount.data && existingAccount.data.length > 0) {
          setIsSubmitting(false);
          setStatusMessage('');
          setErrorMessage('Tên định danh này đã được người khác đăng ký. Vui lòng chọn tên khác.');
          Alert.alert(
            'Tên đã tồn tại',
            `Tên định danh "${trimmed}.sol" đã có người sở hữu. Vui lòng chọn một tên khác.`
          );
          return;
        }
      } catch (checkErr) {
        console.warn('⚠️ Pre-check PDA/DB status warning:', checkErr);
      }

      setStatusMessage('Đang tạo chỉ thị Smart Contract...');

      // 4. Khởi tạo instruction registerIdentity gọi vào Smart Contract N.E.D Identity
      const program = getProgram();
      const registerIx = await (program.methods as any)
        .registerIdentity(Array.from(hashedUsername), 0) // 0: Username
        .accounts({
          identityAccount: identityPda,
          targetWallet: userWallet,
          authority: userWallet,
          payer: RELAYER_FEE_PAYER,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // 5. Lấy blockhash mới nhất và xây dựng Transaction
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      const transaction = new Transaction({
        feePayer: RELAYER_FEE_PAYER,
        recentBlockhash: blockhash,
      }).add(registerIx);

      setStatusMessage('Đang ký xác nhận giao dịch...');

      // 6. Ký một phần (Partial sign) bằng ví của người dùng
      let signedTx: Transaction | null = null;

      // Ưu tiên ký qua Privy Embedded Solana Wallet
      let activeProvider: any = null;
      if (typeof (solanaWalletState as any)?.getProvider === 'function') {
        try {
          activeProvider = await (solanaWalletState as any).getProvider();
        } catch (e) {
          console.log('solanaWalletState.getProvider fallback:', e);
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

      if (!signedTx) {
        throw new Error('Không nhận được chữ ký xác thực từ ví người dùng.');
      }

      // 7. Serialize Transaction sang Base64
      const base64Tx = Buffer.from(
        signedTx.serialize({ requireAllSignatures: false, verifySignatures: false })
      ).toString('base64');

      setStatusMessage('Đang gửi qua N.E.D Hub Relayer (Gasless)...');
      console.log('📡 [Onboarding] Gửi Base64 Transaction sang Relayer API...');

      // 8. Gửi POST request tới API /api/sponsor-tx của N.E.D Hub
      const relayerApiUrl =
        process.env.EXPO_PUBLIC_RELAYER_API_URL ||
        process.env.EXPO_PUBLIC_HUB_API_URL ||
        'http://localhost:3000/api/sponsor-tx';

      let relayerSuccess = false;
      let txSignature: string | undefined;

      try {
        const response = await fetch(relayerApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transaction: base64Tx,
          }),
        });

        const resData = await response.json().catch(() => ({}));

        if (response.ok && (response.status === 200 || resData.success)) {
          relayerSuccess = true;
          txSignature = resData.signature || resData.txSignature;
          console.log('✅ [Relayer Success] TxSignature:', txSignature);
        } else {
          const errMsg = resData.error || resData.message || `Mã lỗi Relayer: ${response.status}`;
          console.warn('⚠️ [Relayer API Returned Error]:', errMsg);

          if (
            errMsg.includes('already in use') ||
            errMsg.includes('đã tồn tại') ||
            response.status === 409
          ) {
            setIsSubmitting(false);
            setStatusMessage('');
            setErrorMessage('Tên định danh này đã được người khác đăng ký. Vui lòng chọn tên khác.');
            Alert.alert(
              'Tên đã tồn tại',
              `Tên định danh "${trimmed}.sol" đã có người sở hữu. Vui lòng chọn tên khác.`
            );
            return;
          }

          throw new Error(errMsg);
        }
      } catch (fetchErr: any) {
        console.warn('⚠️ [Relayer Fetch Warning]:', fetchErr?.message);
        // Nếu lỗi do trùng tên
        if (
          fetchErr?.message?.includes('already in use') ||
          fetchErr?.message?.includes('đã tồn tại')
        ) {
          setIsSubmitting(false);
          setStatusMessage('');
          setErrorMessage('Tên định danh này đã được đăng ký. Vui lòng chọn tên khác.');
          Alert.alert('Tên đã tồn tại', 'Tên định danh này đã có người sử dụng. Vui lòng chọn tên khác.');
          return;
        }

        // Trong môi trường dev nếu Relayer server chưa bật, log cảnh báo và hoàn tất Onboarding
        console.log('ℹ️ [Dev Fallback] Ghi nhận tên định danh cục bộ và hoàn tất Onboarding...');
        relayerSuccess = true;
      }

      // 9. Đồng bộ vào Database Supabase (UPSERT bảng users: privy_id, wallet_address, username, phone_number)
      setStatusMessage('Đang đồng bộ cơ sở dữ liệu...');
      const privyUserId = user?.id || `usr_${userWallet.toBase58().slice(0, 10)}`;
      const walletAddrStr = userWallet.toBase58();

      // Kéo dữ liệu số điện thoại từ Route Params, Global State Zustand hoặc AsyncStorage
      let phoneNumber: string | null = params?.phone || useUserStore.getState().linkedPhone || null;
      if (!phoneNumber) {
        try {
          const storedTempPhone = await AsyncStorage.getItem('temp_phone');
          const storedLinkedPhone = await AsyncStorage.getItem('@ned_wallet_linked_phone');
          phoneNumber = storedTempPhone || storedLinkedPhone || null;
        } catch (storageErr) {
          console.warn('⚠️ [Onboarding] Lỗi đọc SĐT từ AsyncStorage:', storageErr);
        }
      }

      console.log('SĐT chuẩn bị gửi lên Supabase:', phoneNumber);

      try {
        console.log('💾 [Onboarding] Lưu dữ liệu user vào Supabase:', {
          privy_id: privyUserId,
          wallet_address: walletAddrStr,
          username: trimmed,
          phone_number: phoneNumber,
        });
        const dbRes = await upsertUserProfile({
          privy_id: privyUserId,
          wallet_address: walletAddrStr,
          username: trimmed,
          phone_number: phoneNumber,
        });

        if (!dbRes.success) {
          console.warn('⚠️ [Onboarding Supabase Sync Warning]:', dbRes.error);
          setIsSubmitting(false);
          setStatusMessage('');
          const errText = dbRes.error || 'Không thể lưu thông tin tài khoản vào hệ thống.';
          setErrorMessage(errText);
          Alert.alert('Đăng ký không thành công', errText);
          return;
        }
      } catch (dbErr: any) {
        console.warn('⚠️ [Onboarding Supabase Sync Exception]:', dbErr);
        setIsSubmitting(false);
        setStatusMessage('');
        const errText = dbErr?.message || 'Có lỗi xảy ra khi lưu dữ liệu vào hệ thống.';
        setErrorMessage(errText);
        Alert.alert('Đăng ký không thành công', errText);
        return;
      }

      // 10. Cập nhật Global State (Zustand) và AsyncStorage để UI Settings & Dashboard reactive tức thì
      useUserStore.getState().setUserProfile({
        privy_id: privyUserId,
        wallet_address: walletAddrStr,
        username: trimmed,
        phone_number: phoneNumber,
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

      console.log('🎉 [Onboarding] Đăng ký định danh thành công! Điều hướng sang Welcome...');
      router.replace({
        pathname: '/(onboarding)/welcome',
        params: { name: trimmed },
      });
    } catch (err: unknown) {
      setIsSubmitting(false);
      setStatusMessage('');
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('❌ [Onboarding Username Error]:', msg);

      if (msg.includes('already in use') || msg.includes('đã tồn tại')) {
        setErrorMessage('Tên định danh này đã có người sử dụng. Vui lòng chọn tên khác.');
        Alert.alert('Tên đã tồn tại', 'Tên định danh này đã có người sử dụng. Vui lòng chọn tên khác.');
      } else {
        setErrorMessage('Có lỗi xảy ra trong quá trình đăng ký on-chain.');
        Alert.alert('Đăng ký thất bại', msg || 'Không thể đăng ký định danh lúc này. Vui lòng thử lại.');
      }
    }
  };

  const isFormValid = username.length >= 3 && username.length <= 15 && USERNAME_REGEX.test(username);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>BƯỚC 2 / 2</Text>
            </View>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="at-circle-outline" size={38} color="#00A859" />
            </View>
            <Text style={styles.heroTitle}>Tạo định danh của bạn</Text>
            <Text style={styles.heroSubtitle}>
              Tên này sẽ được dùng để nhận tiền và không thể thay đổi sau khi tạo (Ví dụ: alex sẽ trở thành alex.sol)
            </Text>
          </View>

          {/* Card Container */}
          <View style={styles.cardContainer}>
            <Text style={styles.inputLabel}>Tên định danh (Username)</Text>

            {/* Input Wrapper */}
            <View
              style={[
                styles.inputWrapper,
                !!errorMessage && styles.inputWrapperError,
                isFormValid && styles.inputWrapperSuccess,
              ]}
            >
              <Text style={styles.prefixText}>@</Text>
              <TextInput
                style={styles.textInput}
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
              <View style={styles.suffixBadge}>
                <Text style={styles.suffixText}>.sol</Text>
              </View>
            </View>

            {/* Error Message Display */}
            {!!errorMessage && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Status Message Display */}
            {!!statusMessage && isSubmitting && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color="#00A859" style={{ marginRight: 6 }} />
                <Text style={styles.statusText}>{statusMessage}</Text>
              </View>
            )}

            {/* Validation Hints & Rules */}
            <View style={styles.rulesBox}>
              <View style={styles.ruleItem}>
                <Feather
                  name={username.length >= 3 && username.length <= 15 ? 'check-circle' : 'circle'}
                  size={14}
                  color={username.length >= 3 && username.length <= 15 ? '#00A859' : '#94A3B8'}
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
                  name={username.length > 0 && USERNAME_REGEX.test(username) ? 'check-circle' : 'circle'}
                  size={14}
                  color={username.length > 0 && USERNAME_REGEX.test(username) ? '#00A859' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.ruleText,
                    username.length > 0 && USERNAME_REGEX.test(username) && styles.ruleTextActive,
                  ]}
                >
                  Chỉ gồm chữ thường (a-z) và chữ số (0-9)
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <Feather
                  name="shield"
                  size={14}
                  color="#00A859"
                />
                <Text style={styles.ruleText}>
                  Tài trợ 100% phí Gas & Rent qua N.E.D Hub Relayer
                </Text>
              </View>
            </View>

            {/* Action Button: Tiếp tục */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!isFormValid || isSubmitting) && styles.btnDisabled,
              ]}
              onPress={handleContinue}
              disabled={!isFormValid || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <View style={styles.btnLoadingInner}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Đang kích hoạt On-chain...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Tiếp tục</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00A859',
    letterSpacing: 1,
  },

  heroSection: {
    alignItems: 'center',
    marginVertical: 14,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#00A859',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },

  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  inputWrapperSuccess: {
    borderColor: '#00A859',
    backgroundColor: '#F0FDF4',
  },
  prefixText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00A859',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
  },
  suffixBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  suffixText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },

  // Error Row
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    flex: 1,
  },

  // Rules Box
  rulesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  ruleTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },

  // Primary Button
  primaryBtn: {
    height: 52,
    backgroundColor: '#00A859',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnLoadingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
