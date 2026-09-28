import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/services/auth';
import { useUserStore } from '@/stores/useUserStore';
import { getSolanaBalance, getUsdcTokenBalance } from '@/services/solana';
import { getDemoLedger, type DemoLedger } from '@/services/demoLedger';
import { getXStocks, type XStock } from '@/services/xstocks';
import { DepositModal } from '@/components/DepositModal';
import { NotificationModal } from '@/components/NotificationModal';
import { Mascot } from '@/components/Mascot';
import { onbFonts } from '@/components/onboarding/theme';

const money = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isReady, user, walletAddress } = useAuth();
  const { username, avatarUrl } = useUserStore();
  useEffect(() => {
    if (walletAddress)
      void useUserStore.getState().fetchUserProfile(walletAddress);
  }, [walletAddress]);
  const [balance, setBalance] = useState({ sol: 0, usdc: 0 });
  const [ledger, setLedger] = useState<DemoLedger>({
    cashUsdc: 0,
    holdings: [],
    trades: [],
  });
  const [stocks, setStocks] = useState<XStock[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showReceive, setShowReceive] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  const refresh = useCallback(async () => {
    if (!walletAddress) return;
    setRefreshing(true);
    setError('');
    try {
      const [sol, usdc, demo] = await Promise.all([
        getSolanaBalance(walletAddress, true),
        getUsdcTokenBalance(walletAddress, true),
        getDemoLedger(walletAddress),
      ]);
      setBalance({ sol, usdc });
      setLedger(demo);
      if (demo.holdings.length) {
        try {
          setStocks(await getXStocks());
        } catch {
          setError('Investment prices unavailable. Pull down to retry.');
        }
      }
    } catch {
      setError('Unable to refresh balances. Pull down to retry.');
    } finally {
      setRefreshing(false);
    }
  }, [walletAddress]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const timer = setInterval(() => void refresh(), 30000);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  if (!isReady)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#B87AED" />
      </View>
    );
  if (!user) return <Redirect href="/welcome" />;

  const cash = balance.usdc + ledger.cashUsdc;
  const investments = ledger.holdings.reduce(
    (sum, item) =>
      sum +
      item.quantity *
        (stocks.find((stock) => stock.id === item.mint)?.usdPrice ?? 0),
    0,
  );
  const pricesReady = ledger.holdings.every((item) =>
    stocks.some((stock) => stock.id === item.mint),
  );
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? 'Good morning,'
      : hour < 18
        ? 'Good afternoon,'
        : 'Good evening,';
  const actions = [
    {
      title: 'RECEIVE',
      icon: 'arrow-down',
      onPress: () => setShowReceive(true),
    },
    { title: 'SEND', icon: 'arrow-up', onPress: () => router.push('/send') },
    { title: 'SWAP', icon: 'repeat', onPress: () => router.push('/swap') },
    {
      title: 'XSTOCKS',
      icon: 'trending-up',
      onPress: () => router.push('/xstocks'),
    },
  ] as const;

  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor="#B87AED"
          />
        }
      >
        <LinearGradient
          colors={['#0A0614', '#251052', '#7550C9', '#FFFFFF']}
          locations={[0, 0.42, 0.72, 1]}
          style={[styles.hero, { paddingTop: Math.max(insets.top, 16) }]}
        >
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.push('/settings')}
              style={styles.profile}
              accessibilityLabel="Your profile"
            >
              <View style={styles.avatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <Mascot mood="welcome" size={42} />
                )}
              </View>
              <View style={styles.nameWrap}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text numberOfLines={1} style={styles.name}>
                  {username || 'N.E.D User'}
                </Text>
              </View>
            </Pressable>
            <View style={styles.topActions}>
              <Pressable
                accessibilityLabel="Scan QR code"
                style={styles.iconButton}
                onPress={() => router.push('/scan-qr')}
              >
                <Feather name="maximize" size={21} color="white" />
              </Pressable>
              <View style={styles.separator} />
              <Pressable
                accessibilityLabel="Notifications"
                style={styles.iconButton}
                onPress={() => setShowNotifications(true)}
              >
                <Feather name="bell" size={21} color="white" />
              </Pressable>
            </View>
          </View>
          <View style={styles.balanceBlock}>
            <View style={styles.balanceLabelRow}>
              <Text style={styles.kicker}>CASH + INVESTMENTS</Text>
              <Pressable
                accessibilityLabel={
                  hideBalance ? 'Show balances' : 'Hide balances'
                }
                style={styles.eye}
                onPress={() => setHideBalance(!hideBalance)}
              >
                <Feather
                  name={hideBalance ? 'eye-off' : 'eye'}
                  color="#C1B3D7"
                  size={17}
                />
              </Pressable>
            </View>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>
              {hideBalance
                ? '••••••'
                : pricesReady
                  ? money(cash + investments)
                  : '—'}
            </Text>
            <Text style={styles.demo}>Demo balance · SOL shown separately</Text>
            <View style={styles.wallets}>
              {(
                [
                  {
                    label: 'CASH',
                    colors: ['#9B4FDE', '#6366F1'],
                    text: hideBalance ? '••••' : money(cash),
                  },
                  {
                    label: 'CRYPTO',
                    colors: ['#238D9E', '#6341BB'],
                    text: hideBalance
                      ? '••••'
                      : `${balance.sol.toFixed(3)} SOL`,
                  },
                  {
                    label: 'STOCKS',
                    colors: ['#C98500', '#9B4FDE'],
                    text: hideBalance
                      ? '••••'
                      : pricesReady
                        ? money(investments)
                        : '—',
                  },
                ] as const
              ).map((card) => (
                <View key={card.label} style={styles.wallet}>
                  <LinearGradient
                    colors={card.colors}
                    style={styles.walletGradient}
                  >
                    <Text style={styles.walletLabel}>{card.label}</Text>
                    <Text numberOfLines={1} style={styles.walletValue}>
                      {card.text}
                    </Text>
                  </LinearGradient>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.title}
                style={styles.action}
                onPress={action.onPress}
              >
                <View style={styles.actionIcon}>
                  <Feather name={action.icon} size={20} color="white" />
                </View>
                <Text style={styles.actionText}>{action.title}</Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>
        <View style={styles.assets}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Assets</Text>
            <Pressable
              style={styles.historyLink}
              onPress={() => router.push('/history')}
            >
              <Text style={styles.subtle}>History</Text>
              <Feather name="arrow-up-right" size={14} color="#6B6780" />
            </Pressable>
          </View>
          <AssetRow
            symbol="$"
            name="USDC"
            detail={`${balance.usdc.toFixed(2)} USDC on Devnet`}
            value={hideBalance ? '••••' : money(cash)}
            caption="Demo balance"
            color="#2779CB"
          />
          <AssetRow
            symbol="◎"
            name="Solana"
            detail="Devnet · network fees"
            value={hideBalance ? '••••' : `${balance.sol.toFixed(4)} SOL`}
            caption="On-chain balance"
            color="#7662CE"
          />
          {ledger.holdings.map((holding) => (
            <Pressable
              key={holding.mint}
              onPress={() => router.push('/xstocks')}
            >
              <AssetRow
                symbol={holding.symbol[0]}
                name={holding.symbol}
                detail={`${holding.quantity.toFixed(5)} shares`}
                value={
                  hideBalance
                    ? '••••'
                    : stocks.find((s) => s.id === holding.mint)?.usdPrice
                      ? money(
                          holding.quantity *
                            stocks.find((s) => s.id === holding.mint)!
                              .usdPrice!,
                        )
                      : '—'
                }
                caption="Demo balance"
                color="#6B6780"
              />
            </Pressable>
          ))}
          {!ledger.holdings.length ? (
            <Pressable
              onPress={() => router.push('/xstocks')}
              style={styles.investPrompt}
            >
              <Feather name="trending-up" color="#7B2FBE" size={23} />
              <View style={styles.nameWrap}>
                <Text style={styles.promptTitle}>Discover xStocks</Text>
                <Text style={styles.subtle}>
                  Explore companies with live market prices.
                </Text>
              </View>
              <Feather name="chevron-right" color="#7B2FBE" size={18} />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      <DepositModal
        visible={showReceive}
        onClose={() => setShowReceive(false)}
        solanaAddress={walletAddress}
      />
      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </View>
  );
}

function AssetRow({
  symbol,
  name,
  detail,
  value,
  caption,
  color,
}: {
  symbol: string;
  name: string;
  detail: string;
  value: string;
  caption: string;
  color: string;
}) {
  return (
    <View style={styles.assetRow}>
      <View style={[styles.assetIcon, { backgroundColor: color }]}>
        <Text style={styles.assetSymbol}>{symbol}</Text>
      </View>
      <View style={styles.nameWrap}>
        <Text style={styles.assetName}>{name}</Text>
        <Text style={styles.subtle}>{detail}</Text>
      </View>
      <View style={styles.assetRight}>
        <Text style={styles.assetValue}>{value}</Text>
        <Text style={styles.assetCaption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0A0614' },
  content: {
    flexGrow: 1,
    backgroundColor: 'white',
    paddingBottom: 104,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  loading: { flex: 1, justifyContent: 'center', backgroundColor: '#0A0614' },
  hero: { paddingHorizontal: 20, paddingBottom: 44 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 5,
    paddingRight: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#FFFFFF24',
    backgroundColor: '#FFFFFF12',
    maxWidth: '65%',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 24,
    backgroundColor: '#8455CF',
    overflow: 'hidden',
  },
  nameWrap: { flex: 1 },
  greeting: { color: '#FFFFFFAA', fontFamily: onbFonts.body, fontSize: 10 },
  name: { color: 'white', fontFamily: onbFonts.heading, fontSize: 16 },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#FFFFFF24',
    backgroundColor: '#FFFFFF12',
    paddingHorizontal: 3,
  },
  iconButton: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: { height: 20, width: 1, backgroundColor: '#FFFFFF24' },
  balanceBlock: { marginTop: 26 },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: {
    color: '#FFFFFF99',
    fontFamily: onbFonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  eye: { minWidth: 44, minHeight: 32, justifyContent: 'center' },
  balance: {
    color: 'white',
    fontFamily: onbFonts.heading,
    fontSize: 46,
    letterSpacing: -1.8,
  },
  demo: {
    color: '#D4C9EA',
    fontFamily: onbFonts.body,
    fontSize: 10,
    marginTop: 8,
  },
  wallets: { flexDirection: 'row', gap: 10, marginTop: 20 },
  wallet: { width: 85, borderRadius: 8, overflow: 'hidden' },
  walletGradient: { padding: 8, height: 48, justifyContent: 'space-between' },
  walletLabel: {
    fontFamily: onbFonts.bodyBold,
    fontSize: 8,
    color: '#FFFFFFBB',
  },
  walletValue: { fontFamily: onbFonts.monoBold, fontSize: 9, color: 'white' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 26 },
  action: {
    flex: 1,
    backgroundColor: '#FFFFFFEB',
    borderRadius: 16,
    padding: 12,
    height: 100,
    justifyContent: 'space-between',
    boxShadow: '0 4px 14px rgba(32,12,60,0.08)',
  },
  actionIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#1B1428',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#24192E', fontFamily: onbFonts.bodyBold, fontSize: 9 },
  assets: { paddingHorizontal: 20 },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: onbFonts.heading,
    fontSize: 20,
    color: '#221A2E',
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
  },
  subtle: {
    color: '#6B6780',
    fontFamily: onbFonts.body,
    fontSize: 11,
    marginTop: 4,
  },
  assetRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#F0ECF5',
  },
  assetIcon: {
    width: 42,
    height: 42,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetSymbol: { color: 'white', fontFamily: onbFonts.heading, fontSize: 20 },
  assetName: { color: '#24192E', fontFamily: onbFonts.bodySemi, fontSize: 14 },
  assetRight: { alignItems: 'flex-end' },
  assetValue: { color: '#24192E', fontFamily: onbFonts.monoBold, fontSize: 12 },
  assetCaption: { color: '#6B6780', fontSize: 10, marginTop: 5 },
  investPrompt: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#F6F0FB',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  promptTitle: { fontFamily: onbFonts.heading, color: '#492369', fontSize: 14 },
  error: { color: '#A54C16', fontSize: 12, marginBottom: 12 },
});
