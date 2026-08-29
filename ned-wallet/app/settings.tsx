import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons, Feather } from '@expo/vector-icons';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { getLinkedPhone } from '../services/storage';
import { PhoneManagementModal } from '../components/PhoneManagementModal';

export default function SettingsScreen() {
  const router = useRouter();

  let privy: any = null;
  try {
    privy = usePrivy();
  } catch (e) {
    // safely ignore
  }
  const user = privy?.user || null;
  const logout = privy?.logout || (async () => {});

  let solanaWalletState: any = null;
  try {
    solanaWalletState = useEmbeddedSolanaWallet();
  } catch (e) {
    // safely ignore
  }

  // State thông tin người dùng & SĐT
  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // State các cài đặt hiển thị
  const [stealthMode, setStealthMode] = useState(false);
  const [showEmptyPockets, setShowEmptyPockets] = useState(false);

  // Lấy địa chỉ ví Solana
  const getSolanaAddress = (): string | null => {
    if (!user) return null;
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
    }
    const linkedAccounts = (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const solAccount = linkedAccounts.find(
      (acc: any) => acc.type === 'wallet' && (acc.chain_type === 'solana' || acc.chainType === 'solana')
    );
    return solAccount?.address || null;
  };

  const solanaAddress = getSolanaAddress();

  // Nạp SĐT đã liên kết
  useEffect(() => {
    getLinkedPhone().then(setLinkedPhone).catch(console.log);
  }, []);

  // Trích xuất tên hiển thị từ tài khoản Google hoặc Email
  const getUserDisplayName = (): string => {
    if (!user) return 'Đạt Tuấn';
    const googleAcc =
      (user as any)?.google ||
      (user as any)?.linked_accounts?.find((a: any) => a.type === 'google_oauth' || a.type === 'google');
    if (googleAcc?.name) return googleAcc.name;
    if (googleAcc?.email) return googleAcc.email.split('@')[0];

    const emailAcc = (user as any)?.email;
    if (emailAcc?.address) return emailAcc.address.split('@')[0];

    return 'Đạt Tuấn';
  };

  // Định dạng hiển thị số điện thoại
  const formatPhoneDisplay = (phone: string | null): string => {
    if (!phone) return '+84 938 992 410';
    return phone;
  };

  // Rút gọn địa chỉ ví Solana (VD: 9hdn...Xw5p)
  const formatShortAddress = (addr: string | null): string => {
    if (!addr) return '';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  // Sao chép địa chỉ ví vào bộ nhớ tạm
  const handleCopyWallet = async () => {
    if (!solanaAddress) return;
    try {
      await Clipboard.setStringAsync(solanaAddress);
      Alert.alert('Thông Báo', 'Đã sao chép địa chỉ ví Solana!');
    } catch (e) {
      console.log('Copy wallet error:', e);
    }
  };

  // Xử lý Đăng xuất
  const handleSignOut = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ví N.E.D?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/login');
          } catch (e) {
            console.error('Logout error:', e);
            router.replace('/login');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1B28" />

      {/* Header Bar */}
      <View style={styles.topNavBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header Khu Vực Thông Tin Cá Nhân */}
        <View style={styles.profileHeaderSection}>
          {/* Avatar Tròn Gradient Xanh */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarGradient}>
              <Text style={styles.avatarSymbolText}>Đ</Text>
            </View>
          </View>

          {/* Tên Người Dùng */}
          <Text style={styles.userNameText}>{getUserDisplayName()}</Text>

          {/* Số Điện Thoại & Nút Chỉnh Sửa */}
          <TouchableOpacity
            style={styles.phoneRowBtn}
            onPress={() => setShowPhoneModal(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.phoneText}>
              {formatPhoneDisplay(linkedPhone)}
            </Text>
            <Feather name="edit-2" size={14} color="#94A3B8" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {/* Địa Chỉ Ví Solana Ngầm Rút Gọn & Nút Sao Chép */}
          {solanaAddress ? (
            <TouchableOpacity
              style={styles.walletAddressRowBtn}
              onPress={handleCopyWallet}
              activeOpacity={0.75}
            >
              <View style={styles.solanaDot} />
              <Text style={styles.walletAddressText}>
                {formatShortAddress(solanaAddress)}
              </Text>
              <Feather name="copy" size={13} color="#94A3B8" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : null}

          {/* Badge Google Backed Up */}
          <View style={styles.backedUpBadge}>
            <Ionicons name="logo-google" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.backedUpText}>Google Backed up</Text>
            <Feather name="chevron-right" size={14} color="#FFFFFF" style={{ marginLeft: 3 }} />
          </View>
        </View>

        {/* 2. Nhóm 1 (Tài chính & Lịch sử) */}
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Tiền tệ', 'N.E.D hiện hỗ trợ Việt Nam Đồng (VND) và Đô la Mỹ (USD).')}
          >
            <View style={styles.menuItemLeft}>
              {/* Vietnam Flag Badge */}
              <View style={styles.flagIconCircle}>
                <Text style={{ fontSize: 16 }}>🇻🇳</Text>
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>Local currency</Text>
                <Text style={styles.menuItemSubtitle}>VND</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerLine} />

          {/* Transaction History */}
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => router.push('/history')}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="clock" size={20} color="#94A3B8" style={styles.itemIcon} />
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>Transaction history</Text>
                <Text style={styles.menuItemSubtitle}>Xem chi tiết các giao dịch</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* 3. Nhóm 2 (Hiển thị & Chế độ riêng tư) */}
        <View style={styles.groupCard}>
          {/* Stealth Mode */}
          <View style={styles.menuItemRow}>
            <View style={styles.menuItemLeft}>
              <Feather name="eye-off" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>Stealth mode</Text>
            </View>
            <Switch
              value={stealthMode}
              onValueChange={setStealthMode}
              trackColor={{ false: '#3B3D52', true: '#00A859' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.dividerLine} />

          {/* Show empty pockets */}
          <View style={styles.menuItemRow}>
            <View style={styles.menuItemLeft}>
              <Feather name="briefcase" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>Show empty pockets</Text>
            </View>
            <Switch
              value={showEmptyPockets}
              onValueChange={setShowEmptyPockets}
              trackColor={{ false: '#3B3D52', true: '#00A859' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* 4. Nhóm 3 (Hỗ trợ & Đăng xuất) */}
        <View style={styles.groupCard}>
          {/* Invite friends */}
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Mời bạn bè', 'Chia sẻ N.E.D với bạn bè để cùng trải nghiệm thanh toán Web3 tức thì!')}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="user-plus" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>Invite friends</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerLine} />

          {/* Frequently asked questions */}
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('FAQ', 'Trung tâm trợ giúp N.E.D sẽ sớm được cập nhật.')}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="book-open" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>Frequently asked questions</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerLine} />

          {/* Contact support */}
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Hỗ trợ', 'Vui lòng liên hệ support@ned.finance để được trợ giúp 24/7.')}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="message-square" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>Contact support</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerLine} />

          {/* About */}
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Về N.E.D', 'N.E.D (NorthAxis Electronic Dollars)\nPhiên bản: 1.0.0 (Solana Pay & MiniPay Native)')}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="help-circle" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>About</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerLine} />

          {/* Sign out */}
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={handleSignOut}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="log-out" size={20} color="#EF4444" style={styles.itemIcon} />
              <Text style={[styles.menuItemTitle, { color: '#EF4444' }]}>Sign out</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Padding dưới cùng */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Quản Lý Số Điện Thoại */}
      <PhoneManagementModal
        visible={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        userId={user?.id || ''}
        walletAddress={solanaAddress || ''}
        currentPhone={linkedPhone}
        onPhoneUpdated={(newPhone) => setLinkedPhone(newPhone)}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // 1. Profile Header
  profileHeaderSection: {
    alignItems: 'center',
    marginBottom: 26,
  },
  avatarWrapper: {
    width: 78,
    height: 78,
    borderRadius: 39,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#34D399',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSymbolText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  userNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  phoneRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  phoneText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  walletAddressRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  solanaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#14F195',
    marginRight: 6,
  },
  walletAddressText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#CBD5E1',
    fontWeight: '600',
  },
  backedUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E6B47',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  backedUpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Group Cards (Dark Theme)
  groupCard: {
    backgroundColor: '#2A2C3E',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#34374E',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    marginRight: 14,
    width: 22,
  },
  flagIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#34374E',
    marginLeft: 36,
  },
});
