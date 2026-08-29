import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { SendModal } from '@/components/SendModal';
import { useGlobalPresence, PresenceUser } from '@/contexts/GlobalPresenceContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  let privy: any = null;
  try {
    privy = usePrivy();
  } catch (e) {}
  const user = privy?.user || null;

  let solanaWalletState: any = null;
  try {
    solanaWalletState = useEmbeddedSolanaWallet();
  } catch (e) {}

  const { nearbyUsers, broadcastInvite } = useGlobalPresence();

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

  const handleConfirmSend = async (recipient: string, amount: number) => {
    Alert.alert('Chuyển tiền', `Giao dịch ${amount} SOL tới ${recipient.substring(0, 8)}...`);
  };

  // State Modals
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Animation values
  const radarWaveAnim = useRef(new Animated.Value(1)).current;
  const lastShakeTimeRef = useRef(0);

  // Lọc người dùng lân cận dưới 20m
  const liveNearbyIn20m = nearbyUsers.filter(
    (u) => u.distanceMeters !== undefined && u.distanceMeters <= 20
  );

  // Fallback demo peers nếu chưa có thiết bị thật trong phạm vi 20m khi test
  const demoFallbackPeers: PresenceUser[] = [
    {
      user_id: 'demo_peer_1',
      name: 'Nguyễn Văn Nam',
      avatar: 'N',
      lat: 0,
      lng: 0,
      distanceMeters: 3,
    },
    {
      user_id: 'demo_peer_2',
      name: 'Lê Thị Mai',
      avatar: 'M',
      lat: 0,
      lng: 0,
      distanceMeters: 8,
    },
    {
      user_id: 'demo_peer_3',
      name: 'Trần Hoàng',
      avatar: 'H',
      lat: 0,
      lng: 0,
      distanceMeters: 14,
    },
  ];

  const candidateUsers =
    liveNearbyIn20m.length > 0 ? liveNearbyIn20m : demoFallbackPeers;

  // Pulse animation cho radar
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(radarWaveAnim, {
          toValue: 1.4,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(radarWaveAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Hàm kích hoạt khi Lắc thiết bị (Shake Handler)
  const handleShake = () => {
    const now = Date.now();
    // Debounce 3 giây chống spam
    if (now - lastShakeTimeRef.current < 3000) {
      console.log('⏳ [Shake] Bỏ qua do debounce 3s');
      return;
    }
    lastShakeTimeRef.current = now;

    console.log('⚡ [Shake] Phát hiện gia tốc lắc hợp lệ! Mở Bottom Sheet.');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Mặc định chọn tất cả bạn bè trong bán kính 20m
    const allIds = candidateUsers.map((u) => u.user_id);
    setSelectedUserIds(allIds);
    setShowHostModal(true);
  };

  // Lắng nghe cảm biến gia tốc Accelerometer
  useEffect(() => {
    Accelerometer.setUpdateInterval(150);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      // Tính tổng gia tốc 3 chiều
      const totalAcc = Math.sqrt(x * x + y * y + z * z);
      if (totalAcc > 1.75) {
        handleShake();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [candidateUsers]);

  // Toggle chọn từng người dùng
  const toggleUserSelection = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Chọn tất cả
  const selectAllUsers = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUserIds(candidateUsers.map((u) => u.user_id));
  };

  // Phát sóng lời mời (room_invite) & Điều hướng Host sang Room Screen
  const handleBroadcastAndCreateRoom = async () => {
    if (selectedUserIds.length === 0) {
      Alert.alert('Chưa chọn bạn bè', 'Vui lòng chọn ít nhất một người để mời vào phòng chia tiền.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsBroadcasting(true);

    // Tạo room_id ngẫu nhiên
    const roomId = 'room_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    try {
      console.log('🚀 [Shake Host] Phát sóng room_invite:', {
        roomId,
        targetCount: selectedUserIds.length,
      });

      await broadcastInvite(roomId, selectedUserIds);

      setIsBroadcasting(false);
      setShowHostModal(false);

      // Chuyển hướng Host sang màn hình phòng
      router.push(`/shake-room?roomId=${roomId}`);
    } catch (e) {
      console.error('Lỗi khi phát sóng lời mời:', e);
      setIsBroadcasting(false);
      Alert.alert('Lỗi', 'Không thể phát sóng lời mời phòng. Vui lòng thử lại.');
    }
  };

  const handleOpenFeatureInfo = (title: string, desc: string) => {
    Alert.alert(
      `🚀 ${title}`,
      `${desc}\n\nTính năng này đang được đội ngũ kỹ sư N.E.D tích hợp smart contract và sẽ sẵn sàng trong bản cập nhật tới!`
    );
  };

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
              Lắc thiết bị để gom nhóm chia hóa đơn, chuyển tiền qua số điện thoại hoặc giao dịch không chạm.
            </Text>
          </View>
        </View>

        {/* 1. THẺ CỐT LÕI: Shake to Split (Lắc chia tiền) - SẴN SÀNG */}
        <FeatureCard
          title="Shake to Split (Lắc chia tiền)"
          subtitle="Lắc thiết bị để gom nhóm qua Geolocation trong bán kính 20m. Tự động chia hóa đơn và đẩy yêu cầu thanh toán."
          isAvailable={true}
          badgeText="Sẵn sàng (Lắc hoặc chạm)"
          iconNode={
            <MaterialCommunityIcons name="cellphone-nfc" size={26} color="#8B5CF6" />
          }
          iconBgColor="#EDE9FE"
          borderColor="#DDD6FE"
          onPress={handleShake}
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
      />

      {/* BOTTOM SHEET: Shake to Split Host Modal */}
      <Modal
        visible={showHostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowHostModal(false)}
          />

          <View style={styles.bottomSheetContainer}>
            <View style={styles.sheetHandle} />

            {/* Radar Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.radarIconWrapper}>
                <Animated.View
                  style={[
                    styles.radarRing,
                    { transform: [{ scale: radarWaveAnim }] },
                  ]}
                />
                <View style={styles.radarCenterCircle}>
                  <MaterialCommunityIcons name="cellphone-nfc" size={24} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.sheetTitle}>Shake to Split</Text>
              <Text style={styles.sheetSubtitle}>
                Đã quét thấy {candidateUsers.length} bạn bè trong phạm vi 20 mét
              </Text>
            </View>

            {/* Selection Quick Bar */}
            <View style={styles.selectionBar}>
              <Text style={styles.selectionCount}>
                Đã chọn {selectedUserIds.length}/{candidateUsers.length} người
              </Text>
              <TouchableOpacity onPress={selectAllUsers} activeOpacity={0.7}>
                <Text style={styles.selectAllBtn}>Chọn tất cả</Text>
              </TouchableOpacity>
            </View>

            {/* Candidates List */}
            <ScrollView
              style={styles.candidatesList}
              showsVerticalScrollIndicator={false}
            >
              {candidateUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.user_id);
                return (
                  <TouchableOpacity
                    key={u.user_id}
                    style={[
                      styles.candidateItem,
                      isSelected && styles.candidateItemSelected,
                    ]}
                    onPress={() => toggleUserSelection(u.user_id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.candidateAvatar}>
                      <Text style={styles.candidateAvatarText}>{u.avatar}</Text>
                    </View>

                    <View style={styles.candidateDetails}>
                      <Text style={styles.candidateName}>{u.name}</Text>
                      <View style={styles.distanceRow}>
                        <Ionicons name="location-sharp" size={12} color="#00A859" />
                        <Text style={styles.distanceText}>
                          Cách bạn ~{u.distanceMeters ?? 5}m
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxActive,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Action Button: Mời tất cả & Mở phòng */}
            <TouchableOpacity
              style={[
                styles.broadcastActionBtn,
                isBroadcasting && styles.broadcastBtnDisabled,
              ]}
              onPress={handleBroadcastAndCreateRoom}
              disabled={isBroadcasting}
              activeOpacity={0.85}
            >
              {isBroadcasting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <Text style={styles.broadcastActionText}>
                    Mời {selectedUserIds.length} bạn & Mở phòng chia tiền
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Modal & Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  radarIconWrapper: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  radarRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  radarCenterCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  selectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  selectAllBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00A859',
  },
  candidatesList: {
    maxHeight: 220,
    marginBottom: 18,
  },
  candidateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  candidateItemSelected: {
    borderColor: '#00A859',
    backgroundColor: 'rgba(0, 168, 89, 0.08)',
  },
  candidateAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00A859',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  candidateAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  candidateDetails: {
    flex: 1,
  },
  candidateName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  distanceText: {
    fontSize: 12,
    color: '#00A859',
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#00A859',
    borderColor: '#00A859',
  },
  broadcastActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00A859',
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  broadcastBtnDisabled: {
    opacity: 0.6,
  },
  broadcastActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
