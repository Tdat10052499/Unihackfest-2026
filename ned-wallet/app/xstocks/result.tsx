import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { Badge, DText, SuccessMark } from '@/components/design';
import { space } from '@/constants/design';

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
    <Screen glow={success ? 'success' : false}>
      <View style={styles.container}>
        {success ? <SuccessMark /> : <Mascot mood="confused" size={156} floatAnimation />}
        <DText variant="h2" align="center" style={styles.title}>
          {success
            ? side === 'buy'
              ? 'Investment added'
              : 'Sale complete'
            : 'Trade failed'}
        </DText>
        <Badge
          tone="warning"
          label="Demo mode · real price, no real funds moved"
          style={styles.demo}
        />
        {success && trade ? (
          <Card>
            <DText variant="label" style={styles.receipt}>
              DEMO RECEIPT
            </DText>
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
        <DText variant="caption" align="center" style={styles.notice}>
          This demo does not move funds or create on-chain transactions.
        </DText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: space[2] },
  demo: { alignSelf: 'center', marginTop: space[2] },
  receipt: { marginBottom: space[1] },
  notice: { marginTop: space[4] },
});
