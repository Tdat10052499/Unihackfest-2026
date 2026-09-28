import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/services/auth';
import { getSolanaBalance, getUsdcTokenBalance } from '@/services/solana';
import {
  calculateFee,
  calculateMinimumReceived,
  getTokens,
  quoteMintForAsset,
  searchTokens,
  type Slippage,
  useSwapQuote,
  type JupiterToken,
  type JupiterOrder,
} from '@/services/jupiter';
import { saveDemoSwap } from '@/services/storage';
import { getDemoLedger, recordDemoSwap } from '@/services/demoLedger';
import { onbColors, onbFonts } from '@/components/onboarding/theme';
import { amountNumber, sanitizeAmountInput } from '@/utils/amountInput';
import {
  ActionButton,
  Card,
  Header,
  InfoRow,
  Screen,
} from '@/components/xstocks/Screen';
import { AmountKeypad } from '@/components/wallet/AmountKeypad';
import { SlideConfirm } from '@/components/wallet/SlideConfirm';
import { Mascot } from '@/components/Mascot';

type Asset = 'SOL' | 'USDC';
type Stage = 'amount' | 'tokens' | 'review' | 'result';
const decimals = (asset: Asset) => (asset === 'SOL' ? 9 : 6);
const pretty = (raw: string | bigint, asset: Asset) =>
  `${(Number(raw) / 10 ** decimals(asset)).toLocaleString('en-US', { maximumFractionDigits: asset === 'SOL' ? 6 : 4 })} ${asset}`;

export default function SwapScreen() {
  const router = useRouter();
  const { walletAddress } = useAuth();
  const [from, setFrom] = useState<Asset>('SOL');
  const to = from === 'SOL' ? 'USDC' : 'SOL';
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState<Slippage>('auto');
  const [showSlippage, setShowSlippage] = useState(false);
  const [stage, setStage] = useState<Stage>('amount');
  const [balances, setBalances] = useState({ SOL: 0, USDC: 0 });
  const [search, setSearch] = useState('');
  const [tokens, setTokens] = useState<JupiterToken[]>([]);
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'failed'>('success');
  const [reviewQuote, setReviewQuote] = useState<JupiterOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const numericAmount = amountNumber(amount);
  const rawAmount =
    numericAmount > 0
      ? String(Math.floor(numericAmount * 10 ** decimals(from)))
      : '';
  const quoteState = useSwapQuote(
    quoteMintForAsset(from),
    quoteMintForAsset(to),
    stage === 'result' ? '' : rawAmount,
    slippage,
  );
  const quote = stage === 'result' ? reviewQuote : quoteState.quote;
  const fee = quote ? calculateFee(BigInt(quote.outAmount)) : 0n;
  const netOut = quote ? BigInt(quote.outAmount) - fee : 0n;
  const balance = balances[from];
  const notEnough = numericAmount > balance;
  const quoteMatches =
    quote?.inputMint === quoteMintForAsset(from) &&
    quote.outputMint === quoteMintForAsset(to) &&
    quote.inAmount === rawAmount;
  const priceChanged =
    !!reviewQuote &&
    !!quote &&
    (reviewQuote.outAmount !== quote.outAmount ||
      reviewQuote.otherAmountThreshold !== quote.otherAmountThreshold);
  const route =
    quote?.routePlan
      ?.map((r) => r.swapInfo?.label)
      .filter(Boolean)
      .join(' → ') ||
    quote?.router ||
    'Jupiter';
  const feeUsd = Number(quote?.outUsdValue || 0) * 0.0025;

  useEffect(() => {
    if (!walletAddress) return;
    let active = true;
    void Promise.all([
      getSolanaBalance(walletAddress),
      getUsdcTokenBalance(walletAddress),
      getDemoLedger(walletAddress),
    ])
      .then(([sol, usdc, ledger]) => {
        if (active)
          setBalances({
            SOL:
              sol +
              ledger.trades.reduce(
                (sum, trade) =>
                  trade.side !== 'swap'
                    ? sum
                    : sum +
                      (trade.outputSymbol === 'SOL'
                        ? Number(trade.outputAmount)
                        : 0) -
                      (trade.inputSymbol === 'SOL'
                        ? Number(trade.inputAmount)
                        : 0),
                0,
              ),
            USDC: usdc + ledger.cashUsdc,
          });
      })
      .catch(() => {
        if (active) setError('Unable to load balances. Reopen Swap to retry.');
      });
    return () => {
      active = false;
    };
  }, [walletAddress, stage]);

  useEffect(() => {
    if (stage !== 'tokens') return;
    let active = true;
    const timer = setTimeout(() => {
      setTokenLoading(true);
      setTokenError('');
      void (search ? searchTokens(search) : getTokens('verified'))
        .then((items) => {
          if (active) setTokens(items);
        })
        .catch((cause) => {
          if (active)
            setTokenError(
              cause instanceof Error ? cause.message : 'Could not load tokens.',
            );
        })
        .finally(() => {
          if (active) setTokenLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [stage, search]);

  function changeAmount(value: string) {
    setAmount(sanitizeAmountInput(value, decimals(from)).display);
  }
  function flip() {
    setFrom(to);
    setAmount('');
  }
  async function confirm() {
    if (lock.current || priceChanged) return;
    if (!quote || quoteState.isStale || !quoteMatches) {
      setResult('failed');
      setStage('result');
      return;
    }
    if (!walletAddress) {
      setError('Connect your wallet to continue.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      setReviewQuote(quote);
      const outputDisplay = (Number(netOut) / 10 ** decimals(to)).toString();
      await recordDemoSwap(walletAddress, {
        inputSymbol: from,
        inputAmount: String(numericAmount),
        outputSymbol: to,
        outputAmount: outputDisplay,
        feeUsd,
      });
      await saveDemoSwap(
        {
          type: 'swap',
          title: `Demo swap ${from} → ${to}`,
          amount: pretty(rawAmount, from),
          received: pretty(netOut, to),
          time: new Date().toISOString(),
        },
        walletAddress,
      );
      setResult('success');
      setStage('result');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save demo swap.',
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  if (stage === 'result')
    return (
      <Screen>
        <View style={styles.resultHero}>
          <Mascot
            mood={result === 'success' ? 'happy' : 'confused'}
            size={140}
          />
          <Text style={styles.resultTitle}>
            {result === 'success' ? 'Swap complete' : 'Swap didn’t go through'}
          </Text>
          <Text style={styles.demo}>
            Demo mode · real price, no real funds moved
          </Text>
        </View>
        {result === 'success' ? (
          <Card>
            <InfoRow label="You paid" value={`${amount} ${from}`} />
            <InfoRow label="You received" value={pretty(netOut, to)} />
            <InfoRow label="N.E.D fee (0.25%)" value={pretty(fee, to)} />
            <InfoRow label="Network fee" value="Demo — not broadcast" />
          </Card>
        ) : (
          <Text style={styles.warning}>
            Your quote expired. Get a fresh price and try again.
          </Text>
        )}
        <View style={styles.bottom}>
          <ActionButton
            title={result === 'success' ? 'Done' : 'Try again'}
            onPress={() =>
              result === 'success' ? router.back() : setStage('amount')
            }
          />
          <ActionButton
            title="Swap again"
            secondary
            onPress={() => {
              setAmount('');
              setReviewQuote(null);
              setStage('amount');
            }}
          />
        </View>
      </Screen>
    );

  if (stage === 'tokens')
    return (
      <Screen>
        <Header title="Pick a token" onBack={() => setStage('amount')} />
        <TextInput
          accessibilityLabel="Search tokens"
          value={search}
          onChangeText={setSearch}
          placeholder="Search symbol, name or mint"
          placeholderTextColor={onbColors.textSubtle}
          style={styles.search}
        />
        <Text style={styles.sectionTitle}>Your tokens</Text>
        {(['SOL', 'USDC'] as Asset[])
          .filter(
            (asset) =>
              !search || asset.toLowerCase().includes(search.toLowerCase()),
          )
          .map((asset) => (
            <Pressable
              key={asset}
              style={styles.token}
              onPress={() => {
                setFrom(asset);
                setAmount('');
                setStage('amount');
              }}
            >
              <TokenPill asset={asset} />
              <View>
                <Text style={styles.tokenValue}>
                  {balances[asset].toFixed(4)}
                </Text>
                <Text style={styles.small}>Demo balance</Text>
              </View>
            </Pressable>
          ))}
        <Text style={styles.sectionTitle}>Popular</Text>
        <Text style={styles.muted}>
          Other tokens are available to explore. This demo swaps SOL and USDC.
        </Text>
        {tokenLoading ? (
          <Text style={styles.muted}>Loading tokens…</Text>
        ) : null}
        {tokenError ? <Text style={styles.warning}>{tokenError}</Text> : null}
        {!tokenLoading && !tokenError && !tokens.length ? (
          <Text style={styles.muted}>No tokens found.</Text>
        ) : null}
        {tokens.slice(0, 20).map((token) => (
          <View key={token.id} style={styles.token}>
            <View style={styles.tokenName}>
              <Text style={styles.tokenValue}>
                {token.symbol || token.name}
              </Text>
              <Text numberOfLines={1} style={styles.small}>
                {token.name}
              </Text>
            </View>
            <Text style={token.isVerified ? styles.verified : styles.warning}>
              {token.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
            </Text>
          </View>
        ))}
        <ActionButton
          secondary
          title="Looking for stocks like AAPLx?"
          onPress={() => router.push('/xstocks')}
        />
      </Screen>
    );

  if (stage === 'review')
    return (
      <Screen>
        <Header title="Review swap" onBack={() => setStage('amount')} />
        <View style={styles.reviewHero}>
          <Text style={styles.muted}>You pay</Text>
          <Text style={styles.reviewAmount}>
            {amount} {from}
          </Text>
          <Feather name="arrow-down" color="#B87AED" size={20} />
          <Text style={styles.muted}>You get (estimate)</Text>
          <Text style={styles.reviewReceive}>{pretty(netOut, to)}</Text>
        </View>
        <Card>
          <InfoRow
            label="Rate"
            value={
              quote && numericAmount
                ? `1 ${from} ≈ ${(Number(netOut) / 10 ** decimals(to) / numericAmount).toFixed(4)} ${to}`
                : '—'
            }
          />
          <InfoRow
            label="N.E.D fee (0.25%)"
            value={`${pretty(fee, to)} · $${feeUsd.toFixed(2)}`}
          />
          <InfoRow label="Network fee" value="Demo — not broadcast" />
          <InfoRow
            label="Price impact"
            value={`${quote?.priceImpactPct ?? quote?.priceImpact ?? 0}%`}
          />
          <InfoRow
            label="Max slippage"
            value={slippage === 'auto' ? 'Auto' : `${slippage}%`}
          />
          <InfoRow
            label="Minimum you get"
            value={quote ? pretty(calculateMinimumReceived(quote), to) : '—'}
          />
          <InfoRow label="Route" value={route} />
        </Card>
        {priceChanged || quoteState.isStale ? (
          <View style={styles.banner}>
            <Text style={styles.warning}>
              Price updated · Accept the latest quote to continue.
            </Text>
            <ActionButton
              secondary
              title={quoteState.isStale ? 'Refresh price' : 'Accept new price'}
              onPress={() =>
                quoteState.isStale
                  ? void quoteState.refresh()
                  : setReviewQuote(quote)
              }
              disabled={quoteState.isLoading}
            />
          </View>
        ) : null}
        {error ? <Text style={styles.warning}>{error}</Text> : null}
        <View style={styles.bottom}>
          <SlideConfirm
            title={busy ? 'Saving demo swap…' : 'Slide to confirm'}
            disabled={
              busy ||
              priceChanged ||
              quoteState.isStale ||
              quoteState.isLoading ||
              !quoteMatches
            }
            onConfirm={() => void confirm()}
          />
          <Text style={styles.demo}>
            Demo mode · real price, no real funds moved
          </Text>
        </View>
      </Screen>
    );

  return (
    <Screen>
      <Header
        title="Swap"
        onBack={() => router.back()}
        right={
          <Pressable
            accessibilityLabel="Slippage settings"
            style={styles.slipButton}
            onPress={() => setShowSlippage(!showSlippage)}
          >
            <Feather name="sliders" size={14} color="white" />
            <Text style={styles.smallWhite}>
              {slippage === 'auto' ? 'Auto' : `${slippage}%`}
            </Text>
          </Pressable>
        }
      />
      {showSlippage ? (
        <Card>
          <Text style={styles.sectionTitle}>Max price change</Text>
          <View style={styles.slippage}>
            {(['auto', 0.5, 1, 3] as Slippage[]).map((value) => (
              <Pressable
                key={String(value)}
                style={[styles.chip, slippage === value && styles.selected]}
                onPress={() => setSlippage(value)}
              >
                <Text style={styles.smallWhite}>
                  {value === 'auto' ? 'Auto' : `${value}%`}
                </Text>
              </Pressable>
            ))}
          </View>
          {slippage === 3 ? (
            <Text style={styles.warning}>
              3% slippage may result in a worse price.
            </Text>
          ) : null}
        </Card>
      ) : null}
      <View style={styles.payCard}>
        <View style={styles.cardTop}>
          <Text style={styles.muted}>You pay</Text>
          <Text style={styles.small}>Balance {balance.toFixed(4)}</Text>
          {[0.5, 1].map((fraction) => (
            <Pressable
              key={fraction}
              style={styles.quick}
              onPress={() =>
                changeAmount(
                  Math.max(0, balance * fraction).toFixed(decimals(from)),
                )
              }
            >
              <Text style={styles.quickText}>
                {fraction === 1 ? 'Max' : '50%'}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.amountRow}>
          <TextInput
            accessibilityLabel="Amount to swap"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={changeAmount}
            placeholder="0"
            placeholderTextColor={onbColors.textSubtle}
            style={styles.amount}
          />
          <TokenPill asset={from} onPress={() => setStage('tokens')} />
        </View>
      </View>
      <Pressable
        accessibilityLabel="Reverse swap direction"
        style={styles.flip}
        onPress={flip}
      >
        <Feather name="repeat" size={20} color="#C9A2F2" />
      </Pressable>
      <View style={styles.payCard}>
        <View style={styles.cardTop}>
          <Text style={styles.muted}>You get (estimate)</Text>
          <Text style={styles.small}>Balance {balances[to].toFixed(4)}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.amount}>
            {quoteMatches
              ? (Number(netOut) / 10 ** decimals(to)).toLocaleString('en-US', {
                  maximumFractionDigits: 6,
                })
              : '—'}
          </Text>
          <TokenPill asset={to} />
        </View>
      </View>
      <View style={styles.cardTop}>
        <Text style={styles.small}>
          {quoteState.isLoading
            ? 'Updating quote…'
            : `Updates in ${quoteState.secondsRemaining}s`}
        </Text>
        <Text style={styles.small}>Demo balance</Text>
      </View>
      <Text style={styles.fee}>N.E.D fee 0.25% · ${feeUsd.toFixed(2)}</Text>
      <Text style={styles.small}>Network fee: Demo — not broadcast</Text>
      {quoteState.error || error ? (
        <Text style={styles.warning}>{quoteState.error || error}</Text>
      ) : null}
      <View style={styles.bottom}>
        <AmountKeypad
          value={amount}
          decimals={decimals(from)}
          onChange={changeAmount}
        />
        <ActionButton
          title={
            notEnough
              ? `Not enough ${from}`
              : !numericAmount
                ? 'Enter an amount'
                : quoteState.isLoading
                  ? 'Getting quote…'
                  : 'Review swap'
          }
          disabled={
            notEnough ||
            numericAmount <= 0 ||
            quoteState.isLoading ||
            quoteState.isStale ||
            !quoteMatches
          }
          onPress={() => {
            setReviewQuote(quote);
            setStage('review');
          }}
        />
      </View>
    </Screen>
  );
}

function TokenPill({ asset, onPress }: { asset: Asset; onPress?: () => void }) {
  const body = (
    <>
      <View
        style={[
          styles.coin,
          { backgroundColor: asset === 'SOL' ? '#7B3FD4' : '#2779CB' },
        ]}
      >
        <Text style={styles.coinText}>{asset === 'SOL' ? 'S' : 'U'}</Text>
      </View>
      <Text style={styles.tokenValue}>{asset}</Text>
      {onPress ? (
        <Feather name="chevron-down" size={13} color="#BEB8CB" />
      ) : null}
    </>
  );
  return onPress ? (
    <Pressable style={styles.tokenPill} onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    <View style={styles.tokenPill}>{body}</View>
  );
}
const styles = StyleSheet.create({
  payCard: {
    backgroundColor: '#FFFFFF0A',
    borderColor: '#FFFFFF1A',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    minHeight: 126,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 10,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amount: {
    flex: 1,
    minWidth: 0,
    color: 'white',
    fontFamily: onbFonts.heading,
    fontSize: 36,
    paddingVertical: 8,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 30,
    backgroundColor: '#FFFFFF0D',
    borderWidth: 1,
    borderColor: '#FFFFFF1A',
    padding: 6,
    paddingRight: 12,
    minHeight: 44,
  },
  coin: {
    width: 28,
    height: 28,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: { color: 'white', fontFamily: onbFonts.heading },
  muted: {
    color: onbColors.textMuted,
    fontFamily: onbFonts.body,
    fontSize: 12,
  },
  small: {
    color: onbColors.textSubtle,
    fontFamily: onbFonts.body,
    fontSize: 10,
  },
  smallWhite: { color: 'white', fontFamily: onbFonts.bodyMedium, fontSize: 11 },
  quick: {
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: '#9B4FDE25',
    borderWidth: 1,
    borderColor: '#9B4FDE40',
    justifyContent: 'center',
  },
  quickText: { fontSize: 10, color: '#D5A7F4', fontFamily: onbFonts.bodySemi },
  flip: {
    alignSelf: 'center',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A102A',
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#0D0618',
    marginVertical: -10,
    zIndex: 2,
  },
  slipButton: {
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF1A',
    backgroundColor: '#FFFFFF0A',
  },
  slippage: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF0A',
  },
  selected: { backgroundColor: '#7B2FBE' },
  fee: {
    color: onbColors.textMuted,
    fontFamily: onbFonts.body,
    fontSize: 11,
    marginVertical: 8,
  },
  bottom: { marginTop: 'auto', paddingTop: 12 },
  warning: {
    color: onbColors.warning,
    fontFamily: onbFonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 8,
  },
  search: {
    color: 'white',
    fontFamily: onbFonts.body,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF1A',
    backgroundColor: '#FFFFFF0A',
  },
  sectionTitle: {
    fontFamily: onbFonts.heading,
    color: 'white',
    fontSize: 16,
    marginVertical: 14,
  },
  token: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#FFFFFF12',
  },
  tokenValue: { color: 'white', fontFamily: onbFonts.bodySemi, fontSize: 14 },
  tokenName: { flex: 1 },
  verified: { color: '#4ADE80', fontSize: 10 },
  reviewHero: { alignItems: 'center', gap: 10, paddingVertical: 18 },
  reviewAmount: { fontFamily: onbFonts.heading, color: 'white', fontSize: 36 },
  reviewReceive: {
    fontFamily: onbFonts.heading,
    color: '#D5A7F4',
    fontSize: 28,
  },
  resultHero: { alignItems: 'center', paddingTop: 32, gap: 18 },
  resultTitle: {
    color: 'white',
    fontFamily: onbFonts.heading,
    fontSize: 27,
    textAlign: 'center',
  },
  demo: {
    color: '#FBBF24',
    fontFamily: onbFonts.bodyMedium,
    fontSize: 10,
    textAlign: 'center',
    marginVertical: 12,
  },
  banner: { padding: 12, borderRadius: 14, backgroundColor: '#FBBF2410' },
});
