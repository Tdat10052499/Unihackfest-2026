import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
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
import { Feather } from '@expo/vector-icons';
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
import { useAuth } from '../services/auth';
import { getLinkedPhone } from '../services/storage';
import { Button, DText, Header, IconButton, Notice, Screen } from '@/components/design';
import { colors, glass, light, radius, sizes, space } from '@/constants/design';
import { shortAddress } from '../services/identity/resolve';

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

  // The user's current Solana wallet
  const { walletAddress: solanaAddress } = useAuth();

  useEffect(() => {
    getLinkedPhone().then((p) => {
      if (p) setPhoneState(p);
    });
  }, []);

  // Reanimated: the laser scan line moves up and down continuously
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

  // A QR code was scanned (live camera or gallery)
  const handleSuccessScan = (rawData: string) => {
    if (isScanningLocked.current) return;
    isScanningLocked.current = true;
    setIsScanned(true);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    let recipient = rawData.trim();
    let amount: string | undefined;

    // Parse a Solana Pay URL (solana:ADDRESS?amount=X...)
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

  // Scan a barcode straight from the camera
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!isScanned && !isScanningLocked.current && data) {
      handleSuccessScan(data);
    }
  };

  // Pick an image from the device library and scan the QR
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
          Alert.alert('No QR code found', "We couldn't read a QR code in this picture. Try a sharper photo.");
        }
      } catch (scanErr) {
        setIsScanningImage(false);
        console.warn('scanFromURLAsync error:', scanErr);
        Alert.alert("Couldn't read code", 'No valid QR code in this picture.');
      }
    } catch (err) {
      setIsScanningImage(false);
      console.error('Image picker error:', err);
      Alert.alert("Couldn't open photos", 'Unable to open your photo library.');
    }
  };

  // Copy the wallet address to the clipboard
  const handleCopyWalletAddress = async () => {
    if (!solanaAddress) {
      Alert.alert('Wallet not ready', 'No wallet address found yet.');
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

  // Copy the wallet's phone number to the clipboard
  const handleCopyPhone = async () => {
    if (!phoneState) return;
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await Clipboard.setStringAsync(phoneState);
      Alert.alert('Copied', `Phone number copied: ${phoneState}`);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
  };

  const tap = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  const openMyQr = () => {
    tap();
    setShowMyQrModal(true);
  };

  // My QR modal
  function renderMyQrModal() {
    return (
      <Modal visible={showMyQrModal} transparent animationType="fade" onRequestClose={() => setShowMyQrModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.myQrCard}>
            <View style={styles.myQrHeader}>
              <DText variant="h3" accessibilityRole="header" style={styles.flex}>
                My QR code
              </DText>
              <IconButton icon="x" accessibilityLabel="Close" color={colors.text} onPress={() => setShowMyQrModal(false)} />
            </View>

            <View style={styles.qrCard}>
              {solanaAddress ? (
                <QRCode value={solanaAddress} size={190} color={light.text} backgroundColor={colors.white} />
              ) : (
                <View style={styles.qrLoadingBox}>
                  <ActivityIndicator size="large" color={colors.brand} />
                  <DText variant="caption" tone="onLightSecondary">
                    Loading wallet address…
                  </DText>
                </View>
              )}
            </View>

            {phoneState && (
              <Pressable accessibilityRole="button" accessibilityLabel="Copy phone number" onPress={handleCopyPhone} style={styles.phoneRow}>
                <Feather name="phone" size={14} color={colors.successText} />
                <DText variant="mono">{phoneState}</DText>
                <Feather name="copy" size={14} color={colors.textSecondary} />
              </Pressable>
            )}
            <DText variant="mono" tone="secondary" align="center">
              {solanaAddress ? shortAddress(solanaAddress) : 'No wallet address yet'}
            </DText>

            <View style={styles.myQrActions}>
              <Button
                title={copiedAddress ? 'Address copied' : 'Copy wallet address'}
                icon={copiedAddress ? 'check' : 'copy'}
                onPress={handleCopyWalletAddress}
              />
              <Button title="Back to scanning" variant="ghost" onPress={() => setShowMyQrModal(false)} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // No camera permission yet
  if (!permission?.granted) {
    return (
      <Screen glow="settings">
        <StatusBar barStyle="light-content" />
        <Header title="Scan QR code" onBack={() => router.back()} />
        <View style={styles.permissionCenter}>
          <View style={styles.permissionIcon}>
            <Feather name="camera" size={32} color={colors.purple[300]} />
          </View>
          <DText variant="h2" align="center">
            Allow camera access
          </DText>
          <DText variant="body" align="center">
            N.E.D needs your camera to scan QR codes for sending money.
          </DText>
          {Platform.OS === 'web' && (
            <Notice tone="warning" style={styles.permissionNotice}>
              Your browser must allow the camera. If it can&apos;t, upload a picture of the QR code instead.
            </Notice>
          )}
          <View style={styles.permissionActions}>
            <Button
              title="Allow camera"
              icon="camera"
              onPress={async () => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                await requestPermission();
              }}
            />
            <Button title="Upload from photos" icon="image" variant="secondary" onPress={handlePickImage} />
            <Button title="Show my QR code" icon="grid" variant="ghost" onPress={openMyQr} />
          </View>
        </View>
        {renderMyQrModal()}
      </Screen>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={isTorchOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isScanned ? undefined : handleBarcodeScanned}
      />

      {/* Dark overlay with a hole for the scan area */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />
          <View style={styles.focusCutout}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Animated.View style={[styles.scanLine, animatedLineStyle]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <DText variant="body" tone="primary" align="center" style={styles.guidance}>
            Center the QR code in the frame
          </DText>
          <View style={[styles.bottomCard, { marginBottom: Math.max(insets.bottom, space[4]) }]}>
            <Button title="Upload" icon="image" variant="secondary" onPress={handlePickImage} style={styles.flex} />
            <Button title="My QR" icon="grid" variant="secondary" onPress={openMyQr} style={styles.flex} />
          </View>
        </View>
      </View>

      <SafeAreaView edges={['top']} style={styles.headerOverlay} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <IconButton
            icon="chevron-left"
            accessibilityLabel="Close scanner"
            color={colors.text}
            style={styles.headerBtn}
            onPress={() => {
              tap();
              router.back();
            }}
          />
          <DText variant="h3" align="center" style={styles.flex}>
            Scan QR code
          </DText>
          <IconButton
            icon={isTorchOn ? 'zap' : 'zap-off'}
            accessibilityLabel={isTorchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
            color={isTorchOn ? colors.warningText : colors.text}
            style={[styles.headerBtn, isTorchOn && styles.headerBtnActive]}
            onPress={() => {
              tap();
              setIsTorchOn(!isTorchOn);
            }}
          />
        </View>
      </SafeAreaView>

      {isScanningImage && (
        <View style={styles.loadingBackdrop}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.purple[300]} />
            <DText variant="body" tone="primary">
              Reading QR code…
            </DText>
          </View>
        </View>
      )}

      {renderMyQrModal()}
    </View>
  );
}

const CORNER = 32;
const CORNER_W = 4;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fullContainer: { flex: 1, backgroundColor: colors.black },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[2],
    width: '100%',
    maxWidth: sizes.maxContent,
    alignSelf: 'center',
  },
  headerBtn: { backgroundColor: glass.scrim, borderColor: glass.borderStrong },
  headerBtnActive: { borderColor: glass.warningBorder },
  overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlayTop: { flex: 1, backgroundColor: glass.scrim },
  overlayMiddleRow: { height: SCAN_SIZE, flexDirection: 'row' },
  overlaySide: { flex: 1, backgroundColor: glass.scrim },
  overlayBottom: { flex: 1.35, backgroundColor: glass.scrim, alignItems: 'center', justifyContent: 'space-between', paddingTop: space[6] },
  focusCutout: { width: SCAN_SIZE, height: SCAN_SIZE, position: 'relative' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.purple[300] },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: radius.lg },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: radius.lg },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: radius.lg },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: radius.lg },
  scanLine: {
    position: 'absolute',
    left: space[3],
    right: space[3],
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.purple[300],
    boxShadow: `0 0 12px ${colors.purple[400]}`,
  },
  guidance: { paddingHorizontal: space[6] },
  bottomCard: {
    flexDirection: 'row',
    gap: space[3],
    width: SCREEN_WIDTH - space[10],
    maxWidth: sizes.maxContent - space[10],
    padding: space[3],
    borderRadius: radius.xl,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: glass.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingBox: {
    alignItems: 'center',
    gap: space[3],
    padding: space[6],
    borderRadius: radius.xl,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permissionCenter: { flex: 1, justifyContent: 'center', alignItems: 'stretch', gap: space[3] },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glass.iconTint,
    borderWidth: 1,
    borderColor: glass.accentBorder,
    marginBottom: space[2],
  },
  permissionNotice: { marginTop: space[1] },
  permissionActions: { gap: space[3], marginTop: space[4] },
  modalBackdrop: { flex: 1, backgroundColor: glass.scrim, alignItems: 'center', justifyContent: 'center', padding: space[5] },
  myQrCard: {
    width: '100%',
    maxWidth: 360,
    gap: space[3],
    padding: space[6],
    borderRadius: radius.xl,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  myQrHeader: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  qrCard: {
    alignSelf: 'center',
    width: 222,
    height: 222,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLoadingBox: { alignItems: 'center', gap: space[2] },
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], minHeight: sizes.touch },
  myQrActions: { gap: space[2], marginTop: space[2] },
});
