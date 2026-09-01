import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SubWalletItem } from '../../hooks/useSubWallets';
import { useTranslation } from '../../services/i18n';

interface NeoSubWalletsProps {
  subWallets: SubWalletItem[];
  onPressSubWallet: (wallet: SubWalletItem) => void;
  onPressAddSubWallet: () => void;
}

/**
 * NeoSubWallets: Khu vực hiển thị các ví tiền tệ phụ (VND, EUR...) phong cách Neo-brutalism
 * - Nút 'Thêm ví' viền đen nét đứt (dashed border), nền trắng, cao 80px.
 * - Thẻ mini ví phụ nền pastel (vàng VND, mint EUR...), viền đen 2px, bóng đổ cứng.
 * - Chạm vào thẻ mini để mở Popup đổi tiền (Swap).
 */
export const NeoSubWallets: React.FC<NeoSubWalletsProps> = ({
  subWallets,
  onPressSubWallet,
  onPressAddSubWallet,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          {t('subWallets.title', { defaultValue: 'Ví Tiền Tệ Phụ' })}
        </Text>
        <Text style={styles.sectionHint}>
          {t('subWallets.hint', { defaultValue: 'Chạm vào thẻ để đổi tiền' })}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {/* 1. DANH SÁCH CÁC THẺ MINI VÍ PHỤ ĐÃ KÍCH HOẠT */}
        {subWallets.map((wallet) => (
          <TouchableOpacity
            key={wallet.id}
            style={[styles.miniCard, { backgroundColor: wallet.color }]}
            onPress={() => onPressSubWallet(wallet)}
            activeOpacity={0.82}
          >
            <View style={styles.miniCardTopRow}>
              <View style={styles.miniIconCircle}>
                <Text style={styles.miniSymbolText}>{wallet.symbol}</Text>
              </View>
              <View style={styles.swapActionIcon}>
                <MaterialCommunityIcons name="swap-horizontal" size={16} color="#000000" />
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

        {/* 2. NÚT 'THÊM VÍ' VIỀN ĐEN NÉT ĐỨT (DASHED BORDER) */}
        <TouchableOpacity
          style={styles.addWalletBtn}
          onPress={onPressAddSubWallet}
          activeOpacity={0.75}
        >
          <View style={styles.addIconCircle}>
            <Feather name="plus" size={20} color="#000000" />
          </View>
          <Text style={styles.addWalletText}>
            {t('subWallets.addBtn', { defaultValue: 'Thêm ví' })}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  sectionHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  scrollList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  miniCard: {
    width: 140,
    height: 86,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#000000',
    // Hard offset shadow
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  miniCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniSymbolText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  swapActionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
  },
  miniCardBottomCol: {
    marginTop: 2,
  },
  miniCurrencyCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.2,
  },
  miniBalanceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginTop: 1,
  },
  addWalletBtn: {
    width: 110,
    height: 86,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  addWalletText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#111827',
  },
});
