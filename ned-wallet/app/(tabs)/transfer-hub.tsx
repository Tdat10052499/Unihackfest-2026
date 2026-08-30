import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { useTransferToken } from '@/hooks/useTransferToken';
import { getSolanaBalance, ActivityItem } from '@/services/solana';
import { cacheActivities, getCachedActivities } from '@/services/storage';
import { SendModal } from '@/components/SendModal';
import { WalletRecoveryModal } from '@/components/WalletRecoveryModal';

interface FeatureCardProps {
  title: string;
  subtitle: string;
  badgeText?: string;
  isAvailable?: boolean;
  iconNode: React.ReactNode;
  iconBgColor: string;
  cardBgColor?: string;
  borderColor?: string;
  onPress: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  subtitle,
  badgeText = 'Đang phát triển',
  isAvailable = false,
  iconNode,
  iconBgColor,
  cardBgColor = '#FFFFFF',
  borderColor = '#E2E8F0',
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.cardWrapper]}>
      <TouchableOpacity
        style={[
          styles.cardContainer,
          { backgroundColor: cardBgColor, borderColor: borderColor },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {/* Top Row: Icon & Status Badge */}
        <View style={styles.cardTopRow}>
          <View style={[styles.cardIconCircle, { backgroundColor: iconBgColor }]}>
            {iconNode}
          </View>

          <View
            style={[
              styles.badgePill,
              isAvailable ? styles.badgeAvailable : styles.badgeDevelopment,
            ]}
          >
            <View
              style={[
                styles.badgeDot,
                isAvailable ? styles.badgeDotGreen : styles.badgeDotAmber,
              ]}
            />
            <Text
              style={[
                styles.badgeText,
                isAvailable ? styles.badgeTextGreen : styles.badgeTextAmber,
              ]}
            >
              {isAvailable ? 'Sẵn sàng sử dụng' : badgeText}
            </Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>

        {/* Bottom Action Hint */}
        <View style={styles.cardBottomRow}>
          <Text
            style={[
              styles.actionHintText,
              isAvailable ? styles.actionHintGreen : styles.actionHintMuted,
            ]}
          >
            {isAvailable ? 'Bắt đầu tương tác ngay' : 'Tìm hiểu thêm tính năng'}
          </Text>
          <Feather
            name={isAvailable ? 'arrow-right' : 'chevron-right'}
            size={16}
            color={isAvailable ? '#00A859' : '#94A3B8'}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function TransferHubScreen() {
  const router = useRouter();

  const { isReady, user } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const {
    transfer: executeTokenTransfer,
    isTransferring: isSending,
    isWalletReady,
    needsRecovery,
    walletStatus,
    senderAddress: solanaAddress,
  } = useTransferToken();

  const [showSendModal, setShowSendModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  const handleConfirmSend = async (recipient: string, amount: number) => {
    if (needsRecovery) {
      setShowRecoveryModal(true);
      return;
    }
    if (!solanaAddress) {
      Alert.alert('Thông báo', 'Không tìm thấy địa chỉ ví nguồn.');
      return;
    }
    if (!isWalletReady) {
      Alert.alert(
        'Ví đang kết nối',
        `Ví nhúng đang ở trạng thái (${walletStatus}). Vui lòng chờ 2-3 giây để kết nối hoàn tất!`
      );
      return;
    }

    try {
      const result = await executeTokenTransfer({
        fromAddress: solanaAddress,
        recipientAddressOrPhone: recipient,
        amountSol: amount,
      });

      if (!result.success || !result.txSignature) {
        Alert.alert('Giao dịch chưa hoàn tất ❌', result.error || 'Không thể thực hiện giao dịch.');
        return;
      }

      const txSignature = result.txSignature;
      const finalRecipient = result.recipientAddress || recipient;

      setShowSendModal(false);

      // Lưu log lịch sử giao dịch vào cache sau khi giao dịch On-chain đã xác nhận
      const currentActs = (await getCachedActivities()) || [];
      const newAct: ActivityItem = {
        id: txSignature,
        type: 'sent',
        title: 'Chuyển tiền',
        time: 'Vừa xong',
        amount: `-$${(amount * 150).toFixed(2)}`,
        isPositive: false,
        iconBg: '#374151',
        signature: txSignature,
      };
      await cacheActivities([newAct, ...currentActs]);

      Alert.alert(
        'Giao Dịch Thành Công! ⚡',
        `Đã chuyển ${amount} SOL đến:\n${finalRecipient.length > 12 ? `${finalRecipient.slice(0, 6)}...${finalRecipient.slice(-6)}` : finalRecipient}\n\nChữ ký: ${txSignature.slice(0, 16)}...`
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

  const handleOpenFeatureInfo = (title: string, desc: string) => {
    Alert.alert(
      `🚀 ${title}`,
      `${desc}\n\nTính năng này đang được đội ngũ kỹ sư N.E.D tích hợp smart contract và sẽ sẵn sàng trong bản cập nhật tới!`
    );
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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header Bar */}
      <View style={styles.topHeaderBar}>
        <View>
          <Text style={styles.headerTitle}>N.E.D Transfer Hub</Text>
          <Text style={styles.headerSubtitle}>
            Phương thức giao dịch thế hệ mới
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Giới Thiệu Hub */}
        <View style={styles.hubIntroBanner}>
          <View style={styles.introIconBox}>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color="#00A859" />
          </View>
          <View style={styles.introTextBox}>
            <Text style={styles.introTitle}>Chuyển Tiền Tức Thì & Không Giới Hạn</Text>
            <Text style={styles.introDesc}>
              Khởi tạo phòng Shake to Split để chia hóa đơn, chuyển tiền qua Solana / số điện thoại hoặc giao dịch không chạm.
            </Text>
          </View>
        </View>

        {/* 1. THẺ: Shake to Split (Lắc chia tiền) - SẴN SÀNG */}
        <FeatureCard
          title="Shake to Split (Lắc chia tiền)"
          subtitle="Tạo phòng chia tiền, gom nhóm bạn bè lân cận qua Geolocation và lắc thiết bị để chốt thanh toán."
          isAvailable={true}
          badgeText="Sẵn sàng"
          iconNode={
            <MaterialCommunityIcons name="cellphone-nfc" size={26} color="#8B5CF6" />
          }
          iconBgColor="#EDE9FE"
          borderColor="#DDD6FE"
          onPress={handleOpenShakeToSplit}
        />

        {/* 2. THẺ: Chuyển tiền P2P & Số điện thoại - SẴN SÀNG */}
        <FeatureCard
          title="Chuyển tiền P2P & Số điện thoại"
          subtitle="Gửi SOL, USDC tới địa chỉ Solana hoặc số điện thoại định danh N.E.D với thời gian xác thực dưới 1 giây."
          isAvailable={true}
          iconNode={<Feather name="send" size={24} color="#00A859" />}
          iconBgColor="#D1F4E0"
          borderColor="#A7F3D0"
          onPress={() => setShowSendModal(true)}
        />

        {/* 3. THẺ: AirDrop Radar (Chuyển không chạm) */}
        <FeatureCard
          title="AirDrop Radar (Chuyển không chạm)"
          subtitle="Quét thiết bị xung quanh. Kéo thả đồng xu vào Avatar bạn bè để gửi tiền tức thì."
          isAvailable={false}
          iconNode={<MaterialCommunityIcons name="radar" size={26} color="#0284C7" />}
          iconBgColor="#E0F2FE"
          onPress={() =>
            handleOpenFeatureInfo(
              'AirDrop Radar (Chuyển không chạm)',
              'Quét thiết bị xung quanh. Kéo thả đồng xu vào Avatar bạn bè để gửi tiền tức thì.'
            )
          }
        />

        {/* 4. THẺ: Geo-Red Packet (Lì xì không gian) */}
        <FeatureCard
          title="Geo-Red Packet (Lì xì không gian)"
          subtitle="Thả gói lì xì USDC trong bán kính 10m. Smart contract chọn ngẫu nhiên người may mắn."
          isAvailable={false}
          iconNode={
            <MaterialCommunityIcons name="gift-outline" size={26} color="#EF4444" />
          }
          iconBgColor="#FEE2E2"
          onPress={() =>
            handleOpenFeatureInfo(
              'Geo-Red Packet (Lì xì không gian)',
              'Thả gói lì xì USDC trong bán kính 10m. Smart contract chọn ngẫu nhiên người may mắn.'
            )
          }
        />

        {/* Khoảng trống đệm */}
        <View style={{ height: 90 }} />
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
    backgroundColor: '#F8FAFC',
  },
  topHeaderBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
  },
  hubIntroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  introIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  introTextBox: {
    flex: 1,
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  introDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },
  cardWrapper: {
    marginBottom: 14,
  },
  cardContainer: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeAvailable: {
    backgroundColor: '#DCFCE7',
  },
  badgeDevelopment: {
    backgroundColor: '#FEF3C7',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeDotGreen: {
    backgroundColor: '#16A34A',
  },
  badgeDotAmber: {
    backgroundColor: '#D97706',
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  badgeTextGreen: {
    color: '#15803D',
  },
  badgeTextAmber: {
    color: '#B45309',
  },
  cardContent: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionHintText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionHintGreen: {
    color: '#00A859',
  },
  actionHintMuted: {
    color: '#64748B',
  },
});
