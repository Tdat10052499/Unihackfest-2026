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
  ScrollView,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface StablecoinBalances {
  USDC: number;
  EURC: number;
  PYUSD: number;
}

export interface NeoSwapModalProps {
  visible: boolean;
  onClose: () => void;
  initialFromCurrency?: string;
  balances?: StablecoinBalances;
  onConfirmSwap?: (
    fromCurrency: string,
    toCurrency: string,
    fromAmount: number,
    toAmount: number
  ) => Promise<{
    success: boolean;
    error?: string;
    receivedAmount?: number;
    currency?: string;
    symbol?: string;
  }>;
}

interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  color: string;
  rateToUsd: number; // 1 unit = ? USD
}

const CURRENCIES: Record<string, CurrencyMeta> = {
  USDC: { code: 'USDC', name: 'US Dollar', symbol: '$', color: '#E0F7FA', rateToUsd: 1.0 },
  EURC: { code: 'EURC', name: 'Euro', symbol: '€', color: '#FFD6E8', rateToUsd: 1.087 },
  PYUSD: { code: 'PYUSD', name: 'PayPal USD', symbol: '$', color: '#FEF08A', rateToUsd: 1.0 },
};

export const NeoSwapModal: React.FC<NeoSwapModalProps> = ({
  visible,
  onClose,
  initialFromCurrency = 'USDC',
  balances = { USDC: 100, EURC: 0, PYUSD: 25 },
  onConfirmSwap,
}) => {
  const [fromCurrency, setFromCurrency] = useState<string>(initialFromCurrency);
  const [toCurrency, setToCurrency] = useState<string>(
    initialFromCurrency === 'EURC' ? 'USDC' : 'EURC'
  );
  const [fromAmountInput, setFromAmountInput] = useState<string>('20');
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);

  // Cập nhật khi initialFromCurrency thay đổi
  useEffect(() => {
    if (initialFromCurrency && CURRENCIES[initialFromCurrency]) {
      setFromCurrency(initialFromCurrency);
      setToCurrency(initialFromCurrency === 'EURC' ? 'USDC' : 'EURC');
    }
  }, [initialFromCurrency]);

  const fromMeta = CURRENCIES[fromCurrency] || CURRENCIES.USDC;
  const toMeta = CURRENCIES[toCurrency] || CURRENCIES.EURC;

  const fromBalance = balances[fromCurrency as keyof StablecoinBalances] ?? 0;
  const toBalance = balances[toCurrency as keyof StablecoinBalances] ?? 0;

  // Tỷ giá quy đổi giữa 2 đồng
  const exchangeRate = fromMeta.rateToUsd / toMeta.rateToUsd;
  const serviceFeeRate = 0.01; // 1% N.E.D fee

  // Tính số tiền nhận được
  const numInput = parseFloat(fromAmountInput.replace(/,/g, '')) || 0;
  const estimatedReceive = numInput > 0 ? numInput * exchangeRate * (1 - serviceFeeRate) : 0;

  const finishClose = useCallback(() => {
    setIsMounted(false);
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 180 });
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
      backdropOpacity.value = withTiming(0.65, { duration: 250 });
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

  // Đảo chiều From <-> To
  const handleInvertCurrencies = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevFrom = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(prevFrom);
  };

  // Nút MAX
  const handleSetMax = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFromAmountInput(fromBalance.toString());
  };

  // Xác nhận Swap
  const handleExecuteSwap = async () => {
    if (numInput <= 0) {
      Alert.alert('Số Tiền Không Hợp Lệ', 'Vui lòng nhập số tiền lớn hơn 0 để quy đổi.');
      return;
    }

    if (numInput > fromBalance) {
      Alert.alert(
        'Số Dư Không Đủ',
        `Số dư ${fromCurrency} khả dụng của bạn là ${fromMeta.symbol}${fromBalance.toFixed(2)}.`
      );
      return;
    }

    if (fromCurrency === toCurrency) {
      Alert.alert('Lỗi Quy Đổi', 'Vui lòng chọn 2 loại tiền tệ khác nhau để hoán đổi.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSwapping(true);

    try {
      if (onConfirmSwap) {
        const res = await onConfirmSwap(fromCurrency, toCurrency, numInput, estimatedReceive);
        setIsSwapping(false);
        if (res.success) {
          Alert.alert(
            'Đổi Tiền Thành Công! ⚡',
            `Đã đổi ${fromMeta.symbol}${numInput.toFixed(2)} ${fromCurrency} sang ${toMeta.symbol}${estimatedReceive.toFixed(2)} ${toCurrency}.`
          );
          handleClose();
        } else {
          Alert.alert('Giao Dịch Thất Bại', res.error || 'Không thể thực hiện quy đổi lúc này.');
        }
      } else {
        setTimeout(() => {
          setIsSwapping(false);
          Alert.alert(
            'Đổi Tiền Thành Công! ⚡',
            `Đã đổi ${fromMeta.symbol}${numInput.toFixed(2)} ${fromCurrency} sang ${toMeta.symbol}${estimatedReceive.toFixed(2)} ${toCurrency}.`
          );
          handleClose();
        }, 500);
      }
    } catch (err: any) {
      setIsSwapping(false);
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra trong quá trình đổi tiền.');
    }
  };

  if (!visible && !isMounted) return null;

  const currencyKeys = Object.keys(CURRENCIES);

  return (
    <Modal
      transparent={true}
      visible={visible || isMounted}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalRoot}>
        {/* Lớp Backdrop Đen */}
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Lớp Bottom Sheet Neo-brutalism */}
        <Animated.View style={[styles.sheetContainer, animatedSheetStyle]}>
          {/* Thanh kéo trên cùng */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Swap Stablecoin ⚡</Text>
              <Text style={styles.sheetSubtitle}>Quy đổi tức thì • Phí dịch vụ 1% minh bạch</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#000000" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollBody}
          >
            {/* ========================================================= */}
            {/* KHỐI 1: BẠN ĐỔI (YOU PAY) */}
            {/* ========================================================= */}
            <View style={styles.cardPayShadow} />
            <View style={[styles.cardPayBody, { backgroundColor: fromMeta.color }]}>
              {/* Header của thẻ Pay */}
              <View style={styles.cardInnerHeader}>
                <Text style={styles.cardPayLabel}>Bạn Đổi (You pay)</Text>
                <View style={styles.balanceRightContainer}>
                  <Text style={styles.availableBalanceText}>
                    Khả dụng: {fromMeta.symbol}{fromBalance.toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    style={styles.maxBtnBadge}
                    onPress={handleSetMax}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.maxBtnText}>MAX</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Ô nhập số tiền & Badge tiền tệ */}
              <View style={styles.inputFieldRow}>
                <TextInput
                  style={styles.largeAmountInput}
                  value={fromAmountInput}
                  onChangeText={setFromAmountInput}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  maxLength={10}
                />

                <View style={styles.currencyBadgePill}>
                  <View style={styles.currencyBadgeCoin}>
                    <Text style={styles.currencyBadgeCoinText}>{fromMeta.symbol}</Text>
                  </View>
                  <Text style={styles.currencyBadgeCodeText}>{fromMeta.code}</Text>
                </View>
              </View>

              {/* Quick Coin Tabs cho nguồn */}
              <View style={styles.quickCoinsRow}>
                {currencyKeys.map((cKey) => {
                  const isSelected = fromCurrency === cKey;
                  return (
                    <TouchableOpacity
                      key={`from-${cKey}`}
                      style={[
                        styles.quickCoinItem,
                        isSelected && styles.quickCoinItemActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setFromCurrency(cKey);
                        if (toCurrency === cKey) {
                          setToCurrency(cKey === 'USDC' ? 'EURC' : 'USDC');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.quickCoinText,
                          isSelected && styles.quickCoinTextActive,
                        ]}
                      >
                        {cKey}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ========================================================= */}
            {/* NÚT MŨI TÊN ĐẢO CHIỀU Ở GIỮA (Swap Invert Button) */}
            {/* ========================================================= */}
            <View style={styles.invertBtnWrapper}>
              <TouchableOpacity
                style={styles.invertBtnTouchable}
                onPress={handleInvertCurrencies}
                activeOpacity={0.85}
              >
                <View style={styles.invertBtnShadow} />
                <View style={styles.invertBtnBody}>
                  <Ionicons name="swap-vertical" size={20} color="#000000" />
                </View>
              </TouchableOpacity>
            </View>

            {/* ========================================================= */}
            {/* KHỐI 2: BẠN NHẬN (YOU RECEIVE) */}
            {/* ========================================================= */}
            <View style={styles.cardReceiveShadow} />
            <View style={[styles.cardReceiveBody, { backgroundColor: toMeta.color }]}>
              {/* Header của thẻ Receive */}
              <View style={styles.cardInnerHeader}>
                <Text style={styles.cardPayLabel}>Bạn Nhận (You receive)</Text>
                <Text style={styles.availableBalanceText}>
                  Số dư hiện tại: {toMeta.symbol}{toBalance.toFixed(2)}
                </Text>
              </View>

              {/* Hiển thị số tiền quy đổi ước tính */}
              <View style={styles.inputFieldRow}>
                <Text style={styles.largeAmountOutput} numberOfLines={1}>
                  {estimatedReceive > 0 ? estimatedReceive.toFixed(2) : '0.00'}
                </Text>

                <View style={styles.currencyBadgePill}>
                  <View style={styles.currencyBadgeCoin}>
                    <Text style={styles.currencyBadgeCoinText}>{toMeta.symbol}</Text>
                  </View>
                  <Text style={styles.currencyBadgeCodeText}>{toMeta.code}</Text>
                </View>
              </View>

              {/* Quick Coin Tabs cho đích */}
              <View style={styles.quickCoinsRow}>
                {currencyKeys.map((cKey) => {
                  const isSelected = toCurrency === cKey;
                  return (
                    <TouchableOpacity
                      key={`to-${cKey}`}
                      style={[
                        styles.quickCoinItem,
                        isSelected && styles.quickCoinItemActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setToCurrency(cKey);
                        if (fromCurrency === cKey) {
                          setFromCurrency(cKey === 'EURC' ? 'USDC' : 'EURC');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.quickCoinText,
                          isSelected && styles.quickCoinTextActive,
                        ]}
                      >
                        {cKey}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ========================================================= */}
            {/* DÒNG PHÍ MINH BẠCH (Fee Breakdown Callout) */}
            {/* ========================================================= */}
            <View style={styles.feeCalloutContainer}>
              <View style={styles.feeCalloutRow}>
                <Text style={styles.feeCalloutLabel}>Tỷ giá hoán đổi:</Text>
                <Text style={styles.feeCalloutValue}>
                  1 {fromCurrency} ≈ {exchangeRate.toFixed(4)} {toCurrency}
                </Text>
              </View>
              <View style={styles.feeCalloutDivider} />
              <View style={styles.feeCalloutRow}>
                <Text style={styles.feeCalloutSubText}>
                  Network fee: ~0.00001 SOL | N.E.D Service fee: 1%
                </Text>
              </View>
            </View>

            {/* ========================================================= */}
            {/* NÚT BẤM CHỐT GIAO DỊCH LỚN (SWAP NOW) */}
            {/* ========================================================= */}
            <View style={styles.swapCtaWrapper}>
              <TouchableOpacity
                style={[styles.swapCtaTouchable, isSwapping && styles.swapCtaDisabled]}
                onPress={handleExecuteSwap}
                disabled={isSwapping}
                activeOpacity={0.88}
              >
                <View style={styles.swapCtaShadow} />
                <View style={styles.swapCtaBody}>
                  {isSwapping ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <View style={styles.swapCtaContentRow}>
                      <Ionicons name="flash" size={20} color="#000000" />
                      <Text style={styles.swapCtaText}>SWAP NOW ⚡</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    ...StyleSheet.absoluteFill,
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
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    borderTopWidth: 3,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: '#000000',
    maxHeight: SCREEN_HEIGHT * 0.88,
  },
  dragHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 999,
    backgroundColor: '#000000',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    paddingBottom: 10,
  },

  // Khối Thẻ Pay & Receive
  cardPayShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    height: 148,
    backgroundColor: '#000000',
    borderRadius: 20,
  },
  cardPayBody: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 2.5,
    borderColor: '#000000',
    marginBottom: 6,
  },
  cardReceiveShadow: {
    position: 'absolute',
    top: 180,
    left: 4,
    right: -4,
    height: 148,
    backgroundColor: '#000000',
    borderRadius: 20,
  },
  cardReceiveBody: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 2.5,
    borderColor: '#000000',
    marginBottom: 14,
  },
  cardInnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardPayLabel: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  balanceRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availableBalanceText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#374151',
  },
  maxBtnBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  maxBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  inputFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  largeAmountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    paddingVertical: 0,
    marginRight: 10,
  },
  largeAmountOutput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    marginRight: 10,
  },
  currencyBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#000000',
    gap: 6,
  },
  currencyBadgeCoin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyBadgeCoinText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  currencyBadgeCodeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  quickCoinsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  quickCoinItem: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  quickCoinItemActive: {
    backgroundColor: '#000000',
  },
  quickCoinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  quickCoinTextActive: {
    color: '#FFFFFF',
  },

  // Nút đảo chiều ở giữa
  invertBtnWrapper: {
    alignItems: 'center',
    marginVertical: 4,
    zIndex: 10,
  },
  invertBtnTouchable: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  invertBtnShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: '#000000',
    borderRadius: 20,
  },
  invertBtnBody: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Dòng phí minh bạch
  feeCalloutContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.8,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 5,
  },
  feeCalloutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeCalloutLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  feeCalloutValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  feeCalloutDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  feeCalloutSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    width: '100%',
  },

  // Nút SWAP NOW to bản
  swapCtaWrapper: {
    position: 'relative',
    height: 54,
    marginBottom: 8,
  },
  swapCtaTouchable: {
    width: '100%',
    height: '100%',
  },
  swapCtaDisabled: {
    opacity: 0.8,
  },
  swapCtaShadow: {
    position: 'absolute',
    top: 3.5,
    left: 3.5,
    right: -3.5,
    bottom: -3.5,
    backgroundColor: '#000000',
    borderRadius: 18,
  },
  swapCtaBody: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#CCFF00', // Vàng chanh chói siêu bắt mắt
    borderWidth: 2.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapCtaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swapCtaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
});
