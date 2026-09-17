import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  interpolate 
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { useUserStore } from '../../stores/useUserStore';
import { resolveActiveSolanaAddress } from '../../services/identity';
import { fetchOnChainHistory, ActivityItem, getSolanaBalance } from '../../services/solana';
import { getCachedActivities } from '../../services/storage';
import { useExternalWallet } from '../../src/providers/WalletProvider';
import { useWalletCardsStore, DEFAULT_USDC_CARD } from '../../stores/useWalletCardsStore';
import { useOnchainBalance } from '../../hooks/useOnchainBalance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DropdownItem = ({ card, index, isLast, onSelect, isOpen, isLoading }: any) => {
  const itemStyle = useAnimatedStyle(() => {
    const delay = index * 45;
    return {
      opacity: withDelay(delay, withSpring(isOpen.value, { stiffness: 250, damping: 20, mass: 0.5 })),
      transform: [
        {
          translateY: withDelay(
            delay,
            withSpring(interpolate(isOpen.value, [0, 1], [-15, 0]), { stiffness: 250, damping: 20, mass: 0.5 })
          )
        }
      ]
    };
  });

  return (
    <TouchableOpacity onPress={() => onSelect(card.id)} activeOpacity={0.7}>
      <Animated.View style={[styles.dropdownMenuItem, !isLast && styles.dropdownMenuItemBorder, itemStyle]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.walletCardIcon, { width: 28, height: 28, backgroundColor: card.color }]}>
            {card.logoUrl ? (
              <Image source={{ uri: card.logoUrl }} style={{ width: 18, height: 18, borderRadius: 9 }} resizeMode="contain" />
            ) : (
              <FontAwesome5 name={card.icon || 'coins'} size={14} color="#FFF" />
            )}
          </View>
          <Text style={[styles.walletCardName, { color: '#000', fontSize: 16 }]}>{card.name}</Text>
        </View>
        <Text style={[styles.walletCardName, { color: '#000', fontWeight: '900' }]}>
          {isLoading ? '...' : card.balanceFormatted || `$${card.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}`}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function AnalyticsScreen() {
  const router = useRouter();
  
  let privy: any = null;
  try { privy = usePrivy(); } catch (e) {}
  const user = privy?.user || null;

  let solanaWalletState: any = null;
  try { solanaWalletState = useEmbeddedSolanaWallet(); } catch (e) {}
  const externalWallet = useExternalWallet();

  const getSolanaAddress = (): string | null => {
    return resolveActiveSolanaAddress(
      user,
      externalWallet,
      solanaWalletState,
      useUserStore.getState().walletAddress
    );
  };
  const solanaAddress = getSolanaAddress();

  const [transactions, setTransactions] = useState<ActivityItem[]>([]);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadData = async () => {
        if (!solanaAddress) {
          if (isMounted) setIsLoading(false);
          return;
        }
        setIsLoading(true);
        try {
          const [txData, bal, cachedActs] = await Promise.all([
            fetchOnChainHistory(solanaAddress),
            getSolanaBalance(solanaAddress),
            getCachedActivities(),
          ]);
          if (isMounted) {
            // Hợp nhất dữ liệu cache và on-chain để không bỏ sót giao dịch
            const combined = [...(cachedActs || []), ...(txData || [])];
            const seen = new Set<string>();
            const deduped: ActivityItem[] = [];
            for (const item of combined) {
              const key = item.signature || item.id;
              if (key && !seen.has(key)) {
                seen.add(key);
                deduped.push(item);
              }
            }

            // Lọc bỏ hoàn toàn các giao dịch phí mạng (Gas Fee) và các giao dịch $0.00 rác
            const validTransactions = deduped.filter((tx: ActivityItem) => {
              if (!tx) return false;
              if (tx.isNetworkFee === true || tx.type === 'GAS_FEE') return false;
              const cleanAmount = Math.abs(parseFloat(tx.amount.replace(/[^0-9.-]+/g, '')) || 0);
              return cleanAmount >= 0.01;
            });
            setTransactions(validTransactions);
            setSolBalance(bal || 0);
          }
        } catch (error) {
          console.error("Error fetching overview data", error);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };
      loadData();
      return () => { isMounted = false; };
    }, [solanaAddress])
  );

  const { walletCards: globalStablecoins, loadCardsForWallet, activeWalletAddress } = useWalletCardsStore();
  const { usdcBalance: onchainUsdcBalance } = useOnchainBalance(solanaAddress);

  useEffect(() => {
    if (solanaAddress) {
      loadCardsForWallet(solanaAddress);
    }
  }, [solanaAddress, activeWalletAddress]);

  // Đồng bộ Dropdown Chọn Ví từ Global State thẻ ví (Home)
  const walletCards = useMemo(() => {
    if (!globalStablecoins || globalStablecoins.length === 0) {
      return [{
        id: 'usdc_default',
        currency: 'USDC',
        name: 'US DOLLAR',
        network: 'Solana',
        balance: onchainUsdcBalance || 0,
        balanceFormatted: `$${(onchainUsdcBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        color: '#00E5FF',
        icon: 'coins',
        logoUrl: DEFAULT_USDC_CARD.logoUrl,
        symbol: '$',
      }];
    }

    return globalStablecoins.map(coin => {
      let balance = 0;
      let balanceFormatted = '$0.00';

      if (coin.currency === 'USDC') {
        balance = onchainUsdcBalance || 0;
        balanceFormatted = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else {
        const rawStr = coin.balanceFormatted || coin.balanceUsd || '0';
        const parsed = parseFloat(rawStr.replace(/[^0-9.-]+/g, '')) || 0;
        balance = parsed;
        const sym = coin.currency === 'EURC' ? '€' : '$';
        balanceFormatted = coin.balanceFormatted || `${sym}${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      return {
        id: coin.id || coin.currency.toLowerCase(),
        currency: coin.currency,
        name: coin.name || coin.currency,
        network: coin.network || 'Solana',
        balance,
        balanceFormatted,
        color: coin.themeColor || '#00E5FF',
        icon: 'coins',
        logoUrl: coin.logoUrl,
        symbol: coin.symbol || (coin.currency === 'EURC' ? '€' : '$'),
      };
    });
  }, [globalStablecoins, onchainUsdcBalance]);

  const [selectedWalletId, setSelectedWalletId] = useState('');
  const selectedWallet = useMemo(() => {
    if (!walletCards || walletCards.length === 0) {
      return {
        id: 'usdc_default',
        currency: 'USDC',
        name: 'US DOLLAR',
        network: 'Solana',
        balance: onchainUsdcBalance || 0,
        balanceFormatted: `$${(onchainUsdcBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        color: '#00E5FF',
        icon: 'coins',
        logoUrl: DEFAULT_USDC_CARD.logoUrl,
        symbol: '$',
      };
    }
    const found = walletCards.find((c: any) => c.id === selectedWalletId || c.currency?.toLowerCase() === selectedWalletId.toLowerCase());
    return found || walletCards[0];
  }, [walletCards, selectedWalletId, onchainUsdcBalance]);

  const currencySymbol = useMemo(() => {
    if (selectedWallet.currency === 'EURC') return '€';
    if (selectedWallet.currency === 'VND') return '₫';
    if (selectedWallet.symbol && selectedWallet.symbol.length <= 2 && selectedWallet.symbol !== selectedWallet.currency) {
      return selectedWallet.symbol;
    }
    return '$';
  }, [selectedWallet]);

  // Lọc giao dịch chỉ thuộc về loại Thẻ / Stablecoin đang được chọn
  const cardTransactions = useMemo(() => {
    const targetCurrency = (selectedWallet.currency || 'USDC').toUpperCase();
    return transactions.filter((tx: ActivityItem) => {
      if (!tx) return false;
      if (tx.currency) {
        return tx.currency.toUpperCase() === targetCurrency;
      }
      if (tx.amount?.includes('€')) {
        return targetCurrency === 'EURC';
      }
      if (tx.amount?.includes('₫')) {
        return targetCurrency === 'VND';
      }
      return targetCurrency === 'USDC';
    });
  }, [transactions, selectedWallet.currency]);

  const cashFlowStats = useMemo(() => {
    let earned = 0;
    let spent = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    cardTransactions.forEach(tx => {
      if (tx.blockTime) {
        const date = new Date(tx.blockTime * 1000);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          const amt = Math.abs(parseFloat(tx.amount.replace(/[^0-9.-]+/g, '')) || 0);
          if (tx.isPositive) {
            earned += amt;
          } else {
            spent += amt;
          }
        }
      } else {
        const amt = Math.abs(parseFloat(tx.amount.replace(/[^0-9.-]+/g, '')) || 0);
        if (tx.isPositive) {
          earned += amt;
        } else {
          spent += amt;
        }
      }
    });

    const cardBalance = selectedWallet.balance || 0;

    return {
      cardBalance,
      metrics: [
        { id: 'available', label: 'Available', amount: cardBalance, color: '#00E5FF' },
        { id: 'savings', label: 'Savings/Vault', amount: 0, color: '#CDB4DB' },
        { id: 'earned', label: 'Earned (In)', amount: earned, color: '#CCFF00' },
        { id: 'spent', label: 'Spent (Out)', amount: spent, color: '#FF6B6B' }
      ]
    };
  }, [cardTransactions, selectedWallet.balance]);

  const trendData = useMemo(() => {
    const map = new Map<string, { month: string, earned: number, spent: number, ts: number }>();
    cardTransactions.forEach(tx => {
      const blockTime = tx.blockTime || Math.floor(Date.now() / 1000);
      const d = new Date(blockTime * 1000);
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const key = `${month} ${year}`;
      
      if (!map.has(key)) {
        map.set(key, { month, earned: 0, spent: 0, ts: d.getTime() });
      }
      const amt = Math.abs(parseFloat(tx.amount.replace(/[^0-9.-]+/g, '')) || 0);
      if (tx.isPositive) {
        map.get(key)!.earned += amt;
      } else {
        map.get(key)!.spent += amt;
      }
    });
    const sorted = Array.from(map.values()).sort((a, b) => a.ts - b.ts);
    const last3 = sorted.slice(-3);
    if (last3.length === 0) {
      const now = new Date();
      const emptyMonths = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        emptyMonths.push({
          month: d.toLocaleString('en-US', { month: 'short' }),
          earned: 0,
          spent: 0,
        });
      }
      return emptyMonths;
    }
    return last3;
  }, [cardTransactions]);

  const topDrainers = useMemo(() => {
    const sent = cardTransactions
      .map((tx, idx) => {
        const amt = Math.abs(parseFloat(tx.amount.replace(/[^0-9.-]+/g, '')) || 0);
        return {
          id: tx.id || `d${idx}`,
          title: tx.title || 'Spending',
          amount: amt,
          isPositive: tx.isPositive,
        };
      })
      .filter(tx => !tx.isPositive && tx.amount >= 0.01);

    sent.sort((a, b) => b.amount - a.amount);
    return sent.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title,
      amount: -item.amount
    }));
  }, [cardTransactions]);

  const isOpen = useSharedValue(0);

  const toggleDropdown = () => {
    isOpen.value = isOpen.value === 0 ? 1 : 0;
  };

  const selectWallet = (id: string) => {
    setSelectedWalletId(id);
    isOpen.value = 0;
  };

  const dropdownHeight = Math.max(1, walletCards.length) * 62;
  const containerStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(isOpen.value * dropdownHeight, { stiffness: 250, damping: 20, mass: 0.5 }),
      opacity: withSpring(isOpen.value, { stiffness: 250, damping: 20, mass: 0.5 }),
    };
  });

  const mainCardStyle = useAnimatedStyle(() => {
    const rad = interpolate(isOpen.value, [0, 1], [16, 0]);
    return {
      borderBottomLeftRadius: rad,
      borderBottomRightRadius: rad,
    };
  });

  const chevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${interpolate(isOpen.value, [0, 1], [0, 180])}deg` }]
    };
  });

  const radius = 50;
  const cx = 75;
  const cy = 75;
  const strokeWidth = 24;

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (r * Math.cos(angleInRadians)),
      y: centerY + (r * Math.sin(angleInRadians))
    };
  };

  const createArc = (startAngle: number, endAngle: number, color: string) => {
    if (endAngle - startAngle >= 359.9) {
      return (
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
        />
      );
    }
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return (
      <Path
        d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    );
  };

  const createSeparator = (angle: number) => {
    const innerRadius = radius - strokeWidth / 2;
    const outerRadius = radius + strokeWidth / 2;
    const inner = polarToCartesian(cx, cy, innerRadius, angle);
    const outer = polarToCartesian(cx, cy, outerRadius, angle);
    return (
      <Path 
        d={`M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`} 
        stroke="#000" 
        strokeWidth={2} 
        strokeLinecap="butt" 
      />
    );
  };

  // Tính toán góc cho Donut Chart dựa trên giá trị tuyệt đối
  const totalAmountForChart = cashFlowStats.metrics.reduce((acc: number, curr: any) => acc + Math.abs(curr.amount), 0);
  let currentAngle = 0;
  const chartSegments = totalAmountForChart === 0 ? [] : cashFlowStats.metrics.map((metric: any) => {
    const segmentAngle = (Math.abs(metric.amount) / totalAmountForChart) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentAngle;
    currentAngle = endAngle;
    
    return {
      ...metric,
      startAngle,
      endAngle
    };
  }).filter((segment: any) => segment.endAngle > segment.startAngle);

  // Tính toán thanh Budget
  const spendingLimit = 2000;
  const absoluteSpent = Math.abs(cashFlowStats.metrics.find((m: any) => m.id === 'spent')?.amount || 0);
  const budgetPercentage = Math.min((absoluteSpent / spendingLimit) * 100, 100);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. CHOOSE ACCOUNT (Stablecoin Dropdown) */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity 
            style={styles.dropdownMainCard} 
            activeOpacity={0.9} 
            onPress={toggleDropdown}
          >
            <Animated.View style={[styles.walletCardShadow, mainCardStyle]} />
            <Animated.View style={[styles.walletCardBody, mainCardStyle]}>
              <View style={styles.walletCardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.walletCardIcon, { backgroundColor: selectedWallet.color }]}>
                    {selectedWallet.logoUrl ? (
                      <Image source={{ uri: selectedWallet.logoUrl }} style={{ width: 20, height: 20, borderRadius: 10 }} resizeMode="contain" />
                    ) : (
                      <FontAwesome5 name={selectedWallet.icon || 'coins'} size={16} color="#FFF" />
                    )}
                  </View>
                  <Text style={styles.walletCardName}>{selectedWallet.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.walletCardNetwork}>
                    <Text style={styles.walletCardNetworkText}>{selectedWallet.network}</Text>
                  </View>
                  <Animated.View style={chevronStyle}>
                    <Ionicons name="chevron-down" size={20} color="#000" />
                  </Animated.View>
                </View>
              </View>
              <View style={styles.walletCardBottom}>
                <Text style={styles.walletCardBalance}>
                  {isLoading ? '...' : selectedWallet.balanceFormatted || `$${(selectedWallet.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.dropdownMenuWrapper}>
            <Animated.View style={[styles.dropdownMenuShadow, containerStyle]} />
            <Animated.View style={[styles.dropdownMenuBody, containerStyle]}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                {walletCards.map((card: any, index: number) => (
                  <DropdownItem 
                    key={card.id} 
                    card={card} 
                    index={index} 
                    isLast={index === walletCards.length - 1} 
                    onSelect={selectWallet} 
                    isOpen={isOpen} 
                    isLoading={isLoading}
                  />
                ))}
              </View>
            </Animated.View>
          </View>
        </View>

        {/* 3. ANALYTICS CARD */}
        <View style={styles.analyticsWrapper}>
          <View style={styles.analyticsShadow} />
          <View style={styles.analyticsBody}>
            <View style={styles.analyticsHeader}>
              <Text style={styles.analyticsCardTitle}>Cash Flow Overview</Text>
              <TouchableOpacity>
                <Feather name="maximize-2" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* NEW: Total Balance Header inside the card */}
            <View style={styles.analyticsTotalBalanceContainer}>
              <Text style={styles.analyticsTotalBalanceText} adjustsFontSizeToFit={true} numberOfLines={1}>
                {isLoading ? 'Loading...' : `${selectedWallet.name || selectedWallet.currency} Balance: ${currencySymbol}${(selectedWallet.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`}
              </Text>
            </View>

            <View style={styles.analyticsContent}>
              {/* Left: Donut Chart */}
              <View style={styles.chartContainer}>
                <Svg width={150} height={150} viewBox="0 0 150 150">
                  <G>
                    {/* Placeholder if no data */}
                    {totalAmountForChart === 0 && (
                      <Circle cx={75} cy={75} r={50} fill="none" stroke="#E2E8F0" strokeWidth={24} />
                    )}

                    {/* Render Segments */}
                    {chartSegments.map((segment: any) => (
                      <React.Fragment key={`arc-${segment.id}`}>
                        {createArc(segment.startAngle, segment.endAngle, segment.color)}
                      </React.Fragment>
                    ))}
                    
                    {/* Render Separators - Chỉ hiển thị khi có từ 2 segment trở lên */}
                    {chartSegments.length > 1 && chartSegments.map((segment: any) => (
                      <React.Fragment key={`sep-${segment.id}`}>
                        {createSeparator(segment.startAngle)}
                      </React.Fragment>
                    ))}

                    {/* Outer & Inner borders for brutalism */}
                    <Circle cx={75} cy={75} r={63} fill="none" stroke="#000" strokeWidth={2} />
                    <Circle cx={75} cy={75} r={37} fill="none" stroke="#000" strokeWidth={2} />
                  </G>
                </Svg>
                
                {/* Center Icon instead of text */}
                <View style={styles.donutCenterIcon}>
                  <FontAwesome5 name="wallet" size={24} color="#FFF" />
                </View>
              </View>

              {/* Right: Stats Grid */}
              <View style={styles.statsGrid}>
                {cashFlowStats.metrics.map((metric: any) => (
                  <View key={metric.id} style={styles.statCell}>
                    <View style={[styles.statDot, { backgroundColor: metric.color }]} />
                    <Text style={styles.statLabel}>{metric.label}</Text>
                    <Text style={styles.statAmount}>
                      {isLoading ? '...' : `${metric.amount < 0 ? '-' : ''}${currencySymbol}${Math.abs(metric.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 4. BUDGET FOR MONTH (Monthly Outflow Cap) */}
        <View style={styles.budgetContainer}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetTitle}>Monthly Outflow Cap</Text>
            <TouchableOpacity style={styles.editBtn}>
              <Feather name="edit-2" size={14} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.progressWrapper}>
            <View style={styles.progressShadow} />
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${budgetPercentage}%` }]} />
            </View>
          </View>
          
          <Text style={styles.budgetSubText}>
            Amount: <Text style={styles.budgetBold}>{isLoading ? '...' : `${currencySymbol}${absoluteSpent.toLocaleString('en-US', {minimumFractionDigits: 2})} / ${currencySymbol}${spendingLimit.toLocaleString('en-US', {minimumFractionDigits: 2})}`}</Text>
          </Text>
        </View>

        {/* BOTTOM HALF WRAPPER (gap: 24) */}
        <View style={styles.bottomHalfContainer}>
          {/* 5. MONTHLY TREND (DOUBLE BAR CHART) */}
          <View style={styles.trendContainer}>
            <View style={styles.trendShadow} />
            <View style={styles.trendBody}>
              <View style={styles.trendHeaderContainer}>
                <Text style={styles.trendHeader}>Cash Flow Trend</Text>
                <View style={styles.trendLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#00E5FF' }]} />
                    <Text style={styles.legendText}>Earned</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#FF6B6B' }]} />
                    <Text style={styles.legendText}>Spent</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.trendChartContainer}>
                {/* Y-Axis Gridlines & Labels */}
                <View style={styles.yAxisGrid}>
                  {[5000, 2500, 0].map((val, idx) => (
                    <View key={`grid-${idx}`} style={styles.gridLineWrapper}>
                      <Text style={styles.gridLabel} numberOfLines={1}>
                        {val === 0 ? `${currencySymbol}0` : `${currencySymbol}${val/1000}k`}
                      </Text>
                      <View style={styles.gridLine} />
                    </View>
                  ))}
                </View>

                {/* Bars Area (Cột mọc từ đáy) */}
                <View style={styles.trendBarsArea}>
                  {trendData.map((data: any) => {
                    const maxVal = Math.max(10, ...trendData.map((d: any) => Math.max(d.earned, d.spent)));
                    // Max height for bars is 150px
                    const earnedHeight = isLoading ? 0 : (data.earned / maxVal) * 150; 
                    const spentHeight = isLoading ? 0 : (data.spent / maxVal) * 150;
                    
                    return (
                      <View key={data.month} style={styles.trendColumnGroup}>
                        {/* Earned Bar */}
                        <View style={[styles.barCore, { backgroundColor: '#00E5FF', height: earnedHeight }]} />
                        {/* Spent Bar */}
                        <View style={[styles.barCore, { backgroundColor: '#FF6B6B', height: spentHeight }]} />
                      </View>
                    );
                  })}
                </View>
                
                {/* Labels Area (Tách biệt hoàn toàn) */}
                <View style={styles.trendLabelsArea}>
                  {trendData.map((data: any) => (
                    <View key={`label-${data.month}`} style={styles.monthLabelWrapper}>
                      <Text style={styles.monthLabel}>{data.month}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* 6. TOP DRAINERS (LEADERBOARD) */}
          <View style={styles.leaderboardContainer}>
            <View style={styles.leaderboardHeader}>
              <Text style={styles.leaderboardTitle}>Top Drainers</Text>
              <FontAwesome5 name="fire" size={18} color="#FF6B6B" />
            </View>
            
            <View style={styles.leaderboardList}>
              {topDrainers.length === 0 && !isLoading ? (
                <View style={styles.emptyDrainerBox}>
                  <Feather name="info" size={20} color="#64748B" style={{ marginBottom: 6 }} />
                  <Text style={styles.emptyDrainerText}>
                    Chưa có giao dịch chi tiêu nào cho thẻ {selectedWallet.name || selectedWallet.currency}.
                  </Text>
                </View>
              ) : topDrainers.map((item: any, index: number) => (
                <View key={item.id} style={styles.drainerCardWrapper}>
                  <View style={styles.drainerCardShadow} />
                  <View style={styles.drainerCardBody}>
                    <View style={styles.drainerLeft}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                      </View>
                      <Text style={styles.drainerName}>{item.title}</Text>
                    </View>
                    <Text style={styles.drainerAmount}>
                      {isLoading ? '...' : `${item.amount < 0 ? '-' : ''}${currencySymbol}${Math.abs(item.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#EFE9DF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
    paddingBottom: 100,
    paddingTop: 12,
  },
  
  // CHOOSE ACCOUNT
  // STABLECOIN DROPDOWN
  dropdownContainer: {
    position: 'relative',
    zIndex: 100, // Ensure dropdown renders over the Analytics card below
  },
  dropdownMainCard: {
    width: '100%',
    position: 'relative',
    height: 120,
  },
  walletCardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000',
    borderRadius: 16,
  },
  walletCardBody: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  walletCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCardNetwork: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  walletCardNetworkText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
  },
  walletCardBottom: {
    marginTop: 12,
  },
  walletCardName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  walletCardBalance: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1,
  },
  dropdownMenuWrapper: {
    position: 'absolute',
    top: '100%', // Just below the main card
    marginTop: -3, // pull up to overlap border
    left: 0,
    right: 0,
    zIndex: 20,
  },
  dropdownMenuShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '100%',
    backgroundColor: '#000',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  dropdownMenuBody: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
  },
  dropdownMenuItemBorder: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },

  // ANALYTICS CARD
  analyticsWrapper: {
    position: 'relative',
  },
  analyticsShadow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: -6,
    bottom: -6,
    backgroundColor: '#000',
    borderRadius: 24,
  },
  analyticsBody: {
    backgroundColor: '#311B5E', // Deep purple
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    flexDirection: 'column', // Make it column
    gap: 16,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  analyticsCardTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  analyticsTotalBalanceContainer: {
    width: '100%',
  },
  analyticsTotalBalanceText: {
    color: '#FFF',
    fontSize: 32, // Large font size to fit width
    fontWeight: '900', // Black font weight equivalent
    letterSpacing: -1,
  },
  analyticsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chartContainer: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutCenterIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
    columnGap: 8,
  },
  statCell: {
    width: '45%',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  statLabel: {
    color: '#A3A3A3',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  statAmount: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // BUDGET FOR MONTH
  budgetContainer: {
    gap: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  progressWrapper: {
    position: 'relative',
    height: 24,
  },
  progressShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  progressTrack: {
    height: 24,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#CCFF00', // Lime
    borderRightWidth: 2,
    borderRightColor: '#000',
  },
  budgetSubText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  budgetBold: {
    fontWeight: '900',
    color: '#000',
  },

  // CATEGORY GRID
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16, // row gap
  },
  categoryCardWrapper: {
    width: '47.5%',
    position: 'relative',
    marginBottom: 6,
  },
  categoryCardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000',
    borderRadius: 16, // User requested 16px
  },
  categoryCardBody: {
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#EFE9DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBadge: {
    backgroundColor: '#F3F4F6', // xám nhạt
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  catTextContainer: {
    marginTop: 4,
  },
  catTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  catSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 2,
  },
  catAmount: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  // -------------------------
  // NEW BOTTOM HALF STYLES
  // -------------------------
  bottomHalfContainer: {
    gap: 24,
    marginTop: 8,
  },
  
  // TREND CHART
  trendContainer: {
    position: 'relative',
  },
  trendShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000',
    borderRadius: 16,
  },
  trendBody: {
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 16,
    padding: 20,
    height: 280, // User asked for ~240px. 280px provides great space for the 150px bars + header.
  },
  trendHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  trendHeader: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  trendLegend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  trendChartContainer: {
    flex: 1,
    position: 'relative',
    marginTop: 8,
  },
  yAxisGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 28, // space for x labels
    justifyContent: 'space-between',
  },
  gridLineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gridLabel: {
    minWidth: 45, // Make sure 'k' doesn't drop
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textAlign: 'right',
  },
  gridLine: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
    borderColor: '#D4D4D4',
    borderStyle: 'dashed',
  },
  trendBarsArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginLeft: 45 + 8, // offset for y-axis labels
    borderBottomWidth: 2,
    borderColor: '#000',
    zIndex: 3,
  },
  trendColumnGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 0, // No gap between Earned and Spent
  },
  barCore: {
    width: 24,
    borderWidth: 2,
    borderBottomWidth: 0, // Blends perfectly with the baseline
    borderColor: '#000',
    borderRadius: 0,
  },
  trendLabelsArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 45 + 8,
    marginTop: 8, // An toàn không đè đường kẻ
    height: 20,
  },
  monthLabelWrapper: {
    width: 48, // 24 + 24 width of the two bars combined to center text below them
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  
  // TOP DRAINERS
  leaderboardContainer: {
    gap: 16,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
  },
  leaderboardList: {
    gap: 12,
  },
  drainerCardWrapper: {
    position: 'relative',
  },
  drainerCardShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  drainerCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    padding: 12,
  },
  drainerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    backgroundColor: '#CCFF00',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
  },
  drainerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  drainerAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B6B',
  },
  emptyDrainerBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  emptyDrainerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
