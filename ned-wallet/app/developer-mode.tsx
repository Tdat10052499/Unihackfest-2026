import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNetworkStore, SolanaNetwork } from '../stores/useNetworkStore';
import { useTranslation } from '../services/i18n';
import { getHeliusRpcUrl } from '../services/solanaConnection';

export default function DeveloperModeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { activeNetwork, setNetwork, isHydrated } = useNetworkStore();

  const handleSelectNetwork = (network: SolanaNetwork) => {
    if (network === activeNetwork) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    setNetwork(network);

    const networkName = network === 'mainnet-beta' ? 'Mainnet-Beta' : 'Devnet';
    Alert.alert(
      'Chuyển đổi mạng thành công',
      `Ứng dụng đã chuyển sang môi trường Solana ${networkName}. Toàn bộ luồng kết nối ví Phantom và giao dịch sẽ tự động áp dụng.`
    );
  };

  const isMainnet = activeNetwork === 'mainnet-beta';

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1F2E" />

      {/* Top Navigation Bar */}
      <View style={styles.topNavBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitleText}>Developer Mode</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner trạng thái hiện tại */}
        <View style={[styles.statusBanner, isMainnet ? styles.statusBannerMainnet : styles.statusBannerDevnet]}>
          <View style={styles.statusBannerIcon}>
            <MaterialCommunityIcons
              name={isMainnet ? 'check-decagram' : 'flask-outline'}
              size={28}
              color={isMainnet ? '#10B981' : '#F59E0B'}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>MÔI TRƯỜNG ĐANG HOẠT ĐỘNG</Text>
              <View style={[styles.liveIndicator, { backgroundColor: isMainnet ? '#10B981' : '#F59E0B' }]} />
            </View>
            <Text style={styles.statusTitle}>
              {isMainnet ? 'Solana Mainnet-Beta' : 'Solana Devnet (Thử nghiệm)'}
            </Text>
            <Text style={styles.statusDesc}>
              {isMainnet
                ? 'Đang kết nối blockchain chính thức với tài sản thật. Cấu hình bảo mật cao nhất.'
                : 'Đang kết nối môi trường Sandbox thử nghiệm. Thích hợp cho kiểm thử và phát triển.'}
            </Text>
          </View>
        </View>

        {/* Tiêu đề nhóm chọn mạng */}
        <View style={styles.sectionHeaderRow}>
          <Feather name="layers" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <Text style={styles.sectionHeaderText}>LỰA CHỌN MÔI TRƯỜNG MẠNG SOLANA</Text>
        </View>

        {/* Card Lựa chọn 1: Solana Mainnet-Beta */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleSelectNetwork('mainnet-beta')}
          style={[
            styles.networkOptionCard,
            isMainnet && styles.networkOptionCardActiveMainnet,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconCircle, { backgroundColor: '#D8FAF7' }]}>
                <Ionicons name="globe-outline" size={20} color="#0D9488" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.cardTitle, isMainnet && styles.cardTitleActive]}>
                    Solana Mainnet-Beta
                  </Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>Mặc định</Text>
                  </View>
                </View>
                <Text style={styles.cardSubtitle}>Production Environment</Text>
              </View>
            </View>

            {/* Radio Circle */}
            <View style={[styles.radioCircle, isMainnet && styles.radioCircleActiveMainnet]}>
              {isMainnet && <View style={styles.radioInnerMainnet} />}
            </View>
          </View>

          <Text style={styles.cardBodyDesc}>
            Môi trường mạng chính thức của Solana. Sử dụng cho người dùng thực tế với token và ví tiền tệ thực.
          </Text>

          <View style={styles.rpcInfoBox}>
            <Feather name="server" size={12} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.rpcInfoText} numberOfLines={1}>
              RPC: {getHeliusRpcUrl('mainnet-beta')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Card Lựa chọn 2: Solana Devnet */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleSelectNetwork('devnet')}
          style={[
            styles.networkOptionCard,
            !isMainnet && styles.networkOptionCardActiveDevnet,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconCircle, { backgroundColor: '#FFF1A6' }]}>
                <MaterialCommunityIcons name="test-tube" size={20} color="#D97706" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.cardTitle, !isMainnet && styles.cardTitleActive]}>
                    Solana Devnet
                  </Text>
                  <View style={styles.testnetBadge}>
                    <Text style={styles.testnetBadgeText}>Sandbox</Text>
                  </View>
                </View>
                <Text style={styles.cardSubtitle}>Developer Test Environment</Text>
              </View>
            </View>

            {/* Radio Circle */}
            <View style={[styles.radioCircle, !isMainnet && styles.radioCircleActiveDevnet]}>
              {!isMainnet && <View style={styles.radioInnerDevnet} />}
            </View>
          </View>

          <Text style={styles.cardBodyDesc}>
            Môi trường thử nghiệm cho nhà phát triển. Cho phép nhận Faucet SOL và kiểm thử các Smart Contract Anchor miễn phí.
          </Text>

          <View style={styles.rpcInfoBox}>
            <Feather name="server" size={12} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.rpcInfoText} numberOfLines={1}>
              RPC: {getHeliusRpcUrl('devnet')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Tiêu đề nhóm thông tin hệ thống */}
        <View style={styles.sectionHeaderRow}>
          <Feather name="info" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <Text style={styles.sectionHeaderText}>THÔNG TIN KỸ THUẬT & ĐỒNG BỘ</Text>
        </View>

        {/* Bảng thông số hệ thống */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoRowLabel}>Phantom Connect Cluster</Text>
            <Text style={styles.infoRowValueMono}>{activeNetwork}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoRowLabel}>RPC Provider</Text>
            <Text style={styles.infoRowValue}>Helius RPC Node</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoRowLabel}>Trạng thái lưu trữ (Persistence)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.dotSmall, { backgroundColor: isHydrated ? '#10B981' : '#F59E0B' }]} />
              <Text style={styles.infoRowValue}>
                {isHydrated ? 'AsyncStorage (Đã nạp)' : 'Đang nạp...'}
              </Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoRowLabel}>Storage Key</Text>
            <Text style={styles.infoRowValueMono}>@ned_solana_network_v2</Text>
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
    backgroundColor: '#1E1F2E',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#27293D',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusBannerMainnet: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusBannerDevnet: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginLeft: 6,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  networkOptionCard: {
    backgroundColor: '#27293D',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  networkOptionCardActiveMainnet: {
    borderColor: '#10B981',
    backgroundColor: '#2A343F',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  networkOptionCardActiveDevnet: {
    borderColor: '#F59E0B',
    backgroundColor: '#35323A',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardTitleActive: {
    color: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },
  testnetBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  testnetBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActiveMainnet: {
    borderColor: '#10B981',
  },
  radioCircleActiveDevnet: {
    borderColor: '#F59E0B',
  },
  radioInnerMainnet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  radioInnerDevnet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  cardBodyDesc: {
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 12,
  },
  rpcInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rpcInfoText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#27293D',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoRowLabel: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  infoRowValue: {
    fontSize: 12.5,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoRowValueMono: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 4,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
