import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { useOnchainTransfer } from '../hooks/useOnchainTransfer';
import {
  createGeoRedPacketRecord,
  fetchActiveGeoRedPackets,
  claimGeoRedPacketViaBackend,
  GeoRedPacket,
} from '../services/supabase';
import { GEO_REDPACKET_TREASURY, getSolanaBalance } from '../services/solana';
import { WalletRecoveryModal } from '../components/WalletRecoveryModal';

type ActiveTab = 'drop' | 'scan';

export default function GeoRedPacketScreen() {
  const router = useRouter();
  const { user, isReady, logout } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const {
    transfer,
    isTransferring,
    isWalletReady,
    needsRecovery,
    walletStatus,
    statusMessage,
  } = useOnchainTransfer();

  const [activeTab, setActiveTab] = useState<ActiveTab>('drop');
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [claimingPacketId, setClaimingPacketId] = useState<string | null>(null);

  // Vị trí GPS của người dùng
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // State Thả Lì Xì (Drop Mode)
  const [amount, setAmount] = useState('0.005');
  const [wishesMessage, setWishesMessage] = useState('Chúc bạn vạn sự như ý, phát tài phát lộc! 🧧');
  const [radiusMeters, setRadiusMeters] = useState(50);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isSuccessDrop, setIsSuccessDrop] = useState(false);
  const [lastCreatedPacket, setLastCreatedPacket] = useState<GeoRedPacket | null>(null);

  // State Quét Lì Xì (Scan Mode)
  const [nearbyPackets, setNearbyPackets] = useState<GeoRedPacket[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Radar Pulse Animation
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;

  // Lấy địa chỉ ví người dùng hiện tại
  const getMySolanaAddress = (): string | null => {
    if (!user) return null;
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
    }
    const linkedAccounts = (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const solanaAccount = linkedAccounts.find(
      (acc: any) => acc.type === 'wallet' && (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    return solanaAccount?.address || null;
  };

  const myAddress = getMySolanaAddress();

  // Nạp số dư ví
  useEffect(() => {
    if (myAddress) {
      getSolanaBalance(myAddress).then(setSolBalance).catch(console.log);
    }
  }, [myAddress]);

  // Yêu cầu và lấy tọa độ GPS tức thì
  const requestUserLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Ứng dụng cần quyền truy cập vị trí để xác định tọa độ lì xì.');
        setIsLoadingLocation(false);
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);
      setIsLoadingLocation(false);
      return loc;
    } catch (err: any) {
      console.error('Location Error:', err);
      setLocationError('Không thể lấy tọa độ GPS. Vui lòng bật GPS trên thiết bị.');
      setIsLoadingLocation(false);
      return null;
    }
  };

  useEffect(() => {
    requestUserLocation();
  }, []);

  // Kích hoạt Radar Animation khi chuyển sang Tab Scan
  useEffect(() => {
    if (activeTab === 'scan') {
      const createPulse = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const pulse1 = createPulse(pulseAnim1, 0);
      const pulse2 = createPulse(pulseAnim2, 1000);

      pulse1.start();
      pulse2.start();

      handleScanNearbyPackets();

      return () => {
        pulse1.stop();
        pulse2.stop();
      };
    }
  }, [activeTab]);

  // Quét các bao lì xì đang có xung quanh
  const handleScanNearbyPackets = async () => {
    setIsScanning(true);
    let currentLoc = location;
    if (!currentLoc) {
      currentLoc = await requestUserLocation();
    }

    try {
      const userLat = currentLoc?.coords.latitude;
      const userLng = currentLoc?.coords.longitude;
      const packets = await fetchActiveGeoRedPackets(userLat, userLng, 1000);
      setNearbyPackets(packets);
    } catch (err) {
      console.error('Scan packets error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // THỰC THI THẢ LÌ XÌ (ON-CHAIN ESCROW DEPOSIT + SUPABASE RECORD)
  const handleDropRedPacket = async () => {
    if (!myAddress) {
      Alert.alert('Thông báo', 'Không tìm thấy địa chỉ ví nguồn.');
      return;
    }

    let currentLoc = location;
    if (!currentLoc) {
      currentLoc = await requestUserLocation();
      if (!currentLoc) {
        Alert.alert('Chưa có vị trí', 'Vui lòng cho phép truy cập GPS để xác định tọa độ thả lì xì.');
        return;
      }
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số lượng SOL hợp lệ (> 0).');
      return;
    }

    if (solBalance !== null && numAmount > solBalance) {
      Alert.alert('Số dư không đủ', `Số dư ví (${solBalance.toFixed(4)} SOL) không đủ để thả ${numAmount} SOL.`);
      return;
    }

    if (!isWalletReady) {
      Alert.alert(
        'Ví đang kết nối',
        `Ví nhúng đang ở trạng thái (${walletStatus}). Vui lòng chờ vài giây để kết nối hoàn tất!`
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // 1. Chuyển tiền vào Treasury Escrow Wallet trên Solana Devnet
      const result = await transfer({
        fromAddress: myAddress,
        recipientAddressOrPhone: GEO_REDPACKET_TREASURY,
        amountSol: numAmount,
      });

      if (!result.success || !result.transactionHash) {
        const errorMsg = result.error || 'Giao dịch on-chain không thành công.';
        Alert.alert('Lỗi Thả Lì Xì ❌', errorMsg);
        return;
      }

      const txSignature = result.transactionHash;

      // 2. CHỈ KHI GIAO DỊCH ON-CHAIN THÀNH CÔNG -> Lưu bản ghi vào bảng geo_red_packets trên Supabase
      const insertResult = await createGeoRedPacketRecord({
        creator_wallet: myAddress,
        amount: numAmount,
        lat: currentLoc.coords.latitude,
        lng: currentLoc.coords.longitude,
        radius: radiusMeters,
        message: wishesMessage.trim() || 'Chúc bạn nhận được thật nhiều may mắn! 🧧',
        tx_signature: txSignature,
      });

      if (!insertResult.success) {
        Alert.alert(
          'Lưu Tọa Độ Thất Bại ⚠️',
          `Giao dịch on-chain đã ký thành công (${txSignature.slice(0, 12)}...), nhưng hệ thống gặp lỗi khi lưu tọa độ Supabase: ${insertResult.error}`
        );
        return;
      }

      // Cập nhật số dư mới
      getSolanaBalance(myAddress).then(setSolBalance).catch(console.log);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSuccessDrop(true);
      setLastCreatedPacket(insertResult.data || null);

      Alert.alert(
        'Thả Lì Xì Thành Công! 🧧✨',
        `Bao lì xì ${numAmount} SOL đã được khóa an toàn trên Solana Devnet tại tọa độ GPS của bạn.\n\nBán kính: ${radiusMeters}m\nChữ ký: ${txSignature.slice(0, 16)}...`,
        [
          {
            text: 'Xem Radar Quét',
            onPress: () => {
              setIsSuccessDrop(false);
              setActiveTab('scan');
            },
          },
          { text: 'Xong', style: 'cancel', onPress: () => setIsSuccessDrop(false) },
        ]
      );
    } catch (err: any) {
      console.error('Drop Red Packet Error:', err);
      Alert.alert('Lỗi Thả Lì Xì', err?.message || 'Không thể thực hiện lúc này.');
    }
  };

  // THỰC THI NHẬN LÌ XÌ (GỌI SUPABASE EDGE FUNCTION - BACKEND SIGNER)
  const handleClaimRedPacket = async (pkt: GeoRedPacket) => {
    if (!myAddress) {
      Alert.alert('Thông báo', 'Không tìm thấy địa chỉ ví nhận.');
      return;
    }

    if (pkt.creator_wallet.toLowerCase() === myAddress.toLowerCase()) {
      Alert.alert('Không thể nhận ⚠️', 'Bạn không thể tự nhặt bao lì xì do chính mình tạo ra.');
      return;
    }

    let currentLoc = location;
    if (!currentLoc) {
      currentLoc = await requestUserLocation();
      if (!currentLoc) {
        Alert.alert('Chưa có vị trí', 'Vui lòng bật định vị GPS để xác thực khoảng cách.');
        return;
      }
    }

    setClaimingPacketId(pkt.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await claimGeoRedPacketViaBackend({
        packet_id: pkt.id,
        user_wallet: myAddress,
        user_lat: currentLoc.coords.latitude,
        user_lng: currentLoc.coords.longitude,
      });

      if (!result.success) {
        Alert.alert('Không thể mở lì xì ❌', result.error || 'Yêu cầu bị từ chối.');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Cập nhật số dư SOL
      getSolanaBalance(myAddress).then(setSolBalance).catch(console.log);

      Alert.alert(
        '🎉 Mở Lì Xì Thành Công! 🧧✨',
        `Bạn đã nhận được ${result.amount} SOL từ Backend Treasury!\n\nLời chúc: "${result.message || pkt.message}"\n\nChữ ký On-chain:\n${result.txSignature?.slice(0, 16)}...`,
        [
          {
            text: 'Tuyệt vời',
            onPress: () => handleScanNearbyPackets(),
          },
        ]
      );

      handleScanNearbyPackets();
    } catch (err: any) {
      console.error('Claim Error:', err);
      Alert.alert('Lỗi Khi Nhận Lì Xì', err?.message || 'Không thể kết nối máy chủ backend.');
    } finally {
      setClaimingPacketId(null);
    }
  };

  // Format tọa độ
  const formatCoord = (val?: number) => {
    if (val === undefined || val === null) return '--';
    return val.toFixed(6);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF1F2" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Geo-RedPacket</Text>
            <Text style={styles.headerSubtitle}>Lì Xì Tọa Độ Không Gian</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'drop' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('drop');
            }}
          >
            <MaterialCommunityIcons
              name="gift-outline"
              size={18}
              color={activeTab === 'drop' ? '#EF4444' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'drop' && styles.tabTextActive]}>
              Thả Lì Xì
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'scan' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('scan');
            }}
          >
            <MaterialCommunityIcons
              name="radar"
              size={18}
              color={activeTab === 'scan' ? '#EF4444' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>
              Quét Lì Xì Quanh Đây
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Vùng Hiển Thị Vị Trí GPS */}
          <View style={styles.gpsCard}>
            <View style={styles.gpsIconCircle}>
              <Ionicons name="location" size={20} color="#EF4444" />
            </View>
            <View style={styles.gpsInfoCol}>
              <Text style={styles.gpsTitle}>Vị trí GPS Hiện Tại</Text>
              {isLoadingLocation ? (
                <Text style={styles.gpsLoadingText}>Đang lấy tọa độ vệ tinh GPS...</Text>
              ) : location ? (
                <Text style={styles.gpsCoordText}>
                  Lat: {formatCoord(location.coords.latitude)} | Lng: {formatCoord(location.coords.longitude)}
                </Text>
              ) : (
                <Text style={styles.gpsErrorText}>
                  {locationError || 'Chưa xác định được vị trí'}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.gpsRefreshBtn} onPress={requestUserLocation}>
              <Feather name="refresh-cw" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* TAB 1: THẢ LÌ XÌ (DROP MODE) */}
          {activeTab === 'drop' && (
            <View style={styles.tabContentContainer}>
              {/* Banner Lì Xì Đỏ */}
              <View style={styles.redPacketBanner}>
                <View style={styles.bannerIconBox}>
                  <Text style={styles.bannerEmoji}>🧧</Text>
                </View>
                <View style={styles.bannerTextBox}>
                  <Text style={styles.bannerTitle}>Tạo Bao Lì Xì Theo Tọa Độ</Text>
                  <Text style={styles.bannerDesc}>
                    Khóa token SOL on-chain tại vị trí bạn đang đứng. Người nhận phải đến đúng bán kính để mở lì xì.
                  </Text>
                </View>
              </View>

              {/* 1. Nhập Số Lượng SOL */}
              <View style={styles.inputSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.fieldLabel}>Số lượng SOL trong bao lì xì:</Text>
                  {solBalance !== null && (
                    <Text style={styles.balanceText}>Số dư: {solBalance.toFixed(4)} SOL</Text>
                  )}
                </View>

                <View style={styles.amountInputBox}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.005"
                    placeholderTextColor="#94A3B8"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>SOL</Text>
                  </View>
                </View>

                {/* Gợi Ý Nhanh */}
                <View style={styles.quickAmountRow}>
                  {['0.005', '0.01', '0.02', '0.05'].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.quickPill, amount === amt && styles.quickPillActive]}
                      onPress={() => setAmount(amt)}
                    >
                      <Text
                        style={[
                          styles.quickPillText,
                          amount === amt && styles.quickPillTextActive,
                        ]}
                      >
                        {amt} SOL
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 2. Lời Chúc Mừng (Wishes Message) */}
              <View style={styles.inputSection}>
                <Text style={styles.fieldLabel}>Lời chúc gửi gắm:</Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Nhập lời chúc may mắn..."
                  placeholderTextColor="#94A3B8"
                  value={wishesMessage}
                  onChangeText={setWishesMessage}
                  multiline
                  maxLength={100}
                />
              </View>

              {/* 3. Chọn Bán Kính Mở Lì Xì */}
              <View style={styles.inputSection}>
                <Text style={styles.fieldLabel}>Bán kính nhặt lì xì hợp lệ:</Text>
                <View style={styles.radiusOptionsRow}>
                  {[20, 50, 100].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.radiusOptionCard,
                        radiusMeters === r && styles.radiusOptionCardActive,
                      ]}
                      onPress={() => setRadiusMeters(r)}
                    >
                      <MaterialCommunityIcons
                        name="map-marker-radius"
                        size={20}
                        color={radiusMeters === r ? '#EF4444' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.radiusOptionText,
                          radiusMeters === r && styles.radiusOptionTextActive,
                        ]}
                      >
                        {r} mét
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 4. Nút Xác Nhận Thả Lì Xì */}
              <TouchableOpacity
                style={[
                  styles.dropBtn,
                  (isTransferring || !location || !isWalletReady) && styles.dropBtnDisabled,
                ]}
                onPress={handleDropRedPacket}
                disabled={isTransferring || !location || !isWalletReady}
                activeOpacity={0.85}
              >
                {isTransferring ? (
                  <View style={styles.btnInner}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.dropBtnText}>
                      {statusMessage || 'Đang khóa SOL vào Escrow On-chain...'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.btnInner}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>🧧</Text>
                    <Text style={styles.dropBtnText}>Xác Nhận Thả Lì Xì ({amount} SOL)</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: QUÉT LÌ XÌ QUANH ĐÂY (SCAN/RADAR MODE) */}
          {activeTab === 'scan' && (
            <View style={styles.tabContentContainer}>
              {/* Radar Pulse Animation View */}
              <View style={styles.radarContainer}>
                <Animated.View
                  style={[
                    styles.radarPulseCircle,
                    {
                      transform: [
                        {
                          scale: pulseAnim1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 1.8],
                          }),
                        },
                      ],
                      opacity: pulseAnim1.interpolate({
                        inputRange: [0, 0.8, 1],
                        outputRange: [0.8, 0.3, 0],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.radarPulseCircle,
                    {
                      transform: [
                        {
                          scale: pulseAnim2.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 1.8],
                          }),
                        },
                      ],
                      opacity: pulseAnim2.interpolate({
                        inputRange: [0, 0.8, 1],
                        outputRange: [0.8, 0.3, 0],
                      }),
                    },
                  ]}
                />

                <View style={styles.radarCenterCore}>
                  <Text style={{ fontSize: 32 }}>🛰️</Text>
                </View>
              </View>

              <View style={styles.radarStatusBox}>
                <Text style={styles.radarStatusTitle}>
                  {isScanning ? 'Đang quét sóng GPS lân cận...' : `Tìm thấy ${nearbyPackets.length} bao lì xì quanh đây`}
                </Text>
                <Text style={styles.radarStatusSubtitle}>
                  Phạm vi tìm kiếm vệ tinh: 1,000 mét
                </Text>
              </View>

              {/* Danh sách các bao lì xì tìm thấy */}
              <View style={styles.packetListContainer}>
                {nearbyPackets.map((pkt) => {
                  const isMine = myAddress && pkt.creator_wallet.toLowerCase() === myAddress.toLowerCase();
                  const dist = pkt.distanceMeters !== undefined ? pkt.distanceMeters : 999;
                  const isInRange = dist <= pkt.radius;
                  const isClaimingThis = claimingPacketId === pkt.id;

                  return (
                    <View key={pkt.id} style={[styles.packetCard, isInRange && styles.packetCardInRange]}>
                      <View style={styles.packetCardTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={styles.packetCardIcon}>
                            <Text style={{ fontSize: 24 }}>🧧</Text>
                          </View>
                          <View>
                            <Text style={styles.packetCardAmount}>{pkt.amount} SOL</Text>
                            <Text style={styles.packetCardCreator}>
                              Bởi: {pkt.creator_wallet.slice(0, 4)}...{pkt.creator_wallet.slice(-4)}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.distanceBadge,
                            isInRange ? styles.distanceBadgeGreen : styles.distanceBadgeRed,
                          ]}
                        >
                          <Ionicons
                            name="navigate"
                            size={12}
                            color={isInRange ? '#059669' : '#EF4444'}
                            style={{ marginRight: 3 }}
                          />
                          <Text
                            style={[
                              styles.distanceBadgeText,
                              isInRange ? styles.distanceBadgeTextGreen : styles.distanceBadgeTextRed,
                            ]}
                          >
                            {dist !== 999 ? `${dist}m` : 'Gần đây'} / {pkt.radius}m
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.packetCardMessage} numberOfLines={2}>
                        "{pkt.message || 'Chúc bạn nhận được thật nhiều may mắn!'}"
                      </Text>

                      {/* Action Area */}
                      <View style={styles.packetActionRow}>
                        {isMine ? (
                          <View style={styles.myPacketPill}>
                            <MaterialCommunityIcons name="account-check" size={14} color="#64748B" style={{ marginRight: 4 }} />
                            <Text style={styles.myPacketPillText}>Bao lì xì do chính bạn tạo</Text>
                          </View>
                        ) : isInRange ? (
                          <TouchableOpacity
                            style={[styles.claimNowBtn, isClaimingThis && styles.claimNowBtnDisabled]}
                            onPress={() => handleClaimRedPacket(pkt)}
                            disabled={isClaimingThis}
                            activeOpacity={0.85}
                          >
                            {isClaimingThis ? (
                              <View style={styles.btnInner}>
                                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.claimNowBtnText}>Đang nhận lì xì...</Text>
                              </View>
                            ) : (
                              <View style={styles.btnInner}>
                                <Text style={{ fontSize: 15, marginRight: 6 }}>🧧</Text>
                                <Text style={styles.claimNowBtnText}>Mở Lì Xì Ngay</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.outOfRangePill}>
                            <Feather name="map-pin" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                            <Text style={styles.outOfRangeText}>
                              Cần lại gần thêm {dist - pkt.radius}m để mở lì xì
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}

                {nearbyPackets.length === 0 && !isScanning && (
                  <View style={styles.emptyStateBox}>
                    <MaterialCommunityIcons name="map-marker-question-outline" size={48} color="#94A3B8" />
                    <Text style={styles.emptyStateTitle}>Chưa có bao lì xì nào trong khu vực</Text>
                    <Text style={styles.emptyStateDesc}>
                      Hãy thử chuyển sang tab "Thả Lì Xì" để trở thành người đầu tiên lì xì bạn bè tại địa điểm này!
                    </Text>
                  </View>
                )}
              </View>

              {/* Nút Quét Lại */}
              <TouchableOpacity
                style={styles.rescanBtn}
                onPress={handleScanNearbyPackets}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <View style={styles.btnInner}>
                    <Feather name="refresh-cw" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.rescanBtnText}>Quét lại vị trí</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

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
  container: {
    flex: 1,
    backgroundColor: '#FFF1F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E6',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#FFE4E6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#E11D48',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  gpsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gpsInfoCol: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  gpsCoordText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  gpsLoadingText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  gpsErrorText: {
    fontSize: 12,
    color: '#DC2626',
  },
  gpsRefreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  redPacketBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  bannerIconBox: {
    marginRight: 12,
  },
  bannerEmoji: {
    fontSize: 32,
  },
  bannerTextBox: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E11D48',
    marginBottom: 3,
  },
  bannerDesc: {
    fontSize: 12,
    color: '#881337',
    lineHeight: 17,
  },
  inputSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  balanceText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  currencyBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E11D48',
  },
  quickAmountRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickPill: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPillActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FDA4AF',
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  quickPillTextActive: {
    color: '#E11D48',
    fontWeight: '700',
  },
  messageInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 65,
    textAlignVertical: 'top',
  },
  radiusOptionsRow: {
    flexDirection: 'row',
  },
  radiusOptionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  radiusOptionCardActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  radiusOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  radiusOptionTextActive: {
    color: '#E11D48',
    fontWeight: '700',
  },
  dropBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  dropBtnDisabled: {
    backgroundColor: '#FDA4AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  dropBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  radarPulseCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#FDA4AF',
    backgroundColor: 'rgba(254, 205, 211, 0.35)',
  },
  radarCenterCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E11D48',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  radarStatusBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  radarStatusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  radarStatusSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  packetListContainer: {
    marginBottom: 14,
  },
  packetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  packetCardIcon: {
    marginRight: 12,
  },
  packetCardInfo: {
    flex: 1,
  },
  packetCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  packetCardAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E11D48',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E11D48',
  },
  distanceBadgeGreen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  distanceBadgeRed: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FECDD3',
  },
  distanceBadgeTextGreen: {
    color: '#15803D',
  },
  distanceBadgeTextRed: {
    color: '#E11D48',
  },
  packetCardInRange: {
    borderColor: '#FDA4AF',
    backgroundColor: '#FFF1F2',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  packetActionRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FECDD3',
    paddingTop: 8,
  },
  myPacketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    borderRadius: 8,
  },
  myPacketPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  claimNowBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  claimNowBtnDisabled: {
    backgroundColor: '#FDA4AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  claimNowBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  outOfRangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: 6,
    borderRadius: 8,
  },
  outOfRangeText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  packetCardMessage: {
    fontSize: 12.5,
    color: '#334155',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  packetCardCreator: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyStateBox: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyStateDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 17,
  },
  rescanBtn: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescanBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
  },
});
