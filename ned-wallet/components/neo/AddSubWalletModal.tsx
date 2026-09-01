import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SUPPORTED_CURRENCIES, SubWalletItem } from '../../hooks/useSubWallets';
import { useTranslation } from '../../services/i18n';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddSubWalletModalProps {
  visible: boolean;
  onClose: () => void;
  existingWallets: SubWalletItem[];
  onSelectCurrency: (currency: 'VND' | 'EUR' | 'GBP' | 'JPY') => void;
}

export const AddSubWalletModal: React.FC<AddSubWalletModalProps> = ({
  visible,
  onClose,
  existingWallets,
  onSelectCurrency,
}) => {
  const { t } = useTranslation();
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);
  const [isMounted, setIsMounted] = React.useState(false);

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
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Content Bottom Sheet */}
        <Animated.View style={[styles.sheetContainer, animatedSheetStyle]}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>
                {t('subWallets.addTitle', { defaultValue: 'Thêm Ví Tiền Tệ' })}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {t('subWallets.addDesc', { defaultValue: 'Chọn tiền tệ bạn muốn kích hoạt ví phụ' })}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.currencyList}>
            {SUPPORTED_CURRENCIES.map((item) => {
              const isAdded = existingWallets.some((w) => w.currency === item.currency);
              return (
                <TouchableOpacity
                  key={item.currency}
                  style={[
                    styles.currencyCard,
                    { backgroundColor: item.color },
                    isAdded && styles.currencyCardDisabled,
                  ]}
                  disabled={isAdded}
                  onPress={() => {
                    onSelectCurrency(item.currency);
                    handleClose();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.currencyIconCircle}>
                    <Text style={styles.currencySymbol}>{item.symbol}</Text>
                  </View>
                  <View style={styles.currencyInfoCol}>
                    <Text style={styles.currencyCode}>{item.currency} - {item.name}</Text>
                    <Text style={styles.currencyRate}>
                      1 USD ≈ {item.rateToUsd.toLocaleString()} {item.currency}
                    </Text>
                  </View>
                  {isAdded ? (
                    <View style={styles.addedBadge}>
                      <Text style={styles.addedText}>Đã kích hoạt</Text>
                    </View>
                  ) : (
                    <Feather name="plus-circle" size={22} color="#111827" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 2.5,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
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
  currencyList: {
    gap: 12,
    marginTop: 4,
  },
  currencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  currencyCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F1F5F9',
  },
  currencyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.8,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
  },
  currencyInfoCol: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  currencyRate: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
  },
  addedBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000000',
  },
  addedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
});
