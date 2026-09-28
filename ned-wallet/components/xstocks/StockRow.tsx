import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { XStock } from '@/services/xstocks';
import { onbColors, onbFonts } from '@/components/onboarding/theme';

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
        <Text style={styles.logoText}>{stock.symbol.slice(0, 1)}</Text>
      </View>
      <View style={styles.name}>
        <View style={styles.titleLine}>
          <Text style={styles.symbol}>{stock.symbol}</Text>
          {stock.isVerified ? <Text style={styles.verified}>✓</Text> : null}
        </View>
        <Text numberOfLines={1} style={styles.company}>
          {stock.name || 'xStock'}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>
          $
          {(stock.usdPrice ?? 0).toLocaleString('en-US', {
            maximumFractionDigits: 4,
          })}
        </Text>
        <Text style={[styles.change, positive ? styles.up : styles.down]}>
          {positive ? '+' : ''}
          {stock.priceChange24h.toFixed(2)}%
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(155,79,222,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: { color: '#D5A7F4', fontFamily: onbFonts.heading, fontSize: 17 },
  name: { flex: 1, minWidth: 0 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  symbol: {
    color: onbColors.text,
    fontFamily: onbFonts.bodyBold,
    fontSize: 14,
  },
  verified: { color: onbColors.successText, fontSize: 12 },
  company: {
    color: onbColors.textMuted,
    fontFamily: onbFonts.body,
    fontSize: 11,
    marginTop: 3,
  },
  right: { alignItems: 'flex-end' },
  price: { color: onbColors.text, fontFamily: onbFonts.mono, fontSize: 13 },
  change: { fontFamily: onbFonts.bodyMedium, fontSize: 11, marginTop: 4 },
  up: { color: onbColors.successText },
  down: { color: onbColors.warning },
});
