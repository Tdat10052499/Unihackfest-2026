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
  Image,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  lookupWalletByPhone,
  resolveIdentityOnchain,
  normalizeIdentityInput,
  isSamePhoneNumber,
  getAccountIdentifier,
  getMaskedPhone,
} from '../services/identity';
import {
  searchUsersOffchain,
  UserSearchResult,
} from '../services/supabase';
import { getLinkedPhone } from '../services/storage';
import { formatFiatBalance, USD_TO_VND_RATE, getAccountDisplayBalance } from '../services/solana';
import { useTranslation } from '../services/i18n';

interface SendModalProps {
  visible: boolean;
  onClose: () => void;
  solanaAddress: string | null;
  solBalance?: number | null;
  availableBalanceUsd?: number | null;
  initialRecipient?: string;
  onOpenScanner?: () => void;
  onConfirmSend: (recipientAddress: string, amountUsd: number) => Promise<void>;
  isSending?: boolean;
  needsRecovery?: boolean;
  onTriggerRecovery?: () => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  visible,
  onClose,
  solanaAddress,
  solBalance,
  availableBalanceUsd,
  initialRecipient = '',
  onOpenScanner,
  onConfirmSend,
  isSending = false,
  needsRecovery = false,
  onTriggerRecovery,
}) => {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState(initialRecipient);
  const [debouncedInput, setDebouncedInput] = useState(initialRecipient);
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
  const [availableUsd, setAvailableUsd] = useState<number>(availableBalanceUsd ?? 0);
  const [myPhone, setMyPhone] = useState<string | null>(null);

  // Nạp SĐT của chính người dùng từ local cache
  useEffect(() => {
    getLinkedPhone().then((p) => {
      if (p) setMyPhone(p);
    });
  }, [visible]);

  // Nạp số dư on-chain thực tế (USDT/USDC/SOL)
  useEffect(() => {
    if (visible && solanaAddress) {
      getAccountDisplayBalance(solanaAddress, true)
        .then((bal) => {
          setAvailableUsd(bal.usdBalance);
        })
        .catch(console.warn);
    } else if (availableBalanceUsd !== undefined && availableBalanceUsd !== null) {
      setAvailableUsd(availableBalanceUsd);
    }
  }, [visible, solanaAddress, availableBalanceUsd]);

  // Cập nhật khi initialRecipient thay đổi (ví dụ sau khi quét QR)
  useEffect(() => {
    if (initialRecipient) {
      setSearchInput(initialRecipient);
      setIsLockedRecipient(false);
    }
  }, [initialRecipient]);

  // 1. Cơ chế Debounce 500ms chống spam
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
    if (solanaAddress && (debouncedInput.toLowerCase() === solanaAddress.toLowerCase() || parsed.normalized.toLowerCase() === solanaAddress.toLowerCase())) {
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
            if (solanaAddress && u.wallet_address.toLowerCase() === solanaAddress.toLowerCase()) {
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
            if (solanaAddress && onchainRes.walletAddress.toLowerCase() === solanaAddress.toLowerCase()) {
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
  }, [debouncedInput, solanaAddress, myPhone, isLockedRecipient, t]);

  // Xử lý khi người dùng chọn 1 kết quả từ Autocomplete Dropdown
  const handleSelectUser = (item: UserSearchResult) => {
    setIsLoadingLookup(false);
    if (solanaAddress && item.wallet_address.toLowerCase() === solanaAddress.toLowerCase()) {
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

  const handleSend = async () => {
    if (needsRecovery) {
      onTriggerRecovery?.();
      return;
    }

    let targetWallet = resolvedAddress;

    if (!targetWallet) {
      const input = searchInput.trim();
      if (!input) {
        Alert.alert(
          t('settings.title', { defaultValue: 'Thông báo' }),
          t('send.invalidRecipient', { defaultValue: 'Vui lòng nhập số điện thoại hoặc tài khoản người nhận.' })
        );
        return;
      }

      if (myPhone && isSamePhoneNumber(input, myPhone)) {
        Alert.alert(
          t('settings.title', { defaultValue: 'Thông báo' }),
          t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' })
        );
        return;
      }

      if (solanaAddress && input.toLowerCase() === solanaAddress.toLowerCase()) {
        Alert.alert(
          t('settings.title', { defaultValue: 'Thông báo' }),
          t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' })
        );
        return;
      }

      const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input);
      if (isSolanaBase58) {
        targetWallet = input;
      } else {
        setIsLoadingLookup(true);
        targetWallet = await lookupWalletByPhone(input);
        setIsLoadingLookup(false);
      }
    }

    if (!targetWallet) {
      Alert.alert(
        t('send.failedTitle', { defaultValue: 'Không tìm thấy tài khoản' }),
        t('send.phoneNotLinked', { defaultValue: 'Không tìm thấy tài khoản liên kết với số điện thoại này.' })
      );
      return;
    }

    if (solanaAddress && targetWallet.toLowerCase() === solanaAddress.toLowerCase()) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('send.cannotSendToSelf', { defaultValue: 'Bạn không thể chuyển tiền đến tài khoản của chính mình.' })
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông báo' }),
        t('send.invalidAmount', { defaultValue: 'Vui lòng nhập số tiền hợp lệ.' })
      );
      return;
    }

    await onConfirmSend(targetWallet, numAmount);
  };

  const parsedAmount = parseFloat(amount) || 0;
  const vndEquivalent = Math.round(parsedAmount * USD_TO_VND_RATE);

  if (!visible) return null;

  return (
    <View style={styles.overlayWrapper} pointerEvents="box-none">
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropDismissArea}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.bottomSheetContainer}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerTitleCol}>
                <Text style={styles.sheetTitle}>{t('send.title', { defaultValue: 'Chuyển Tiền' })}</Text>
                <Text style={styles.sheetSubtitle}>
                  {t('send.subtitle', { defaultValue: 'Chuyển tiền nhanh chóng qua số điện thoại hoặc mã N.E.D' })}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 10 }}
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
                    <Feather
                      name="search"
                      size={18}
                      color="#64748B"
                      style={{ marginRight: 8 }}
                    />
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

                  {/* Vùng bên phải ô nhập: Spinner, Nút Xóa / Nút quét QR */}
                  <View style={styles.rightActionBox}>
                    {isLoadingLookup ? (
                      <ActivityIndicator size="small" color="#00A859" />
                    ) : isLockedRecipient ? (
                      <TouchableOpacity
                        onPress={handleResetRecipient}
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
                    ) : onOpenScanner ? (
                      <TouchableOpacity
                        onPress={onOpenScanner}
                        style={styles.qrScanBtn}
                      >
                        <Ionicons
                          name="qr-code-outline"
                          size={20}
                          color="#00A859"
                        />
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
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#00A859"
                    />
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
                  <Feather
                    name="alert-circle"
                    size={16}
                    color="#DC2626"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.errorText}>{searchError}</Text>
                </View>
              ) : null}

              {/* 6. Nhập Số Tiền USD / VND */}
              <View style={[styles.inputSection, { marginTop: 14 }]}>
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

                {/* Dòng quy đổi tỷ giá VND thời gian thực */}
                <View style={styles.rateHintRow}>
                  <Text style={styles.rateHintText}>
                    ≈ {vndEquivalent.toLocaleString('vi-VN')} ₫ (Tỷ giá: $1 = 25.000 ₫)
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
                      style={[
                        styles.quickPill,
                        amount === amt && styles.quickPillActive,
                      ]}
                      onPress={() => setAmount(amt)}
                    >
                      <Text
                        style={[
                          styles.quickPillText,
                          amount === amt && styles.quickPillTextActive,
                        ]}
                      >
                        ${amt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 7. Nút Xác Nhận Chuyển Tiền / Khôi phục ví */}
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  needsRecovery && styles.sendBtnRecovery,
                  ((!resolvedAddress && !needsRecovery) || !!searchError || isSending || isLoadingLookup) &&
                    styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={((!resolvedAddress && !needsRecovery) || !!searchError) || isSending || isLoadingLookup}
                activeOpacity={0.85}
              >
                {needsRecovery ? (
                  <View style={styles.sendBtnInner}>
                    <MaterialCommunityIcons
                      name="shield-key"
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.sendBtnText}>{t('home.recover', { defaultValue: 'Khôi phục tài khoản' })}</Text>
                  </View>
                ) : isSending ? (
                  <View style={styles.sendBtnInner}>
                    <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                    <Text style={styles.sendBtnText}>Đang thực hiện chuyển tiền...</Text>
                  </View>
                ) : (
                  <View style={styles.sendBtnInner}>
                    <Feather
                      name="send"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.sendBtnText}>{t('send.sendButton', { defaultValue: 'Xác nhận chuyển' })}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayWrapper: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: '90%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleCol: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSection: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  searchBoxSuccess: {
    borderColor: '#00A859',
    backgroundColor: '#F0FDF4',
  },
  searchBoxError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  searchBoxLocked: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  searchInputLocked: {
    fontWeight: '600',
    color: '#15803D',
  },
  rightActionBox: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  qrScanBtn: {
    padding: 4,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 8,
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
    padding: 12,
    marginBottom: 8,
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
    marginBottom: 8,
    paddingBottom: 6,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  lockedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 10,
  },
  lockedAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  lockedAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
  },
  lockedAvatarLetter: {
    fontSize: 17,
    fontWeight: '700',
    color: '#6D28D9',
  },
  lockedUserInfoCol: {
    flex: 1,
  },
  lockedUserName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#15803D',
  },
  lockedUserAddress: {
    fontSize: 11.5,
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
    marginBottom: 10,
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
    marginBottom: 10,
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
    marginBottom: 8,
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
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
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
    fontSize: 12,
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
  },
  sendBtnRecovery: {
    backgroundColor: '#D97706',
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
