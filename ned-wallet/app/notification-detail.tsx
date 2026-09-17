import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useNotificationStore, InAppNotification } from '../stores/useNotificationStore';
import { useUserStore } from '../stores/useUserStore';
import { getUserProfileByWallet } from '../services/supabase';

/**
 * Định dạng số điện thoại hiển thị rõ ràng, chuyên nghiệp
 * VD: +84 912 345 678 hoặc 0912 345 678
 */
function formatDisplayPhone(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+84') && cleaned.length >= 11) {
    return `+84 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone.trim();
}

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { notifications, activeNotification } = useNotificationStore();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tìm thông báo theo id truyền qua param hoặc dùng activeNotification
  const notification: InAppNotification | undefined =
    notifications.find((n) => n.id === id) || activeNotification || undefined;

  // State quản lý thông tin Người chuyển & Người nhận
  const [senderName, setSenderName] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string | null>(null);
  const [senderWallet, setSenderWallet] = useState<string>('');

  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string | null>(null);
  const [recipientWallet, setRecipientWallet] = useState<string>('');

  const [isResolving, setIsResolving] = useState<boolean>(true);

  // Phân giải thông tin Người chuyển & Người nhận (Tên ví, Số điện thoại, Địa chỉ ví)
  useEffect(() => {
    if (!notification) return;

    let isMounted = true;

    async function resolveProfiles() {
      setIsResolving(true);
      const currentUser = useUserStore.getState();
      const myWallet = currentUser.walletAddress || useNotificationStore.getState().activeWalletAddress || '';
      const myUsername = currentUser.username ? `@${currentUser.username}.sol` : 'Ví của bạn';
      const myPhone = currentUser.linkedPhone || null;

      const isReceive = notification!.type === 'RECEIVE_MONEY';

      // 1. Địa chỉ ví khởi tạo
      const sWallet =
        notification!.senderWallet ||
        (isReceive ? 'Ví đối tác trên Solana' : myWallet || 'Ví của bạn');

      const rWallet =
        notification!.recipientWallet ||
        (isReceive ? myWallet || 'Ví của bạn' : 'Ví người nhận trên Solana');

      // 2. Tên & SĐT khởi tạo
      let sName = notification!.senderName || '';
      let sPhone = notification!.senderPhone || null;
      let rName = notification!.recipientName || '';
      let rPhone = notification!.recipientPhone || null;

      // Nhận diện nếu ví người chuyển là ví của người dùng hiện tại
      if (myWallet && sWallet.toLowerCase() === myWallet.toLowerCase()) {
        sName = sName || myUsername;
        sPhone = sPhone || myPhone;
      } else if (!isReceive && !sName) {
        sName = myUsername;
        sPhone = sPhone || myPhone;
      }

      // Nhận diện nếu ví người nhận là ví của người dùng hiện tại
      if (myWallet && rWallet.toLowerCase() === myWallet.toLowerCase()) {
        rName = rName || myUsername;
        rPhone = rPhone || myPhone;
      } else if (isReceive && !rName) {
        rName = myUsername;
        rPhone = rPhone || myPhone;
      }

      // Phục hồi từ sender nếu có
      if (!sName && notification!.sender && notification!.sender !== 'Bạn') {
        sName = notification!.sender;
      }

      // Trích xuất từ senderNote (VD: "Chuyển đến: 0912345678" hoặc "Chuyển đến: @alice.sol")
      if (notification!.senderNote) {
        const matchTo = notification!.senderNote.match(/Chuyển đến:\s*(.+)/i);
        if (matchTo && matchTo[1]) {
          const val = matchTo[1].trim();
          if (val.startsWith('0') || val.startsWith('+84')) {
            if (!rPhone) rPhone = val;
            if (!rName) rName = 'Người nhận';
          } else if (!rName) {
            rName = val;
          }
        }
      }

      // 3. Tra cứu hồ sơ Supabase nếu là địa chỉ Base58 hợp lệ
      const isSolanaBase58 = (addr: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);

      try {
        if (
          isSolanaBase58(sWallet) &&
          sWallet.toLowerCase() !== myWallet.toLowerCase() &&
          (!sName || !sPhone || sName.includes('Solana'))
        ) {
          const profile = await getUserProfileByWallet(sWallet);
          if (profile) {
            if (profile.username) sName = `@${profile.username}.sol`;
            if (profile.phone_number) sPhone = profile.phone_number;
          }
        }

        if (
          isSolanaBase58(rWallet) &&
          rWallet.toLowerCase() !== myWallet.toLowerCase() &&
          (!rName || !rPhone || rName.includes('Solana'))
        ) {
          const profile = await getUserProfileByWallet(rWallet);
          if (profile) {
            if (profile.username) rName = `@${profile.username}.sol`;
            if (profile.phone_number) rPhone = profile.phone_number;
          }
        }
      } catch (err) {
        console.warn('⚠️ [NotificationDetail] Lỗi tra cứu profile:', err);
      }

      // Fallbacks hiển thị rõ ràng
      if (!sName) {
        sName = isReceive ? 'Ví đối tác trên Solana' : (myUsername || 'Ví của bạn');
      }
      if (!rName) {
        rName = isReceive ? (myUsername || 'Ví của bạn') : 'Người nhận trên Solana';
      }

      if (isMounted) {
        setSenderWallet(sWallet);
        setRecipientWallet(rWallet);
        setSenderName(sName);
        setSenderPhone(sPhone);
        setRecipientName(rName);
        setRecipientPhone(rPhone);
        setIsResolving(false);
      }
    }

    resolveProfiles();

    return () => {
      isMounted = false;
    };
  }, [notification?.id, notification?.txHash]);

  const handleCopy = async (text: string, key: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleOpenSolscan = () => {
    if (!notification?.txHash) {
      Alert.alert('Thông báo', 'Giao dịch này chưa có mã băm (txHash) on-chain.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `https://solscan.io/tx/${notification.txHash}?cluster=devnet`;
    Linking.openURL(url).catch((err) => console.warn('Cannot open Solscan URL:', err));
  };

  const handleOpenSolanaExplorer = () => {
    if (!notification?.txHash) {
      Alert.alert('Thông báo', 'Giao dịch này chưa có mã băm (txHash) on-chain.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `https://explorer.solana.com/tx/${notification.txHash}?cluster=devnet`;
    Linking.openURL(url).catch((err) => console.warn('Cannot open Solana Explorer URL:', err));
  };

  const handleShare = async () => {
    if (!notification) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const isReceive = notification.type === 'RECEIVE_MONEY';
      const content = [
        `[N.E.D Wallet - Chi tiết giao dịch]`,
        `Tiêu đề: ${notification.title}`,
        notification.amount
          ? `Số tiền: ${isReceive ? '+' : '-'}$${Number(notification.amount).toFixed(2)} ${notification.currency || 'USDC'}`
          : null,
        `--- Người chuyển ---`,
        `Tên ví: ${senderName}`,
        senderPhone ? `SĐT: ${senderPhone}` : 'SĐT: Chưa liên kết',
        `Địa chỉ ví: ${senderWallet}`,
        `--- Người nhận ---`,
        `Tên ví: ${recipientName}`,
        recipientPhone ? `SĐT: ${recipientPhone}` : 'SĐT: Chưa liên kết',
        `Địa chỉ ví: ${recipientWallet}`,
        notification.txHash ? `TxHash: ${notification.txHash}` : null,
        notification.txHash ? `Solscan: https://solscan.io/tx/${notification.txHash}?cluster=devnet` : null,
      ]
        .filter(Boolean)
        .join('\n');

      await Share.share({ message: content });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  if (!notification) {
    return (
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết thông báo</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyText}>Không tìm thấy thông tin chi tiết.</Text>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={() => router.back()}>
            <Text style={styles.primaryActionBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isReceive = notification.type === 'RECEIVE_MONEY';
  const isTransfer = notification.type === 'TRANSFER';
  const isWarning = notification.type === 'WARNING';

  const formattedDate = new Date(notification.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Chi tiết giao dịch</Text>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Feather name="share-2" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. THẺ TỔNG QUAN GIAO DỊCH (SUMMARY CARD) */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardShadow} />
          <View style={styles.summaryCardBody}>
            {/* Icon lớn */}
            <View
              style={[
                styles.largeIconBox,
                {
                  backgroundColor: isReceive
                    ? '#CCFF00'
                    : isTransfer
                    ? '#FF8A8A'
                    : isWarning
                    ? '#FDE047'
                    : '#A5F3FC',
                },
              ]}
            >
              {isReceive ? (
                <Feather name="arrow-down-left" size={28} color="#000" />
              ) : isTransfer ? (
                <Feather name="arrow-up-right" size={28} color="#000" />
              ) : isWarning ? (
                <Ionicons name="warning" size={28} color="#000" />
              ) : (
                <Ionicons name="shield-checkmark" size={28} color="#000" />
              )}
            </View>

            {/* Trạng thái xác nhận on-chain */}
            <View style={styles.statusPill}>
              <View style={styles.pulsingGreenDot} />
              <Text style={styles.statusPillText}>
                {isWarning ? 'Cảnh báo mạng' : 'Đã xác nhận on-chain'}
              </Text>
            </View>

            {/* Số tiền biến động */}
            {notification.amount !== undefined ? (
              <View style={styles.amountBox}>
                <Text style={styles.amountLargeText}>
                  {isReceive ? '+' : '-'}${Number(notification.amount).toFixed(2)}{' '}
                  <Text style={styles.amountCurrencySub}>
                    {notification.currency || 'USDC'}
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* Tiêu đề & Thời gian */}
            <Text style={styles.summaryTitle}>{notification.title}</Text>
            <Text style={styles.summaryTime}>{formattedDate}</Text>
          </View>
        </View>

        {/* 3. KHỐI NÊU RÕ THÔNG TIN NGƯỜI CHUYỂN & NGƯỜI NHẬN (VÍ TÊN GÌ, SĐT GÌ) */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardShadow} />
          <View style={styles.cardBody}>
            <View style={styles.cardSectionHeader}>
              <FontAwesome5 name="users" size={14} color="#000" />
              <Text style={styles.cardSectionTitle}>THÔNG TIN NGƯỜI CHUYỂN & NGƯỜI NHẬN</Text>
            </View>

            {/* A. THÔNG TIN NGƯỜI CHUYỂN (SENDER) */}
            <View style={styles.partyCard}>
              <View style={styles.partyHeaderRow}>
                <View style={[styles.partyBadge, { backgroundColor: '#E0E7FF' }]}>
                  <Feather name="arrow-up-right" size={12} color="#000" />
                  <Text style={styles.partyBadgeText}>NGƯỜI DÙNG CHUYỂN (FROM)</Text>
                </View>
                {isReceive ? (
                  <View style={styles.roleTag}>
                    <Text style={styles.roleTagText}>Bên chuyển</Text>
                  </View>
                ) : (
                  <View style={[styles.roleTag, { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}>
                    <Text style={[styles.roleTagText, { color: '#16A34A' }]}>Ví của bạn</Text>
                  </View>
                )}
              </View>

              {/* 1. TÊN VÍ NGƯỜI CHUYỂN */}
              <View style={styles.infoFieldRow}>
                <View style={styles.fieldLabelBox}>
                  <Ionicons name="person-circle-outline" size={15} color="#4B5563" />
                  <Text style={styles.fieldLabelText}>Tên ví:</Text>
                </View>
                <View style={styles.fieldValueContainer}>
                  <Text style={styles.walletNameHighlight} numberOfLines={1}>
                    {senderName || 'Chưa đặt tên ví'}
                  </Text>
                </View>
              </View>

              {/* 2. SỐ ĐIỆN THOẠI NGƯỜI CHUYỂN */}
              <View style={styles.infoFieldRow}>
                <View style={styles.fieldLabelBox}>
                  <Feather name="phone" size={13} color="#4B5563" />
                  <Text style={styles.fieldLabelText}>Số điện thoại:</Text>
                </View>
                <View style={styles.fieldValueContainer}>
                  {senderPhone ? (
                    <View style={styles.phonePillBox}>
                      <Text style={styles.phonePillText}>
                        {formatDisplayPhone(senderPhone)}
                      </Text>
                      <TouchableOpacity
                        style={styles.inlineMiniCopyBtn}
                        onPress={() => handleCopy(senderPhone, 'senderPhone', 'Số điện thoại người chuyển')}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name={copiedKey === 'senderPhone' ? 'check' : 'copy'}
                          size={11}
                          color={copiedKey === 'senderPhone' ? '#16A34A' : '#000'}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.unlinkedPillBox}>
                      <Ionicons name="information-circle-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.unlinkedPillText}>Chưa liên kết SĐT</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 3. ĐỊA CHỈ VÍ NGƯỜI CHUYỂN */}
              <View style={styles.addressBlock}>
                <View style={styles.addressLabelRow}>
                  <FontAwesome5 name="wallet" size={11} color="#6B7280" />
                  <Text style={styles.addressLabelText}>Địa chỉ ví Solana:</Text>
                </View>
                <View style={styles.addressBox}>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {senderWallet}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyIconBtn}
                    onPress={() => handleCopy(senderWallet, 'senderWallet', 'Địa chỉ ví gửi')}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={copiedKey === 'senderWallet' ? 'check' : 'copy'}
                      size={13}
                      color={copiedKey === 'senderWallet' ? '#16A34A' : '#000'}
                    />
                    <Text style={styles.copyBtnText}>
                      {copiedKey === 'senderWallet' ? 'Đã chép' : 'Sao chép'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* MŨI TÊN CHỈ XUỐNG BIỂU DIỄN DÒNG TIỀN */}
            <View style={styles.arrowFlowContainer}>
              <View style={styles.arrowFlowLine} />
              <View style={styles.arrowFlowBadge}>
                <Feather name="arrow-down" size={16} color="#000" />
              </View>
              <View style={styles.arrowFlowLine} />
            </View>

            {/* B. THÔNG TIN NGƯỜI NHẬN (RECIPIENT) */}
            <View style={styles.partyCard}>
              <View style={styles.partyHeaderRow}>
                <View style={[styles.partyBadge, { backgroundColor: '#CCFF00' }]}>
                  <Feather name="arrow-down-left" size={12} color="#000" />
                  <Text style={styles.partyBadgeText}>NGƯỜI NHẬN (TO / RECIPIENT)</Text>
                </View>
                {isReceive ? (
                  <View style={[styles.roleTag, { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}>
                    <Text style={[styles.roleTagText, { color: '#16A34A' }]}>Ví của bạn</Text>
                  </View>
                ) : (
                  <View style={styles.roleTag}>
                    <Text style={styles.roleTagText}>Bên nhận</Text>
                  </View>
                )}
              </View>

              {/* 1. TÊN VÍ NGƯỜI NHẬN */}
              <View style={styles.infoFieldRow}>
                <View style={styles.fieldLabelBox}>
                  <Ionicons name="person-circle-outline" size={15} color="#4B5563" />
                  <Text style={styles.fieldLabelText}>Tên ví:</Text>
                </View>
                <View style={styles.fieldValueContainer}>
                  <Text style={styles.walletNameHighlight} numberOfLines={1}>
                    {recipientName || 'Chưa đặt tên ví'}
                  </Text>
                </View>
              </View>

              {/* 2. SỐ ĐIỆN THOẠI NGƯỜI NHẬN */}
              <View style={styles.infoFieldRow}>
                <View style={styles.fieldLabelBox}>
                  <Feather name="phone" size={13} color="#4B5563" />
                  <Text style={styles.fieldLabelText}>Số điện thoại:</Text>
                </View>
                <View style={styles.fieldValueContainer}>
                  {recipientPhone ? (
                    <View style={styles.phonePillBox}>
                      <Text style={styles.phonePillText}>
                        {formatDisplayPhone(recipientPhone)}
                      </Text>
                      <TouchableOpacity
                        style={styles.inlineMiniCopyBtn}
                        onPress={() => handleCopy(recipientPhone, 'recipientPhone', 'Số điện thoại người nhận')}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name={copiedKey === 'recipientPhone' ? 'check' : 'copy'}
                          size={11}
                          color={copiedKey === 'recipientPhone' ? '#16A34A' : '#000'}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.unlinkedPillBox}>
                      <Ionicons name="information-circle-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.unlinkedPillText}>Chưa liên kết SĐT</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 3. ĐỊA CHỈ VÍ NGƯỜI NHẬN */}
              <View style={styles.addressBlock}>
                <View style={styles.addressLabelRow}>
                  <FontAwesome5 name="wallet" size={11} color="#6B7280" />
                  <Text style={styles.addressLabelText}>Địa chỉ ví Solana:</Text>
                </View>
                <View style={styles.addressBox}>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {recipientWallet}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyIconBtn}
                    onPress={() => handleCopy(recipientWallet, 'recipientWallet', 'Địa chỉ ví nhận')}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={copiedKey === 'recipientWallet' ? 'check' : 'copy'}
                      size={13}
                      color={copiedKey === 'recipientWallet' ? '#16A34A' : '#000'}
                    />
                    <Text style={styles.copyBtnText}>
                      {copiedKey === 'recipientWallet' ? 'Đã chép' : 'Sao chép'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* LỜI NHẮN / GHI CHÚ GIAO DỊCH */}
            {(notification.senderNote || notification.message) && (
              <View style={styles.notePaperBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Feather name="edit-3" size={13} color="#000" />
                  <Text style={styles.notePaperHeader}>Lời nhắn giao dịch:</Text>
                </View>
                <Text style={styles.notePaperContent}>
                  {notification.senderNote || notification.message}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 4. KHỐI THÔNG SỐ ON-CHAIN (SOLANA DEVNET / MAINNET) */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardShadow} />
          <View style={styles.cardBody}>
            <View style={styles.cardSectionHeader}>
              <MaterialCommunityIcons name="cube-scan" size={17} color="#000" />
              <Text style={styles.cardSectionTitle}>THÔNG SỐ ON-CHAIN (SOLANA)</Text>
            </View>

            {/* CHỮ KÝ GIAO DỊCH (TX HASH / SIGNATURE) */}
            {notification.txHash ? (
              <View style={styles.onchainRowContainer}>
                <Text style={styles.onchainLabel}>MÃ GIAO DỊCH (TX HASH):</Text>
                <View style={styles.txHashBox}>
                  <Text style={styles.txHashFullText} numberOfLines={2}>
                    {notification.txHash}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyTxBtn}
                    onPress={() => handleCopy(notification.txHash!, 'txHash', 'Mã băm giao dịch')}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={copiedKey === 'txHash' ? 'check' : 'copy'}
                      size={14}
                      color={copiedKey === 'txHash' ? '#16A34A' : '#000'}
                    />
                    <Text style={styles.copyBtnText}>
                      {copiedKey === 'txHash' ? 'Đã chép' : 'Sao chép'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* MẠNG LƯỚI & PHÍ MẠNG & SỐ KHỐI */}
            <View style={styles.gridParamsContainer}>
              <View style={styles.paramCell}>
                <Text style={styles.paramLabel}>MẠNG LƯỚI</Text>
                <Text style={styles.paramValue}>
                  {notification.network || 'Solana Devnet'}
                </Text>
              </View>

              <View style={styles.paramCell}>
                <Text style={styles.paramLabel}>PHÍ MẠNG (GAS)</Text>
                <Text style={styles.paramValue}>
                  {notification.fee || '0.000005 SOL'}
                </Text>
              </View>
            </View>

            <View style={styles.gridParamsContainer}>
              <View style={styles.paramCell}>
                <Text style={styles.paramLabel}>SỐ KHỐI (SLOT)</Text>
                <Text style={styles.paramValue}>
                  {notification.blockNumber ? `#${notification.blockNumber}` : 'On-Chain Confirmed'}
                </Text>
              </View>

              <View style={styles.paramCell}>
                <Text style={styles.paramLabel}>ĐỘ BẢO MẬT</Text>
                <Text style={[styles.paramValue, { color: '#008000' }]}>
                  Max Confirmations
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. CÁC NÚT HÀNH ĐỘNG XEM TRÊN EXPLORER ON-CHAIN */}
        {notification.txHash ? (
          <View style={styles.actionButtonsContainer}>
            {/* Nút 1: Xem trên Solscan */}
            <TouchableOpacity
              style={[styles.neoActionBtn, styles.btnSolscan]}
              onPress={handleOpenSolscan}
              activeOpacity={0.85}
            >
              <View style={styles.btnShadow} />
              <View style={[styles.btnBody, { backgroundColor: '#CCFF00' }]}>
                <FontAwesome5 name="search-location" size={16} color="#000" />
                <Text style={styles.neoActionBtnText}>Xem trên Solscan</Text>
                <Feather name="external-link" size={16} color="#000" />
              </View>
            </TouchableOpacity>

            {/* Nút 2: Xem trên Solana Explorer */}
            <TouchableOpacity
              style={[styles.neoActionBtn, styles.btnSolanaExplorer]}
              onPress={handleOpenSolanaExplorer}
              activeOpacity={0.85}
            >
              <View style={styles.btnShadow} />
              <View style={[styles.btnBody, { backgroundColor: '#FFFFFF' }]}>
                <Ionicons name="globe-outline" size={18} color="#000" />
                <Text style={styles.neoActionBtnText}>Solana Explorer</Text>
                <Feather name="external-link" size={16} color="#000" />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#EFE9DF', // Nền giấy kem thô Neo-brutalism
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 2, height: 2 },
    shadowColor: '#000000',
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 18,
    paddingBottom: 40,
  },
  cardWrapper: {
    position: 'relative',
    width: '100%',
  },
  cardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000000',
    borderRadius: 16,
  },
  summaryCardBody: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  cardBody: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 16,
    padding: 16,
  },
  largeIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#008000',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  pulsingGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#008000',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#008000',
  },
  amountBox: {
    marginBottom: 8,
  },
  amountLargeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#008000',
    letterSpacing: -1,
  },
  amountCurrencySub: {
    fontSize: 18,
    fontWeight: '900',
    color: '#008000',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 8,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  partyCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  partyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  partyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  partyBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.3,
  },
  roleTag: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#9CA3AF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
  },
  infoFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  fieldLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 110,
  },
  fieldLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  fieldValueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  walletNameHighlight: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  phonePillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  phonePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'monospace',
  },
  inlineMiniCopyBtn: {
    padding: 2,
  },
  unlinkedPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unlinkedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  addressBlock: {
    marginTop: 2,
    gap: 4,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  addressText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  copyIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },
  arrowFlowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 8,
  },
  arrowFlowLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#000000',
  },
  arrowFlowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notePaperBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  notePaperHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  notePaperContent: {
    fontSize: 13,
    color: '#1F2937',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  onchainRowContainer: {
    marginBottom: 12,
  },
  onchainLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4B5563',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  txHashBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  txHashFullText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#111827',
    fontWeight: '700',
    flex: 1,
  },
  copyTxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  gridParamsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  paramCell: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 10,
  },
  paramLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  paramValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  actionButtonsContainer: {
    gap: 12,
    marginTop: 4,
  },
  neoActionBtn: {
    position: 'relative',
    height: 52,
    width: '100%',
  },
  btnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: '#000000',
    borderRadius: 12,
  },
  btnBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 12,
    gap: 10,
  },
  btnSolscan: {},
  btnSolanaExplorer: {},
  neoActionBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6B7280',
    marginBottom: 16,
  },
  primaryActionBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
