import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import {
  lookupWalletByPhone,
  resolveIdentityOnchain,
  normalizeIdentityInput,
  getUserPhoneNumberFromDB,
  isSamePhoneNumber,
  getAccountIdentifier,
  getMaskedPhone,
  resolveActiveSolanaAddress,
} from '../services/identity';
import {
  searchUsersOffchain,
  UserSearchResult,
} from '../services/supabase';
import {
  getSolanaBalance,
  getAccountDisplayBalance,
  AccountDisplayBalance,
  ActivityItem,
  formatFiatBalance,
  USD_TO_VND_RATE,
} from '../services/solana';
import { cacheActivities, getCachedActivities, getLinkedPhone } from '../services/storage';
import { useOnchainTransfer } from '../hooks/useOnchainTransfer';
import { WalletRecoveryModal } from '../components/WalletRecoveryModal';
import { useTranslation } from '../services/i18n';
import { useUserStore } from '../stores/useUserStore';
import { useExternalWallet } from '../src/providers/WalletProvider';

/**
 * 🎨 Component NeoCard: Hỗ trợ tạo Thẻ viền đen đậm với Bóng đổ cứng (Hard Shadow)
 * Hoàn toàn không bị nhòe/blur trên cả Android và iOS.
 */
interface NeoCardProps {
  children: React.ReactNode;
  shadowColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  offset?: number;
  style?: any;
  containerStyle?: any;
}

const NeoCard: React.FC<NeoCardProps> = ({
  children,
  shadowColor = '#000000',
  backgroundColor = '#FFFFFF',
  borderColor = '#000000',
  borderWidth = 2.5,
  borderRadius = 22,
  offset = 4,
  style,
  containerStyle,
}) => {
  return (
    <View style={[{ position: 'relative', marginVertical: 8 }, containerStyle]}>
      {/* Hard Shadow Layer */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: shadowColor,
            borderRadius,
            top: offset,
            left: offset,
            borderWidth: 0,
          },
        ]}
      />
      {/* Front Card Layer */}
      <View
        style={[
          {
            backgroundColor,
            borderColor,
            borderWidth,
            borderRadius,
            padding: 18,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

export default function SendScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { user, isReady, logout } = usePrivy();
  const externalWallet = useExternalWallet();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const {
    transfer,
    isTransferring,
    isWalletReady,
    needsRecovery,
    walletStatus,
  } = useOnchainTransfer();

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  const [searchInput, setSearchInput] = useState((params.recipient as string) || '');
  const [debouncedInput, setDebouncedInput] = useState((params.recipient as string) || '');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [isLockedRecipient, setIsLockedRecipient] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(null);
  const [resolvedIdentity, setResolvedIdentity] = useState<{
    type: 'wallet' | 'phone' | 'username';
    label: string;
    maskedWallet: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [amount, setAmount] = useState('5');
  const [availableUsd, setAvailableUsd] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [accountBalanceState, setAccountBalanceState] = useState<AccountDisplayBalance | null>(null);
  const [myPhone, setMyPhone] = useState<string | null>(null);

  // Lấy địa chỉ ví người dùng hiện tại theo độ ưu tiên: Embedded Wallet -> Store -> Linked Accounts
  const getMySolanaAddress = (): string | null => {
    return resolveActiveSolanaAddress(
      user,
      externalWallet,
      solanaWalletState,
      useUserStore.getState().walletAddress
    );
  };

  const myAddress = getMySolanaAddress();

  // Nạp SĐT và số dư on-chain (USDT/USDC/SOL) của chính người dùng
  const refreshUserData = async () => {
    if (myAddress) {
      try {
        const displayBal = await getAccountDisplayBalance(myAddress, true);
        setAvailableUsd(displayBal.usdBalance);
        setSolBalance(displayBal.solBalance);
        setAccountBalanceState(displayBal);
      } catch (e) {
        console.log('Error fetching display balance in send:', e);
      }
    }
    const cachedPhone = await getLinkedPhone();
    if (cachedPhone) setMyPhone(cachedPhone);
    if (user?.id) {
      const dbPhone = await getUserPhoneNumberFromDB(user.id);
      if (dbPhone) setMyPhone(dbPhone);
    }
  };

  useEffect(() => {
    refreshUserData();

    // Tự động đồng bộ số dư mỗi 8 giây
    const interval = setInterval(() => {
      if (myAddress) {
        getAccountDisplayBalance(myAddress)
          .then((bal) => {
            setAvailableUsd(bal.usdBalance);
            setSolBalance(bal.solBalance);
            setAccountBalanceState(bal);
          })
          .catch(() => {});
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [myAddress, user]);

  // 1. Debounce 500ms chống spam RPC / API
  useEffect(() => {
    if (isLockedRecipient) return;

    const handler = setTimeout(() => {
      setDebouncedInput(searchInput.trim());
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, isLockedRecipient]);

  // 2. Tra cứu danh tính Off-chain qua Supabase với Fallback On-chain
  useEffect(() => {
    if (isLockedRecipient) return;

    if (!debouncedInput) {
      setResolvedAddress(null);
      setResolvedPhone(null);
      setResolvedIdentity(null);
      setSearchResults([]);
      setSelectedUser(null);
      setSearchError('');
      setIsLoadingLookup(false);
      return;
    }

    const parsed = normalizeIdentityInput(debouncedInput);

    // Chặn 1: Người dùng nhập chính SĐT của mình
    if (parsed.type === 'phone' && myPhone && isSamePhoneNumber(parsed.normalized, myPhone)) {
      setResolvedAddress(null);
      setResolvedPhone(null);
      setResolvedIdentity(null);
      setSearchResults([]);
      setSearchError(t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình' }));
      setIsLoadingLookup(false);
      return;
    }

    // Chặn 2: Người dùng nhập chính địa chỉ ví của mình
    if (
      myAddress &&
      (debouncedInput.toLowerCase() === myAddress.toLowerCase() ||
        parsed.normalized.toLowerCase() === myAddress.toLowerCase())
    ) {
      setResolvedAddress(null);
      setResolvedPhone(null);
      setResolvedIdentity(null);
      setSearchResults([]);
      setSearchError(t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình' }));
      setIsLoadingLookup(false);
      return;
    }

    // Trường hợp 1: Nhập trực tiếp địa chỉ Base58 hợp lệ
    if (parsed.type === 'wallet') {
      setResolvedAddress(parsed.normalized);
      setResolvedPhone(null);
      setSearchResults([]);
      setResolvedIdentity({
        type: 'wallet',
        label: 'Địa chỉ ví Solana',
        maskedWallet: `${parsed.normalized.slice(0, 4)}...${parsed.normalized.slice(-4)}`,
      });
      setSearchError('');
      setIsLoadingLookup(false);
      return;
    }

    // Trường hợp 2: Tra cứu Off-chain qua Supabase Database
    let isMounted = true;
    setIsLoadingLookup(true);
    setSearchError('');

    searchUsersOffchain(debouncedInput)
      .then(async (users) => {
        if (!isMounted) return;

        if (users && users.length > 0) {
          const filtered = users.filter((u) => {
            if (myAddress && u.wallet_address.toLowerCase() === myAddress.toLowerCase()) {
              return false;
            }
            if (myPhone && u.phone_number && isSamePhoneNumber(u.phone_number, myPhone)) {
              return false;
            }
            return true;
          });

          if (filtered.length > 0) {
            setSearchResults(filtered);
            setSearchError('');
            setIsLoadingLookup(false);
            return;
          }
        }

        // Trường hợp 3: Fallback tra cứu On-chain PDA nếu Supabase chưa có bản ghi
        console.log('ℹ️ [Off-chain Search] Thử fallback tra cứu On-chain PDA:', debouncedInput);
        try {
          const onchainRes = await resolveIdentityOnchain(debouncedInput);
          if (!isMounted) return;
          setIsLoadingLookup(false);

          if (onchainRes.success && onchainRes.walletAddress) {
            if (myAddress && onchainRes.walletAddress.toLowerCase() === myAddress.toLowerCase()) {
              setResolvedAddress(null);
              setResolvedPhone(null);
              setResolvedIdentity(null);
              setSearchResults([]);
              setSearchError(t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình' }));
            } else {
              setResolvedAddress(onchainRes.walletAddress);
              setSearchResults([]);
              if (onchainRes.type === 'phone') {
                setResolvedPhone(onchainRes.normalized || debouncedInput);
              }
              const label =
                onchainRes.type === 'phone'
                  ? getMaskedPhone(onchainRes.normalized)
                  : `@${onchainRes.normalized}.sol`;
              const maskedWallet = `${onchainRes.walletAddress.slice(0, 4)}...${onchainRes.walletAddress.slice(-4)}`;

              setResolvedIdentity({
                type: onchainRes.type || 'username',
                label,
                maskedWallet,
              });
              setSearchError('');
            }
          } else {
            setResolvedAddress(null);
            setResolvedPhone(null);
            setResolvedIdentity(null);
            setSearchResults([]);
            setSearchError(t('send.notFound', { defaultValue: 'Không tìm thấy người dùng định danh này' }));
          }
        } catch (onchainErr) {
          if (!isMounted) return;
          setIsLoadingLookup(false);
          setResolvedAddress(null);
          setResolvedPhone(null);
          setResolvedIdentity(null);
          setSearchResults([]);
          setSearchError(t('send.notFound', { defaultValue: 'Không tìm thấy người dùng định danh này' }));
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoadingLookup(false);
        setSearchResults([]);
        setSearchError('Lỗi kết nối khi tìm kiếm người nhận');
        console.error('Off-chain search error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedInput, myAddress, myPhone, isLockedRecipient, t]);

  // Xử lý khi người dùng chọn 1 kết quả từ Autocomplete Dropdown
  const handleSelectUser = (item: UserSearchResult) => {
    setIsLoadingLookup(false);
    if (myAddress && item.wallet_address.toLowerCase() === myAddress.toLowerCase()) {
      setSearchError(t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình' }));
      return;
    }
    if (myPhone && item.phone_number && isSamePhoneNumber(item.phone_number, myPhone)) {
      setSearchError(t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình' }));
      return;
    }

    const masked = `${item.wallet_address.slice(0, 4)}...${item.wallet_address.slice(-4)}`;
    setResolvedAddress(item.wallet_address);
    setSelectedUser(item);
    setIsLockedRecipient(true);
    setSearchResults([]);
    setSearchError('');
    setSearchInput(`@${item.username}.sol`);
    setResolvedIdentity({
      type: 'username',
      label: `@${item.username}.sol`,
      maskedWallet: masked,
      avatarUrl: item.avatar_url,
    });
  };

  // Mở khóa ô nhập liệu để tìm kiếm lại người nhận khác
  const handleResetRecipient = () => {
    setIsLoadingLookup(false);
    setIsLockedRecipient(false);
    setSelectedUser(null);
    setResolvedAddress(null);
    setResolvedPhone(null);
    setResolvedIdentity(null);
    setSearchResults([]);
    setSearchInput('');
    setSearchError('');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('deposit.copiedAlert', { defaultValue: 'Đã sao chép vào bộ nhớ tạm!' })
      );
    } catch (e) {
      console.log('Copy error:', e);
    }
  };

  // THỰC THI GIAO DỊCH 100% ON-CHAIN GASLESS
  const handleSendTransaction = async () => {
    if (needsRecovery) {
      setShowRecoveryModal(true);
      return;
    }

    if (!myAddress) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('deposit.noAddress', { defaultValue: 'Không tìm thấy địa chỉ tài khoản người gửi.' })
      );
      return;
    }

    const recipientInput = (resolvedAddress || searchInput).trim();
    if (!recipientInput) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('send.invalidRecipient', { defaultValue: 'Vui lòng nhập số điện thoại hoặc tài khoản người nhận.' })
      );
      return;
    }

    // Chặn người dùng tự chuyển cho bản thân
    if (myAddress && recipientInput.toLowerCase() === myAddress.toLowerCase()) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Không thể thực hiện ⚠️' }),
        t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' })
      );
      return;
    }

    if (myPhone && isSamePhoneNumber(recipientInput, myPhone)) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Không thể thực hiện ⚠️' }),
        t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' })
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('send.invalidAmount', { defaultValue: 'Vui lòng nhập số tiền hợp lệ (lớn hơn 0).' })
      );
      return;
    }

    try {
      const result = await transfer({
        fromAddress: myAddress,
        recipientAddressOrPhone: recipientInput,
        amountUsd: numAmount,
      });

      if (!result.success || !result.transactionHash) {
        const errorMsg = result.error || 'Không thể thực hiện chuyển tiền.';
        if (
          errorMsg.includes('timeout') ||
          errorMsg.includes('user-signer') ||
          errorMsg.includes('WebView')
        ) {
          Alert.alert(
            t('settings.resetTitle', { defaultValue: 'Phiên làm việc bị gián đoạn ⚠️' }),
            t('settings.resetMsg', { defaultValue: 'Phiên kết nối đang bị treo. Bạn có muốn làm mới phiên đăng nhập ngay?' }),
            [
              { text: t('settings.cancel', { defaultValue: 'Đóng' }), style: 'cancel' },
              {
                text: t('settings.confirmReset', { defaultValue: 'Làm mới ngay' }),
                style: 'destructive',
                onPress: async () => {
                  const { executeHardReset } = await import('../services/storage');
                  await executeHardReset(logout);
                  router.replace('/login');
                },
              },
            ]
          );
          return;
        }

        Alert.alert(t('send.failedTitle', { defaultValue: 'Chuyển tiền chưa hoàn tất ❌' }), errorMsg);
        return;
      }

      const txSignature = result.transactionHash;
      const finalRecipient = result.recipientAddress || recipientInput;

      // Lưu log lịch sử giao dịch on-chain vào cache
      const currentActs = (await getCachedActivities()) || [];
      const newAct: ActivityItem = {
        id: txSignature,
        type: 'sent',
        title: 'Chuyển tiền',
        time: 'Vừa xong',
        amount: `-$${numAmount.toFixed(2)}`,
        isPositive: false,
        iconBg: '#374151',
        signature: txSignature,
        blockTime: Math.floor(Date.now() / 1000),
      };
      await cacheActivities([newAct, ...currentActs]);

      const recipientDisplayName = resolvedIdentity?.label
        ? resolvedIdentity.label
        : resolvedPhone
        ? getMaskedPhone(resolvedPhone)
        : getAccountIdentifier(null, finalRecipient);

      // Cập nhật lại số dư ngay lập tức sau khi chuyển thành công
      refreshUserData();

      Alert.alert(
        t('send.successTitle', { defaultValue: 'Chuyển Tiền Thành Công! ⚡' }),
        `Đã chuyển $${numAmount.toFixed(2)} (${(numAmount * USD_TO_VND_RATE).toLocaleString('vi-VN')} ₫) đến:\n${recipientDisplayName}\n\nMã giao dịch: ${txSignature.slice(0, 16)}...`,
        [{ text: t('tabs.home', { defaultValue: 'Về Trang Chủ' }), onPress: () => router.replace('/') }]
      );
    } catch (err: any) {
      console.error('Send Transaction Error:', err);
      Alert.alert(t('send.failedTitle', { defaultValue: 'Lỗi Giao Dịch' }), err?.message || 'Không thể thực hiện chuyển tiền.');
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const vndEquivalent = Math.round(parsedAmount * USD_TO_VND_RATE);

  // Bảo vệ giao diện: Chỉ render khi ví hoặc tài khoản đã sẵn sàng
  const isAuthenticated = Boolean(
    user ||
      externalWallet?.connected ||
      externalWallet?.publicKey ||
      useUserStore.getState().walletAddress
  );

  if (!isAuthenticated && !isReady) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={{ marginTop: 12, color: '#334155', fontWeight: '700' }}>
          {t('activities.loading', { defaultValue: 'Đang xác thực phiên đăng nhập...' })}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4FBFB" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          {/* Circular Neo-Brutalism Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtnWrapper}
            activeOpacity={0.8}
          >
            <View style={styles.backBtnShadow} />
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={20} color="#000000" />
            </View>
          </TouchableOpacity>

          {/* Bold Header Title with Neo-brutalism Text Shadow */}
          <Text style={styles.headerTitle}>Transfer Money</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ================= KHỐI 1: RECIPIENT CARD ================= */}
          <NeoCard
            backgroundColor="#FFFFFF"
            shadowColor="#000000"
            borderColor="#000000"
            borderWidth={2.5}
            borderRadius={22}
            offset={4}
          >
            <Text style={styles.cardLabel}>Recipient (Phone or Account):</Text>

            {/* Input Box màu Beige/Hồng nhạt (#FDF5E6) với viền đen */}
            <View
              style={[
                styles.recipientInputContainer,
                isLockedRecipient && styles.recipientInputContainerLocked,
                searchError && styles.recipientInputContainerError,
              ]}
            >
              <View style={styles.recipientInputPrefix}>
                <Ionicons
                  name={isLockedRecipient ? 'checkmark-circle' : 'search-outline'}
                  size={18}
                  color={isLockedRecipient ? '#10B981' : '#64748B'}
                />
              </View>

              <TextInput
                style={[
                  styles.recipientTextInput,
                  isLockedRecipient && styles.recipientTextInputLocked,
                ]}
                placeholder="Enter recipient phone number..."
                placeholderTextColor="#94A3B8"
                value={searchInput}
                onChangeText={setSearchInput}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLockedRecipient}
              />

              <View style={styles.recipientActionCol}>
                {isLoadingLookup ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : isLockedRecipient ? (
                  <TouchableOpacity
                    onPress={handleResetRecipient}
                    style={styles.resetPillBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={16} color="#000000" />
                  </TouchableOpacity>
                ) : searchInput.length > 0 ? (
                  <TouchableOpacity
                    onPress={handleResetRecipient}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Error Message */}
            {searchError ? (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{searchError}</Text>
              </View>
            ) : null}

            {/* Autocomplete Dropdown List */}
            {searchResults.length > 0 && !isLockedRecipient && (
              <View style={styles.dropdownBox}>
                <Text style={styles.dropdownSectionLabel}>
                  Gợi ý người nhận ({searchResults.length}):
                </Text>
                {searchResults.map((item, idx) => {
                  const masked = `${item.wallet_address.slice(0, 4)}...${item.wallet_address.slice(-4)}`;
                  const initial = (item.username || '?').charAt(0).toUpperCase();

                  return (
                    <TouchableOpacity
                      key={item.id || item.wallet_address || idx}
                      style={[
                        styles.dropdownItemRow,
                        idx === searchResults.length - 1 && styles.dropdownItemRowLast,
                      ]}
                      onPress={() => handleSelectUser(item)}
                      activeOpacity={0.7}
                    >
                      {/* Avatar */}
                      <View style={styles.dropdownAvatarCircle}>
                        {item.avatar_url ? (
                          <Image
                            source={{ uri: item.avatar_url }}
                            style={styles.dropdownAvatarImg}
                          />
                        ) : (
                          <Text style={styles.dropdownAvatarLetter}>{initial}</Text>
                        )}
                      </View>

                      {/* Info */}
                      <View style={styles.dropdownInfoCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.dropdownUsernameText}>@{item.username}.sol</Text>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#10B981"
                            style={{ marginLeft: 4 }}
                          />
                        </View>
                        <Text style={styles.dropdownSubText}>
                          Ví: {masked}
                          {item.phone_number ? ` • ${getMaskedPhone(item.phone_number)}` : ''}
                        </Text>
                      </View>

                      <Feather name="arrow-up-right" size={16} color="#000000" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Recipient Locked Display */}
            {isLockedRecipient && resolvedAddress && (
              <View style={styles.lockedCardInner}>
                <View style={styles.lockedUserRow}>
                  <View style={styles.lockedAvatarCircle}>
                    {resolvedIdentity?.avatarUrl || selectedUser?.avatar_url ? (
                      <Image
                        source={{ uri: (resolvedIdentity?.avatarUrl || selectedUser?.avatar_url)! }}
                        style={styles.lockedAvatarImg}
                      />
                    ) : (
                      <Text style={styles.lockedAvatarLetter}>
                        {(resolvedIdentity?.label || selectedUser?.username || 'U')
                          .replace('@', '')
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.lockedNameText}>
                      {resolvedIdentity?.label || `@${selectedUser?.username}.sol`}
                    </Text>
                    <Text style={styles.lockedSubText}>
                      {resolvedIdentity?.maskedWallet ||
                        `${resolvedAddress.slice(0, 4)}...${resolvedAddress.slice(-4)}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.lockedChangeBtn}
                    onPress={handleResetRecipient}
                  >
                    <Text style={styles.lockedChangeBtnText}>Đổi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </NeoCard>

          {/* ================= KHỐI 2: AMOUNT CARD (LAVENDER HARD SHADOW) ================= */}
          <NeoCard
            backgroundColor="#FFFFFF"
            shadowColor="#DDD6FE" /* Bóng đổ cứng màu tím nhạt Lavender đặc trưng (#DDD6FE / #E6E6FA) */
            borderColor="#000000"
            borderWidth={2.5}
            borderRadius={22}
            offset={5}
            containerStyle={{ marginTop: 12 }}
          >
            {/* Balance Badge ở góc trái trên */}
            <View style={styles.balanceBadgeRow}>
              <View style={styles.balancePill}>
                <Text style={styles.balancePillText}>
                  Khả dụng: {formatFiatBalance(availableUsd, 'USD')}
                </Text>
              </View>
            </View>

            {/* Ô nhập tiền chữ siêu to + Badge USD màu Cyan viền đen */}
            <View style={styles.amountInputCard}>
              <Text style={styles.amountDollarSign}>$ </Text>
              <TextInput
                style={styles.amountBigTextInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="5"
                placeholderTextColor="#94A3B8"
              />
              <View style={styles.usdBadge}>
                <Text style={styles.usdBadgeText}>USD</Text>
              </View>
            </View>

            {/* Dòng quy đổi tỉ giá */}
            <Text style={styles.exchangeRateText}>
              ≈ {vndEquivalent.toLocaleString('vi-VN')}đ ($1 = 25.000 đ)
            </Text>

            {/* Freeship Badge (Viên thuốc màu Cyan + Icon tia sét đen) */}
            <View style={styles.freeshipRow}>
              <View style={styles.freeshipBadge}>
                <Ionicons name="flash" size={14} color="#000000" />
                <Text style={styles.freeshipText}>Miễn phí chuyển tiền</Text>
              </View>
            </View>

            {/* Hàng nút Chọn tiền nhanh (Quick Select Pills) */}
            <View style={styles.quickSelectRow}>
              {['2', '5', '10', '20'].map((val) => {
                const isActive = amount === val;
                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.quickSelectPill,
                      isActive && styles.quickSelectPillActive,
                    ]}
                    onPress={() => setAmount(val)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.quickSelectText,
                        isActive && styles.quickSelectTextActive,
                      ]}
                    >
                      ${val}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </NeoCard>

          <View style={{ height: 20 }} />

          {/* ================= KHỐI 3: ACTION CARD (BOTTOM CONFIRM BUTTON) ================= */}
          <NeoCard
            backgroundColor="#FFFFFF"
            shadowColor="#000000"
            borderColor="#000000"
            borderWidth={2.5}
            borderRadius={20}
            offset={4}
            containerStyle={{ marginTop: 'auto', marginBottom: 16 }}
            style={{ padding: 12 }}
          >
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!resolvedAddress ||
                  !!searchError ||
                  isTransferring ||
                  isLoadingLookup ||
                  !isWalletReady) &&
                  styles.confirmBtnDisabled,
              ]}
              onPress={handleSendTransaction}
              disabled={
                !isWalletReady ||
                !resolvedAddress ||
                !!searchError ||
                isTransferring ||
                isLoadingLookup
              }
              activeOpacity={0.88}
            >
              {isTransferring ? (
                <View style={styles.confirmBtnInner}>
                  <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmBtnText}>
                    {t('send.sendingButton', { defaultValue: 'Đang thực hiện chuyển...' })}
                  </Text>
                </View>
              ) : (
                <View style={styles.confirmBtnInner}>
                  <Feather name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmBtnText}>Confirm Transfer</Text>
                </View>
              )}
            </TouchableOpacity>
          </NeoCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <WalletRecoveryModal
        visible={showRecoveryModal || needsRecovery}
        onClose={() => setShowRecoveryModal(false)}
        onSuccess={() => setShowRecoveryModal(false)}
      />
    </SafeAreaView>
  );
}

// ==========================================
// 🎨 NEO-BRUTALISM STYLESHEET
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FBFB', // Nền xanh mint/cyan rất nhạt theo đúng thiết kế
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtnWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  backBtnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#000000',
  },
  backBtnInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.18)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  // Khối 1: Recipient Card
  cardLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  recipientInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF5E6', // Nền màu beige/hồng nhạt theo yêu cầu
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000000',
    height: 52,
    paddingHorizontal: 12,
  },
  recipientInputContainerLocked: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  recipientInputContainerError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  recipientInputPrefix: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientTextInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#000000',
    height: '100%',
  },
  recipientTextInputLocked: {
    color: '#047857',
    fontWeight: '700',
  },
  recipientActionCol: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  resetPillBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
    flex: 1,
  },

  // Dropdown Autocomplete
  dropdownBox: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 10,
  },
  dropdownSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemRowLast: {
    borderBottomWidth: 0,
  },
  dropdownAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E7FF',
    borderWidth: 1.8,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dropdownAvatarImg: {
    width: '100%',
    height: '100%',
  },
  dropdownAvatarLetter: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3730A3',
  },
  dropdownInfoCol: {
    flex: 1,
    marginLeft: 10,
  },
  dropdownUsernameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  dropdownSubText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },

  // Locked Recipient Inner Card
  lockedCardInner: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.8,
    borderColor: '#000000',
    padding: 10,
  },
  lockedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DDD6FE',
    borderWidth: 1.8,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lockedAvatarImg: {
    width: '100%',
    height: '100%',
  },
  lockedAvatarLetter: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4C1D95',
  },
  lockedNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  lockedSubText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  lockedChangeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.8,
    borderColor: '#000000',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lockedChangeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },

  // Khối 2: Amount Card
  balanceBadgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  balancePill: {
    backgroundColor: '#8B5CF6', // Tím chuẩn theo thiết kế
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.8,
    borderColor: '#000000',
  },
  balancePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  amountInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#000000',
    height: 60,
    paddingHorizontal: 14,
  },
  amountDollarSign: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000000',
  },
  amountBigTextInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '900',
    color: '#000000',
    height: '100%',
  },
  usdBadge: {
    backgroundColor: '#00FFFF', // Màu Cyan theo đúng thiết kế
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  usdBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  exchangeRateText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 8,
    marginBottom: 12,
  },
  freeshipRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  freeshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00FFFF', // Viên thuốc màu Cyan
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  freeshipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickSelectPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSelectPillActive: {
    backgroundColor: '#8B5CF6', // Đổi sang nền tím khi active
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  quickSelectTextActive: {
    color: '#FFFFFF',
  },

  // Khối 3: Action Card
  confirmBtn: {
    height: 52,
    backgroundColor: '#35165E', // Nền tím đậm Dark Purple
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.65,
  },
  confirmBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
