import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import {
  fetchOnChainHistory,
  ActivityItem,
} from '../services/solana';
import {
  getCachedActivities,
  cacheActivities,
} from '../services/storage';

type FilterType = 'all' | 'received' | 'sent' | 'reward';

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = usePrivy();
  const solanaWalletState = useEmbeddedSolanaWallet();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Trích xuất địa chỉ ví Solana
  const getSolanaAddress = (): string | null => {
    if (!user) return null;
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
    }
    const linkedAccounts = (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const solAccount = linkedAccounts.find(
      (acc: any) => acc.type === 'wallet' && (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    return solAccount?.address || null;
  };

  const solanaAddress = getSolanaAddress();

  // Nạp Cache khởi tạo
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await getCachedActivities();
        if (cached && cached.length > 0) {
          setActivities(cached);
        }
      } catch (err) {
        console.log('Error reading cached history:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadCache();
  }, []);

  // Kéo dữ liệu On-chain từ Solana Devnet
  const loadOnChainHistory = useCallback(async (force: boolean = false) => {
    if (!solanaAddress) return;
    try {
      const data = await fetchOnChainHistory(solanaAddress, force);
      if (data && data.length > 0) {
        setActivities(data);
        cacheActivities(data);
      }
    } catch (err) {
      console.log('Error fetching history:', err);
    }
  }, [solanaAddress]);

  useEffect(() => {
    if (solanaAddress) {
      loadOnChainHistory();
    }
  }, [solanaAddress, loadOnChainHistory]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOnChainHistory(true);
    setIsRefreshing(false);
  };

  // Sao chép Signature
  const handleCopySignature = async (sig?: string) => {
    if (!sig) return;
    try {
      await Clipboard.setStringAsync(sig);
      Alert.alert('Thông Báo', 'Đã sao chép Transaction Signature!');
    } catch (e) {
      console.log('Copy signature error:', e);
    }
  };

  // Mở Solscan Devnet Explorer
  const handleOpenExplorer = (sig?: string) => {
    if (!sig) return;
    const url = `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
    Linking.openURL(url).catch((err) => {
      Alert.alert('Lỗi', 'Không thể mở liên kết Solana Explorer.');
    });
  };

  // Lọc danh sách giao dịch
  const filteredActivities = activities.filter((item) => {
    // 1. Lọc theo tab
    if (filter !== 'all' && item.type !== filter) {
      return false;
    }
    // 2. Lọc theo chuỗi tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAmount = item.amount.toLowerCase().includes(q);
      const matchSig = item.signature ? item.signature.toLowerCase().includes(q) : false;
      return matchTitle || matchAmount || matchSig;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* 1. Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch Sử Giao Dịch</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={isRefreshing}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={18} color="#00A859" />
        </TouchableOpacity>
      </View>

      {/* 2. Thanh Tìm Kiếm (Search Bar) */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo số tiền, chữ ký tx..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 3. Filter Pills Bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Tất cả ({activities.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'received' && styles.filterPillActive]}
            onPress={() => setFilter('received')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'received' && styles.filterTextActive]}>
              Nhận tiền
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'sent' && styles.filterPillActive]}
            onPress={() => setFilter('sent')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'sent' && styles.filterTextActive]}>
              Chuyển tiền
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'reward' && styles.filterPillActive]}
            onPress={() => setFilter('reward')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === 'reward' && styles.filterTextActive]}>
              Phần thưởng
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 4. Danh Sách Giao Dịch Toàn Bộ */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#00A859']}
            tintColor="#00A859"
          />
        }
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#00A859" />
            <Text style={styles.loadingText}>Đang tải lịch sử giao dịch...</Text>
          </View>
        ) : filteredActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>Không có giao dịch nào</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Không tìm thấy giao dịch khớp với từ khóa tìm kiếm.'
                : 'Chưa có biến động giao dịch on-chain nào trong danh mục này.'}
            </Text>
          </View>
        ) : (
          <View style={styles.activityCard}>
            {filteredActivities.map((item, index) => {
              const isLast = index === filteredActivities.length - 1;
              return (
                <View key={item.id}>
                  <View style={styles.activityItemRow}>
                    {/* Icon Hình Tròn */}
                    <View
                      style={[
                        styles.activityIconCircle,
                        { backgroundColor: item.iconBg || '#00A859' },
                      ]}
                    >
                      {item.type === 'reward' ? (
                        <MaterialCommunityIcons
                          name="gift-outline"
                          size={20}
                          color="#FFFFFF"
                        />
                      ) : item.type === 'received' ? (
                        <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
                      ) : (
                        <Feather name="arrow-up-right" size={18} color="#FFFFFF" />
                      )}
                    </View>

                    {/* Chi Tiết Giao Dịch */}
                    <View style={styles.activityContentCol}>
                      <View style={styles.titleAndAmountRow}>
                        <Text style={styles.activityItemTitle}>{item.title}</Text>
                        <Text
                          style={[
                            styles.activityItemAmount,
                            item.isPositive
                              ? styles.amountPositive
                              : styles.amountNegative,
                          ]}
                        >
                          {item.amount}
                        </Text>
                      </View>

                      <View style={styles.timeAndMetaRow}>
                        <Text style={styles.activityItemTime}>{item.time}</Text>

                        {/* Signature Pill & Hành động */}
                        {item.signature ? (
                          <View style={styles.signatureActionPill}>
                            <TouchableOpacity
                              style={styles.sigTextBtn}
                              onPress={() => handleCopySignature(item.signature)}
                            >
                              <Text style={styles.sigShortText}>
                                {item.signature.slice(0, 4)}...{item.signature.slice(-4)}
                              </Text>
                              <Feather name="copy" size={11} color="#64748B" style={{ marginLeft: 4 }} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.explorerIconBtn}
                              onPress={() => handleOpenExplorer(item.signature)}
                            >
                              <Feather name="external-link" size={11} color="#00A859" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.confirmedBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#00A859" />
                            <Text style={styles.confirmedText}>Confirmed</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {!isLast && <View style={styles.dividerLine} />}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D1F4E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#00A859',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  activityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContentCol: {
    flex: 1,
  },
  titleAndAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  activityItemAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  amountPositive: {
    color: '#00A859',
  },
  amountNegative: {
    color: '#0F172A',
  },
  timeAndMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  activityItemTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  signatureActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 6,
  },
  sigTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sigShortText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#475569',
    fontWeight: '600',
  },
  explorerIconBtn: {
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#CBD5E1',
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmedText: {
    fontSize: 11,
    color: '#00A859',
    fontWeight: '600',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 56,
  },
});
