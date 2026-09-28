import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DText } from '@/components/design';
import { dataColors, radius, space } from '@/constants/design';
import type { DemoHolding } from '@/services/demoLedger';
import type { XStock } from '@/services/xstocks';

// Màu cố định theo mã (dataviz đã kiểm tra trên nền tối)
const COLORS: Record<string, string> = {
  AAPLx: dataColors.series[0],
  NVDAx: dataColors.series[1],
  SPYx: dataColors.series[2],
  TSLAx: dataColors.series[3],
  Other: dataColors.other,
};

export function AllocationBar({
  holdings,
  stocks,
}: {
  holdings: DemoHolding[];
  stocks: XStock[];
}) {
  const total = holdings.reduce(
    (sum, holding) =>
      sum +
      holding.quantity *
        (stocks.find((stock) => stock.id === holding.mint)?.usdPrice ?? 0),
    0,
  );
  const segments = holdings
    .map((holding) => ({
      symbol: holding.symbol,
      value:
        holding.quantity *
        (stocks.find((stock) => stock.id === holding.mint)?.usdPrice ?? 0),
      color: COLORS[holding.symbol] ?? COLORS.Other,
    }))
    .filter((segment) => segment.value > 0);
  if (!total) return null;
  return (
    <View>
      <View style={styles.bar}>
        {segments.map((segment) => (
          <View
            key={segment.symbol}
            style={{
              width: `${(segment.value / total) * 100}%`,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.symbol} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: segment.color }]} />
            <DText variant="caption" tone="secondary">
              {segment.symbol} {Math.round((segment.value / total) * 100)}%
            </DText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 8,
    borderRadius: radius.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    gap: 2,
    marginVertical: space[3],
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
});
