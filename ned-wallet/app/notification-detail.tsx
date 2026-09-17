import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useNotificationStore, InAppNotification } from '../stores/useNotificationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NotificationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { notifications, activeNotification } = useNotificationStore();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tìm thông báo theo id truyền qua param hoặc dùng activeNotification
  const notification: InAppNotification | undefined =
    notifications.find((n) => n.id === id) || activeNotification || undefined;

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
      const content = [
        `[N.E.D Wallet - Chi tiết giao dịch]`,
        `Tiêu đề: ${notification.title}`,
        notification.amount ? `Số tiền: +$${Number(notification.amount).toFixed(2)} ${notification.currency || 'USDC'}` : null,
        notification.senderWallet ? `Ví gửi: ${notification.senderWallet}` : null,
        notification.recipientWallet ? `Ví nhận: ${notification.recipientWallet}` : null,
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
  const isSystem = notification.type === 'SYSTEM';

  const formattedDate = new Date(notification.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const activeWallet =
    useNotificationStore.getState().activeWalletAddress || '';

  const senderAddress =
    notification.senderWallet ||
    (isReceive ? 'Ví đối tác trên Solana' : activeWallet || 'Ví của bạn');

  const recipientAddress =
    notification.recipientWallet ||
    (isReceive ? activeWallet || 'Ví của bạn' : 'Ví người nhận trên Solana');

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

            {/* Trạng thái xác nhận */}
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

        {/* 3. KHỐI THÔNG TIN VÍ GỬI & VÍ GỬI ĐẾN (WALLET INFO CARD) */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardShadow} />
          <View style={styles.cardBody}>
            <View style={styles.cardSectionHeader}>
              <FontAwesome5 name="wallet" size={14} color="#000" />
              <Text style={styles.cardSectionTitle}>THÔNG TIN VÍ GIAO DỊCH</Text>
            </View>

            {/* VÍ GỬI (FROM) */}
            <View style={styles.walletRowBox}>
              <View style={styles.walletHeaderRow}>
                <View style={styles.walletBadgeSender}>
                  <Text style={styles.walletBadgeText}>VÍ GỬI (FROM)</Text>
                </View>
                {notification.sender && (
                  <Text style={styles.senderDisplayName}>{notification.sender}</Text>
                )}
              </View>

              <View style={styles.addressContainer}>
                <Text style={styles.addressText} numberOfLines={2}>
                  {senderAddress}
                </Text>
                <TouchableOpacity
                  style={styles.copyIconBtn}
                  onPress={() => handleCopy(senderAddress, 'sender', 'Ví gửi')}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={copiedKey === 'sender' ? 'check' : 'copy'}
                    size={14}
                    color={copiedKey === 'sender' ? '#008000' : '#000'}
                  />
                  <Text style={styles.copyBtnText}>
                    {copiedKey === 'sender' ? 'Đã chép' : 'Sao chép'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* MŨI TÊN CHỈ XUỐNG GIỮA 2 VÍ */}
            <View style={styles.arrowBetweenWallets}>
              <View style={styles.arrowLine} />
              <View style={styles.arrowIconBox}>
                <Feather name="arrow-down" size={16} color="#000" />
              </View>
              <View style={styles.arrowLine} />
            </View>

            {/* VÍ GỬI ĐẾN (TO - RECIPIENT) */}
            <View style={styles.walletRowBox}>
              <View style={styles.walletHeaderRow}>
                <View style={styles.walletBadgeRecipient}>
                  <Text style={styles.walletBadgeText}>VÍ GỬI ĐẾN (TO / NHẬN)</Text>
                </View>
                <Text style={styles.senderDisplayName}>
                  {isReceive ? 'Ví của bạn (N.E.D Wallet)' : 'Người nhận'}
                </Text>
              </View>

              <View style={styles.addressContainer}>
                <Text style={styles.addressText} numberOfLines={2}>
                  {recipientAddress}
                </Text>
                <TouchableOpacity
                  style={styles.copyIconBtn}
                  onPress={() => handleCopy(recipientAddress, 'recipient', 'Ví gửi đến')}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={copiedKey === 'recipient' ? 'check' : 'copy'}
                    size={14}
                    color={copiedKey === 'recipient' ? '#008000' : '#000'}
                  />
                  <Text style={styles.copyBtnText}>
                    {copiedKey === 'recipient' ? 'Đã chép' : 'Sao chép'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* LỜI NHẮN / GHI CHÚ */}
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

        {/* 4. KHỐI THÔNG TIN GIAO DỊCH ON-CHAIN (ON-CHAIN DETAILS) */}
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
                      color={copiedKey === 'txHash' ? '#008000' : '#000'}
                    />
                    <Text style={styles.copyBtnText}>
                      {copiedKey === 'txHash' ? 'Đã chép' : 'Sao chép'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* MẠNG LƯỚI & PHÍ MẠNG & BLOCK */}
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

        {/* 5. CÁC NÚT HÀNH ĐỘNG XEM TRÊN EXPLORER */}
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
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  walletRowBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    padding: 12,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  walletBadgeSender: {
    backgroundColor: '#E0E7FF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  walletBadgeRecipient: {
    backgroundColor: '#CCFF00',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  walletBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  senderDisplayName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },
  addressContainer: {
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
    fontSize: 12,
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
  arrowBetweenWallets: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    gap: 8,
  },
  arrowLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#000000',
  },
  arrowIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
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
