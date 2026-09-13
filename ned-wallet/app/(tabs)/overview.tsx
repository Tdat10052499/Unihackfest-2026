import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock data
const CATEGORIES = [
  { id: 'bills', label: 'Bills', icon: 'receipt-outline', amount: 250.0, itemsCount: 4 },
  { id: 'food', label: 'Food', icon: 'restaurant-outline', amount: 312.4, itemsCount: 12 },
  { id: 'shopping', label: 'Shopping', icon: 'cart-outline', amount: 150.0, itemsCount: 3 },
  { id: 'transport', label: 'Transport', icon: 'car-outline', amount: 80.5, itemsCount: 8 },
];

export default function AnalyticsScreen() {
  const router = useRouter();

  // Donut chart path calculations
  // Center: 80, 80. Radius: 60, Stroke width: 20
  // Yellow (Earned): 65%
  // Cyan (Available): 20%
  // Purple (Savings): 15%
  const radius = 50;
  const cx = 75;
  const cy = 75;
  const strokeWidth = 24;

  const createArc = (startAngle: number, endAngle: number, color: string) => {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    // Gap for black border around segments requires individual paths with a black stroke
    return (
      <Path
        d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    );
  };


  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (r * Math.cos(angleInRadians)),
      y: centerY + (r * Math.sin(angleInRadians))
    };
  };

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
        {/* 2. CHOOSE ACCOUNT */}
        <TouchableOpacity style={styles.accountCard} activeOpacity={0.9}>
          <View style={styles.accountCardShadow} />
          <View style={styles.accountCardBody}>
            <View style={styles.accountLeft}>
              <View style={styles.accountIconWrapper}>
                <Ionicons name="globe-outline" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.accountName}>Muminul Hoque</Text>
                <Text style={styles.accountNumber}>**** 7845</Text>
              </View>
            </View>
            <View style={styles.accountRight}>
              <Text style={styles.accountBalance}>$8,182.80</Text>
              <Ionicons name="chevron-down" size={20} color="#000" />
            </View>
          </View>
        </TouchableOpacity>

        {/* 3. ANALYTICS CARD */}
        <View style={styles.analyticsWrapper}>
          <View style={styles.analyticsShadow} />
          <View style={styles.analyticsBody}>
            <View style={styles.analyticsHeader}>
              <Text style={styles.analyticsCardTitle}>Monthly overview</Text>
              <TouchableOpacity>
                <Feather name="maximize-2" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.analyticsContent}>
              {/* Left: Donut Chart */}
              <View style={styles.chartContainer}>
                <Svg width={150} height={150} viewBox="0 0 150 150">
                  <G>
                    {/* Fake segments with black borders around them */}
                    {/* Earned: 0 to 234 degrees (65%) */}
                    {createArc(0, 234, '#FFD700')}
                    {/* Available: 234 to 306 degrees (20%) */}
                    {createArc(234, 306, '#00E5FF')}
                    {/* Savings: 306 to 360 degrees (15%) */}
                    {createArc(306, 360, '#E0BBE4')}

                    {/* Outer & Inner borders for brutalism */}
                    <Circle cx={75} cy={75} r={63} fill="none" stroke="#000" strokeWidth={2} />
                    <Circle cx={75} cy={75} r={37} fill="none" stroke="#000" strokeWidth={2} />

                    {/* Center Text */}
                    <SvgText x={75} y={70} textAnchor="middle" fill="#A3A3A3" fontSize={9} fontWeight="bold">Total Balance</SvgText>
                    <SvgText x={75} y={88} textAnchor="middle" fill="#FFF" fontSize={14} fontWeight="900">$8,182.80</SvgText>
                  </G>
                </Svg>
              </View>

              {/* Right: Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statCell}>
                  <View style={[styles.statDot, { backgroundColor: '#FFD700' }]} />
                  <Text style={styles.statLabel}>Earned</Text>
                  <Text style={styles.statAmount}>$5,182</Text>
                </View>
                <View style={styles.statCell}>
                  <View style={[styles.statDot, { backgroundColor: '#FF6B6B' }]} />
                  <Text style={styles.statLabel}>Spent</Text>
                  <Text style={styles.statAmount}>$2,500</Text>
                </View>
                <View style={styles.statCell}>
                  <View style={[styles.statDot, { backgroundColor: '#00E5FF' }]} />
                  <Text style={styles.statLabel}>Available</Text>
                  <Text style={styles.statAmount}>$2,000</Text>
                </View>
                <View style={styles.statCell}>
                  <View style={[styles.statDot, { backgroundColor: '#E0BBE4' }]} />
                  <Text style={styles.statLabel}>Savings</Text>
                  <Text style={styles.statAmount}>$1,000</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 4. BUDGET FOR MONTH */}
        <View style={styles.budgetContainer}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetTitle}>Budget for Sep</Text>
            <TouchableOpacity style={styles.editBtn}>
              <Feather name="edit-2" size={14} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.progressWrapper}>
            <View style={styles.progressShadow} />
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '68%' }]} />
            </View>
          </View>
          
          <Text style={styles.budgetSubText}>Amount: <Text style={styles.budgetBold}>$20,256</Text></Text>
        </View>

        {/* 5. CATEGORY GRID */}
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <View key={cat.id} style={styles.categoryCardWrapper}>
              <View style={styles.categoryCardShadow} />
              <TouchableOpacity style={styles.categoryCardBody} activeOpacity={0.9}>
                <View style={styles.catHeader}>
                  <View style={styles.catIconBox}>
                    <Ionicons name={cat.icon as any} size={20} color="#000" />
                  </View>
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{cat.itemsCount} items</Text>
                  </View>
                </View>
                <Text style={styles.catTitle}>{cat.label}</Text>
                <Text style={styles.catAmount}>${cat.amount.toFixed(2)}</Text>
              </TouchableOpacity>
            </View>
          ))}
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
  accountCard: {
    position: 'relative',
  },
  accountCardShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000',
    borderRadius: 16,
  },
  accountCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  accountNumber: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  accountRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
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
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  analyticsCardTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
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
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  statAmount: {
    color: '#FFF',
    fontSize: 15,
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
    borderRadius: 20,
  },
  categoryCardBody: {
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  catIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#EFE9DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBadge: {
    backgroundColor: '#EFE9DF',
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
  catTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    marginTop: 4,
  },
  catAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
  },
});
