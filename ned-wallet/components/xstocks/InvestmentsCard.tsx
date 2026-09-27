import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DemoLedger } from '@/services/demoLedger';
import type { XStock } from '@/services/xstocks';
import { onbColors, onbFonts } from '@/components/onboarding/theme';
import { AllocationBar } from './AllocationBar';

export function InvestmentsCard({ ledger, stocks, onSeeAll, showAll = false }: { ledger: DemoLedger; stocks: XStock[]; onSeeAll: () => void; showAll?: boolean }) {
  const value = ledger.holdings.reduce((sum, holding) => sum + holding.quantity * (stocks.find((stock) => stock.id === holding.mint)?.usdPrice ?? 0), 0);
  const holdings = ledger.holdings.map((holding) => ({
    ...holding,
    value: holding.quantity * (stocks.find((stock) => stock.id === holding.mint)?.usdPrice ?? 0),
  })).sort((a, b) => b.value - a.value);
  const today = holdings.reduce((sum, holding) => {
    const change = stocks.find((stock) => stock.id === holding.mint)?.priceChange24h ?? 0;
    return sum + holding.value * (change / (100 + change || 100));
  }, 0);
  const currentCostBasis = ledger.holdings.reduce((sum, holding) => sum + holding.costBasisUsd, 0);
  const realized = ledger.trades.reduce((sum, trade) => sum + (Number(trade.pnl ?? 0) || 0), 0);
  const allTime = value - currentCostBasis + realized;
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Your investments</Text>
      <Text style={styles.total}>${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
      <Text style={styles.demo}>Demo balance</Text>
      <View style={styles.stats}>
        <View><Text style={styles.statLabel}>Today</Text><Text style={[styles.statValue, today >= 0 ? styles.positive : styles.negative]}>{today >= 0 ? '+' : ''}${today.toFixed(2)}</Text></View>
        <View><Text style={styles.statLabel}>All-time</Text><Text style={[styles.statValue, allTime >= 0 ? styles.positive : styles.negative]}>{allTime >= 0 ? '+' : ''}${allTime.toFixed(2)}</Text></View>
      </View>
      <AllocationBar holdings={ledger.holdings} stocks={stocks} />
      {holdings.length === 0 ? (
        <View style={styles.empty}><Text style={styles.teddy}>◉ᴥ◉</Text><View style={styles.emptyCopy}><Text style={styles.emptyTitle}>No investments yet</Text><Text style={styles.emptyText}>Start with as little as $1. Pick a company below.</Text></View></View>
      ) : (showAll ? holdings : holdings.slice(0, 3)).map((holding) => (
        <View key={holding.mint} style={styles.holding}>
          <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
          <Text style={styles.holdingQty}>{holding.quantity.toFixed(5)}</Text>
          <Text style={styles.holdingValue}>${holding.value.toFixed(2)}</Text>
        </View>
      ))}
      {holdings.length > 3 ? <Pressable onPress={onSeeAll} style={styles.more}><Text style={styles.moreText}>{showAll ? 'Show less' : 'See all investments ›'}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 17, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
  kicker: { color: 'rgba(255,255,255,0.56)', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 10 },
  total: { color: onbColors.text, fontFamily: onbFonts.heading, fontSize: 30, marginTop: 6 },
  demo: { color: '#B87AED', fontSize: 10, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 22, marginTop: 11 },
  statLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10 },
  statValue: { fontFamily: onbFonts.mono, fontSize: 12, marginTop: 4 },
  positive: { color: '#4ADE80' }, negative: { color: '#FB7185' },
  holding: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, marginTop: 10, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  holdingSymbol: { flex: 1, color: onbColors.text, fontFamily: onbFonts.bodyBold },
  holdingQty: { color: 'rgba(255,255,255,0.55)', fontFamily: onbFonts.mono, fontSize: 10, marginRight: 12 },
  holdingValue: { color: onbColors.text, fontFamily: onbFonts.mono, fontSize: 12 },
  empty: { flexDirection: 'row', gap: 13, alignItems: 'center', paddingVertical: 14, marginTop: 12, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  teddy: { color: '#D5A7F4', fontSize: 28 }, emptyCopy: { flex: 1 },
  emptyTitle: { color: onbColors.text, fontFamily: onbFonts.heading, fontSize: 14 },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 16, marginTop: 3 },
  more: { alignItems: 'center', marginTop: 12 }, moreText: { color: '#B87AED', fontFamily: onbFonts.heading, fontSize: 12 },
});
