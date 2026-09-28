import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/services/auth';
import { getDemoLedger } from '@/services/demoLedger';
import {
  getGeckoOhlcv,
  getXStocks,
  isUsMarketOpen,
  type Ohlcv,
  type XStock,
  type XStockRange,
} from '@/services/xstocks';
import { useXStocksStore } from '@/stores/useXStocksStore';
import {
  ActionButton,
  Header,
  Muted,
  Screen,
} from '@/components/xstocks/Screen';
import { Badge, Button, Card, DText, Notice } from '@/components/design';
import { colors, fonts, glass, radius, space } from '@/constants/design';
import { PriceChart } from '@/components/xstocks/PriceChart';

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
  const [stock, setLocalStock] = useState<XStock | null>(
    selected?.id === mint ? selected : null,
  );
  const [rows, setRows] = useState<Ohlcv[]>([]);
  const [chartError, setChartError] = useState('');
  const [ledger, setLedger] = useState({
    cashUsdc: 0,
    holdings: [],
    trades: [],
  } as Awaited<ReturnType<typeof getDemoLedger>>);
  const [loadingStock, setLoadingStock] = useState(!stock);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    let active = true;
    if (!stock)
      void getXStocks()
        .then((items) => {
          const item = items.find((candidate) => candidate.id === mint) ?? null;
          if (active) {
            setLocalStock(item);
            if (item) setStock(item);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setLoadingStock(false);
        });
    return () => {
      active = false;
    };
  }, [mint, setStock, stock]);

  useEffect(() => {
    let active = true;
    if (walletAddress)
      void getDemoLedger(walletAddress).then((value) => {
        if (active) setLedger(value);
      });
    return () => {
      active = false;
    };
  }, [walletAddress]);

  useEffect(() => {
    if (!stock) return;
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (active) {
          setLoadingChart(true);
          setChartError('');
        }
        return getGeckoOhlcv(stock.id, range);
      })
      .then((value) => {
        if (active) setRows(value);
      })
      .catch((error) => {
        if (active) {
          setRows([]);
          setChartError(
            error instanceof Error ? error.message : 'Chart data unavailable.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadingChart(false);
      });
    return () => {
      active = false;
    };
  }, [stock, range]);

  const holding = useMemo(
    () => ledger.holdings.find((item) => item.mint === mint),
    [ledger.holdings, mint],
  );
  const positionValue = (holding?.quantity ?? 0) * (stock?.usdPrice ?? 0);
  const pnl = positionValue - (holding?.costBasisUsd ?? 0);
  const chartChange =
    rows.length > 1 && rows[0][4] !== 0
      ? ((rows[rows.length - 1][4] - rows[0][4]) / rows[0][4]) * 100
      : (stock?.priceChange24h ?? 0);

  if (loadingStock)
    return (
      <Screen>
        <Header title="xStocks" onBack={() => router.back()} />
        <ActivityIndicator color={colors.purple[300]} />
      </Screen>
    );
  if (!stock)
    return (
      <Screen>
        <Header title="xStocks" onBack={() => router.back()} />
        <Muted>
          This xStock could not be found. Return to the market list and try
          again.
        </Muted>
        <ActionButton
          title="Back to xStocks"
          onPress={() => router.replace('/xstocks')}
        />
      </Screen>
    );

  function chooseSide(side: 'buy' | 'sell') {
    const setSide = useXStocksStore.getState().setSide;
    setSide(side);
    router.push('/xstocks/trade' as Href);
  }

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button
            title="Sell"
            variant="secondary"
            onPress={() => chooseSide('sell')}
            style={styles.flex}
          />
          <Button
            title="Buy"
            onPress={() => chooseSide('buy')}
            style={styles.flex}
          />
        </View>
      }
    >
      <Header
        title={stock.symbol}
        onBack={() => router.back()}
        right={
          <Badge
            tone={isUsMarketOpen() ? 'success' : 'warning'}
            label={isUsMarketOpen() ? 'MARKET OPEN' : 'MARKET CLOSED'}
          />
        }
      />
      <DText variant="body">{stock.name || stock.symbol}</DText>
      <DText variant="hero" adjustsFontSizeToFit numberOfLines={1} style={styles.price}>
        $
        {(stock.usdPrice ?? 0).toLocaleString('en-US', {
          maximumFractionDigits: 6,
        })}
      </DText>
      <DText variant="mono" tone={chartChange >= 0 ? 'success' : 'error'}>
        {chartChange >= 0 ? '+' : ''}
        {chartChange.toFixed(2)}% {range} change
      </DText>
      {!isUsMarketOpen() ? (
        <Notice tone="warning" style={styles.closed}>
          US market closed · prices may differ from Friday’s close.
        </Notice>
      ) : null}
      <View style={styles.chart}>
        {loadingChart ? (
          <ActivityIndicator color={colors.purple[300]} />
        ) : (
          <PriceChart values={rows.map((row) => row[4])} />
        )}
      </View>
      <View style={styles.rangeBar}>
        {RANGES.map((value) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: range === value }}
            key={value}
            onPress={() => setRange(value)}
            style={[styles.range, range === value && styles.rangeSelected]}
          >
            <DText
              variant="caption"
              tone={range === value ? 'primary' : 'secondary'}
              style={range === value ? styles.rangeTextSelected : undefined}
            >
              {value}
            </DText>
          </Pressable>
        ))}
      </View>
      {chartError ? (
        <DText variant="caption" tone="warning">
          {chartError}
        </DText>
      ) : (
        <DText variant="caption" align="right">
          Chart by GeckoTerminal
        </DText>
      )}
      <Card variant="accent" padding={space[4]} style={styles.position}>
        <DText variant="h3">Your position · Demo balance</DText>
        <View style={styles.metrics}>
          <Metric label="Value" value={`$${positionValue.toFixed(2)}`} />
          <Metric label="Shares" value={(holding?.quantity ?? 0).toFixed(5)} />
          <Metric
            label="Avg. buy price"
            value={
              holding?.quantity
                ? `$${(holding.costBasisUsd / holding.quantity).toFixed(2)}`
                : '—'
            }
          />
          <Metric
            label="Gain / loss"
            value={`${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`}
            positive={pnl >= 0}
          />
        </View>
      </Card>
      <DText variant="h3">Market stats</DText>
      <View style={styles.metrics}>
        <Metric
          label="24h volume"
          value={`$${stock.volume24h.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        />
        <Metric
          label="Liquidity"
          value={`$${stock.liquidity.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        />
        <Metric
          label="Market cap"
          value={
            stock.mcap
              ? `$${stock.mcap.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              : '—'
          }
        />
        <Metric
          label="Holders"
          value={stock.holderCount?.toLocaleString('en-US') ?? '—'}
        />
      </View>
      <Card>
        <DText variant="h3">What is an xStock?</DText>
        <Muted>
          An xStock is a token designed to track a public share price. It is not
          the underlying security and does not provide shareholder rights.
        </Muted>
      </Card>
    </Screen>
  );
}

function Metric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <DText variant="caption">{label}</DText>
      <DText
        variant="mono"
        tone={positive === undefined ? 'primary' : positive ? 'success' : 'error'}
        style={styles.metricValue}
      >
        {value}
      </DText>
    </View>
  );
}
const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    marginTop: space[3],
    marginBottom: space[4],
  },
  metric: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
  },
  metricValue: { fontFamily: fonts.monoBold, marginTop: space[1] },
  price: { marginTop: space[1] },
  closed: { marginTop: space[4] },
  rangeBar: {
    flexDirection: 'row',
    padding: space[1],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.border,
    backgroundColor: glass.fill,
    marginBottom: space[2],
  },
  range: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  rangeSelected: { backgroundColor: glass.iconTint },
  rangeTextSelected: { fontFamily: fonts.bodySemi },
  chart: { height: 242, justifyContent: 'center' },
  position: { marginVertical: space[4] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  flex: { flex: 1 },
});
