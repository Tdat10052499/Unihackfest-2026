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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { SendModal } from '@/components/SendModal';

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
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
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
            {isAvailable ? 'Bắt đầu chuyển tiền ngay' : 'Tìm hiểu thêm tính năng'}
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
  const { user } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();

  const [showSendModal, setShowSendModal] = useState(false);

  // Lấy địa chỉ ví Solana
  const getSolanaAddress = (): string | null => {
    if (!user) return null;
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
    }
    const linkedAccounts = (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const solAccount = linkedAccounts.find(
      (acc: any) => acc.type === 'wallet' && (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    return solAccount?.address || null;
  };

  const solanaAddress = getSolanaAddress();

  const handleOpenFeatureInfo = (title: string, desc: string) => {
    Alert.alert(
      `🚀 ${title}`,
      `${desc}\n\nTính năng này đang được đội ngũ kỹ sư N.E.D tích hợp smart contract và sẽ sẵn sàng trong bản cập nhật tới!`
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header Bar Không Nút Back */}
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
              Lựa chọn phương thức chuyển tiền nhanh chóng qua Solana, số điện thoại hoặc các trải nghiệm Web3 không chạm.
            </Text>
          </View>
        </View>

        {/* 1. THẺ CỐT LÕI (Active): Chuyển tiền P2P & Tra cứu SĐT */}
        <FeatureCard
          title="Chuyển tiền P2P & Số điện thoại"
          subtitle="Gửi SOL, USDC tới địa chỉ Solana hoặc số điện thoại định danh N.E.D với thời gian xác thực dưới 1 giây."
          isAvailable={true}
          iconNode={<Feather name="send" size={24} color="#00A859" />}
          iconBgColor="#D1F4E0"
          borderColor="#A7F3D0"
          onPress={() => setShowSendModal(true)}
        />

        {/* 2. THẺ 1: Shake to Split (Lắc chia tiền) */}
        <FeatureCard
          title="Shake to Split (Lắc chia tiền)"
          subtitle="Lắc thiết bị để gom nhóm qua Geolocation. Tự động chia hóa đơn và đẩy yêu cầu thanh toán."
          isAvailable={false}
          iconNode={
            <MaterialCommunityIcons name="cellphone-nfc" size={26} color="#8B5CF6" />
          }
          iconBgColor="#EDE9FE"
          onPress={() =>
            handleOpenFeatureInfo(
              'Shake to Split (Lắc chia tiền)',
              'Lắc thiết bị để gom nhóm qua Geolocation. Tự động chia hóa đơn và đẩy yêu cầu thanh toán.'
            )
          }
        />

        {/* 3. THẺ 2: AirDrop Radar (Chuyển không chạm) */}
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

        {/* 4. THẺ 3: Geo-Red Packet (Lì xì không gian) */}
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
        onConfirmSend={async () => {
          setShowSendModal(false);
          Alert.alert('Thành Công', 'Đã chuyển tiền thành công!');
        }}
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
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Intro Banner
  hubIntroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  introIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  introTextBox: {
    flex: 1,
  },
  introTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#166534',
  },
  introDesc: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 16,
  },

  // Feature Card
  cardWrapper: {
    marginBottom: 16,
  },
  cardContainer: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
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
  },
  badgeDotGreen: {
    backgroundColor: '#00A859',
  },
  badgeDotAmber: {
    backgroundColor: '#D97706',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextGreen: {
    color: '#166534',
  },
  badgeTextAmber: {
    color: '#92400E',
  },
  cardContent: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionHintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionHintGreen: {
    color: '#00A859',
  },
  actionHintMuted: {
    color: '#94A3B8',
  },
});
