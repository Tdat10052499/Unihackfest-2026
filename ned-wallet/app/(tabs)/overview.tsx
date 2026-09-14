import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  interpolate 
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 1. Tổng quan Dòng tiền (Hero Stats)
const cashFlowStats = {
  totalBalance: 12540.50, // Tổng tài sản định giá
  metrics: [
    { id: 'available', label: 'Available', amount: 8182.00, color: '#00E5FF' }, // Cyan - Tiền sẵn sàng thanh toán trong Main Wallet
    { id: 'savings', label: 'Savings/Vault', amount: 4358.50, color: '#CDB4DB' }, // Tím - Tiền trong các Sub-wallets
    { id: 'earned', label: 'Earned (In)', amount: 2450.00, color: '#CCFF00' }, // Vàng chanh - Nhận tiền, Host thu tiền, Nhặt Lì xì
    { id: 'spent', label: 'Spent (Out)', amount: -1200.00, color: '#FF6B6B' } // Đỏ - Chuyển đi, Guest trả tiền, Thả Lì xì
  ]
};

// 1.5. Danh sách các thẻ chi tiêu Stablecoin
const walletCards = [
  { id: 'usdt', name: 'USDT', network: 'Solana', balance: 8182.00, color: '#10B981', icon: 'dollar-sign' },
  { id: 'eurc', name: 'EURC', network: 'Solana', balance: 4358.50, color: '#3B82F6', icon: 'euro-sign' },
  { id: 'usdc', name: 'USDC', network: 'Solana', balance: 0.00, color: '#8B5CF6', icon: 'coins' },
];

// 2. Phân bổ Giao dịch theo Tính năng (Category Grid)
const categoryData = [
  { id: 'c1', title: 'Transfers', subtitle: 'Send & Receive', items: 24, amount: 850.00, icon: 'paper-plane', bgColor: '#FFF' },
  { id: 'c2', title: 'Shake to Split', subtitle: 'Group Bills', items: 8, amount: -320.00, icon: 'users', bgColor: '#FFF' },
  { id: 'c3', title: 'Social & Fun', subtitle: 'RedPackets & Toss', items: 15, amount: 120.00, icon: 'gift', bgColor: '#FFF' },
  { id: 'c4', title: 'Gateway', subtitle: 'Deposit & Withdraw', items: 3, amount: 1500.00, icon: 'building', bgColor: '#FFF' }
];

// 3. Biểu đồ Xu hướng (Trend Data)
const trendData = [
  { month: 'Jan', earned: 3200, spent: 1500 },
  { month: 'Feb', earned: 4100, spent: 2100 },
  { month: 'Mar', earned: 2450, spent: 1200 },
];

// 4. Bảng xếp hạng Top Drainers
const topDrainers = [
  { id: 'd1', title: 'Social Pay', amount: -450.00 },
  { id: 'd2', title: 'Weekend Shake', amount: -320.00 },
  { id: 'd3', title: 'Gas Fees (Solana)', amount: -85.50 },
];

const DropdownItem = ({ card, index, isLast, onSelect, isOpen }: any) => {
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
            <FontAwesome5 name={card.icon} size={14} color="#FFF" />
          </View>
          <Text style={[styles.walletCardName, { color: '#000', fontSize: 16 }]}>{card.name}</Text>
        </View>
        <Text style={[styles.walletCardName, { color: '#000', fontWeight: '900' }]}>
          {card.id === 'eurc' ? '€' : '$'}{card.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function AnalyticsScreen() {
  const router = useRouter();
  
  const [selectedWalletId, setSelectedWalletId] = useState('usdt');
  const selectedWallet = walletCards.find(c => c.id === selectedWalletId) || walletCards[0];

  const isOpen = useSharedValue(0);

  const toggleDropdown = () => {
    isOpen.value = isOpen.value === 0 ? 1 : 0;
  };

  const selectWallet = (id: string) => {
    setSelectedWalletId(id);
    isOpen.value = 0;
  };

  const containerStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(isOpen.value * 186, { stiffness: 250, damping: 20, mass: 0.5 }),
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
  const totalAmountForChart = cashFlowStats.metrics.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
  let currentAngle = 0;
  const chartSegments = cashFlowStats.metrics.map((metric) => {
    const segmentAngle = (Math.abs(metric.amount) / totalAmountForChart) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentAngle;
    currentAngle = endAngle;
    
    return {
      ...metric,
      startAngle,
      endAngle
    };
  });

  // Tính toán thanh Budget
  const spendingLimit = 2000;
  const absoluteSpent = Math.abs(cashFlowStats.metrics.find(m => m.id === 'spent')?.amount || 0);
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
                    <FontAwesome5 name={selectedWallet.icon} size={16} color="#FFF" />
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
                  {selectedWallet.id === 'eurc' ? '€' : '$'}{selectedWallet.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          <Animated.View style={[styles.dropdownMenuWrapper, containerStyle]}>
            <View style={styles.dropdownMenuShadow} />
            <View style={styles.dropdownMenuBody}>
              {walletCards.map((card, index) => (
                <DropdownItem 
                  key={card.id} 
                  card={card} 
                  index={index} 
                  isLast={index === walletCards.length - 1} 
                  onSelect={selectWallet} 
                  isOpen={isOpen} 
                />
              ))}
            </View>
          </Animated.View>
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
                Total Balance: ${cashFlowStats.totalBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}
              </Text>
            </View>

            <View style={styles.analyticsContent}>
              {/* Left: Donut Chart */}
              <View style={styles.chartContainer}>
                <Svg width={150} height={150} viewBox="0 0 150 150">
                  <G>
                    {/* Render Segments */}
                    {chartSegments.map((segment) => (
                      <React.Fragment key={`arc-${segment.id}`}>
                        {createArc(segment.startAngle, segment.endAngle, segment.color)}
                      </React.Fragment>
                    ))}
                    
                    {/* Render Separators */}
                    {chartSegments.map((segment) => (
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
                {cashFlowStats.metrics.map(metric => (
                  <View key={metric.id} style={styles.statCell}>
                    <View style={[styles.statDot, { backgroundColor: metric.color }]} />
                    <Text style={styles.statLabel}>{metric.label}</Text>
                    <Text style={styles.statAmount}>
                      {metric.amount < 0 ? '-' : ''}${Math.abs(metric.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
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
            Amount: <Text style={styles.budgetBold}>${absoluteSpent.toLocaleString('en-US', {minimumFractionDigits: 2})} / ${spendingLimit.toLocaleString('en-US', {minimumFractionDigits: 2})}</Text>
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
                        {val === 0 ? '$0' : `$${val/1000}k`}
                      </Text>
                      <View style={styles.gridLine} />
                    </View>
                  ))}
                </View>

                {/* Bars Area (Cột mọc từ đáy) */}
                <View style={styles.trendBarsArea}>
                  {trendData.map((data) => {
                    const maxVal = 5000;
                    // Max height for bars is 150px
                    const earnedHeight = (data.earned / maxVal) * 150; 
                    const spentHeight = (data.spent / maxVal) * 150;
                    
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
                
                {/* X-Axis Baseline */}
                <View style={styles.xAxisBaseline} />
                
                {/* Labels Area (Tách biệt hoàn toàn) */}
                <View style={styles.trendLabelsArea}>
                  {trendData.map((data) => (
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
              {topDrainers.map((item, index) => (
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
                      {item.amount < 0 ? '-' : ''}${Math.abs(item.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
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
    overflow: 'hidden',
  },
  dropdownMenuShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  dropdownMenuBody: {
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
  xAxisBaseline: {
    position: 'absolute',
    bottom: 28, // height of labels area + margin
    left: 45 + 8, // start after the y-axis labels
    right: 0,
    height: 2,
    backgroundColor: '#000',
    zIndex: 2, // baseline rests above the grid but below bars? Or same layer
  },
  trendBarsArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginLeft: 45 + 8, // offset for y-axis labels
    marginBottom: 28, // sitting exactly on the baseline
    overflow: 'hidden', // Make sure bars don't spill
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
});
