import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { NeoCard } from './NeoCard';
import { NeoButton } from './NeoButton';
import { NEO_COLORS } from './tokens';
import { SubWalletItem } from '../../hooks/useSubWallets';
import { useTranslation } from '../../services/i18n';

export interface NeoBalanceCardProps {
  balanceUsd?: string;
  balanceVnd?: string;
  onDepositPress?: () => void;
  onWithdrawPress?: () => void;
  onBottomLatchPress?: () => void;
  onToggleCurrency?: () => void;
  subWallets?: SubWalletItem[];
  onPressSubWallet?: (wallet: SubWalletItem) => void;
  onPressAddSubWallet?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * NeoBalanceCard: Thẻ Ví phong cách Neo-brutalism tích hợp Accordion Sub-wallets
 * - Toàn bộ vùng Ví Phụ nằm hoàn toàn BÊN TRONG thẻ màu tím.
 * - Chuyển động mở mềm mại: LinearTransition(350ms, Easing.bezier(0.25, 0.1, 0.25, 1)).
 * - Staggered Entrance: FadeInDown(300ms, delay 100ms) và FadeOutUp(200ms).
 * - Icon mũi tên xoay 180 độ đồng bộ tốc độ 350ms với đường cong Bezier.
 */
export const NeoBalanceCard: React.FC<NeoBalanceCardProps> = ({
  balanceUsd = '$100',
  balanceVnd = 'đ 0.00',
  onDepositPress,
  onWithdrawPress,
  onBottomLatchPress,
  onToggleCurrency,
  subWallets = [],
  onPressSubWallet,
  onPressAddSubWallet,
  style,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(145);

  // Reanimated Shared Values cho Chiều Cao Nội Suy & Xoay Icon Mũi Tên
  const animatedHeight = useSharedValue(0);
  const chevronRotation = useSharedValue(0);

  useEffect(() => {
    if (isExpanded) {
      if (measuredHeight > 0) {
        animatedHeight.value = withTiming(measuredHeight, {
          duration: 400,
          easing: Easing.bezier(0.33, 1, 0.68, 1),
        });
      }
    } else {
      animatedHeight.value = withTiming(0, {
        duration: 350,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
      });
    }

    chevronRotation.value = withTiming(isExpanded ? 180 : 0, {
      duration: 350,
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    });
  }, [isExpanded, measuredHeight]);

  const animatedHeightStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedHeight.value === 0 ? 0 : 1,
  }));

  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const handleToggleExpand = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsExpanded((prev) => !prev);
    if (onBottomLatchPress) {
      onBottomLatchPress();
    }
  };

  return (
    <View style={[styles.outerWrapper, style]}>
      {/* 1. Thẻ Tím Neo-brutalism chính bao bọc toàn bộ nội dung */}
      <NeoCard
        backgroundColor="#9E77DC"
        borderColor="#000000"
        shadowColor="#000000"
        borderRadius={24}
        borderWidth={2.5}
        offset={5}
        style={styles.cardInner}
      >
        {/* Hàng Tiêu Đề "Dollars" */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggleCurrency}
          style={styles.headerRow}
        >
          <Text style={styles.currencyLabel}>Dollars</Text>
        </TouchableOpacity>

        {/* Số Dư Lớn "$100" */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggleCurrency}
          style={styles.balanceRow}
        >
          <Text style={styles.mainBalanceText}>{balanceUsd}</Text>
        </TouchableOpacity>

        {/* Dòng Số Dư Phụ "đ 0.00" */}
        <View style={styles.subBalanceRow}>
          <Text style={styles.subBalanceText}>{balanceVnd}</Text>
        </View>

        {/* Hàng 2 Nút Thao Tác (Deposit & Withdraw) */}
        <View style={styles.actionsRow}>
          {/* Nút Deposit (Nền vàng nhạt pastel #FFF1A6) */}
          <NeoButton
            onPress={onDepositPress}
            backgroundColor="#FFF1A6"
            borderColor="#000000"
            shadowColor="#000000"
            borderRadius={999}
            borderWidth={2}
            offset={3}
            containerStyle={styles.actionBtnContainer}
            icon={
              <View style={styles.iconCircleBadge}>
                <Ionicons name="arrow-down" size={14} color="#000000" />
              </View>
            }
          >
            <Text style={styles.actionBtnText}>Deposit</Text>
          </NeoButton>

          {/* Nút Withdraw (Nền xanh mint nhạt pastel #D8FAF7) */}
          <NeoButton
            onPress={onWithdrawPress}
            backgroundColor="#D8FAF7"
            borderColor="#000000"
            shadowColor="#000000"
            borderRadius={999}
            borderWidth={2}
            offset={3}
            containerStyle={styles.actionBtnContainer}
            icon={
              <View style={styles.iconCircleBadge}>
                <Feather name="arrow-up-right" size={14} color="#000000" />
              </View>
            }
          >
            <Text style={styles.actionBtnText}>Withdraw</Text>
          </NeoButton>
        </View>

        {/* 2. KHU VỰC VÍ TIỀN TỆ PHỤ NẰM HOÀN TOÀN BÊN TRONG THẺ TÍM (ABSOLUTE MEASUREMENT ACCORDION) */}
        <Animated.View style={[styles.accordionWrapper, animatedHeightStyle]}>
          <View
            style={styles.measuredSubWalletsArea}
            onLayout={(e) => {
              const h = Math.round(e.nativeEvent.layout.height);
              if (h > 0 && Math.abs(h - measuredHeight) > 1) {
                setMeasuredHeight(h);
              }
            }}
          >
            {/* Đường Kẻ Ngang Phân Cách Neo-brutalism */}
            <View style={styles.subWalletsDivider} />

            <View style={styles.subWalletsHeaderRow}>
              <Text style={styles.subWalletsTitle}>
                {t('subWallets.title', { defaultValue: 'Ví Tiền Tệ Phụ' })}
              </Text>
              <Text style={styles.subWalletsHint}>
                {t('subWallets.hint', { defaultValue: 'Chạm vào thẻ để đổi tiền' })}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subWalletsScrollList}
            >
              {/* 1. Danh Sách Các Thẻ Mini Ví Phụ (Chỉ render khi loại tiền đó thực sự tồn tại) */}
              {Array.isArray(subWallets) &&
                subWallets.map((wallet) => (
                  <TouchableOpacity
                    key={wallet.id}
                    style={[styles.miniCard, { backgroundColor: wallet.color }]}
                    onPress={() => onPressSubWallet && onPressSubWallet(wallet)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.miniCardTopRow}>
                      <View style={styles.miniIconCircle}>
                        <Text style={styles.miniSymbolText}>{wallet.symbol}</Text>
                      </View>
                      <View style={styles.swapActionIcon}>
                        <MaterialCommunityIcons name="swap-horizontal" size={15} color="#000000" />
                      </View>
                    </View>

                    <View style={styles.miniCardBottomCol}>
                      <Text style={styles.miniCurrencyCode}>{wallet.currency}</Text>
                      <Text style={styles.miniBalanceText} numberOfLines={1}>
                        {wallet.symbol} {wallet.balance.toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

              {/* 2. Nút 'Thêm ví' Viền Nét Đứt Cố Định Ở Cuối Danh Sách */}
              <TouchableOpacity
                style={styles.addWalletBtn}
                onPress={onPressAddSubWallet}
                activeOpacity={0.75}
              >
                <View style={styles.addIconCircle}>
                  <Feather name="plus" size={18} color="#000000" />
                </View>
                <Text style={styles.addWalletText}>
                  {t('subWallets.addBtn', { defaultValue: 'Thêm ví' })}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Animated.View>
      </NeoCard>

      {/* 3. Nút Bán Nguyệt Đính Ở Cạnh Dưới Thẻ Tím (Toggle Accordion & Xoay Icon) */}
      <View style={styles.bottomLatchAnchor}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleToggleExpand}
          style={styles.latchWrapper}
        >
          {/* Lớp bóng đen cho nút bán nguyệt */}
          <View style={styles.latchShadow} />
          {/* Lớp nút bán nguyệt màu tím */}
          <View style={styles.latchBody}>
            <Animated.View style={animatedChevronStyle}>
              <Feather name="chevron-down" size={22} color="#000000" />
            </Animated.View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'relative',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  cardInner: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    minHeight: 185,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: 0.2,
  },
  balanceRow: {
    marginVertical: 2,
  },
  mainBalanceText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subBalanceRow: {
    marginBottom: 16,
  },
  subBalanceText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#E9DCFE',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBtnContainer: {
    flex: 1,
  },
  iconCircleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.8,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  actionBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.1,
  },
  // Sub-wallets Accordion Styles Inside Purple Card
  accordionWrapper: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  measuredSubWalletsArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 14,
    paddingBottom: 4,
  },
  subWalletsDivider: {
    height: 2,
    backgroundColor: '#000000',
    marginBottom: 12,
    borderRadius: 1,
  },
  subWalletsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  subWalletsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  subWalletsHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C1D95',
  },
  subWalletsScrollList: {
    gap: 10,
    paddingBottom: 4,
  },
  miniCard: {
    width: 130,
    height: 80,
    borderRadius: 16,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  miniCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniSymbolText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  swapActionIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
  },
  miniCardBottomCol: {
    marginTop: 2,
  },
  miniCurrencyCode: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  miniBalanceText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
    marginTop: 1,
  },
  addWalletBtn: {
    width: 100,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  addWalletText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#111827',
  },
  bottomLatchAnchor: {
    position: 'absolute',
    bottom: -13,
    alignSelf: 'center',
    zIndex: 20,
  },
  latchWrapper: {
    position: 'relative',
    width: 60,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  latchShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 60,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#000000',
  },
  latchBody: {
    width: 60,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#9E77DC',
    borderWidth: 2.2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
