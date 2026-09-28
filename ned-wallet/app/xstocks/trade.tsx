import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
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
import { onbColors, onbFonts } from '@/components/onboarding/theme';

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
          <Text style={styles.amountLabel}>Amount to invest</Text>
          <View style={styles.amountBox}>
            <Text style={styles.currency}>$</Text>
            <TextInput
              value={amount}
              onChangeText={(value) =>
                setQuickValue(sanitizeAmountInput(value, 2).display)
              }
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.35)"
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
                <Text style={styles.shortcutText}>${value}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setQuickValue(usdcAvailable.toFixed(2))}
              style={styles.shortcut}
            >
              <Text style={styles.shortcutText}>Max</Text>
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
            <Text style={styles.error}>
              Not enough USDC. Available: ${usdcAvailable.toFixed(2)}.
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text style={styles.amountLabel}>Amount to sell</Text>
          <View style={styles.toggle}>
            <Pressable
              style={[
                styles.toggleItem,
                sellMode === 'usd' && styles.activeToggle,
              ]}
              onPress={() => setSellMode('usd')}
            >
              <Text style={styles.toggleText}>USD value</Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleItem,
                sellMode === 'shares' && styles.activeToggle,
              ]}
              onPress={() => setSellMode('shares')}
            >
              <Text style={styles.toggleText}>Shares</Text>
            </Pressable>
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.currency}>{sellMode === 'usd' ? '$' : ''}</Text>
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
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={[
                styles.input,
                { width: Math.min(250, Math.max(60, amount.length * 31 + 20)) },
              ]}
            />
            <Text style={styles.unit}>
              {sellMode === 'shares' ? activeStock.symbol : ''}
            </Text>
          </View>
          <View style={styles.shortcuts}>
            {[0.25, 0.5, 0.75, 1].map((value) => (
              <Pressable
                key={value}
                onPress={() => setSellPercent(value)}
                style={styles.shortcut}
              >
                <Text style={styles.shortcutText}>
                  {value === 1 ? 'All' : `${value * 100}%`}
                </Text>
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
            <Text style={styles.error}>
              That is more than you own ({position.quantity.toFixed(6)}{' '}
              {activeStock.symbol}).
            </Text>
          ) : null}
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
        <ActivityIndicator color="#B87AED" style={styles.spinner} />
      ) : null}
      <View>
        <Text style={styles.footnote}>
          Demo mode uses live Jupiter pricing. Orders are not signed or
          broadcast.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountLabel: {
    color: '#FFFFFF88',
    textAlign: 'left',
    fontFamily: onbFonts.body,
    fontSize: 12,
    marginTop: 18,
  },
  bottom: { marginTop: 'auto' },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 96,
  },
  currency: {
    color: onbColors.text,
    fontFamily: onbFonts.heading,
    fontSize: 48,
  },
  input: {
    maxWidth: '80%',
    minWidth: 75,
    textAlign: 'left',
    color: onbColors.text,
    fontFamily: onbFonts.heading,
    fontSize: 52,
    padding: 10,
  },
  unit: { color: onbColors.textMuted, fontSize: 12 },
  shortcuts: { flexDirection: 'row', gap: 8, marginTop: 13, marginBottom: 8 },
  shortcut: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  shortcutText: {
    color: '#D5A7F4',
    fontFamily: onbFonts.bodyMedium,
    fontSize: 11,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  toggleItem: { flex: 1, padding: 9, alignItems: 'center', borderRadius: 8 },
  activeToggle: { backgroundColor: 'rgba(155,79,222,0.3)' },
  toggleText: { color: onbColors.text, fontSize: 11 },
  error: { color: '#FBBF24', fontSize: 12, marginTop: 10 },
  spinner: { marginTop: 10 },
  footnote: { color: 'rgba(255,255,255,0.55)', fontSize: 11, lineHeight: 17 },
});
