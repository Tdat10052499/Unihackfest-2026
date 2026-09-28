import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '@/services/auth';
import { getUsdcTokenBalance } from '@/services/solana';
import { getOrder, MAINNET_USDC_MINT } from '@/services/jupiter';
import { getDemoLedger, type DemoLedger } from '@/services/demoLedger';
import { amountNumber, sanitizeAmountInput } from '@/utils/amountInput';
import { useXStocksStore } from '@/stores/useXStocksStore';
import {
  ActionButton,
  Card,
  Header,
  InfoRow,
  Muted,
  Screen,
} from '@/components/xstocks/Screen';
import { AmountKeypad } from '@/components/wallet/AmountKeypad';
import { DText } from '@/components/design';
import { colors, fonts, glass, radius, space, type } from '@/constants/design';

export default function XStockTradeScreen() {
  const router = useRouter();
  const { walletAddress } = useAuth();
  const stock = useXStocksStore((state) => state.stock);
  const side = useXStocksStore((state) => state.side);
  const amount = useXStocksStore((state) => state.amount);
  const setAmount = useXStocksStore((state) => state.setAmount);
  const setQuote = useXStocksStore((state) => state.setQuote);
  const [baseUsdc, setBaseUsdc] = useState(0);
  const [demoLedger, setDemoLedger] = useState<DemoLedger>({
    cashUsdc: 0,
    holdings: [],
    trades: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sellMode, setSellMode] = useState<'usd' | 'shares'>('usd');
  const [position, setPosition] = useState({ quantity: 0, costBasisUsd: 0 });

  useEffect(() => {
    let active = true;
    if (walletAddress) {
      void Promise.all([
        getUsdcTokenBalance(walletAddress),
        getDemoLedger(walletAddress),
      ])
        .then(([balance, demo]) => {
          if (!active) return;
          setBaseUsdc(balance);
          setDemoLedger(demo);
          const current = demo.holdings.find((item) => item.mint === stock?.id);
          setPosition({
            quantity: current?.quantity ?? 0,
            costBasisUsd: current?.costBasisUsd ?? 0,
          });
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [stock?.id, walletAddress]);

  if (!stock)
    return (
      <Screen>
        <Header title="Trade xStock" onBack={() => router.back()} />
        <Muted>Choose an xStock first.</Muted>
        <ActionButton
          title="Back to market"
          onPress={() => router.replace('/xstocks')}
        />
      </Screen>
    );

  const activeStock = stock;
  const numericAmount = amountNumber(amount);
  const sellQuantity =
    sellMode === 'usd'
      ? numericAmount / Math.max(activeStock.usdPrice ?? 0, 1e-12)
      : numericAmount;
  const usdcAvailable = baseUsdc + demoLedger.cashUsdc;
  const canReview =
    side === 'buy'
      ? numericAmount > 0 && numericAmount <= usdcAvailable
      : sellQuantity > 0 && sellQuantity <= position.quantity;
  const mint = activeStock.id;
  const insufficientCash = side === 'buy' && numericAmount > usdcAvailable;

  function setQuickValue(value: string) {
    setAmount(value);
    setError('');
  }

  async function review() {
    setError('');
    setLoading(true);
    try {
      let quote;
      if (side === 'buy') {
        quote = await getOrder(
          MAINNET_USDC_MINT,
          mint,
          Math.floor(numericAmount * 1_000_000),
          'auto',
        );
      } else {
        quote = await getOrder(
          mint,
          MAINNET_USDC_MINT,
          Math.floor(sellQuantity * 10 ** activeStock.decimals),
          'auto',
        );
      }
      if (!quote.outAmount || BigInt(quote.outAmount) <= 0n)
        throw new Error('No Jupiter route found for this amount.');
      setQuote(quote);
      router.push('/xstocks/review' as Href);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Quote unavailable. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  function setSellPercent(percent: number) {
    setSellMode('shares');
    setQuickValue(
      String(
        (position.quantity * percent).toFixed(
          Math.min(activeStock.decimals, 8),
        ),
      ),
    );
  }

  return (
    <Screen>
      <Header
        title={`${side === 'buy' ? 'Buy' : 'Sell'} ${activeStock.symbol}`}
        onBack={() => router.back()}
      />
      {side === 'buy' ? (
        <>
          <DText variant="label" style={styles.amountLabel}>
            Amount to invest
          </DText>
          <View style={styles.amountBox}>
            <DText variant="hero">$</DText>
            <TextInput
              value={amount}
              onChangeText={(value) =>
                setQuickValue(sanitizeAmountInput(value, 2).display)
              }
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                { width: Math.min(250, Math.max(60, amount.length * 31 + 20)) },
              ]}
            />
          </View>
          <View style={styles.shortcuts}>
            {[10, 50, 100].map((value) => (
              <Pressable
                key={value}
                onPress={() => setQuickValue(String(value))}
                style={styles.shortcut}
              >
                <DText variant="caption" tone="accent" style={styles.shortcutText}>
                  ${value}
                </DText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setQuickValue(usdcAvailable.toFixed(2))}
              style={styles.shortcut}
            >
              <DText variant="caption" tone="accent" style={styles.shortcutText}>
                Max
              </DText>
            </Pressable>
          </View>
          <Card>
            <InfoRow label="Pay with" value="Cash balance (USDC)" />
          </Card>
          <InfoRow
            label="Cash balance · Demo balance"
            value={`$${usdcAvailable.toFixed(2)} USDC`}
          />
          <InfoRow label="N.E.D fee" value="0.25% of received amount" />
          <InfoRow
            label="Estimated shares"
            value="Calculated from the live quote on review"
          />
          {insufficientCash ? (
            <DText variant="caption" tone="error" style={styles.error}>
              Not enough USDC. Available: ${usdcAvailable.toFixed(2)}.
            </DText>
          ) : null}
        </>
      ) : (
        <>
          <DText variant="label" style={styles.amountLabel}>
            Amount to sell
          </DText>
          <View style={styles.toggle}>
            <Pressable
              style={[
                styles.toggleItem,
                sellMode === 'usd' && styles.activeToggle,
              ]}
              onPress={() => setSellMode('usd')}
            >
              <DText variant="caption" tone="primary">USD value</DText>
            </Pressable>
            <Pressable
              style={[
                styles.toggleItem,
                sellMode === 'shares' && styles.activeToggle,
              ]}
              onPress={() => setSellMode('shares')}
            >
              <DText variant="caption" tone="primary">Shares</DText>
            </Pressable>
          </View>
          <View style={styles.amountBox}>
            <DText variant="hero">{sellMode === 'usd' ? '$' : ''}</DText>
            <TextInput
              value={amount}
              onChangeText={(value) =>
                setQuickValue(
                  sanitizeAmountInput(
                    value,
                    sellMode === 'usd' ? 2 : Math.min(activeStock.decimals, 8),
                  ).display,
                )
              }
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                { width: Math.min(250, Math.max(60, amount.length * 31 + 20)) },
              ]}
            />
            <DText variant="caption" tone="secondary">
              {sellMode === 'shares' ? activeStock.symbol : ''}
            </DText>
          </View>
          <View style={styles.shortcuts}>
            {[0.25, 0.5, 0.75, 1].map((value) => (
              <Pressable
                key={value}
                onPress={() => setSellPercent(value)}
                style={styles.shortcut}
              >
                <DText variant="caption" tone="accent" style={styles.shortcutText}>
                  {value === 1 ? 'All' : `${value * 100}%`}
                </DText>
              </Pressable>
            ))}
          </View>
          <Muted>
            Position: {position.quantity.toFixed(6)} {activeStock.symbol} · cost
            basis ${position.costBasisUsd.toFixed(2)}
          </Muted>
          <InfoRow
            label="Estimated shares to sell"
            value={`${sellQuantity.toFixed(6)} ${activeStock.symbol}`}
          />
          {sellQuantity > position.quantity ? (
            <DText variant="caption" tone="error" style={styles.error}>
              That is more than you own ({position.quantity.toFixed(6)}{' '}
              {activeStock.symbol}).
            </DText>
          ) : null}
        </>
      )}
      {error ? (
        <DText variant="caption" tone="error" style={styles.error}>
          {error}
        </DText>
      ) : null}
      <View style={styles.bottom}>
        <AmountKeypad
          value={amount}
          decimals={
            side === 'buy' || sellMode === 'usd'
              ? 2
              : Math.min(activeStock.decimals, 8)
          }
          onChange={setQuickValue}
        />
        <ActionButton
          title={
            loading
              ? 'Getting quote…'
              : side === 'buy'
                ? 'Review order'
                : 'Review sale'
          }
          disabled={!canReview || loading}
          onPress={() => void review()}
        />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.purple[300]} style={styles.spinner} />
      ) : null}
      <View>
        <DText variant="caption" tone="secondary">
          Demo mode uses live Jupiter pricing. Orders are not signed or
          broadcast.
        </DText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountLabel: { marginTop: space[4] },
  bottom: { marginTop: 'auto' },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 96,
  },
  input: {
    ...type.hero,
    maxWidth: '80%',
    minWidth: 75,
    textAlign: 'left',
    padding: space[2],
  },
  shortcuts: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[3],
    marginBottom: space[2],
  },
  shortcut: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: glass.fillStrong,
  },
  shortcutText: { fontFamily: fonts.bodyMedium, color: colors.purple[200] },
  toggle: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: space[1],
    backgroundColor: glass.fillStrong,
    marginBottom: space[3],
  },
  toggleItem: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  activeToggle: { backgroundColor: glass.iconTint },
  error: { marginTop: space[2] },
  spinner: { marginTop: space[2] },
});
