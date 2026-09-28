import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '@/services/auth';
import { NED_FEE_BPS } from '@/services/jupiter';
import { isUsMarketOpen } from '@/services/xstocks';
import {
  recordDemoBuy,
  recordDemoSell,
  getDemoLedger,
} from '@/services/demoLedger';
import { useXStocksStore } from '@/stores/useXStocksStore';
import {
  ActionButton,
  Card,
  Header,
  InfoRow,
  Muted,
  Screen,
} from '@/components/xstocks/Screen';
import { SlideConfirm } from '@/components/wallet/SlideConfirm';
import { RiskDisclosure } from '@/components/xstocks/RiskDisclosure';
import { Badge, DText, Notice } from '@/components/design';
import { space } from '@/constants/design';
import { StyleSheet, View } from 'react-native';

const riskKey = (wallet: string) => `@ned_xstocks_risk:${wallet}`;

export default function XStockReviewScreen() {
  const router = useRouter();
  const { walletAddress } = useAuth();
  const stock = useXStocksStore((state) => state.stock);
  const side = useXStocksStore((state) => state.side);
  const amount = useXStocksStore((state) => state.amount);
  const quote = useXStocksStore((state) => state.quote);
  const setResult = useXStocksStore((state) => state.setResult);
  const [accepted, setAccepted] = useState(false);
  const [riskAlreadyAccepted, setRiskAlreadyAccepted] = useState(false);
  const [position, setPosition] = useState({ quantity: 0, costBasisUsd: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (walletAddress)
      void AsyncStorage.getItem(riskKey(walletAddress)).then((value) =>
        setRiskAlreadyAccepted(value === '1'),
      );
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress || !stock || side !== 'sell') return;
    void getDemoLedger(walletAddress).then((ledger) => {
      const holding = ledger.holdings.find((item) => item.mint === stock.id);
      if (holding)
        setPosition({
          quantity: holding.quantity,
          costBasisUsd: holding.costBasisUsd,
        });
    });
  }, [side, stock, walletAddress]);

  const outAmount = useMemo(() => Number(quote?.outAmount ?? 0), [quote]);
  if (!stock || !quote)
    return (
      <Screen>
        <Header title="Review order" onBack={() => router.back()} />
        <Muted>
          Your quote is missing or expired. Get a fresh quote to continue.
        </Muted>
        <ActionButton title="Back to trade" onPress={() => router.back()} />
      </Screen>
    );

  const outDecimals = side === 'buy' ? stock.decimals : 6;
  const grossOut = outAmount / 10 ** outDecimals;
  const netOut = grossOut * (1 - NED_FEE_BPS / 10_000);
  const feeUsd =
    side === 'buy'
      ? (amountNumberSafe(amount) * NED_FEE_BPS) / 10_000
      : (grossOut * NED_FEE_BPS) / 10_000;
  const minGross = Number(quote.otherAmountThreshold ?? 0) / 10 ** outDecimals;
  const minNet = minGross * (1 - NED_FEE_BPS / 10_000);
  const soldQuantity =
    side === 'sell' ? Number(quote.inAmount) / 10 ** stock.decimals : 0;
  const soldCostBasis =
    side === 'sell' && position.quantity > 0
      ? position.costBasisUsd * (soldQuantity / position.quantity)
      : 0;
  const requiresRisk = side === 'buy' && !riskAlreadyAccepted;

  async function confirm() {
    if (!walletAddress || !quote || busy) return;
    setBusy(true);
    setError('');
    try {
      const latest = await getDemoLedger(walletAddress);
      if (side === 'buy') {
        const receivedQuantity =
          (Number(quote.outAmount) / 10 ** stock!.decimals) *
          (1 - NED_FEE_BPS / 10_000);
        await recordDemoBuy(walletAddress, {
          mint: stock!.id,
          symbol: stock!.symbol,
          usd: amountNumberSafe(amount),
          quantity: receivedQuantity,
        });
        if (requiresRisk)
          await AsyncStorage.setItem(riskKey(walletAddress), '1');
      } else {
        const quantity = Number(quote.inAmount) / 10 ** stock!.decimals;
        const proceedsUsd = Number(quote.outAmount) / 1_000_000;
        const current = latest.holdings.find(
          (holding) => holding.mint === stock!.id,
        );
        if (!current || quantity > current.quantity)
          throw new Error(
            'Your demo position changed. Review the amount again.',
          );
        await recordDemoSell(walletAddress, {
          mint: stock!.id,
          symbol: stock!.symbol,
          quantity,
          proceedsUsd,
        });
      }
      setResult('success');
      router.replace('/xstocks/result' as Href);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Demo trade failed.';
      setError(message);
      setResult('failed', message);
      router.replace('/xstocks/result' as Href);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen glow="review">
      <Header title="Review order" onBack={() => router.back()} />
      <View style={styles.hero}>
        <Badge
          tone="accent"
          label={`${side === 'buy' ? 'Buy' : 'Sell'} ${stock.symbol}`}
        />
        <DText variant="hero" adjustsFontSizeToFit numberOfLines={1}>
          {side === 'buy'
            ? `$${amountNumberSafe(amount).toFixed(2)}`
            : `$${netOut.toFixed(2)}`}
        </DText>
        <DText variant="mono" tone="secondary">
          {side === 'buy' ? netOut.toFixed(6) : soldQuantity.toFixed(6)}{' '}
          {stock.symbol}
        </DText>
      </View>
      <Card>
        <DText variant="h3" style={styles.cardTitle}>
          {side === 'buy' ? 'Buy' : 'Sell'} {stock.symbol}
        </DText>
        <InfoRow
          label={side === 'buy' ? 'You pay' : 'You sell'}
          value={
            side === 'buy'
              ? `$${amount} USDC`
              : `${soldQuantity.toFixed(6)} ${stock.symbol}`
          }
        />
        <InfoRow
          label="You receive"
          value={
            side === 'buy'
              ? `${netOut.toFixed(6)} ${stock.symbol}`
              : `$${netOut.toFixed(2)} USDC`
          }
        />
        <InfoRow
          label="Rate"
          value={`1 ${stock.symbol} ≈ $${(stock.usdPrice ?? 0).toFixed(4)}`}
        />
        <InfoRow label="N.E.D fee" value={`0.25% · $${feeUsd.toFixed(4)}`} />
        {side === 'sell' ? (
          <InfoRow
            label="Gain on this sale"
            value={`${netOut - soldCostBasis >= 0 ? '+' : ''}$${(netOut - soldCostBasis).toFixed(2)}`}
          />
        ) : null}
        <InfoRow label="Network fee" value="Demo — not broadcast" />
        <InfoRow
          label="Price impact"
          value={
            quote.priceImpactPct
              ? `${quote.priceImpactPct}%`
              : `${quote.priceImpact ?? 0}%`
          }
        />
        <InfoRow
          label="Minimum you get"
          value={
            side === 'buy'
              ? `${minNet.toFixed(6)} ${stock.symbol}`
              : `$${minNet.toFixed(2)} USDC`
          }
        />
        <InfoRow
          label="Route"
          value={
            quote.routePlan
              ?.map((route) => route.swapInfo?.label)
              .filter(Boolean)
              .join(' → ') || 'Jupiter route'
          }
        />
      </Card>
      {!isUsMarketOpen() ? (
        <Notice tone="warning">
          US market is closed. Live on-chain prices may differ from Friday’s
          close.
        </Notice>
      ) : null}
      {requiresRisk ? (
        <RiskDisclosure
          checked={accepted}
          onChange={() => setAccepted((value) => !value)}
        />
      ) : null}
      {error ? (
        <DText variant="caption" tone="error" style={styles.error}>
          {error}
        </DText>
      ) : null}
      <SlideConfirm
        title={
          busy
            ? 'Saving demo trade…'
            : side === 'buy'
              ? 'Slide to buy'
              : 'Slide to sell'
        }
        disabled={busy || (requiresRisk && !accepted)}
        onConfirm={() => void confirm()}
      />
      <DText variant="caption" align="center" style={styles.demo}>
        Demo mode · real price, no real funds moved
      </DText>
    </Screen>
  );
}

function amountNumberSafe(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: space[4], gap: space[3] },
  cardTitle: { marginBottom: space[1] },
  demo: { marginTop: space[3] },
  error: { marginTop: space[2] },
});
