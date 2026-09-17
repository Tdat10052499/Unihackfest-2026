import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
  InteractionManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, scanFromURLAsync } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { useExternalWallet } from '../src/providers/WalletProvider';
import { useUserStore } from '../stores/useUserStore';
import { resolveActiveSolanaAddress, getMaskedPhone, getAccountIdentifier } from '../services/identity';
import { getLinkedPhone } from '../services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_SIZE = Math.min(Math.round(SCREEN_WIDTH * 0.74), 280);

export default function ScanQrScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [showMyQrModal, setShowMyQrModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [phoneState, setPhoneState] = useState<string | null>(null);

  const isScanningLocked = useRef(false);

  // Lấy thông tin ví Solana hiện tại của người dùng
  const { user } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();
  const externalWallet = useExternalWallet();

  const solanaAddress = resolveActiveSolanaAddress(
    user,
    externalWallet,
    solanaWalletState,
    useUserStore.getState().walletAddress
  );

  useEffect(() => {
    getLinkedPhone().then((p) => {
      if (p) setPhoneState(p);
    });
  }, []);

  // Reanimated - Laser Scan Line chạy dọc lên xuống liên tục
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(SCAN_SIZE - 8, {
        duration: 2000,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, []);

  const animatedLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  // Xử lý quét mã QR thành công (Live camera hoặc Gallery)
  const handleSuccessScan = (rawData: string) => {
    if (isScanningLocked.current) return;
    isScanningLocked.current = true;
    setIsScanned(true);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    let recipient = rawData.trim();
    let amount: string | undefined;

    // Phân tích cú pháp Solana Pay URL (solana:ADDRESS?amount=X...)
    if (recipient.toLowerCase().startsWith('solana:')) {
      const withoutPrefix = recipient.slice(7);
      const [addr, query] = withoutPrefix.split('?');
      recipient = addr;
      if (query) {
        const match = query.match(/amount=([0-9.]+)/i);
        if (match && match[1]) {
          amount = match[1];
        }
      }
    }

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        router.replace({
          pathname: '/send',
          params: {
            recipient,
            ...(amount ? { amount } : {}),
          },
        });
      }, 300);
    });
  };

  // Quét barcode trực tiếp từ Camera
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!isScanned && !isScanningLocked.current && data) {
      handleSuccessScan(data);
    }
  };

  // Tải ảnh từ thư viện thiết bị & quét QR
  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const imageUri = result.assets[0].uri;
      setIsScanningImage(true);

      try {
        const scanResults = await scanFromURLAsync(imageUri, ['qr']);
        setIsScanningImage(false);

        if (scanResults && scanResults.length > 0 && scanResults[0].data) {
          handleSuccessScan(scanResults[0].data);
        } else {
          Alert.alert(
            'Không tìm thấy mã QR',
            'Không thể nhận diện mã QR trong hình ảnh đã chọn. Vui lòng chọn ảnh chụp rõ nét hơn hoặc thử lại.'
          );
        }
      } catch (scanErr) {
        setIsScanningImage(false);
        console.warn('scanFromURLAsync error:', scanErr);
        Alert.alert(
          'Không thể nhận diện',
          'Không tìm thấy mã QR hợp lệ trong ảnh này.'
        );
      }
    } catch (err) {
      setIsScanningImage(false);
      console.error('Image picker error:', err);
      Alert.alert('Lỗi chọn ảnh', 'Không thể mở thư viện ảnh trên thiết bị.');
    }
  };

  // Sao chép địa chỉ ví vào bộ nhớ tạm
  const handleCopyWalletAddress = async () => {
    if (!solanaAddress) {
      Alert.alert('Thông báo', 'Không tìm thấy địa chỉ ví.');
      return;
    }
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await Clipboard.setStringAsync(solanaAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2500);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
  };

  // Sao chép số điện thoại ví vào bộ nhớ tạm
  const handleCopyPhone = async () => {
    if (!phoneState) return;
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await Clipboard.setStringAsync(phoneState);
      Alert.alert('Đã sao chép', `Đã sao chép số điện thoại ví: ${phoneState}`);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
  };

  // Render Modal QR Của Tôi (My QR)
  function renderMyQrModal() {
    return (
      <Modal
        visible={showMyQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMyQrModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.myQrModalCard}>
            {/* Header Modal */}
            <View style={styles.myQrModalHeader}>
              <View style={styles.myQrModalIconWrap}>
                <Ionicons name="qr-code" size={20} color="#000000" />
              </View>
              <Text style={styles.myQrModalTitle}>Mã QR Của Tôi</Text>
              <TouchableOpacity
                onPress={() => setShowMyQrModal(false)}
                style={styles.myQrModalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Đóng"
              >
                <Ionicons name="close" size={20} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* QR Code Container */}
            <View style={styles.qrCardContainer}>
              {solanaAddress ? (
                <QRCode
                  value={solanaAddress}
                  size={190}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              ) : (
                <View style={styles.qrLoadingBox}>
                  <ActivityIndicator size="large" color="#000000" />
                  <Text style={styles.qrLoadingText}>Đang nạp địa chỉ ví...</Text>
                </View>
              )}
            </View>

            {/* Thông tin định danh tài khoản */}
            <View style={styles.accountInfoWrap}>
              {phoneState && (
                <TouchableOpacity
                  style={styles.phoneBadgeRow}
                  onPress={handleCopyPhone}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={14} color="#00A859" />
                  <Text style={styles.phoneBadgeText}>
                    SĐT ví: <Text style={{ fontWeight: '900' }}>{phoneState}</Text>
                  </Text>
                  <Ionicons name="copy-outline" size={13} color="#64748B" />
                </TouchableOpacity>
              )}

              <Text style={styles.addressShortText}>
                {solanaAddress
                  ? `${solanaAddress.slice(0, 10)}...${solanaAddress.slice(-10)}`
                  : 'Chưa phát hiện địa chỉ ví'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.myQrActions}>
              <TouchableOpacity
                style={[
                  styles.copyAddressMainBtn,
                  copiedAddress && styles.copyAddressMainBtnSuccess,
                ]}
                onPress={handleCopyWalletAddress}
                activeOpacity={0.88}
              >
                <Ionicons
                  name={copiedAddress ? 'checkmark-circle' : 'copy-outline'}
                  size={18}
                  color={copiedAddress ? '#FFFFFF' : '#000000'}
                />
                <Text
                  style={[
                    styles.copyAddressMainBtnText,
                    copiedAddress && styles.copyAddressMainBtnTextSuccess,
                  ]}
                >
                  {copiedAddress ? 'Đã sao chép địa chỉ ví!' : 'Sao chép địa chỉ ví'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeMyQrBtn}
                onPress={() => setShowMyQrModal(false)}
                activeOpacity={0.88}
              >
                <Text style={styles.closeMyQrBtnText}>Quay lại quét QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Màn hình khi chưa có quyền Camera
  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FDF8F5" />
        <SafeAreaView style={styles.permissionSafeArea}>
          {/* Header Back */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.permissionHeaderTitle}>Quét Mã QR</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Neo-brutalist Permission Card */}
          <View style={styles.permissionCenterWrap}>
            <View style={styles.permissionCard}>
              <View style={styles.permissionIconBadge}>
                <Ionicons name="camera" size={36} color="#000000" />
              </View>

              <Text style={styles.permissionCardTitle}>Cần Cấp Quyền Camera</Text>
              <Text style={styles.permissionCardDesc}>
                Để quét mã QR nhận hoặc chuyển tiền Solana Pay tức thì, N.E.D Wallet cần bạn cấp quyền truy cập máy ảnh.
              </Text>

              <TouchableOpacity
                style={styles.permissionPrimaryBtn}
                onPress={async () => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  await requestPermission();
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.permissionPrimaryBtnText}>Cấp Quyền Camera</Text>
              </TouchableOpacity>

              <View style={styles.permissionDivider} />

              <TouchableOpacity
                style={styles.permissionSecondaryBtn}
                onPress={handlePickImage}
                activeOpacity={0.88}
              >
                <Ionicons name="images-outline" size={18} color="#000000" />
                <Text style={styles.permissionSecondaryBtnText}>Tải ảnh từ thư viện</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.permissionSecondaryBtn, { marginTop: 10 }]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowMyQrModal(true);
                }}
                activeOpacity={0.88}
              >
                <Ionicons name="qr-code-outline" size={18} color="#000000" />
                <Text style={styles.permissionSecondaryBtnText}>Xem QR của tôi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Modal QR Của Tôi */}
        {renderMyQrModal()}
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 1. Camera View chiếm trọn 100% màn hình */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={isTorchOn}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={isScanned ? undefined : handleBarcodeScanned}
      />

      {/* 2. Lớp Overlay tối đục lỗ vùng quét chính giữa */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        {/* Top Overlay */}
        <View style={styles.overlayTop} />

        {/* Middle Row: Left Overlay + Focus Area (Trong suốt) + Right Overlay */}
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />

          {/* Vùng Lấy Nét Trong Suốt (Focus Area) */}
          <View style={styles.focusCutout}>
            {/* 4 Góc Khung Viền Cyan (#00E5FF) bo góc 16px */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Hiệu ứng quét: Vạch Laser ngang Cyan chạy dọc lên xuống */}
            <Animated.View style={[styles.scanLaserLine, animatedLineStyle]}>
              <View style={styles.scanLaserCore} />
              <View style={styles.scanLaserGlow} />
            </Animated.View>
          </View>

          <View style={styles.overlaySide} />
        </View>

        {/* Bottom Overlay chứa Hướng dẫn & Card Công cụ */}
        <View style={styles.overlayBottom}>
          {/* Dòng chữ hướng dẫn ngay bên dưới khung quét */}
          <Text style={styles.guidanceText}>
            Di chuyển mã QR vào trung tâm khung hình
          </Text>

          {/* 4. Bottom Actions: Thẻ nổi Floating Card Neo-brutalism */}
          <View
            style={[
              styles.floatingBottomCard,
              { marginBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.bottomActionsRow}>
              {/* Nút 1: Tải ảnh từ Thư viện */}
              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={handlePickImage}
                activeOpacity={0.85}
              >
                <View style={styles.actionIconBadge}>
                  <Ionicons name="images" size={18} color="#000000" />
                </View>
                <Text style={styles.actionBtnText}>Tải ảnh</Text>
              </TouchableOpacity>

              {/* Nút 2: QR Của Tôi */}
              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowMyQrModal(true);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.actionIconBadge, { backgroundColor: '#FFE600' }]}>
                  <Ionicons name="qr-code" size={18} color="#000000" />
                </View>
                <Text style={styles.actionBtnText}>QR của tôi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Header Controls (Trên cùng, trong SafeAreaView) */}
      <SafeAreaView edges={['top']} style={styles.headerOverlay} pointerEvents="box-none">
        <View style={styles.headerRow}>
          {/* Nút Back / Đóng (Góc trái) */}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.back();
            }}
            activeOpacity={0.85}
            accessibilityLabel="Đóng máy quét"
          >
            <Ionicons name="arrow-back" size={22} color="#000000" />
          </TouchableOpacity>

          {/* Tiêu đề ở giữa: Chữ trắng, font Heavy, viền shadow đen */}
          <Text style={styles.headerTitle}>Quét Mã QR</Text>

          {/* Nút Đèn Pin Flashlight (Góc phải) */}
          <TouchableOpacity
            style={[
              styles.headerBtn,
              isTorchOn && styles.headerBtnActive,
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setIsTorchOn(!isTorchOn);
            }}
            activeOpacity={0.85}
            accessibilityLabel="Bật tắt đèn flash"
          >
            <Ionicons
              name={isTorchOn ? 'flash' : 'flash-outline'}
              size={21}
              color="#000000"
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Loading Overlay khi đang xử lý ảnh từ thư viện */}
      {isScanningImage && (
        <View style={styles.loadingBackdrop}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingText}>Đang nhận diện mã QR...</Text>
          </View>
        </View>
      )}

      {/* Modal QR Của Tôi */}
      {renderMyQrModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Header Controls
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    // Solid hard shadow
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  headerBtnActive: {
    backgroundColor: '#FFD700',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    // Viền text đen (Text shadow) nổi bật trên camera
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },

  // 3-Row Overlay (Phủ đen mờ rgba(0,0,0,0.7) & Đục lỗ trong suốt)
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayMiddleRow: {
    height: SCAN_SIZE,
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayBottom: {
    flex: 1.35,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Vùng Lấy Nét Trong Suốt (Focus Cutout)
  focusCutout: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },

  // 4 Góc Viền Cyan (#00E5FF), dày 4px, dài 32px, bo góc 16px
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#00E5FF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },

  // Hiệu ứng Laser quét ngang
  scanLaserLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 3,
    justifyContent: 'center',
  },
  scanLaserCore: {
    height: 3,
    backgroundColor: '#00E5FF',
    borderRadius: 2,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  scanLaserGlow: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 229, 255, 0.25)',
    borderRadius: 6,
  },

  // Hướng dẫn
  guidanceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 24,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 2,
  },

  // 4. Bottom Actions: Thẻ nổi Floating Card Neo-brutalism
  floatingBottomCard: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: '#FDF8F5',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 18,
    padding: 14,
    // Solid hard shadow 4px 4px 0px #000
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 8,
    // Mini hard shadow 2px 2px 0px #000
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  actionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E0FFFF', // Cyan nhạt
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.1,
  },

  // Loading Overlay
  loadingBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  loadingBox: {
    backgroundColor: '#FDF8F5',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },

  // Permission State Styles
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FDF8F5',
  },
  permissionSafeArea: {
    flex: 1,
  },
  permissionHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
  },
  permissionCenterWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  permissionIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#FFE600',
    borderWidth: 2.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  permissionCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionCardDesc: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  permissionPrimaryBtn: {
    width: '100%',
    backgroundColor: '#00E5FF',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  permissionPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
  },
  permissionDivider: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  permissionSecondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  permissionSecondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#000000',
  },

  // Modal QR Của Tôi (My QR Modal)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  myQrModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FDF8F5',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 9,
  },
  myQrModalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  myQrModalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFE600',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  myQrModalTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 17,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.2,
  },
  myQrModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },

  qrCardContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginBottom: 16,
  },
  qrLoadingBox: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLoadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  accountInfoWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 18,
  },
  phoneBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 8,
  },
  phoneBadgeText: {
    fontSize: 12.5,
    color: '#065F46',
  },
  addressShortText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  myQrActions: {
    width: '100%',
    gap: 10,
  },
  copyAddressMainBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E5FF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  copyAddressMainBtnSuccess: {
    backgroundColor: '#10B981',
  },
  copyAddressMainBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.2,
  },
  copyAddressMainBtnTextSuccess: {
    color: '#FFFFFF',
  },

  closeMyQrBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 11,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  closeMyQrBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#000000',
  },
});
