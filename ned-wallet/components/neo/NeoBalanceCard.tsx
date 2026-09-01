import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { NeoCard } from './NeoCard';
import { NeoButton } from './NeoButton';
import { NEO_COLORS } from './tokens';

export interface NeoBalanceCardProps {
  balanceUsd?: string;
  balanceVnd?: string;
  onDepositPress?: () => void;
  onWithdrawPress?: () => void;
  onBottomLatchPress?: () => void;
  onToggleCurrency?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * NeoBalanceCard: Thẻ Ví phong cách Neo-brutalism
 * Chuẩn thiết kế với Thẻ tím, Nút Deposit vàng (#FFF1A6), Nút Withdraw xanh nhạt (#D8FAF7), và Nút đính cạnh dưới.
 */
export const NeoBalanceCard: React.FC<NeoBalanceCardProps> = ({
  balanceUsd = '$100',
  balanceVnd = 'đ 0.00',
  onDepositPress,
  onWithdrawPress,
  onBottomLatchPress,
  onToggleCurrency,
  style,
}) => {
  return (
    <View style={[styles.outerWrapper, style]}>
      {/* 1. Thẻ Tím Neo-brutalism chính */}
      <NeoCard
        backgroundColor="#9E77DC"
        borderColor="#000000"
        shadowColor="#000000"
        borderRadius={22}
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
      </NeoCard>

      {/* 2. Nút Bán Nguyệt / Viên Thuốc Đính Ở Cạnh Dưới Thẻ Tím */}
      <View style={styles.bottomLatchAnchor}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onBottomLatchPress}
          style={styles.latchWrapper}
        >
          {/* Lớp bóng đen cho nút bán nguyệt */}
          <View style={styles.latchShadow} />
          {/* Lớp nút bán nguyệt màu tím */}
          <View style={styles.latchBody}>
            <Feather name="chevron-down" size={22} color="#000000" />
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
    paddingHorizontal: 22,
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
    marginBottom: 18,
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
