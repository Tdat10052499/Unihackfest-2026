import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { useOnchainTransfer } from '@/hooks/useOnchainTransfer';
import { ActivityItem } from '@/services/solana';
import { cacheActivities, getCachedActivities } from '@/services/storage';
import { useTranslation } from '@/services/i18n';
import { SendModal } from '@/components/SendModal';
import { WalletRecoveryModal } from '@/components/WalletRecoveryModal';
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
          <Text style={styles.interactText}>Interact now</Text>
          <Feather name="arrow-right" size={18} color="#000000" />
        </View>
      </TouchableOpacity>
    </NeoCard>
  );
};

export default function TransferHubScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const { isReady, user } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const {
    transfer: executeTokenTransfer,
    isTransferring: isSending,
    isWalletReady,
    needsRecovery,
    walletStatus,
    senderAddress: solanaAddress,
  } = useOnchainTransfer();

  const [showSendModal, setShowSendModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // THỰC THI CHUYỂN TIỀN 100% ON-CHAIN TỪ TRANSFER HUB
  const handleConfirmSend = async (recipient: string, amount: number) => {
    if (!solanaAddress) {
      Alert.alert('Thông báo', 'Không tìm thấy địa chỉ tài khoản nguồn.');
      return;
    }
    if (!isWalletReady) {
      Alert.alert(
        'Tài khoản đang kết nối',
        `Tài khoản đang ở trạng thái (${walletStatus}). Vui lòng chờ vài giây để kết nối hoàn tất!`
      );
      return;
    }

    try {
      const result = await executeTokenTransfer({
        fromAddress: solanaAddress,
        recipientAddressOrPhone: recipient,
        amountUsd: amount,
      });

      if (!result.success || !result.transactionHash) {
        Alert.alert('Chuyển tiền chưa hoàn tất ❌', result.error || 'Không thể thực hiện chuyển tiền.');
        return;
      }

      const txSignature = result.transactionHash;
      const finalRecipient = result.recipientAddress || recipient;

      setShowSendModal(false);

      // Lưu log lịch sử giao dịch vào cache
      const currentActs = (await getCachedActivities()) || [];
      const newAct: ActivityItem = {
        id: txSignature,
        type: 'sent',
        title: 'Chuyển tiền',
        time: 'Vừa xong',
        amount: `-$${amount.toFixed(2)}`,
        isPositive: false,
        iconBg: '#374151',
        signature: txSignature,
      };
      await cacheActivities([newAct, ...currentActs]);

      Alert.alert(
        'Chuyển Tiền Thành Công! ⚡',
        `Đã chuyển $${amount.toFixed(2)} đến:\n${finalRecipient}\n\nMã giao dịch: ${txSignature.slice(0, 16)}...`
      );
    } catch (err: any) {
      console.error('Transfer Hub Send Error:', err);
      Alert.alert('Lỗi Giao Dịch', err?.message || 'Không thể chuyển tiền lúc này.');
    }
  };

  // Mở Shake to Split (Host Workspace)
  const handleOpenShakeToSplit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const roomId = 'room_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    router.push(`/shake-room?roomId=${roomId}&isHost=true`);
  };

  // Bảo vệ State Giao diện: Chỉ hiển thị khi ví và tài khoản đã sẵn sàng
  if (!isReady) {
    return (
      <SafeAreaView style={[styles.safeContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00A859" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>
          Đang tải N.E.D Transfer Hub...
        </Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00A859" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>
          Phiên đăng nhập đã hết hạn. Đang chuyển hướng...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5EBE1" />

      {/* Header Bar */}
      <View style={styles.topHeaderBar}>
        <Text style={styles.headerTitle}>Transfer Hub</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. THẺ: Shake & Split bill (Nền Tím Nhạt #F3EBFF) */}
        <NeoFeatureCard
          title="Shake & Split bill"
          description="Shake phones with nearby friends to auto-discover and split bills on-chain."
          iconNode={
            <MaterialCommunityIcons name="cellphone-nfc" size={22} color="#FFFFFF" />
          }
          iconBgColor="#5B21B6"
          cardBgColor="#F3EBFF"
          dividerColor="#E9D5FF"
          onPress={handleOpenShakeToSplit}
        />

        {/* 2. THẺ: Transfer by Phone Number (Nền Xanh Ngọc Nhạt #E6FAF8) */}
        <NeoFeatureCard
          title="Transfer by Phone Number"
          description="Send SOL directly to recipient via linked phone number."
          iconNode={<Ionicons name="navigate" size={20} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />}
          iconBgColor="#0D9488"
          cardBgColor="#E6FAF8"
          dividerColor="#CCFBF1"
          onPress={() => router.push('/send')}
        />

        {/* 3. THẺ: Coin Toss Lì Xì Room (Nền Trắng #FFFFFF) */}
        <NeoFeatureCard
          title="Coin Toss Lì Xì Room"
          description="Create a room, invite nearby friends, and swipe to toss the lucky coin to pick a winner for on-chain SOL."
          iconNode={
            <MaterialCommunityIcons name="bitcoin" size={22} color="#FFFFFF" />
          }
          iconBgColor="#78350F"
          cardBgColor="#FFFFFF"
          dividerColor="#E2E8F0"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const roomId = 'coin_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
            router.push(`/coin-toss-room?roomId=${roomId}&isHost=true` as any);
          }}
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
        onTriggerRecovery={() => {
          setShowSendModal(false);
          setShowRecoveryModal(true);
        }}
      />

      {/* Modal Khôi phục Ví Bảo Mật */}
      <WalletRecoveryModal
        visible={showRecoveryModal || needsRecovery}
        onClose={() => setShowRecoveryModal(false)}
        onSuccess={() => setShowRecoveryModal(false)}
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
