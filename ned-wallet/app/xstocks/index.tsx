import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/services/auth';
import {
  getXStocks,
  isUsMarketOpen,
  sortXStocks,
  type XStock,
  type XStockSort,
} from '@/services/xstocks';
import { getDemoLedger, type DemoLedger } from '@/services/demoLedger';
import { Badge, Button, DText } from '@/components/design';
import { colors, fonts, glass, radius, space, type } from '@/constants/design';
import { WalletNav } from '@/components/wallet/WalletNav';
import { Screen } from '@/components/xstocks/Screen';
import { InvestmentsCard } from '@/components/xstocks/InvestmentsCard';
import { StockRow } from '@/components/xstocks/StockRow';
import { useXStocksStore } from '@/stores/useXStocksStore';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready' };

export default function XStocksListScreen() {
  const router = useRouter();
  const { walletAddress } = useAuth();
  const setStock = useXStocksStore((state) => state.setStock);
  const [stocks, setStocks] = useState<XStock[]>([]);
  const [ledger, setLedger] = useState<DemoLedger>({
    cashUsdc: 0,
    holdings: [],
    trades: [],
  });
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
      setLoad({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Unable to load xStocks.',
      });
    }
  }, []);

  useEffect(() => {
    // The initial loading state is set by the async loader so retries use the same state transition.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStocks();
  }, [loadStocks]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (walletAddress)
        void getDemoLedger(walletAddress).then((value) => {
          if (active) setLedger(value);
        });
      return () => {
        active = false;
      };
    }, [walletAddress]),
  );

  const visible = useMemo(() => {
    const filtered = stocks.filter(
      (stock) =>
        !query ||
        `${stock.symbol} ${stock.name ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    return sortXStocks(filtered, sort);
  }, [stocks, query, sort]);

  function openStock(stock: XStock) {
    setStock(stock);
    router.push(`/xstocks/${encodeURIComponent(stock.id)}` as Href);
  }

  return (
    <View style={styles.fill}>
      <Screen style={styles.page} glow="market">
        <View style={styles.listTop}>
          <DText variant="h1" accessibilityRole="header">
            xStocks
          </DText>
          <MarketBadge />
        </View>
        <DText variant="body">Own a slice of real companies, from $1.</DText>
        <InvestmentsCard
          ledger={ledger}
          stocks={stocks}
          showAll={showAll}
          onSeeAll={() => setShowAll((value) => !value)}
        />
        <TextInput
          accessibilityLabel="Search stocks and ETFs"
          value={query}
          onChangeText={setQuery}
          placeholder="Search stocks & ETFs"
          placeholderTextColor={colors.textTertiary}
          style={styles.search}
        />
        <View style={styles.sorts}>
          {(['movers', 'traded', 'az'] as XStockSort[]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: sort === value }}
              onPress={() => setSort(value)}
              style={[styles.chip, sort === value && styles.selected]}
            >
              <DText
                variant="caption"
                tone={sort === value ? 'primary' : 'secondary'}
                style={styles.chipText}
              >
                {value === 'movers'
                  ? 'Top movers'
                  : value === 'traded'
                    ? 'Most traded'
                    : 'A–Z'}
              </DText>
            </Pressable>
          ))}
        </View>

        <View style={styles.listHeader}>
          <DText variant="h3">Stocks & ETFs</DText>
          {load.status === 'ready' ? (
            <DText variant="caption">{visible.length} assets</DText>
          ) : null}
        </View>
        {load.status === 'loading' ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.purple[300]} />
            <DText variant="body" align="center" style={styles.stateText}>
              Loading xStocks…
            </DText>
          </View>
        ) : null}
        {load.status === 'error' ? (
          <View style={styles.state}>
            <DText variant="h3">xStocks unavailable</DText>
            <DText variant="body" align="center" style={styles.stateText}>
              {load.message}
            </DText>
            <Button
              title="Retry"
              compact
              onPress={() => void loadStocks()}
              style={styles.retry}
            />
          </View>
        ) : null}
        {load.status === 'empty' ? (
          <View style={styles.state}>
            <DText variant="h3">No xStocks found</DText>
            <DText variant="body" align="center" style={styles.stateText}>
              Jupiter returned no matching stocks. Try again later.
            </DText>
            <Button
              title="Retry"
              compact
              onPress={() => void loadStocks()}
              style={styles.retry}
            />
          </View>
        ) : null}
        {load.status === 'ready' && visible.length === 0 ? (
          <DText variant="body" align="center" style={styles.noSearch}>
            No assets match “{query}”.
          </DText>
        ) : null}
        {load.status === 'ready'
          ? visible.map((stock) => (
              <StockRow
                key={stock.id}
                stock={stock}
                onPress={() => openStock(stock)}
              />
            ))
          : null}
      </Screen>
      <WalletNav active="Home" />
    </View>
  );
}

function MarketBadge() {
  const open = isUsMarketOpen();
  return (
    <Badge
      tone={open ? 'success' : 'warning'}
      icon="clock"
      label={open ? 'US market open' : 'US market closed'}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { paddingBottom: 110 },
  listTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    marginBottom: space[2],
  },
  search: {
    ...type.body,
    color: colors.text,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: glass.border,
    backgroundColor: glass.fill,
    paddingHorizontal: space[4],
    marginTop: space[4],
  },
  sorts: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space[3],
    borderWidth: 1,
    borderColor: glass.borderStrong,
    borderRadius: radius.pill,
  },
  selected: { backgroundColor: glass.iconTint, borderColor: colors.purple[400] },
  chipText: { fontFamily: fonts.bodyMedium },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space[6],
    marginBottom: space[1],
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space[8],
    paddingHorizontal: space[3],
  },
  stateText: { marginTop: space[2] },
  retry: { alignSelf: 'center', marginTop: space[3] },
  noSearch: { paddingVertical: space[5] },
});
