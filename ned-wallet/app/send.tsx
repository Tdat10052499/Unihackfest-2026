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

  // Lấy địa chỉ ví người dùng hiện tại theo độ ưu tiên: External Wallet (Phantom) -> Store -> Linked Accounts -> Embedded Wallet
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
        getAccountDisplayBalance(myAddress).then((bal) => {
          setAvailableUsd(bal.usdBalance);
          setSolBalance(bal.solBalance);
          setAccountBalanceState(bal);
        }).catch(() => {});
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
    if (myAddress && (debouncedInput.toLowerCase() === myAddress.toLowerCase() || parsed.normalized.toLowerCase() === myAddress.toLowerCase())) {
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
          // Lọc bỏ chính tài khoản của người dùng nếu có trong kết quả
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
              const label = onchainRes.type === 'phone'
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
  const isAuthenticated = Boolean(user || externalWallet?.connected || externalWallet?.publicKey || useUserStore.getState().walletAddress);
  if (!isAuthenticated && !isReady) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00A859" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>
          {t('activities.loading', { defaultValue: 'Đang xác thực phiên đăng nhập...' })}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('send.title', { defaultValue: 'Chuyển Tiền' })}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Thanh Tìm Kiếm Thông Minh (Smart Debounce Input) */}
          <View style={styles.inputSection}>
            <Text style={styles.fieldLabel}>{t('send.recipientLabel', { defaultValue: 'Người nhận:' })}</Text>
            <View
              style={[
                styles.searchBox,
                (resolvedAddress || isLockedRecipient) && styles.searchBoxSuccess,
                searchError && styles.searchBoxError,
                isLockedRecipient && styles.searchBoxLocked,
              ]}
            >
              {isLockedRecipient ? (
                <Ionicons name="lock-closed" size={18} color="#00A859" style={{ marginRight: 8 }} />
              ) : (
                <Feather name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
              )}
              <TextInput
                style={[styles.searchInput, isLockedRecipient && styles.searchInputLocked]}
                placeholder={t('send.recipientPlaceholder', { defaultValue: 'Nhập @username, SĐT hoặc ví Solana...' })}
                placeholderTextColor="#94A3B8"
                value={searchInput}
                onChangeText={setSearchInput}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLockedRecipient}
              />
              <View style={styles.rightActionBox}>
                {isLoadingLookup ? (
                  <ActivityIndicator size="small" color="#00A859" />
                ) : isLockedRecipient ? (
                  <TouchableOpacity
                    onPress={handleResetRecipient}
                    style={styles.changeActionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#00A859" />
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
          </View>

          {/* 2. Autocomplete Dropdown Danh Sách Kết Quả từ Supabase */}
          {searchResults.length > 0 && !isLockedRecipient && (
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownHeader}>
                <Feather name="users" size={13} color="#64748B" style={{ marginRight: 5 }} />
                <Text style={styles.dropdownHeaderText}>Gợi ý người nhận ({searchResults.length})</Text>
              </View>
              {searchResults.map((item, idx) => {
                const masked = `${item.wallet_address.slice(0, 4)}...${item.wallet_address.slice(-4)}`;
                const initial = (item.username || '?').charAt(0).toUpperCase();

                return (
                  <TouchableOpacity
                    key={item.id || item.wallet_address || idx}
                    style={[
                      styles.dropdownItem,
                      idx === searchResults.length - 1 && styles.dropdownItemLast,
                    ]}
                    onPress={() => handleSelectUser(item)}
                    activeOpacity={0.7}
                  >
                    {/* Avatar */}
                    <View style={styles.dropdownAvatarContainer}>
                      {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.dropdownAvatarImg} />
                      ) : (
                        <View style={styles.dropdownAvatarFallback}>
                          <Text style={styles.dropdownAvatarLetter}>{initial}</Text>
                        </View>
                      )}
                    </View>

                    {/* Details */}
                    <View style={styles.dropdownDetailsCol}>
                      <View style={styles.dropdownNameRow}>
                        <Text style={styles.dropdownUsername}>@{item.username}.sol</Text>
                        <Ionicons name="checkmark-circle" size={14} color="#00A859" style={{ marginLeft: 4 }} />
                      </View>
                      <View style={styles.dropdownSubRow}>
                        <Text style={styles.dropdownWalletText}>Ví: {masked}</Text>
                        {item.phone_number ? (
                          <Text style={styles.dropdownPhoneText}> • {getMaskedPhone(item.phone_number)}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Arrow */}
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 3. Thẻ Người Nhận Đã Chọn Kèm Tích Xanh (Locked Recipient Card) */}
          {isLockedRecipient && resolvedAddress && (
            <View style={styles.lockedRecipientCard}>
              <View style={styles.lockedHeaderRow}>
                <View style={styles.lockedStatusBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#00A859" />
                  <Text style={styles.lockedStatusText}>Đã xác thực người nhận</Text>
                </View>
                <TouchableOpacity
                  style={styles.changePillBtn}
                  onPress={handleResetRecipient}
                >
                  <Feather name="edit-2" size={12} color="#00A859" style={{ marginRight: 4 }} />
                  <Text style={styles.changePillText}>Đổi người nhận</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.lockedUserRow}>
                <View style={styles.lockedAvatarBox}>
                  {resolvedIdentity?.avatarUrl || selectedUser?.avatar_url ? (
                    <Image
                      source={{ uri: (resolvedIdentity?.avatarUrl || selectedUser?.avatar_url)! }}
                      style={styles.lockedAvatarImg}
                    />
                  ) : (
                    <View style={styles.lockedAvatarFallback}>
                      <Text style={styles.lockedAvatarLetter}>
                        {(resolvedIdentity?.label || selectedUser?.username || 'U').replace('@', '').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.lockedUserInfoCol}>
                  <Text style={styles.lockedUserName}>
                    {resolvedIdentity?.label || `@${selectedUser?.username}.sol`}
                  </Text>
                  <Text style={styles.lockedUserAddress}>
                    Ví: {resolvedIdentity?.maskedWallet || `${resolvedAddress.slice(0, 4)}...${resolvedAddress.slice(-4)}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.copyPillBtn}
                  onPress={() => copyToClipboard(resolvedAddress)}
                >
                  <Ionicons name="copy-outline" size={12} color="#15803D" style={{ marginRight: 3 }} />
                  <Text style={styles.copyPillText}>{t('deposit.copyAddress', { defaultValue: 'Sao chép' })}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 4. Trạng Thái UI: Base58 Address Trực Tiếp */}
          {!isLockedRecipient && resolvedAddress && (
            <View style={styles.successCard}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark-circle" size={22} color="#00A859" />
              </View>
              <View style={styles.successInfoCol}>
                <Text style={styles.successTitle}>
                  Nhận bởi: {resolvedIdentity?.maskedWallet || `${resolvedAddress.slice(0, 4)}...${resolvedAddress.slice(-4)}`}
                </Text>
                <Text style={styles.successAddressText}>
                  {resolvedIdentity?.label ? `Định danh: ${resolvedIdentity.label}` : 'Đã xác thực danh tính on-chain'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copyPillBtn}
                onPress={() => copyToClipboard(resolvedAddress)}
              >
                <Text style={styles.copyPillText}>{t('deposit.copyAddress', { defaultValue: 'Sao chép' })}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 5. Trạng Thái UI: Báo Lỗi Chữ Đỏ */}
          {searchError ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          ) : null}

          {/* 6. Nhập Số Tiền USD / VND */}
          <View style={[styles.inputSection, { marginTop: 18 }]}>
            <View style={styles.amountHeaderRow}>
              <Text style={styles.fieldLabel}>{t('send.amountLabel', { defaultValue: 'Số tiền chuyển:' })}</Text>
              <Text style={styles.balanceHintText}>
                Khả dụng: {formatFiatBalance(availableUsd, 'USD')}
              </Text>
            </View>

            <View style={styles.amountInputRow}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="5.00"
                placeholderTextColor="#94A3B8"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyBadgeText}>USD</Text>
              </View>
            </View>

            {/* Dòng quy đổi tỷ giá VND thời gian thực & Gasless Badge */}
            <View style={styles.rateHintRow}>
              <Text style={styles.rateHintText}>
                ≈ {vndEquivalent.toLocaleString('vi-VN')} ₫ ($1 = 25.000 ₫)
              </Text>
              <View style={styles.gaslessBadge}>
                <Ionicons name="flash" size={12} color="#059669" />
                <Text style={styles.gaslessText}>Miễn phí chuyển tiền</Text>
              </View>
            </View>

            {/* Quick Amount Pills */}
            <View style={styles.quickAmountRow}>
              {['2', '5', '10', '20'].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickPill, amount === amt && styles.quickPillActive]}
                  onPress={() => setAmount(amt)}
                >
                  <Text style={[styles.quickPillText, amount === amt && styles.quickPillTextActive]}>
                    ${amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 7. Nút Xác Nhận Chuyển Tiền */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!resolvedAddress || !!searchError || isTransferring || isLoadingLookup || !isWalletReady) && styles.sendBtnDisabled,
            ]}
            onPress={() => {
              handleSendTransaction();
            }}
            disabled={!isWalletReady || !resolvedAddress || !!searchError || isTransferring || isLoadingLookup}
            activeOpacity={0.85}
          >
            {isTransferring ? (
              <View style={styles.sendBtnInner}>
                <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                <Text style={styles.sendBtnText}>{t('send.sendingButton', { defaultValue: 'Đang thực hiện chuyển tiền...' })}</Text>
              </View>
            ) : isLoadingLookup ? (
              <View style={styles.sendBtnInner}>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.sendBtnText}>Đang tra cứu...</Text>
              </View>
            ) : !resolvedAddress ? (
              <View style={styles.sendBtnInner}>
                <Feather name="user-check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.sendBtnText}>{t('send.noRecipientButton', { defaultValue: 'Vui lòng chọn người nhận' })}</Text>
              </View>
            ) : (
              <View style={styles.sendBtnInner}>
                <Feather name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.sendBtnText}>{t('send.sendButton', { defaultValue: 'Xác nhận chuyển' })}</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Khôi phục Tài Khoản Bảo Mật */}
      <WalletRecoveryModal
        visible={showRecoveryModal || needsRecovery}
        onClose={() => setShowRecoveryModal(false)}
        onSuccess={() => setShowRecoveryModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  searchBoxSuccess: {
    borderColor: '#00A859',
    backgroundColor: '#F0FDF4',
  },
  searchBoxError: {
    borderColor: '#EF4444',
  },
  searchBoxLocked: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  searchInputLocked: {
    fontWeight: '600',
    color: '#15803D',
  },
  rightActionBox: {
    marginLeft: 6,
  },
  changeActionBtn: {
    padding: 2,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 10,
  },
  dropdownAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  dropdownAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  dropdownAvatarLetter: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6D28D9',
  },
  dropdownDetailsCol: {
    flex: 1,
  },
  dropdownNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownUsername: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dropdownWalletText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  dropdownPhoneText: {
    fontSize: 11.5,
    color: '#059669',
    fontWeight: '500',
  },
  lockedRecipientCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    marginTop: 4,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  lockedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  lockedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 5,
  },
  changePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changePillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#15803D',
  },
  lockedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedAvatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    marginRight: 10,
  },
  lockedAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  lockedAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
  },
  lockedAvatarLetter: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6D28D9',
  },
  lockedUserInfoCol: {
    flex: 1,
  },
  lockedUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
  },
  lockedUserAddress: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  successIconBox: {
    marginRight: 10,
  },
  successInfoCol: {
    flex: 1,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  successAddressText: {
    fontSize: 12,
    color: '#166534',
    marginTop: 1,
  },
  copyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  copyPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  balanceHintText: {
    fontSize: 12,
    color: '#00A859',
    fontWeight: '600',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 6,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  currencyBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  rateHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  rateHintText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  gaslessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gaslessText: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '700',
    marginLeft: 3,
  },
  quickAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickPill: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPillActive: {
    backgroundColor: '#D1F4E0',
    borderColor: '#00A859',
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  quickPillTextActive: {
    color: '#00A859',
    fontWeight: '700',
  },
  sendBtn: {
    backgroundColor: '#00A859',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
