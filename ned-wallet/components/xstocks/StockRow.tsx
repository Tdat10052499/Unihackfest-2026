import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { XStock } from '@/services/xstocks';
import { DText } from '@/components/design';
import { colors, fonts, glass, radius, space } from '@/constants/design';

export function StockRow({
  stock,
  onPress,
}: {
  stock: XStock;
  onPress: () => void;
}) {
  const positive = stock.priceChange24h >= 0;
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.logo}>
        <DText variant="h3" style={styles.logoText}>
          {stock.symbol.slice(0, 1)}
        </DText>
      </View>
      <View style={styles.name}>
        <View style={styles.titleLine}>
          <DText variant="body" tone="primary" style={styles.symbol}>
            {stock.symbol}
          </DText>
          {stock.isVerified ? (
            <Feather name="check-circle" size={12} color={colors.successText} />
          ) : null}
        </View>
        <DText variant="caption" tone="secondary" numberOfLines={1}>
          {stock.name || 'xStock'}
        </DText>
      </View>
      <View style={styles.right}>
        <DText variant="mono">
          $
          {(stock.usdPrice ?? 0).toLocaleString('en-US', {
            maximumFractionDigits: 4,
          })}
        </DText>
        <DText
          variant="caption"
          tone={positive ? 'success' : 'error'}
          style={styles.change}
        >
          {positive ? '+' : ''}
          {stock.priceChange24h.toFixed(2)}%
        </DText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: glass.divider,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: glass.iconTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.purple[200] },
  name: { flex: 1, minWidth: 0 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  symbol: { fontFamily: fonts.bodySemi },
  right: { alignItems: 'flex-end' },
  change: { fontFamily: fonts.bodyMedium, marginTop: 2 },
});
