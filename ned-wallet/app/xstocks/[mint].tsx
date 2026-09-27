import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/services/auth';
import { getDemoLedger } from '@/services/demoLedger';
import { getGeckoOhlcv, getXStocks, isUsMarketOpen, type Ohlcv, type XStock, type XStockRange } from '@/services/xstocks';
import { useXStocksStore } from '@/stores/useXStocksStore';
import { ActionButton, Card, Header, InfoRow, Muted, Screen } from '@/components/xstocks/Screen';
import { PriceChart } from '@/components/xstocks/PriceChart';
import { onbColors, onbFonts } from '@/components/onboarding/theme';

const RANGES: XStockRange[] = ['1D', '1W', '1M', '6M'];

export default function XStockDetailScreen() {
  const router = useRouter();
  const { mint: routeMint } = useLocalSearchParams<{ mint: string }>();
  const mint = decodeURIComponent(routeMint ?? '');
  const { walletAddress } = useAuth();
  const selected = useXStocksStore((state) => state.stock);
  const setStock = useXStocksStore((state) => state.setStock);
  const range = useXStocksStore((state) => state.range);
  const setRange = useXStocksStore((state) => state.setRange);
  const [stock, setLocalStock] = useState<XStock | null>(selected?.id === mint ? selected : null);
  const [rows, setRows] = useState<Ohlcv[]>([]);
  const [chartError, setChartError] = useState('');
  const [ledger, setLedger] = useState({ cashUsdc: 0, holdings: [], trades: [] } as Awaited<ReturnType<typeof getDemoLedger>>);
  const [loadingStock, setLoadingStock] = useState(!stock);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    let active = true;
    if (!stock) void getXStocks().then((items) => {
      const item = items.find((candidate) => candidate.id === mint) ?? null;
      if (active) { setLocalStock(item); if (item) setStock(item); }
    }).catch(() => undefined).finally(() => { if (active) setLoadingStock(false); });
    return () => { active = false; };
  }, [mint, setStock, stock]);

  useEffect(() => {
    let active = true;
    if (walletAddress) void getDemoLedger(walletAddress).then((value) => { if (active) setLedger(value); });
    return () => { active = false; };
  }, [walletAddress]);

  useEffect(() => {
    if (!stock) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        setLoadingChart(true);
        setChartError('');
      }
      return getGeckoOhlcv(stock.id, range);
    }).then((value) => { if (active) setRows(value); })
      .catch((error) => { if (active) { setRows([]); setChartError(error instanceof Error ? error.message : 'Chart data unavailable.'); } })
      .finally(() => { if (active) setLoadingChart(false); });
    return () => { active = false; };
  }, [stock, range]);

  const holding = useMemo(() => ledger.holdings.find((item) => item.mint === mint), [ledger.holdings, mint]);
  const positionValue = (holding?.quantity ?? 0) * (stock?.usdPrice ?? 0);
  const pnl = positionValue - (holding?.costBasisUsd ?? 0);
  const chartChange = rows.length > 1 && rows[0][4] !== 0
    ? ((rows[rows.length - 1][4] - rows[0][4]) / rows[0][4]) * 100
    : stock?.priceChange24h ?? 0;

  if (loadingStock) return <Screen><Header title="xStocks" onBack={() => router.back()} /><ActivityIndicator color="#B87AED" /></Screen>;
  if (!stock) return <Screen><Header title="xStocks" onBack={() => router.back()} /><Muted>This xStock could not be found. Return to the market list and try again.</Muted><ActionButton title="Back to xStocks" onPress={() => router.replace('/xstocks')} /></Screen>;

  function chooseSide(side: 'buy' | 'sell') {
    const setSide = useXStocksStore.getState().setSide;
    setSide(side);
    router.push('/xstocks/trade' as Href);
  }

  return (
    <Screen>
      <Header title={stock.symbol} onBack={() => router.back()} right={<Text style={styles.market}>{isUsMarketOpen() ? 'MARKET OPEN' : 'MARKET CLOSED'}</Text>} />
      <Text style={styles.name}>{stock.name || stock.symbol}</Text>
      <Text style={styles.price}>${(stock.usdPrice ?? 0).toLocaleString('en-US', { maximumFractionDigits: 6 })}</Text>
      <Text style={[styles.change, chartChange >= 0 ? styles.up : styles.down]}>{chartChange >= 0 ? '+' : ''}{chartChange.toFixed(2)}% {range} change</Text>
      {!isUsMarketOpen() ? <View style={styles.closed}><Text style={styles.closedText}>US market closed · prices may differ from Friday’s close.</Text></View> : null}
      <View style={styles.rangeBar}>{RANGES.map((value) => <Pressable key={value} onPress={() => setRange(value)} style={[styles.range, range === value && styles.rangeSelected]}><Text style={[styles.rangeText, range === value && styles.rangeTextSelected]}>{value}</Text></Pressable>)}</View>
      <View style={styles.chart}>{loadingChart ? <ActivityIndicator color="#B87AED" /> : <PriceChart values={rows.map((row) => row[4])} />}</View>
      {chartError ? <Text style={styles.chartError}>{chartError}</Text> : <Text style={styles.attribution}>Chart by GeckoTerminal</Text>}
      <Card>
        <Text style={styles.cardTitle}>Your position</Text>
        <InfoRow label="Shares" value={`${(holding?.quantity ?? 0).toFixed(6)} ${stock.symbol}`} />
        <InfoRow label="Market value" value={`$${positionValue.toFixed(2)}`} />
        <InfoRow label="Unrealized P/L" value={`${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`} />
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Market stats</Text>
        <InfoRow label="Liquidity" value={`$${stock.liquidity.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        <InfoRow label="Market cap" value={stock.mcap ? `$${stock.mcap.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'} />
        <InfoRow label="Holders" value={stock.holderCount?.toLocaleString() ?? '—'} />
      </Card>
      <Card><Text style={styles.cardTitle}>What is an xStock?</Text><Muted>An xStock is a token designed to track a public share price. It is not the underlying security and does not provide shareholder rights.</Muted></Card>
      <View style={styles.actions}><ActionButton title="Sell" secondary onPress={() => chooseSide('sell')} /><View style={styles.gap} /><View style={styles.flex}><ActionButton title="Buy" onPress={() => chooseSide('buy')} /></View></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  market: { color: '#FBBF24', fontFamily: onbFonts.bodyMedium, fontSize: 9 }, name: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  price: { color: onbColors.text, fontFamily: onbFonts.heading, fontSize: 34, marginTop: 5 }, change: { fontFamily: onbFonts.mono, fontSize: 12, marginTop: 3 }, up: { color: '#4ADE80' }, down: { color: '#FB7185' },
  closed: { padding: 10, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.1)', marginTop: 14 }, closedText: { color: '#FBBF24', fontSize: 11 },
  rangeBar: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 4 }, range: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10 }, rangeSelected: { backgroundColor: 'rgba(155,79,222,0.2)' }, rangeText: { color: 'rgba(255,255,255,0.55)', fontSize: 11 }, rangeTextSelected: { color: '#D5A7F4', fontFamily: onbFonts.bodyBold },
  chart: { height: 145, justifyContent: 'center' }, chartError: { color: '#FBBF24', fontSize: 10 }, attribution: { color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'right' }, cardTitle: { color: onbColors.text, fontFamily: onbFonts.heading, fontSize: 14, marginBottom: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 2 }, gap: { width: 10 }, flex: { flex: 1 },
});
