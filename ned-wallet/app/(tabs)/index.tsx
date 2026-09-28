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
import { Redirect, useFocusEffect, useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/services/auth';
import { useUserStore } from '@/stores/useUserStore';
import { getSolanaBalance, getUsdcTokenBalance } from '@/services/solana';
import { getDemoLedger, type DemoLedger } from '@/services/demoLedger';
import { getXStocks, type XStock } from '@/services/xstocks';
import { NotificationModal } from '@/components/NotificationModal';
import { AmbientGlow } from '@/components/design';
import { MASCOT_IMAGES } from '@/constants/mascot';
import { blur, colors, dataColors, diagonal, fonts, glass, gradients, home, light, radius, shadows, sizes, space, type } from '@/constants/design';

const walletCards = [
  { label: 'CASH', colors: home.walletCards.cash },
  { label: 'CRYPTO', colors: home.walletCards.crypto },
  { label: 'STOCKS', colors: home.walletCards.stocks },
] as const;

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
        <ActivityIndicator color={colors.purple[300]} />
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
      onPress: () => router.push('/receive' as Href),
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
            tintColor={colors.purple[300]}
          />
        }
      >
        <LinearGradient
          colors={home.heroColors}
          locations={home.heroLocations}
          style={[styles.hero, { paddingTop: Math.max(insets.top, space[4]) }]}
        >
          <AmbientGlow preset="homeHero" />
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.push('/settings')}
              style={styles.profile}
              accessibilityLabel="Your profile"
            >
              <LinearGradient colors={gradients.purpleIndigo} {...diagonal} style={styles.avatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <Image source={MASCOT_IMAGES.lineArt} style={styles.avatarArt} resizeMode="contain" />
                )}
              </LinearGradient>
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
                <Feather name="maximize" size={20} color={colors.text} />
              </Pressable>
              <View style={styles.separator} />
              <Pressable
                accessibilityLabel="Notifications"
                style={styles.iconButton}
                onPress={() => setShowNotifications(true)}
              >
                <Feather name="bell" size={20} color={colors.text} />
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
                  color={colors.textSecondary}
                  size={17}
                />
              </Pressable>
            </View>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>
              {hideBalance ? (
                '••••••'
              ) : pricesReady ? (
                <>
                  {money(cash + investments).slice(0, -3)}
                  <Text style={styles.cents}>{money(cash + investments).slice(-3)}</Text>
                </>
              ) : (
                '—'
              )}
            </Text>
            <Text style={styles.demo}>Demo balance · SOL shown separately</Text>
            <View style={styles.wallets}>
              {walletCards.map((card) => (
                <LinearGradient
                  key={card.label}
                  colors={card.colors}
                  locations={home.walletLocations}
                  {...diagonal}
                  style={styles.wallet}
                >
                  <Image source={MASCOT_IMAGES.lineArt} style={styles.walletArt} resizeMode="contain" />
                  <Text style={styles.walletLabel}>{card.label}</Text>
                </LinearGradient>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add money"
                onPress={() => router.push('/receive' as Href)}
                style={styles.addWallet}
              >
                <Feather name="plus" size={18} color={colors.text} />
              </Pressable>
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
                  <Feather name={action.icon} size={18} color={colors.text} />
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
              <Text style={styles.historyText}>History</Text>
              <Feather name="arrow-up-right" size={14} color={light.textSecondary} />
            </Pressable>
          </View>
          <AssetRow
            symbol="$"
            name="USDC"
            detail={`${balance.usdc.toFixed(2)} USDC on Devnet`}
            value={hideBalance ? '••••' : money(cash)}
            caption="Demo balance"
            color={dataColors.usdc}
          />
          <AssetRow
            symbol="◎"
            name="Solana"
            detail="Devnet · network fees"
            value={hideBalance ? '••••' : `${balance.sol.toFixed(4)} SOL`}
            caption="On-chain balance"
            color={dataColors.sol}
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
                color={dataColors.other}
              />
            </Pressable>
          ))}
          {!ledger.holdings.length ? (
            <Pressable
              onPress={() => router.push('/xstocks')}
              style={styles.investPrompt}
            >
              <Feather name="trending-up" color={light.accent} size={22} />
              <View style={styles.nameWrap}>
                <Text style={styles.promptTitle}>Discover xStocks</Text>
                <Text style={styles.subtle}>
                  Explore companies with live market prices.
                </Text>
              </View>
              <Feather name="chevron-right" color={light.accent} size={18} />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
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
  page: { flex: 1, backgroundColor: home.heroTop },
  content: {
    flexGrow: 1,
    backgroundColor: light.background,
    paddingBottom: 104,
    maxWidth: sizes.maxContent,
    width: '100%',
    alignSelf: 'center',
  },
  loading: { flex: 1, justifyContent: 'center', backgroundColor: home.heroTop },
  hero: { paddingHorizontal: space[5], paddingBottom: space[16], overflow: 'hidden' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: 52,
    paddingLeft: 5,
    paddingRight: space[4],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: glass.borderStrong,
    backgroundColor: glass.fillStrong,
    boxShadow: shadows.glassPill,
    ...blur.glass,
    maxWidth: '65%',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarArt: { width: 42, height: 43, marginBottom: -4 },
  nameWrap: { flex: 1, minWidth: 0 },
  greeting: { ...type.caption, color: colors.textSecondary },
  name: { ...type.bodyLarge, fontFamily: fonts.display, lineHeight: 20 },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: glass.borderStrong,
    backgroundColor: glass.fillStrong,
    boxShadow: shadows.glassPill,
    ...blur.glass,
    paddingHorizontal: space[1],
  },
  iconButton: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: { height: 20, width: 1, backgroundColor: glass.borderStrong },
  balanceBlock: { marginTop: space[8] },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  kicker: { ...type.label, letterSpacing: 1.4 },
  eye: { minWidth: sizes.touch, minHeight: 32, justifyContent: 'center' },
  balance: { ...type.hero, letterSpacing: -1.8, lineHeight: 52, marginTop: space[2] },
  cents: { color: home.cents },
  demo: { ...type.caption, color: colors.textSecondary, marginTop: space[2] },
  wallets: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  wallet: {
    width: 64,
    height: 40,
    borderRadius: radius.sm,
    overflow: 'hidden',
    boxShadow: shadows.miniCard,
  },
  walletArt: { position: 'absolute', right: -6, bottom: -8, width: 34, height: 35, opacity: 0.55 },
  walletLabel: { position: 'absolute', left: 7, top: 6, fontFamily: fonts.mono, fontSize: 8, lineHeight: 10, color: glass.cardLabel },
  addWallet: {
    width: 64,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: home.addCardBorder,
    backgroundColor: glass.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: space[2], marginTop: space[6] },
  action: {
    flex: 1,
    backgroundColor: home.tile,
    borderRadius: radius.lg,
    padding: space[3],
    height: 104,
    justifyContent: 'space-between',
    boxShadow: shadows.tile,
  },
  actionIcon: {
    width: 30,
    height: 30,
    backgroundColor: light.text,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontFamily: fonts.displaySemi, fontSize: 12, letterSpacing: 0.8, color: light.text },
  assets: { paddingHorizontal: space[5] },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[2],
  },
  sectionTitle: { ...type.h3, fontFamily: fonts.display, color: light.text },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: sizes.touch },
  historyText: { ...type.body, fontFamily: fonts.bodyMedium, color: light.textSecondary },
  subtle: { ...type.caption, color: light.textSecondary, marginTop: 2 },
  assetRow: {
    flexDirection: 'row',
    gap: space[3],
    alignItems: 'center',
    paddingVertical: space[4],
    borderBottomWidth: 1,
    borderColor: light.divider,
  },
  assetIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetSymbol: { ...type.h3, fontFamily: fonts.display, color: colors.text },
  assetName: { ...type.bodyLarge, fontFamily: fonts.bodySemi, fontSize: 15, color: light.text },
  assetRight: { alignItems: 'flex-end' },
  assetValue: { ...type.mono, fontFamily: fonts.monoBold, color: light.text },
  assetCaption: { ...type.caption, color: light.textSecondary, marginTop: 2 },
  investPrompt: {
    flexDirection: 'row',
    gap: space[3],
    alignItems: 'center',
    backgroundColor: light.surface,
    padding: space[4],
    borderRadius: radius.lg,
    marginTop: space[5],
  },
  promptTitle: { ...type.bodyLarge, fontFamily: fonts.display, fontSize: 15, color: light.text },
  error: { ...type.caption, color: light.errorText, marginBottom: space[3] },
});
