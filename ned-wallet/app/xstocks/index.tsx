import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/services/auth';
import { getXStocks, isUsMarketOpen, sortXStocks, type XStock, type XStockSort } from '@/services/xstocks';
import { getDemoLedger, type DemoLedger } from '@/services/demoLedger';
import { onbColors, onbFonts } from '@/components/onboarding/theme';
import { Header, Screen } from '@/components/xstocks/Screen';
import { InvestmentsCard } from '@/components/xstocks/InvestmentsCard';
import { StockRow } from '@/components/xstocks/StockRow';
import { useXStocksStore } from '@/stores/useXStocksStore';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'empty' } | { status: 'ready' };

export default function XStocksListScreen() {
  const router = useRouter();
  const { walletAddress } = useAuth();
  const setStock = useXStocksStore((state) => state.setStock);
  const [stocks, setStocks] = useState<XStock[]>([]);
  const [ledger, setLedger] = useState<DemoLedger>({ cashUsdc: 0, holdings: [], trades: [] });
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<XStockSort>('movers');
  const [showAll, setShowAll] = useState(false);

  const loadStocks = useCallback(async () => {
    setLoad({ status: 'loading' });
    try {
      const items = await getXStocks(true);
      setStocks(items);
      setLoad(items.length ? { status: 'ready' } : { status: 'empty' });
    } catch (error) {
      setLoad({ status: 'error', message: error instanceof Error ? error.message : 'Unable to load xStocks.' });
    }
  }, []);

  useEffect(() => {
    // The initial loading state is set by the async loader so retries use the same state transition.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStocks();
  }, [loadStocks]);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (walletAddress) void getDemoLedger(walletAddress).then((value) => { if (active) setLedger(value); });
    return () => { active = false; };
  }, [walletAddress]));

  const visible = useMemo(() => {
    const filtered = stocks.filter((stock) => !query || `${stock.symbol} ${stock.name ?? ''}`.toLowerCase().includes(query.toLowerCase()));
    return sortXStocks(filtered, sort);
  }, [stocks, query, sort]);

  function openStock(stock: XStock) {
    setStock(stock);
    router.push(`/xstocks/${encodeURIComponent(stock.id)}` as Href);
  }

  return (
    <Screen>
      <Header title="xStocks" onBack={() => router.back()} right={<MarketBadge />} />
      <Text style={styles.subtitle}>Own a slice of real companies, from $1.</Text>
      <InvestmentsCard ledger={ledger} stocks={stocks} showAll={showAll} onSeeAll={() => setShowAll((value) => !value)} />
      <TextInput accessibilityLabel="Search stocks and ETFs" value={query} onChangeText={setQuery} placeholder="Search stocks & ETFs" placeholderTextColor="rgba(255,255,255,0.35)" style={styles.search} />
      <View style={styles.sorts}>{(['movers', 'traded', 'az'] as XStockSort[]).map((value) => (
        <Pressable key={value} onPress={() => setSort(value)} style={[styles.chip, sort === value && styles.selected]}>
          <Text style={[styles.chipText, sort === value && styles.selectedText]}>{value === 'movers' ? 'Top movers' : value === 'traded' ? 'Most traded' : 'A–Z'}</Text>
        </Pressable>
      ))}</View>

      <View style={styles.listHeader}><Text style={styles.sectionTitle}>Stocks & ETFs</Text>{load.status === 'ready' ? <Text style={styles.count}>{visible.length} assets</Text> : null}</View>
      {load.status === 'loading' ? <View style={styles.state}><ActivityIndicator color="#B87AED" /><Text style={styles.stateText}>Loading xStocks…</Text></View> : null}
      {load.status === 'error' ? <View style={styles.state}><Text style={styles.errorTitle}>xStocks unavailable</Text><Text style={styles.stateText}>{load.message}</Text><Pressable onPress={() => void loadStocks()} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}
      {load.status === 'empty' ? <View style={styles.state}><Text style={styles.errorTitle}>No xStocks found</Text><Text style={styles.stateText}>Jupiter returned no matching stocks. Try again later.</Text><Pressable onPress={() => void loadStocks()} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}
      {load.status === 'ready' && visible.length === 0 ? <Text style={styles.noSearch}>No assets match “{query}”.</Text> : null}
      {load.status === 'ready' ? visible.map((stock) => <StockRow key={stock.id} stock={stock} onPress={() => openStock(stock)} />) : null}
    </Screen>
  );
}

function MarketBadge() {
  const open = isUsMarketOpen();
  return <View style={[styles.marketBadge, open ? styles.marketOpen : styles.marketClosed]}><View style={[styles.dot, { backgroundColor: open ? '#22C55E' : '#FBBF24' }]} /><Text style={[styles.marketText, { color: open ? '#4ADE80' : '#FBBF24' }]}>{open ? 'US market open' : 'US market closed'}</Text></View>;
}

const styles = StyleSheet.create({
  subtitle: { color: 'rgba(255,255,255,0.52)', fontFamily: onbFonts.body, fontSize: 12, marginTop: -14 },
  search: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, marginTop: 17, color: onbColors.text, fontFamily: onbFonts.body },
  sorts: { flexDirection: 'row', gap: 8, marginTop: 12 }, chip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20 }, selected: { backgroundColor: 'rgba(155,79,222,0.2)', borderColor: '#9B4FDE' }, chipText: { color: 'rgba(255,255,255,0.65)', fontSize: 11 }, selectedText: { color: '#D5A7F4' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 3 }, sectionTitle: { color: onbColors.text, fontFamily: onbFonts.heading, fontSize: 15 }, count: { color: onbColors.textMuted, fontSize: 10 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34, paddingHorizontal: 12 }, stateText: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 }, errorTitle: { color: onbColors.text, fontFamily: onbFonts.heading, fontSize: 16 }, retry: { paddingHorizontal: 20, paddingVertical: 10, marginTop: 13, borderRadius: 12, backgroundColor: onbColors.purple }, retryText: { color: 'white', fontFamily: onbFonts.bodyBold, fontSize: 12 }, noSearch: { color: onbColors.textMuted, paddingVertical: 20, textAlign: 'center', fontSize: 12 },
  marketBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 18, borderWidth: 1 }, marketOpen: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.25)' }, marketClosed: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.24)' }, dot: { width: 6, height: 6, borderRadius: 5 }, marketText: { fontSize: 9, fontFamily: onbFonts.bodyMedium },
});
