import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../services/auth';
import { useOnchainTransfer } from '@/hooks/useOnchainTransfer';
import { useTranslation } from '@/services/i18n';
import { SendModal } from '@/components/SendModal';
import type { PreparedUsdcTransfer } from '@/services/p2pTransfer';
import { TransactionReceiptModal } from '@/components/TransactionReceiptModal';
import { NeoCard } from '@/components/neo/NeoCard';
import { NEO_COLORS } from '@/components/neo/tokens';

interface NeoFeatureCardProps {
  title: string;
  description: string;
  iconNode: React.ReactNode;
  iconBgColor: string;
  cardBgColor: string;
  dividerColor?: string;
  onPress: () => void;
}

const NeoFeatureCard: React.FC<NeoFeatureCardProps> = ({
  title,
  description,
  iconNode,
  iconBgColor,
  cardBgColor,
  dividerColor = '#E2E8F0',
  onPress,
}) => {
  const { t } = useTranslation();
  return (
    <NeoCard
      backgroundColor={cardBgColor}
      borderColor="#000000"
      shadowColor="#000000"
      borderRadius={22}
      borderWidth={2.5}
      offset={5}
      containerStyle={styles.cardContainerStyle}
      style={styles.cardInner}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        style={styles.cardTouchable}
      >
        {/* Top Row: Icon Tròn Viền Đen */}
        <View style={styles.cardTopRow}>
          <View style={[styles.cardIconCircle, { backgroundColor: iconBgColor }]}>
            {iconNode}
          </View>
        </View>

        {/* Tiêu đề & Mô tả tính năng */}
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>

        {/* Đường Kẻ Ngang Phân Cách */}
        <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />

        {/* Bottom Row: Interact now -> */}
        <View style={styles.cardBottomRow}>
          <Text style={styles.interactText}>{t('transferHub.interactNow', { defaultValue: 'Interact now' })}</Text>
          <Feather name="arrow-right" size={18} color="#000000" />
        </View>
      </TouchableOpacity>
    </NeoCard>
  );
};

export default function TransferHubScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const { isReady, user } = useAuth();
  const {
    transfer: executeTokenTransfer,
    isTransferring: isSending,
    isWalletReady,
    needsRecovery,
    senderAddress: solanaAddress,
  } = useOnchainTransfer();

  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData] = useState<{
    amount: number | string;
    currency?: string;
    note?: string;
    txHash?: string;
  }>({ amount: 0, currency: 'USD', note: '' });

  // THỰC THI CHUYỂN TIỀN 100% ON-CHAIN TỪ TRANSFER HUB
  const handleConfirmSend = async (recipient: string, amount: number, prepared: PreparedUsdcTransfer) => {
    if (!solanaAddress || !isWalletReady) throw new Error('Your wallet is not ready. Please retry.');
    const result = await executeTokenTransfer({ fromAddress: solanaAddress, recipientAddressOrPhone: recipient, amountUsdc: amount, prepared });
    if (!result.success || !result.transactionHash) throw new Error(result.error || 'Transfer failed.');
    return result.transactionHash;
  };

  // Bảo vệ State Giao diện: Chỉ hiển thị khi ví và tài khoản đã sẵn sàng
  if (!isReady) {
    return (
      <SafeAreaView style={[styles.safeContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00A859" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>
          {t('transferHub.loading', { defaultValue: 'Đang tải N.E.D Transfer Hub...' })}
        </Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00A859" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>
          {t('session.expiredRedirect', { defaultValue: 'Phiên đăng nhập đã hết hạn. Đang chuyển hướng...' })}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5EBE1" />

      {/* Header Bar */}
      <View style={styles.topHeaderBar}>
        <Text style={styles.headerTitle}>{t('transferHub.title', { defaultValue: 'Transfer Hub' })}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* THẺ: Transfer by Phone Number (Nền Xanh Ngọc Nhạt #E6FAF8) */}
        <NeoFeatureCard
          title={t('transferHub.phoneTransferTitle', { defaultValue: 'Transfer by Phone Number' })}
          description={t('transferHub.phoneTransferSubtitle', { defaultValue: 'Send SOL directly to recipient via linked phone number.' })}
          iconNode={<Ionicons name="navigate" size={20} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />}
          iconBgColor="#0D9488"
          cardBgColor="#E6FAF8"
          dividerColor="#CCFBF1"
          onPress={() => router.push('/send')}
        />

        {/* Khoảng trống đệm */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Modal Chuyển Tiền P2P */}
      <SendModal
        visible={showSendModal}
        onClose={() => setShowSendModal(false)}
        solanaAddress={solanaAddress}
        solBalance={null}
        onConfirmSend={handleConfirmSend}
        isSending={isSending}
        needsRecovery={needsRecovery}
        onTriggerRecovery={() => setShowSendModal(false)}
      />

      {/* Modal Hóa Đơn Giao Dịch Chuẩn Neo-brutalism */}
      <TransactionReceiptModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        amount={receiptData.amount}
        currency={receiptData.currency}
        note={receiptData.note}
        txHash={receiptData.txHash}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5EBE1', // Nền Beige sáng phong cách Neo-brutalism
  },
  topHeaderBar: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  cardContainerStyle: {
    marginBottom: 18,
  },
  cardInner: {
    padding: 18,
  },
  cardTouchable: {
    width: '100%',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  dividerLine: {
    height: 1,
    marginVertical: 14,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interactText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
  },
});
