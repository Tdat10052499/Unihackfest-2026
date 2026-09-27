import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DemoHolding } from '@/services/demoLedger';
import type { XStock } from '@/services/xstocks';

const COLORS: Record<string, string> = { AAPLx: '#9B4FDE', NVDAx: '#C98500', SPYx: '#3987E5', TSLAx: '#199E70', Other: '#6B6780' };

export function AllocationBar({ holdings, stocks }: { holdings: DemoHolding[]; stocks: XStock[] }) {
  const total = holdings.reduce((sum, holding) => sum + holding.quantity * (stocks.find((stock) => stock.id === holding.mint)?.usdPrice ?? 0), 0);
  const segments = holdings.map((holding) => ({
    symbol: holding.symbol,
    value: holding.quantity * (stocks.find((stock) => stock.id === holding.mint)?.usdPrice ?? 0),
    color: COLORS[holding.symbol] ?? COLORS.Other,
  })).filter((segment) => segment.value > 0);
  if (!total) return null;
  return (
    <View>
      <View style={styles.bar}>{segments.map((segment) => <View key={segment.symbol} style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }} />)}</View>
      <View style={styles.legend}>{segments.map((segment) => <View key={segment.symbol} style={styles.item}><View style={[styles.dot, { backgroundColor: segment.color }]} /><Text style={styles.label}>{segment.symbol} {Math.round((segment.value / total) * 100)}%</Text></View>)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 8, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', gap: 2, marginVertical: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 5 },
  label: { color: 'rgba(255,255,255,0.65)', fontSize: 10 },
});
