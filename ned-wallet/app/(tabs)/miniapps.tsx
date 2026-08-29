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

interface MiniAppCardProps {
  title: string;
  category: string;
  description: string;
  iconNode: React.ReactNode;
  iconBg: string;
}

const MiniAppCard: React.FC<MiniAppCardProps> = ({
  title,
  category,
  description,
  iconNode,
  iconBg,
}) => (
  <TouchableOpacity
    style={styles.appCard}
    activeOpacity={0.85}
    onPress={() =>
      Alert.alert(
        title,
        `${description}\n\nỨng dụng này đang trong quá trình phát triển trên hệ sinh thái N.E.D MiniApps!`
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
          <Text style={styles.soonBadgeText}>Sắp ra mắt</Text>
        </View>
      </View>
      <Text style={styles.appCategory}>{category}</Text>
      <Text style={styles.appDesc}>{description}</Text>
    </View>
  </TouchableOpacity>
);

export default function MiniAppsScreen() {
  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>N.E.D MiniApps Hub</Text>
          <Text style={styles.headerSubtitle}>
            Hệ sinh thái ứng dụng phi tập trung Web3 trên Solana
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
            <Text style={styles.bannerTitle}>Web3 DApps Không Giới Hạn</Text>
            <Text style={styles.bannerSubtitle}>
              Trải nghiệm DeFi, Gaming, Thanh toán thương mại điện tử với tốc độ tức thì của mạng Solana.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>ỨNG DỤNG NỔI BẬT</Text>

        <MiniAppCard
          title="Solana Pay Merchant"
          category="Thanh Toán & Cửa Hàng"
          description="Tạo hóa đơn QR Code cho quán cafe, cửa hàng bán lẻ và nhận thanh toán USDC/VND tức thì."
          iconNode={<MaterialCommunityIcons name="qrcode-scan" size={24} color="#00A859" />}
          iconBg="#D1F4E0"
        />

        <MiniAppCard
          title="Jupiter Swap Lite"
          category="DeFi & Hoán Đổi Token"
          description="Hoán đổi token nhanh chóng với tỷ giá tốt nhất từ giao thức Jupiter Aggregator."
          iconNode={<MaterialCommunityIcons name="swap-horizontal-bold" size={24} color="#8B5CF6" />}
          iconBg="#EDE9FE"
        />

        <MiniAppCard
          title="Micro Savings (Tích Lũy Nhỏ)"
          category="Tài Chính Cá Nhân"
          description="Tự động làm tròn số tiền chi tiêu lẻ để tích lũy SOL sinh lời mỗi ngày."
          iconNode={<Feather name="trending-up" size={24} color="#0284C7" />}
          iconBg="#E0F2FE"
        />

        <MiniAppCard
          title="Web3 Gift Cards"
          category="Thẻ Quà Tặng & Voucher"
          description="Mua và tặng thẻ quà điện tử (Grab, Shopee, Starbucks) thanh toán bằng số dư N.E.D."
          iconNode={<MaterialCommunityIcons name="gift-outline" size={24} color="#EF4444" />}
          iconBg="#FEE2E2"
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
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerTextBox: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#166534',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  appCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  appIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  appInfoCol: {
    flex: 1,
  },
  appHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  soonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  soonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  appCategory: {
    fontSize: 11,
    color: '#00A859',
    fontWeight: '600',
    marginTop: 2,
  },
  appDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 4,
  },
});
