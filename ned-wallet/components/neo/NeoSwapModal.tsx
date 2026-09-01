import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SubWalletItem } from '../../hooks/useSubWallets';
import { useTranslation } from '../../services/i18n';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NeoSwapModalProps {
  visible: boolean;
  onClose: () => void;
  targetWallet: SubWalletItem | null;
  mainUsdBalance: number;
  onConfirmSwap: (targetCurrency: string, usdAmount: number) => Promise<{
    success: boolean;
    error?: string;
    receivedAmount?: number;
    currency?: string;
    symbol?: string;
  }>;
}

export const NeoSwapModal: React.FC<NeoSwapModalProps> = ({
  visible,
  onClose,
  targetWallet,
  mainUsdBalance = 100,
  onConfirmSwap,
}) => {
  const { t } = useTranslation();
  const [usdInput, setUsdInput] = useState('10');
  const [targetAmount, setTargetAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);

  const rate = targetWallet ? targetWallet.rateToUsd : 25400;

  // Tính toán tỷ giá tự động khi nhập USD
  useEffect(() => {
    const val = parseFloat(usdInput.replace(/,/g, ''));
    if (!isNaN(val) && val >= 0) {
      const converted = Math.round(val * rate);
      setTargetAmount(converted.toLocaleString('vi-VN'));
    } else {
      setTargetAmount('0');
    }
  }, [usdInput, rate]);

  const finishClose = useCallback(() => {
    setIsMounted(false);
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    sheetTranslateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      }
    );
  }, [backdropOpacity, sheetTranslateY, finishClose]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      setUsdInput('10');
      backdropOpacity.value = withTiming(0.6, { duration: 300 });
      sheetTranslateY.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    } else if (isMounted) {
      handleClose();
    }
  }, [visible]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const handleExecuteSwap = async () => {
    const amountToSwap = parseFloat(usdInput.replace(/,/g, ''));
    if (isNaN(amountToSwap) || amountToSwap <= 0) {
      Alert.alert('Thông Báo', 'Vui lòng nhập số tiền USD hợp lệ để quy đổi.');
      return;
    }

    if (amountToSwap > mainUsdBalance) {
      Alert.alert('Số Dư Không Đủ', `Số dư khả dụng của bạn là $${mainUsdBalance.toFixed(2)} USD.`);
      return;
    }

    if (!targetWallet) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsSwapping(true);
    setTimeout(async () => {
      const res = await onConfirmSwap(targetWallet.currency, amountToSwap);
      setIsSwapping(false);

      if (res.success) {
        Alert.alert(
          'Đổi Tiền Thành Công! ⚡',
          `Đã chuyển $${amountToSwap.toFixed(2)} USD sang ${res.symbol} ${res.receivedAmount?.toLocaleString()} ${res.currency}.`
        );
        handleClose();
      } else {
        Alert.alert('Giao Dịch Thất Bại', res.error || 'Không thể thực hiện quy đổi.');
      }
    }, 600);
  };

  if (!visible && !isMounted) return null;

  return (
    <Modal
      transparent={true}
      visible={visible || isMounted}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalRoot}>
        {/* Lớp Backdrop */}
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Lớp Content Bottom Sheet */}
        <Animated.View style={[styles.sheetContainer, animatedSheetStyle]}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>
                {t('swap.title', { defaultValue: 'Quy Đổi Tiền Tệ' })}
              </Text>
              <Text style={styles.sheetSubtitle}>
                Tỷ giá trực tiếp: 1 USD ≈ {rate.toLocaleString()} {targetWallet?.currency || 'VND'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* KHỐI 1: TÀI KHOẢN NGUỒN (USD - Nền Tím Pastel) */}
          <View style={styles.inputCardUsd}>
            <View style={styles.inputCardHeader}>
              <Text style={styles.inputCardLabel}>Bạn Đổi (From USD)</Text>
              <Text style={styles.availableText}>
                Khả dụng: ${mainUsdBalance.toFixed(2)}
              </Text>
            </View>

            <View style={styles.inputFieldRow}>
              <TextInput
                style={styles.largeInputText}
                value={usdInput}
                onChangeText={setUsdInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#6B7280"
                maxLength={9}
              />
              <View style={styles.currencyBadge}>
                <View style={styles.badgeIconCircle}>
                  <Text style={styles.badgeSymbolText}>$</Text>
                </View>
                <Text style={styles.badgeCodeText}>USD</Text>
              </View>
            </View>
          </View>

          {/* NÚT MŨI TÊN ĐẢO CHIỀU Ở GIỮA */}
          <View style={styles.swapArrowWrapper}>
            <View style={styles.arrowCircle}>
              <Feather name="arrow-down" size={20} color="#000000" />
            </View>
          </View>

          {/* KHỐI 2: TÀI KHOẢN ĐÍCH (VND/EUR - Nền Vàng Pastel) */}
          <View style={[styles.inputCardTarget, { backgroundColor: targetWallet?.color || '#FFF1A6' }]}>
            <View style={styles.inputCardHeader}>
              <Text style={styles.inputCardLabel}>
                Bạn Nhận (To {targetWallet?.currency || 'VND'})
              </Text>
              <Text style={styles.availableText}>
                Số dư hiện tại: {targetWallet?.symbol} {targetWallet?.balance.toLocaleString()}
              </Text>
            </View>

            <View style={styles.inputFieldRow}>
              <Text style={styles.largeOutputText} numberOfLines={1}>
                {targetAmount}
              </Text>
              <View style={styles.currencyBadge}>
                <View style={styles.badgeIconCircle}>
                  <Text style={styles.badgeSymbolText}>{targetWallet?.symbol || 'đ'}</Text>
                </View>
                <Text style={styles.badgeCodeText}>{targetWallet?.currency || 'VND'}</Text>
              </View>
            </View>
          </View>

          {/* NÚT XÁC NHẬN ĐỔI TIỀN (Neo-brutalism To Bản) */}
          <TouchableOpacity
            style={styles.confirmSwapBtn}
            onPress={handleExecuteSwap}
            disabled={isSwapping}
            activeOpacity={0.88}
          >
            {isSwapping ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.btnContentRow}>
                <MaterialCommunityIcons name="swap-horizontal-bold" size={22} color="#FFFFFF" />
                <Text style={styles.confirmSwapText}>Xác Nhận Đổi Tiền</Text>
              </View>
            )}
          </TouchableOpacity>
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
  sheetContainer: {
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    borderTopWidth: 2.5,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.8,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputCardUsd: {
    backgroundColor: '#EDE4FF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  inputCardTarget: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  inputCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputCardLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  availableText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  inputFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  largeInputText: {
    flex: 1,
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    paddingVertical: 0,
    marginRight: 10,
  },
  largeOutputText: {
    flex: 1,
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
    marginRight: 10,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.8,
    borderColor: '#000000',
    gap: 6,
  },
  badgeIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSymbolText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  badgeCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  swapArrowWrapper: {
    alignItems: 'center',
    marginVertical: -14,
    zIndex: 10,
  },
  arrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  confirmSwapBtn: {
    marginTop: 20,
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3.5, height: 3.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmSwapText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
