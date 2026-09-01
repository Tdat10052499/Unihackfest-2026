import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from '../../services/i18n';

interface MiniAppCardProps {
  title: string;
  category: string;
  description: string;
  iconNode: React.ReactNode;
  iconBg: string;
  soonText?: string;
  inDevMsg?: string;
}

const MiniAppCard: React.FC<MiniAppCardProps> = ({
  title,
  category,
  description,
  iconNode,
  iconBg,
  soonText,
  inDevMsg,
}) => (
  <TouchableOpacity
    style={styles.appCard}
    activeOpacity={0.85}
    onPress={() =>
      Alert.alert(
        title,
        `${description}\n\n${inDevMsg || 'Ứng dụng này đang trong quá trình phát triển trên hệ sinh thái N.E.D MiniApps!'}`
      )
    }
  >
    <View style={[styles.appIconCircle, { backgroundColor: iconBg }]}>
      {iconNode}
    </View>
    <View style={styles.appInfoCol}>
      <View style={styles.appHeaderRow}>
        <Text style={styles.appTitle}>{title}</Text>
        <View style={styles.soonBadge}>
          <Text style={styles.soonBadgeText}>{soonText || 'Sắp ra mắt'}</Text>
        </View>
      </View>
      <Text style={styles.appCategory}>{category}</Text>
      <Text style={styles.appDesc}>{description}</Text>
    </View>
  </TouchableOpacity>
);

export default function MiniAppsScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>{t('miniapps.title', { defaultValue: 'N.E.D MiniApps Hub' })}</Text>
          <Text style={styles.headerSubtitle}>
            {t('miniapps.subtitle', { defaultValue: 'Hệ sinh thái ứng dụng phi tập trung Web3 trên Solana' })}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerIconBox}>
            <Ionicons name="sparkles" size={24} color="#00A859" />
          </View>
          <View style={styles.bannerTextBox}>
            <Text style={styles.bannerTitle}>{t('miniapps.bannerTitle', { defaultValue: 'Web3 DApps Không Giới Hạn' })}</Text>
            <Text style={styles.bannerSubtitle}>
              {t('miniapps.bannerSubtitle', { defaultValue: 'Trải nghiệm DeFi, Gaming, Thanh toán thương mại điện tử với tốc độ tức thì của mạng Solana.' })}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>{t('miniapps.featuredSection', { defaultValue: 'ỨNG DỤNG NỔI BẬT' })}</Text>

        <MiniAppCard
          title={t('miniapps.solanaPayTitle', { defaultValue: 'Solana Pay Merchant' })}
          category={t('miniapps.solanaPayCategory', { defaultValue: 'Thanh Toán & Cửa Hàng' })}
          description={t('miniapps.solanaPayDesc', { defaultValue: 'Tạo hóa đơn QR Code cho quán cafe, cửa hàng bán lẻ và nhận thanh toán USDC/VND tức thì.' })}
          iconNode={<MaterialCommunityIcons name="qrcode-scan" size={24} color="#00A859" />}
          iconBg="#D1F4E0"
          soonText={t('miniapps.comingSoon', { defaultValue: 'Sắp ra mắt' })}
          inDevMsg={t('miniapps.inDevNotice', { defaultValue: 'Ứng dụng này đang trong quá trình phát triển trên hệ sinh thái N.E.D MiniApps!' })}
        />

        <MiniAppCard
          title={t('miniapps.jupiterSwapTitle', { defaultValue: 'Jupiter Swap Lite' })}
          category={t('miniapps.jupiterSwapCategory', { defaultValue: 'DeFi & Hoán Đổi Token' })}
          description={t('miniapps.jupiterSwapDesc', { defaultValue: 'Hoán đổi token nhanh chóng với tỷ giá tốt nhất từ giao thức Jupiter Aggregator.' })}
          iconNode={<MaterialCommunityIcons name="swap-horizontal-bold" size={24} color="#8B5CF6" />}
          iconBg="#EDE9FE"
          soonText={t('miniapps.comingSoon', { defaultValue: 'Sắp ra mắt' })}
          inDevMsg={t('miniapps.inDevNotice', { defaultValue: 'Ứng dụng này đang trong quá trình phát triển trên hệ sinh thái N.E.D MiniApps!' })}
        />

        <MiniAppCard
          title={t('miniapps.microSavingsTitle', { defaultValue: 'Micro Savings (Tích Lũy Nhỏ)' })}
          category={t('miniapps.microSavingsCategory', { defaultValue: 'Tài Chính Cá Nhân' })}
          description={t('miniapps.microSavingsDesc', { defaultValue: 'Tự động làm tròn số tiền chi tiêu lẻ để tích lũy SOL sinh lời mỗi ngày.' })}
          iconNode={<Feather name="trending-up" size={24} color="#0284C7" />}
          iconBg="#E0F2FE"
          soonText={t('miniapps.comingSoon', { defaultValue: 'Sắp ra mắt' })}
          inDevMsg={t('miniapps.inDevNotice', { defaultValue: 'Ứng dụng này đang trong quá trình phát triển trên hệ sinh thái N.E.D MiniApps!' })}
        />

        <MiniAppCard
          title={t('miniapps.giftCardsTitle', { defaultValue: 'Web3 Gift Cards' })}
          category={t('miniapps.giftCardsCategory', { defaultValue: 'Thẻ Quà Tặng & Voucher' })}
          description={t('miniapps.giftCardsDesc', { defaultValue: 'Mua và tặng thẻ quà điện tử (Grab, Shopee, Starbucks) thanh toán bằng số dư N.E.D.' })}
          iconNode={<MaterialCommunityIcons name="gift-outline" size={24} color="#EF4444" />}
          iconBg="#FEE2E2"
          soonText={t('miniapps.comingSoon', { defaultValue: 'Sắp ra mắt' })}
          inDevMsg={t('miniapps.inDevNotice', { defaultValue: 'Ứng dụng này đang trong quá trình phát triển trên hệ sinh thái N.E.D MiniApps!' })}
        />

        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1F4E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bannerTextBox: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  appIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  appInfoCol: {
    flex: 1,
  },
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  appTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  soonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  soonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  appCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00A859',
    marginBottom: 4,
  },
  appDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
