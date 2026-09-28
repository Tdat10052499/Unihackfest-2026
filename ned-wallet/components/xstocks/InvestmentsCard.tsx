import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { DemoLedger } from '@/services/demoLedger';
import type { XStock } from '@/services/xstocks';
import { Card, DText } from '@/components/design';
import { fonts, glass, space } from '@/constants/design';
import { Mascot } from '@/components/Mascot';
import { AllocationBar } from './AllocationBar';

export function InvestmentsCard({
  ledger,
  stocks,
  onSeeAll,
  showAll = false,
}: {
  ledger: DemoLedger;
  stocks: XStock[];
  onSeeAll: () => void;
  showAll?: boolean;
}) {
  const value = ledger.holdings.reduce(
    (sum, holding) =>
      sum +
      holding.quantity *
        (stocks.find((stock) => stock.id === holding.mint)?.usdPrice ?? 0),
    0,
  );
  const holdings = ledger.holdings
    .map((holding) => ({
      ...holding,
      value:
        holding.quantity *
        (stocks.find((stock) => stock.id === holding.mint)?.usdPrice ?? 0),
    }))
    .sort((a, b) => b.value - a.value);
  const today = holdings.reduce((sum, holding) => {
    const change =
      stocks.find((stock) => stock.id === holding.mint)?.priceChange24h ?? 0;
    return sum + holding.value * (change / (100 + change || 100));
  }, 0);
  const currentCostBasis = ledger.holdings.reduce(
    (sum, holding) => sum + holding.costBasisUsd,
    0,
  );
  const realized = ledger.trades.reduce(
    (sum, trade) => sum + (Number(trade.pnl ?? 0) || 0),
    0,
  );
  const allTime = value - currentCostBasis + realized;
  return (
    <Card style={styles.card}>
      <DText variant="label">Your investments</DText>
      <DText variant="h1" style={styles.total}>
        $
        {value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </DText>
      <DText variant="caption" tone="accent">
        Demo balance
      </DText>
      <View style={styles.stats}>
        <View>
          <DText variant="caption">Today</DText>
          <DText
            variant="mono"
            tone={today >= 0 ? 'success' : 'error'}
            style={styles.statValue}
          >
            {today >= 0 ? '+' : ''}${today.toFixed(2)}
          </DText>
        </View>
        <View>
          <DText variant="caption">All-time</DText>
          <DText
            variant="mono"
            tone={allTime >= 0 ? 'success' : 'error'}
            style={styles.statValue}
          >
            {allTime >= 0 ? '+' : ''}${allTime.toFixed(2)}
          </DText>
        </View>
      </View>
      <AllocationBar holdings={ledger.holdings} stocks={stocks} />
      {holdings.length === 0 ? (
        <View style={styles.empty}>
          <Mascot mood="curious" size={70} />
          <View style={styles.emptyCopy}>
            <DText variant="h3">
              No investments yet
            </DText>
            <DText variant="caption" tone="secondary">
              Start with as little as $1. Pick a company below.
            </DText>
          </View>
        </View>
      ) : (
        (showAll ? holdings : holdings.slice(0, 3)).map((holding) => (
          <View key={holding.mint} style={styles.holding}>
            <DText variant="body" tone="primary" style={styles.holdingSymbol}>
              {holding.symbol}
            </DText>
            <DText variant="caption" style={styles.holdingQty}>
              {holding.quantity.toFixed(5)}
            </DText>
            <DText variant="mono">${holding.value.toFixed(2)}</DText>
          </View>
        ))
      )}
      {holdings.length > 3 ? (
        <Pressable onPress={onSeeAll} style={styles.more}>
          <DText variant="body" tone="accent" style={styles.moreText}>
            {showAll ? 'Show less' : 'See all investments ›'}
          </DText>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space[4] },
  total: { marginTop: space[1] },
  stats: { flexDirection: 'row', gap: space[6], marginTop: space[3] },
  statValue: { marginTop: space[1] },
  holding: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: space[3],
    marginTop: space[2],
    borderTopWidth: 1,
    borderColor: glass.divider,
  },
  holdingSymbol: { flex: 1, fontFamily: fonts.bodySemi },
  holdingQty: { fontFamily: fonts.mono, marginRight: space[3] },
  empty: {
    flexDirection: 'row',
    gap: space[3],
    alignItems: 'center',
    paddingVertical: space[3],
    marginTop: space[3],
    borderTopWidth: 1,
    borderColor: glass.divider,
  },
  emptyCopy: { flex: 1 },
  more: { alignItems: 'center', justifyContent: 'center', marginTop: space[3], minHeight: 44 },
  moreText: { fontFamily: fonts.displaySemi },
});
