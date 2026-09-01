import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from '../services/i18n';
import { getLinkedPhone } from '../services/storage';
import { getAccountIdentifier, getMaskedPhone } from '../services/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DepositModalProps {
  visible: boolean;
  onClose: () => void;
  solanaAddress: string | null;
}

/**
 * DepositModal: Cấu trúc Bottom Sheet độc lập ở Root Level
 * - Bọc trong <Modal transparent={true} animationType="none"> để thoát khỏi Tab Navigator và che phủ hoàn toàn Bottom Tab Bar.
 * - Lớp Backdrop (Fade-in 0 -> 0.6 bằng withTiming) tách biệt với Lớp Bottom Sheet.
 * - Chuyển động trượt dứt khoát: withTiming({ duration: 250, easing: Easing.out(Easing.cubic) }), tuyệt đối không nảy.
 * - Tự động co giãn kích thước mượt mà với Reanimated LayoutTransition (LinearTransition) & FadeIn/FadeOut.
 * - Luồng đóng đồng bộ: Chạy hiệu ứng trượt xuống & fade-out rồi mới unmount component.
 */
export const DepositModal: React.FC<DepositModalProps> = ({
  visible,
  onClose,
  solanaAddress,
}) => {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<'OPTIONS' | 'VNPAY' | 'SOLANA_QR'>('OPTIONS');
  const [vnpayAmount, setVnpayAmount] = useState('100.000');
  const [isProcessingVnpay, setIsProcessingVnpay] = useState(false);
  const [phoneState, setPhoneState] = useState<string | null>(null);
  const [isModalMounted, setIsModalMounted] = useState(false);

  // Reanimated Shared Values
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    getLinkedPhone().then((p) => {
      if (p) setPhoneState(p);
    });
  }, [visible]);

  // Luồng hoàn tất đóng Modal
  const finishClose = useCallback(() => {
    setIsModalMounted(false);
    setCurrentView('OPTIONS');
    onClose();
  }, [onClose]);

  // Kích hoạt animation đóng có kiểm soát (trượt dứt khoát & fade-out)
  const handleCloseWithAnimation = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    sheetTranslateY.value = withTiming(
      SCREEN_HEIGHT,
      {
        duration: 220,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      }
    );
  }, [backdropOpacity, sheetTranslateY, finishClose]);

  // Đồng bộ trạng thái mở / đóng khi prop `visible` thay đổi
  useEffect(() => {
    if (visible) {
      setIsModalMounted(true);
      // Backdrop fade-in mượt mà
      backdropOpacity.value = withTiming(0.6, { duration: 300 });
      // Bottom sheet trượt lên dứt khoát không có độ nảy (Easing.out(Easing.cubic))
      sheetTranslateY.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    } else if (isModalMounted) {
      handleCloseWithAnimation();
    }
  }, [visible]);

  // Animated Styles
  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const copyToClipboard = async (text?: string | null) => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(
        t('settings.title', { defaultValue: 'Thông Báo' }),
        t('deposit.copiedAlert', { defaultValue: 'Đã sao chép mã tài khoản vào bộ nhớ tạm!' })
      );
    } catch (err) {
      console.log('Copy error:', err);
    }
  };

  const handleProceedVnpay = () => {
    setIsProcessingVnpay(true);
    setTimeout(() => {
      setIsProcessingVnpay(false);
      const estUsdc = (parseInt(vnpayAmount.replace(/\D/g, '') || '100000', 10) / 25400).toFixed(2);
      Alert.alert(
        t('deposit.vnpayDialogTitle', { defaultValue: 'Cổng Thanh Toán VNPAY' }),
        t('deposit.vnpayDialogDesc', {
          amount: vnpayAmount,
          usdc: estUsdc,
          defaultValue: `Mô phỏng khởi tạo giao dịch nạp ${vnpayAmount} VND qua VNPAY-QR.\nQuy đổi ước tính: ~${estUsdc} USDC`,
        }),
        [
          {
            text: t('deposit.vnpayConfirmBtn', { defaultValue: 'Xác Nhận Giả Lập Nạp' }),
            onPress: () => {
              Alert.alert(
                t('deposit.vnpaySuccessTitle', { defaultValue: 'Thành Công! 🎉' }),
                t('deposit.vnpaySuccessMsg', { defaultValue: 'Đã ghi nhận giao dịch nạp tiền qua VNPAY.' })
              );
              handleCloseWithAnimation();
            },
          },
          { text: t('deposit.close', { defaultValue: 'Đóng' }), style: 'cancel' },
        ]
      );
    }, 800);
  };

  if (!visible && !isModalMounted) return null;

  return (
    <Modal
      transparent={true}
      visible={visible || isModalMounted}
      animationType="none"
      onRequestClose={handleCloseWithAnimation}
      statusBarTranslucent={true}
    >
      <View style={styles.modalRoot}>
        {/* 1. LỚP BACKDROP TÁCH BIỆT: Phủ kín màn hình với hiệu ứng Fade-in (0 -> 0.6) */}
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleCloseWithAnimation}
            accessibilityLabel="Close Deposit Modal Backdrop"
          />
        </Animated.View>

        {/* 2. LỚP CONTENT BOTTOM SHEET: Trượt từ dưới lên và tự co giãn mượt mà theo nội dung con (Layout Transition) */}
        <Animated.View
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={[styles.bottomSheetContainer, animatedSheetStyle]}
        >
          {/* Drag Handle Indicator */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.sheetTitle}>
                {currentView === 'OPTIONS'
                  ? t('deposit.title', { defaultValue: 'Nạp Tiền Vào Ví' })
                  : currentView === 'VNPAY'
                  ? t('deposit.vnpayTitle', { defaultValue: 'Cổng Nạp VNPAY' })
                  : t('deposit.solanaTitle', { defaultValue: 'Nhận qua Solana Network' })}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {currentView === 'OPTIONS'
                  ? t('deposit.selectMethod', { defaultValue: 'Chọn phương thức nạp tiền phù hợp' })
                  : currentView === 'VNPAY'
                  ? t('deposit.vnpaySubtitle', { defaultValue: 'Nạp tức thì từ tài khoản ngân hàng nội địa' })
                  : t('deposit.solanaSubtitle', { defaultValue: 'Quét mã QR hoặc sao chép địa chỉ ví ngầm' })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={
                currentView === 'OPTIONS'
                  ? handleCloseWithAnimation
                  : () => setCurrentView('OPTIONS')
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentView === 'OPTIONS' ? 'close' : 'arrow-back'}
                size={22}
                color="#374151"
              />
            </TouchableOpacity>
          </View>

          {/* View 1: 2 Khối Tùy Chọn Nạp Chính (FadeIn/FadeOut + LayoutTransition) */}
          {currentView === 'OPTIONS' && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.optionsWrapper}
            >
              {/* Khối 1: Cổng thanh toán nội địa VNPAY */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => setCurrentView('VNPAY')}
                activeOpacity={0.75}
              >
                <View style={[styles.optionIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <MaterialCommunityIcons
                    name="bank-transfer"
                    size={26}
                    color="#0284C7"
                  />
                </View>
                <View style={styles.optionInfoCol}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>{t('deposit.vnpayCardTitle', { defaultValue: 'VNPAY (VND to USDC)' })}</Text>
                    <View style={styles.fastTag}>
                      <Text style={styles.fastTagText}>{t('deposit.instantTag', { defaultValue: 'Tức thì' })}</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSubtitle}>
                    {t('deposit.vnpayCardDesc', { defaultValue: 'Nạp tiền tức thì qua cổng ngân hàng nội địa' })}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Khối 2: Mạng lưới Solana */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => setCurrentView('SOLANA_QR')}
                activeOpacity={0.75}
              >
                <View style={[styles.optionIconBox, { backgroundColor: '#EDE9FE' }]}>
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={24}
                    color="#7C3AED"
                  />
                </View>
                <View style={styles.optionInfoCol}>
                  <Text style={styles.optionTitle}>{t('deposit.solanaCardTitle', { defaultValue: 'Receive via Solana Network' })}</Text>
                  <Text style={styles.optionSubtitle}>
                    {t('deposit.solanaCardDesc', { defaultValue: 'Gửi SOL, USDC từ Phantom, Binance, OKX...' })}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* View 2: Màn Hình Nạp VNPAY (FadeIn/FadeOut + LayoutTransition) */}
          {currentView === 'VNPAY' && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.vnpayContentWrapper}
            >
              <Text style={styles.inputFieldLabel}>{t('deposit.amountLabel', { defaultValue: 'Số tiền nạp (VND):' })}</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="100.000"
                placeholderTextColor="#9CA3AF"
                value={vnpayAmount}
                onChangeText={setVnpayAmount}
                keyboardType="numeric"
              />

              <View style={styles.quickAmountRow}>
                {['50.000', '100.000', '200.000', '500.000'].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickAmountPill,
                      vnpayAmount === amt && styles.quickAmountPillActive,
                    ]}
                    onPress={() => setVnpayAmount(amt)}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        vnpayAmount === amt && styles.quickAmountTextActive,
                      ]}
                    >
                      {amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.mainActionBtn}
                onPress={handleProceedVnpay}
                disabled={isProcessingVnpay}
                activeOpacity={0.85}
              >
                {isProcessingVnpay ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.mainActionBtnText}>
                    {t('deposit.continueVnpay', { defaultValue: 'Tiếp tục qua VNPAY' })}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* View 3: Màn Hình Hiển Thị Mã QR & Địa Chỉ Ví Solana (FadeIn/FadeOut + LayoutTransition) */}
          {currentView === 'SOLANA_QR' && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.qrContentWrapper}
            >
              {solanaAddress ? (
                <>
                  <View style={styles.qrCard}>
                    <QRCode
                      value={solanaAddress}
                      size={180}
                      color="#111827"
                      backgroundColor="#FFFFFF"
                    />
                    <Text style={styles.addressDisplayText} numberOfLines={2}>
                      {phoneState
                        ? `Mã tài khoản: ${getMaskedPhone(phoneState)}`
                        : `Mã tài khoản: ${getAccountIdentifier(null, solanaAddress)}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mainActionBtn}
                    onPress={() => copyToClipboard(phoneState || solanaAddress)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.mainActionBtnText}>
                      {t('deposit.copyAddress', { defaultValue: 'Sao chép Mã Tài Khoản' })}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280' }}>
                    {t('deposit.noAddress', { defaultValue: 'Chưa phát hiện địa chỉ ví Solana.' })}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  bottomSheetContainer: {
    position: 'relative',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 26,
    // Neo-brutalism viền đen trên cùng và bóng đổ
    borderTopWidth: 2.5,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleCol: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsWrapper: {
    marginTop: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.8,
    borderColor: '#000000',
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  optionInfoCol: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  fastTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  fastTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  optionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  vnpayContentWrapper: {
    paddingVertical: 10,
  },
  inputFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  quickAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickAmountPill: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  quickAmountPillActive: {
    backgroundColor: '#D1F4E0',
    borderColor: '#000000',
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  quickAmountTextActive: {
    color: '#00A859',
    fontWeight: '800',
  },
  mainActionBtn: {
    backgroundColor: '#00A859',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  mainActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  qrContentWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  addressDisplayText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 14,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
