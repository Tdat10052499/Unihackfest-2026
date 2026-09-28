import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '@/services/auth';
import { getDemoLedger } from '@/services/demoLedger';
import { useXStocksStore } from '@/stores/useXStocksStore';
import { Mascot } from '@/components/Mascot';
import {
  ActionButton,
  Card,
  InfoRow,
  Muted,
  Screen,
} from '@/components/xstocks/Screen';
import { onbColors, onbFonts } from '@/components/onboarding/theme';

export default function XStockResultScreen() {
  const router = useRouter();
  const { walletAddress } = useAuth();
  const result = useXStocksStore((state) => state.result);
  const error = useXStocksStore((state) => state.error);
  const stock = useXStocksStore((state) => state.stock);
  const side = useXStocksStore((state) => state.side);
  const [trade, setTrade] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let active = true;
    if (walletAddress && result === 'success')
      void getDemoLedger(walletAddress).then((ledger) => {
        if (active) setTrade(ledger.trades.at(-1) ?? null);
      });
    return () => {
      active = false;
    };
  }, [result, walletAddress]);

  const success = result === 'success';
  return (
    <Screen>
      <View style={styles.container}>
        <Mascot
          mood={success ? 'happy' : 'confused'}
          size={156}
          floatAnimation
        />
        <Text style={styles.title}>
          {success
            ? side === 'buy'
              ? 'Investment added'
              : 'Sale complete'
            : 'Trade failed'}
        </Text>
        <Text style={styles.demo}>
          Demo mode · real price, no real funds moved
        </Text>
        {success && trade ? (
          <Card>
            <Text style={styles.receipt}>DEMO RECEIPT</Text>
            <InfoRow
              label="Asset"
              value={String(trade.symbol ?? stock?.symbol ?? 'xStock')}
            />
            <InfoRow label="Side" value={side.toUpperCase()} />
            <InfoRow
              label={side === 'buy' ? 'Paid' : 'Shares sold'}
              value={
                side === 'buy'
                  ? `$${Number(trade.usd ?? 0).toFixed(2)} USDC`
                  : `${Number(trade.quantity ?? 0).toFixed(6)} ${stock?.symbol ?? ''}`
              }
            />
            <InfoRow
              label={side === 'buy' ? 'Shares received' : 'Received'}
              value={
                side === 'buy'
                  ? `${Number(trade.quantity ?? 0).toFixed(6)} ${stock?.symbol ?? ''}`
                  : `$${Number(trade.proceeds ?? 0).toFixed(2)} USDC`
              }
            />
            <InfoRow
              label="N.E.D fee"
              value={`$${Number(trade.fee ?? 0).toFixed(4)}`}
            />
            <InfoRow label="Network fee" value="Demo — not broadcast" />
            <InfoRow
              label="Time"
              value={
                trade.time
                  ? new Date(String(trade.time)).toLocaleString()
                  : 'Just now'
              }
            />
          </Card>
        ) : (
          <Muted>
            {success
              ? 'Loading your demo receipt…'
              : error ||
                'The quote expired or the simulated trade could not be completed.'}
          </Muted>
        )}
        {success && stock ? (
          <ActionButton
            title={`View ${stock.symbol} position`}
            onPress={() => router.replace(`/xstocks/${stock.id}` as Href)}
          />
        ) : null}
        <ActionButton
          secondary
          title="Done"
          onPress={() => router.replace('/xstocks')}
        />
        <Text style={styles.notice}>
          This demo does not move funds or create on-chain transactions.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    color: onbColors.text,
    fontFamily: onbFonts.heading,
    fontSize: 23,
    marginTop: 8,
    textAlign: 'center',
  },
  demo: {
    color: '#FBBF24',
    fontFamily: onbFonts.bodyMedium,
    fontSize: 11,
    marginTop: 7,
    textAlign: 'center',
  },
  receipt: {
    color: 'rgba(255,255,255,0.48)',
    fontFamily: onbFonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  notice: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    marginTop: 14,
    textAlign: 'center',
  },
});
