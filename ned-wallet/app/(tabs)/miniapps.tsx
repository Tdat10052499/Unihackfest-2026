import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface MiniAppItem {
  id: string;
  title: string;
  category: string;
  description: string;
  iconName: string;
  iconType: 'feather' | 'ionicons';
  iconBg: string;
  iconColor?: string;
  categoryColor?: string;
  status?: string;
}

// 2. Cấu trúc Mock Data cho danh sách Mini-Apps
const MINI_APPS_DATA: MiniAppItem[] = [
  {
    id: '1',
    title: 'Solana Pay Merchant',
    category: 'Payments & Merchant',
    description: 'Generate QR code invoices for cafes, retail shops and receive instant USDC/VND payments.',
    iconName: 'qr-code',
    iconType: 'ionicons',
    iconBg: '#E0FFFF', // Cyan nhạt
    categoryColor: '#0891B2',
    status: 'Coming soon',
  },
  {
    id: '2',
    title: 'Jupiter Swap Lite',
    category: 'DeFi & Token Swap',
    description: 'Swap tokens swiftly with optimal rates routed by Jupiter Aggregator.',
    iconName: 'swap-horizontal',
    iconType: 'ionicons',
    iconBg: '#E6E6FA', // Tím nhạt
    categoryColor: '#0891B2',
    status: 'Coming soon',
  },
  {
    id: '3',
    title: 'Micro Savings',
    category: 'Personal Finance',
    description: 'Auto-round up spare change to accumulate SOL and earn daily yield.',
    iconName: 'trending-up',
    iconType: 'feather',
    iconBg: '#FFFFFF', // Trắng
    categoryColor: '#0891B2',
    status: 'Coming soon',
  },
  {
    id: '4',
    title: 'Web3 Gift Cards',
    category: 'Gift Cards & Vouchers',
    description: 'Purchase and gift digital cards (Grab, Shopee, Starbucks) using N.E.D balance.',
    iconName: 'gift-outline',
    iconType: 'ionicons',
    iconBg: '#FFE4E1', // Hồng nhạt
    categoryColor: '#0891B2',
    status: 'Coming soon',
  },
];

export default function MiniAppsScreen() {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCardPress = (item: MiniAppItem | { title: string; status?: string }) => {
    // Gọi hiệu ứng rung nhẹ Haptics
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage('Tính năng đang được phát triển');
    setToastVisible(true);

    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  };

  const renderIcon = (name: string, type: 'feather' | 'ionicons', color: string = '#000000') => {
    if (type === 'feather') {
      return <Feather name={name as any} size={22} color={color} />;
    }
    return <Ionicons name={name as any} size={22} color={color} />;
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF8F5" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Tiêu đề chính "MINI APPS" */}
        <Text style={styles.mainTitle}>MINI APPS</Text>

        {/* Thẻ Banner Highlight "Limitless Web3 DApps" */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardShadow} />
          <TouchableOpacity
            style={styles.cardFront}
            activeOpacity={0.85}
            onPress={() => handleCardPress({ title: 'Limitless Web3 DApps' })}
          >
            <View style={[styles.iconBox, { backgroundColor: '#00E5FF' }]}>
              <Ionicons name="sparkles" size={22} color="#000000" />
            </View>

            <View style={styles.textContent}>
              <Text style={styles.cardTitle}>Limitless Web3 DApps</Text>
              <Text style={styles.bannerDesc}>
                Experience DeFi, Gaming, E-commerce payments with Solana instant speed.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tiêu đề phụ "Featured Apps" */}
        <Text style={styles.sectionTitle}>Featured Apps</Text>

        {/* Danh sách các thẻ ứng dụng Mock Data */}
        {MINI_APPS_DATA.map((item) => (
          <View key={item.id} style={styles.cardWrapper}>
            {/* Hard Shadow Layer phía sau (Neo-brutalism) */}
            <View style={styles.cardShadow} />

            <TouchableOpacity
              style={styles.cardFront}
              activeOpacity={0.85}
              onPress={() => handleCardPress(item)}
            >
              {/* Biểu tượng (Icon Box - Bên trái) */}
              <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                {renderIcon(item.iconName, item.iconType, item.iconColor || '#000000')}
              </View>

              {/* Nội dung (Text Content - Ở giữa) */}
              <View style={styles.textContent}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>

                  {/* Badge Trạng thái "Coming soon" ở góc phải */}
                  {item.status && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{item.status}</Text>
                    </View>
                  )}
                </View>

                {/* Phụ đề 2 dòng: Dòng 1 (thể loại), Dòng 2 (mô tả) */}
                <Text style={[styles.cardCategory, { color: item.categoryColor || '#0891B2' }]}>
                  {item.category}
                </Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Toast thông báo "Tính năng đang được phát triển" chuẩn Neo-brutalism */}
      {toastVisible && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={styles.toastShadow} />
          <View style={styles.toastCard}>
            <Text style={styles.toastIcon}>🚧</Text>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FDF8F5',
  },
  // BẮT BUỘC contentContainerStyle padding: 20, paddingBottom: 120
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },

  // Typography Tiêu đề
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginTop: 24,
    marginBottom: 16,
  },

  // Thẻ Ứng Dụng (Mini-App Card)
  cardWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  cardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000000',
    borderRadius: 16,
  },
  cardFront: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },

  // Biểu tượng (Icon Box - Bên trái)
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nội dung (Text Content - Ở giữa)
  textContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    flex: 1,
    marginRight: 6,
  },
  bannerDesc: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 16,
    marginTop: 2,
  },
  cardCategory: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 16,
  },

  // Badge Trạng thái (Góc phải)
  statusBadge: {
    backgroundColor: '#FFF8DC',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },

  // Toast thông báo Neo-brutalism
  toastContainer: {
    position: 'absolute',
    bottom: 125,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: '#000000',
    borderRadius: 14,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    justifyContent: 'center',
  },
  toastIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  toastText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#000000',
  },
});
