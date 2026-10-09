import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, TextInput, Linking, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../services/auth';
import { Mascot } from '@/components/Mascot';
import { Badge, DText, IconButton, Screen } from '@/components/design';
import { colors, fonts, glass, radius, sizes, space, type } from '@/constants/design';
import { WalletNav } from '@/components/wallet/WalletNav';
import {
  fetchOnChainHistory,
  ActivityItem,
  getActivityTitle,
  formatLocalizedRelativeTime,
} from '../services/solana';
import { getCachedActivities, cacheActivities } from '../services/storage';
import { useTranslation } from '../services/i18n';

import { displayNamesFor } from '../services/identity/resolve';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'received', label: 'Received' },
  { key: 'sent', label: 'Sent' },
  { key: 'reward', label: 'Rewards' },
] as const;

type FilterType = 'all' | 'received' | 'sent' | 'reward';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { walletAddress } = useAuth();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    void displayNamesFor(activities.flatMap(item => item.counterpartyWallet ? [item.counterpartyWallet] : [])).then(value => { if (active) setNames(value); });
    return () => { active = false; };
  }, [activities]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Địa chỉ ví Solana nhúng (Dynamic)
  const solanaAddress = walletAddress;

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
      if (data.length > 0) { setActivities(data); await cacheActivities(data); }
    } catch (err) {
      console.log('Error fetching history:', err);
    }
  }, [solanaAddress]);

  // Tự động làm mới khi màn hình được Focus
  useFocusEffect(
    useCallback(() => {
      if (solanaAddress) {
        loadOnChainHistory(true);
      }
    }, [solanaAddress, loadOnChainHistory])
  );

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
      Alert.alert('Copied', 'Transaction signature copied.');
    } catch (e) {
      console.log('Copy signature error:', e);
    }
  };

  // Mở Solscan Devnet Explorer
  const handleOpenExplorer = (sig?: string) => {
    if (!sig) return;
    const url = `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', 'Unable to open Solana Explorer.');
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
      const matchTitle = (getActivityTitle(item, t) || item.title).toLowerCase().includes(q);
      const matchAmount = item.amount.toLowerCase().includes(q);
      const matchSig = item.signature ? item.signature.toLowerCase().includes(q) : false;
      return matchTitle || matchAmount || matchSig || !!(item.counterpartyWallet && names[item.counterpartyWallet]?.toLowerCase().includes(q));
    }
    return true;
  });

  const titleFor = (item: ActivityItem) =>
    item.counterpartyWallet && names[item.counterpartyWallet]
      ? `${item.type === 'sent' ? 'To' : 'From'} ${names[item.counterpartyWallet]}`
      : getActivityTitle(item, t);
  const iconFor = (item: ActivityItem) =>
    item.type === 'received'
      ? { name: 'arrow-down-left' as const, bg: glass.successFill, fg: colors.successText }
      : item.type === 'reward'
        ? { name: 'gift' as const, bg: glass.warningFill, fg: colors.warningText }
        : { name: 'arrow-up-right' as const, bg: glass.fillStrong, fg: colors.text };

  return (
    <View style={styles.page}>
      <Screen glow="settings" scroll={false} edges={['top', 'left', 'right']} contentStyle={styles.frame}>
        <View style={styles.headerBar}>
          <DText variant="h1" accessibilityRole="header" style={styles.title}>
            History
          </DText>
          <IconButton
            icon="refresh-cw"
            accessibilityLabel="Refresh history"
            color={colors.text}
            onPress={() => void handleRefresh()}
          />
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={colors.textTertiary} />
          <TextInput
            accessibilityLabel="Search history"
            style={styles.searchInput}
            placeholder="Search amount, name or signature"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearchQuery('')} hitSlop={8}>
              <Feather name="x-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(f.key)}
                style={[styles.filterPill, on && styles.filterPillActive]}
              >
                <DText variant="body" style={[styles.filterText, on && styles.filterTextActive]}>
                  {f.key === 'all' ? `${f.label} (${activities.length})` : f.label}
                </DText>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          contentContainerStyle={styles.scrollList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.purple[300]]} tintColor={colors.purple[300]} />
          }
        >
          {isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.purple[300]} />
              <DText variant="caption" tone="secondary">Loading history…</DText>
            </View>
          ) : filteredActivities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Mascot mood={searchQuery ? 'question' : 'sleepy'} size={110} floatAnimation containerStyle={{ marginBottom: space[3] }} />
              <DText variant="h3" align="center">No activity yet</DText>
              <DText variant="body" align="center">
                {searchQuery ? 'Nothing matches your search.' : 'Money you send or receive shows up here.'}
              </DText>
            </View>
          ) : (
            <View style={styles.activityCard}>
              {filteredActivities.map((item, index) => {
                const icon = iconFor(item);
                return (
                  <View key={item.id} style={[styles.activityItemRow, index > 0 && styles.divider]}>
                    <View style={[styles.activityIcon, { backgroundColor: icon.bg }]}>
                      <Feather name={icon.name} size={18} color={icon.fg} />
                    </View>
                    <View style={styles.activityContentCol}>
                      <View style={styles.titleAndAmountRow}>
                        <DText variant="bodyLarge" style={styles.activityItemTitle} numberOfLines={1}>
                          {titleFor(item)}
                        </DText>
                        <DText variant="mono" tone={item.isPositive ? 'success' : 'primary'} style={styles.amount}>
                          {item.amount}
                        </DText>
                      </View>
                      <View style={styles.timeAndMetaRow}>
                        <DText variant="caption" tone="secondary" style={styles.metaText} numberOfLines={1}>
                          {formatLocalizedRelativeTime(item.blockTime, t)}
                        </DText>
                        {item.signature ? (
                          <View style={styles.sigActions}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Copy transaction signature"
                              onPress={() => handleCopySignature(item.signature)}
                              style={styles.sigButton}
                            >
                              <DText variant="caption" style={styles.sigText}>
                                {item.signature.slice(0, 4)}…{item.signature.slice(-4)}
                              </DText>
                              <Feather name="copy" size={12} color={colors.textSecondary} />
                            </Pressable>
                            <Pressable
                              accessibilityRole="link"
                              accessibilityLabel="View on Solana Explorer"
                              onPress={() => handleOpenExplorer(item.signature)}
                              style={styles.sigButton}
                            >
                              <Feather name="external-link" size={14} color={colors.textAccent} />
                            </Pressable>
                          </View>
                        ) : (
                          <Badge label="Confirmed" tone="success" icon="check" />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </Screen>
      <WalletNav active="Records" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  frame: { paddingHorizontal: space[4], paddingBottom: 0 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[1], paddingBottom: space[4] },
  title: { fontFamily: fonts.display },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: 48,
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
  },
  searchInput: { ...type.body, flex: 1, color: colors.text, height: '100%' },
  filterBar: { flexGrow: 0, marginTop: space[3] },
  filterScroll: { gap: space[2], paddingBottom: space[1] },
  filterPill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
  },
  filterPillActive: { backgroundColor: colors.brand, borderColor: colors.purple[400] },
  filterText: { fontFamily: fonts.bodyMedium, color: colors.textSecondary },
  filterTextActive: { color: colors.text },
  scrollList: { paddingTop: space[4], paddingBottom: 120 },
  centerBox: { alignItems: 'center', gap: space[3], paddingVertical: space[12] },
  emptyCard: { alignItems: 'center', gap: space[2], paddingVertical: space[10], paddingHorizontal: space[6] },
  activityCard: {
    borderRadius: radius.xl,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
    paddingHorizontal: space[4],
  },
  activityItemRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], minHeight: sizes.touch + space[4] },
  divider: { borderTopWidth: 1, borderColor: glass.divider },
  activityIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  activityContentCol: { flex: 1, minWidth: 0, gap: 2 },
  titleAndAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  activityItemTitle: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15 },
  amount: { fontFamily: fonts.monoBold },
  timeAndMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  metaText: { flex: 1 },
  sigActions: { flexDirection: 'row', alignItems: 'center' },
  sigButton: { flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: 32, paddingHorizontal: space[1] },
  sigText: { fontFamily: fonts.mono, color: colors.textSecondary },
});
