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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import { getLinkedPhone, setLinkedPhone as setLinkedPhoneStorage, executeHardReset } from '../services/storage';
import { getUserPhoneNumberFromDB, getAccountIdentifier, getMaskedPhone } from '../services/identity';
import { useTranslation, changeAppLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '../services/i18n';
import { PhoneManagementModal } from '../components/PhoneManagementModal';
import { useNetworkStore, SolanaNetwork } from '../stores/useNetworkStore';
import { useExternalWallet } from '../src/providers/WalletProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const externalWallet = useExternalWallet();

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
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // State các cài đặt hiển thị
  const [stealthMode, setStealthMode] = useState(false);
  const [showEmptyPockets, setShowEmptyPockets] = useState(false);

  // Lấy ngôn ngữ hiện tại
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi';
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  // Lấy địa chỉ ví Solana đã liên kết (từ ví ngoài Phantom hoặc embedded wallet)
  const getSolanaAddress = (): string | null => {
    // 1. Kiểm tra ví Solana bên ngoài vừa kết nối/đăng nhập (Phantom / SIWS)
    if (externalWallet?.publicKey) {
      return externalWallet.publicKey.toBase58();
    }
    // 2. Kiểm tra ví ngầm Embedded Solana Wallet của Privy
    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
    }
    // 3. Kiểm tra danh sách tài khoản ví liên kết trong Privy User
    if (user) {
      const linkedAccounts = (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
      const solAccount = linkedAccounts.find(
        (acc: any) => acc.type === 'wallet' && (acc.chain_type === 'solana' || acc.chainType === 'solana')
      );
      if (solAccount?.address) return solAccount.address;
    }
    return null;
  };

  const solanaAddress = getSolanaAddress();

  // Nạp SĐT đã liên kết (Ưu tiên Source of Truth Supabase)
  useEffect(() => {
    const loadPhone = async () => {
      if (user?.id) {
        const dbPhone = await getUserPhoneNumberFromDB(user.id);
        if (dbPhone) {
          setLinkedPhone(dbPhone);
          await setLinkedPhoneStorage(dbPhone);
          return;
        }
      }
      const cached = await getLinkedPhone();
      setLinkedPhone(cached);
    };
    loadPhone();
  }, [user]);

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
    if (!phone) return t('settings.unlinked');
    return phone;
  };

  // Rút gọn địa chỉ ví Solana (VD: 9hdn...Xw5p)
  const formatShortAddress = (addr: string | null): string => {
    if (!addr) return '';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  // Sao chép nội dung vào bộ nhớ tạm với thông báo & phản hồi rung
  const handleCopyText = async (text: string, successMsg: string) => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(t('settings.title', { defaultValue: 'Thông báo' }), successMsg);
    } catch (e) {
      console.log('Copy error:', e);
    }
  };

  // Sao chép mã tài khoản vào bộ nhớ tạm
  const handleCopyWallet = async () => {
    const accId = getAccountIdentifier(user, linkedPhone);
    handleCopyText(accId, t('settings.copied', { defaultValue: 'Đã sao chép mã tài khoản!' }));
  };

  // State cấu hình mạng lưới (Solana Network - Helius RPC)
  const { activeNetwork } = useNetworkStore();

  // Xử lý chuyển đổi ngôn ngữ từ danh sách
  const handleSelectLanguage = async (langItem: SupportedLanguage) => {
    if (!langItem.available) {
      Alert.alert(
        `${langItem.flag} ${langItem.nativeName}`,
        t('settings.comingSoonLang', { defaultValue: 'Ngôn ngữ này sẽ sớm được hỗ trợ trong bản cập nhật tới.' })
      );
      return;
    }

    if (langItem.code === currentLang) {
      setShowLanguageModal(false);
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    await changeAppLanguage(langItem.code);
    setShowLanguageModal(false);
  };

  /**
   * Xử lý Đăng xuất (handleLogout) an toàn:
   * 1. Hiển thị hộp thoại xác nhận trước khi đăng xuất.
   * 2. Gọi logout() từ Privy SDK để vô hiệu hóa token/session xác thực.
   * 3. Gọi externalWallet.disconnect() để dọn dẹp sạch toàn bộ State & Ref ví Phantom:
   *    - publicKey / phantomWalletPublicKey -> null
   *    - sessionToken -> null
   *    - sharedSecret -> null
   *    - pendingConnectRef / pendingSignMessageRef -> null
   * 4. Dọn dẹp AsyncStorage qua executeHardReset.
   * 5. Luôn bảo đảm điều hướng người dùng về màn hình /login trong khối finally.
   */
  const handleLogout = async () => {
    Alert.alert(
      t('settings.signOutConfirmTitle', { defaultValue: 'Đăng xuất tài khoản' }),
      t('settings.signOutConfirmMsg', { defaultValue: 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng N.E.D không? Phiên đăng nhập hiện tại sẽ được đóng an toàn.' }),
      [
        { text: t('settings.cancel', { defaultValue: 'Hủy' }), style: 'cancel' },
        {
          text: t('settings.signOut', { defaultValue: 'Đăng xuất' }),
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 [handleLogout] Bắt đầu quy trình đăng xuất an toàn...');
              // 1. Dọn dẹp sạch State/Ref của ví Phantom cục bộ
              if (externalWallet?.disconnect) {
                await externalWallet.disconnect();
              }
              // 2. Đăng xuất khỏi Privy và xóa session cache trong AsyncStorage
              await executeHardReset(logout);
              console.log('✅ [handleLogout] Đã hoàn tất đăng xuất khỏi Privy & dọn dẹp bộ nhớ');
            } catch (err) {
              console.error('❌ [handleLogout] Lỗi trong quá trình đăng xuất:', err);
            } finally {
              // 3. Khối finally: Đảm bảo 100% State/Ref ví được reset triệt để
              try {
                if (externalWallet?.disconnect) {
                  await externalWallet.disconnect();
                }
              } catch (_) {}
              // 4. Điều hướng người dùng về màn hình Đăng nhập
              router.replace('/login');
            }
          },
        },
      ]
    );
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
        <Text style={styles.navTitleText}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
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

          {/* Mã Định Danh Tài Khoản N.E.D */}
          <TouchableOpacity
            style={styles.infoBadgeRowBtn}
            onPress={handleCopyWallet}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="card-account-details-outline" size={14} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.infoBadgeLabel}>Tài khoản:</Text>
            <Text style={styles.infoBadgeValue}>
              {getAccountIdentifier(user, linkedPhone)}
            </Text>
            <Feather name="copy" size={12} color="#94A3B8" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {/* Privy User ID */}
          {user?.id ? (
            <TouchableOpacity
              style={styles.infoBadgeRowBtn}
              onPress={() => handleCopyText(user.id, 'Đã sao chép Privy User ID!')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="shield-account-outline" size={14} color="#6366F1" style={{ marginRight: 6 }} />
              <Text style={styles.infoBadgeLabel}>Privy ID:</Text>
              <Text style={styles.infoBadgeValueMono}>
                {user.id.length > 26 ? `${user.id.slice(0, 14)}...${user.id.slice(-6)}` : user.id}
              </Text>
              <Feather name="copy" size={12} color="#94A3B8" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : null}

          {/* Địa chỉ ví Solana đã liên kết */}
          {solanaAddress ? (
            <TouchableOpacity
              style={styles.infoBadgeRowBtn}
              onPress={() => handleCopyText(solanaAddress, 'Đã sao chép địa chỉ ví Solana!')}
              activeOpacity={0.75}
            >
              <View style={styles.solanaDot} />
              <Text style={styles.infoBadgeLabel}>Ví liên kết:</Text>
              <Text style={styles.infoBadgeValueMono}>
                {formatShortAddress(solanaAddress)}
              </Text>
              <Feather name="copy" size={12} color="#94A3B8" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : null}

          {/* Badge Google Backed Up (nếu có tài khoản Google) */}
          {((user as any)?.google || (user as any)?.linked_accounts?.some((a: any) => a.type === 'google_oauth' || a.type === 'google')) ? (
            <View style={styles.backedUpBadge}>
              <Ionicons name="logo-google" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.backedUpText}>{t('settings.googleBackedUp')}</Text>
            </View>
          ) : null}
        </View>

        {/* 2. Nhóm 1 (Ngôn ngữ / Extensible Language Selector Item) */}
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.langIconCircle}>
                <Feather name="globe" size={18} color="#10B981" />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>{t('settings.language')}</Text>
                <Text style={styles.menuItemSubtitle}>{t('settings.languageSubtitle')}</Text>
              </View>
            </View>

            <View style={styles.langBadgeRight}>
              <Text style={styles.langBadgeText}>
                {currentLangObj.flag} {currentLangObj.nativeName}
              </Text>
              <Feather name="chevron-right" size={18} color="#64748B" style={{ marginLeft: 6 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 2.5. Nhóm Cấu Hình Nâng Cao / Developer Mode */}
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => router.push('/developer-mode')}
          >
            <View style={styles.menuItemLeft}>
              <View
                style={[
                  styles.networkIconCircle,
                  { backgroundColor: '#EDE9FE' },
                ]}
              >
                <Feather name="terminal" size={18} color="#6366F1" />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>Developer Mode</Text>
                <Text style={styles.menuItemSubtitle}>Cấu hình mạng Solana (Mainnet / Devnet)</Text>
              </View>
            </View>

            <View
              style={[
                styles.networkBadge,
                { backgroundColor: activeNetwork === 'mainnet-beta' ? '#D8FAF7' : '#FFF1A6' },
              ]}
            >
              <Text style={styles.networkBadgeText}>
                {activeNetwork === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
              </Text>
              <Feather name="chevron-right" size={16} color="#000000" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        </View>


        {/* 3. Nhóm 2 (Tài chính & Lịch sử) */}
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert(t('settings.localCurrency'), t('settings.currencyInfo'))}
          >
            <View style={styles.menuItemLeft}>
              {/* Vietnam Flag Badge */}
              <View style={styles.flagIconCircle}>
                <Text style={{ fontSize: 16 }}>🇻🇳</Text>
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>{t('settings.localCurrency')}</Text>
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
                <Text style={styles.menuItemTitle}>{t('settings.transactionHistory')}</Text>
                <Text style={styles.menuItemSubtitle}>{t('settings.viewTxDetails')}</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* 4. Nhóm 3 (Hiển thị & Chế độ riêng tư) */}
        <View style={styles.groupCard}>
          {/* Stealth Mode */}
          <View style={styles.menuItemRow}>
            <View style={styles.menuItemLeft}>
              <Feather name="eye-off" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>{t('settings.stealthMode')}</Text>
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
              <Text style={styles.menuItemTitle}>{t('settings.showEmptyPockets')}</Text>
            </View>
            <Switch
              value={showEmptyPockets}
              onValueChange={setShowEmptyPockets}
              trackColor={{ false: '#3B3D52', true: '#00A859' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* 5. Nhóm 4 (Hỗ trợ & Đăng xuất) */}
        <View style={styles.groupCard}>
          {/* Invite friends */}
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert(t('settings.inviteFriends'), t('settings.shareInfo'))}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="user-plus" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>{t('settings.inviteFriends')}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerLine} />

          {/* Frequently asked questions */}
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert(t('settings.faq'), t('settings.faqInfo'))}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="book-open" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>{t('settings.faq')}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerLine} />

          {/* Contact support */}
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert(t('settings.contactSupport'), t('settings.supportInfo'))}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="message-square" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>{t('settings.contactSupport')}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerLine} />

          {/* About */}
          <TouchableOpacity
            style={styles.menuItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert(t('settings.about'), t('settings.aboutInfo'))}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="help-circle" size={20} color="#94A3B8" style={styles.itemIcon} />
              <Text style={styles.menuItemTitle}>{t('settings.about')}</Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* 5. Nút Đăng Xuất (Duy nhất, rõ ràng, màu đỏ cảnh báo) */}
        <TouchableOpacity
          style={styles.logoutBtnContainer}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>
            {t('settings.signOut', { defaultValue: 'Đăng xuất tài khoản' })}
          </Text>
        </TouchableOpacity>

        {/* Padding dưới cùng */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Chọn Ngôn Ngữ Mở Rộng */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowLanguageModal(false)}
          />

          <View style={styles.langModalContainer}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitleText}>
                  {t('settings.selectLanguage', { defaultValue: 'Chọn Ngôn Ngữ' })}
                </Text>
                <Text style={styles.modalSubtitleText}>
                  {t('settings.selectLanguageDesc', { defaultValue: 'Chọn ngôn ngữ hiển thị giao diện cho ứng dụng N.E.D' })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowLanguageModal(false)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.langListScroll} showsVerticalScrollIndicator={false}>
              {SUPPORTED_LANGUAGES.map((langItem) => {
                const isSelected = langItem.code === currentLang;
                return (
                  <TouchableOpacity
                    key={langItem.code}
                    style={[
                      styles.langOptionCard,
                      isSelected && styles.langOptionCardActive,
                      !langItem.available && styles.langOptionCardDisabled,
                    ]}
                    onPress={() => handleSelectLanguage(langItem)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.langCardLeft}>
                      <Text style={styles.langFlagEmoji}>{langItem.flag}</Text>
                      <View style={{ marginLeft: 12 }}>
                        <Text
                          style={[
                            styles.langNativeName,
                            isSelected && styles.langNativeNameActive,
                          ]}
                        >
                          {langItem.nativeName}
                        </Text>
                        <Text style={styles.langIntlName}>{langItem.name}</Text>
                      </View>
                    </View>

                    <View style={styles.langCardRight}>
                      {isSelected ? (
                        <View style={styles.activeCheckCircle}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      ) : !langItem.available ? (
                        <View style={styles.comingSoonPill}>
                          <Text style={styles.comingSoonPillText}>
                            {t('miniapps.comingSoon', { defaultValue: 'Sắp có' })}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.inactiveRadioDot} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
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
    elevation: 8,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00A859',
  },
  avatarSymbolText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  phoneRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  infoBadgeRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  infoBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginRight: 4,
  },
  infoBadgeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  infoBadgeValueMono: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logoutBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  walletAddressRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 10,
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
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
  },
  backedUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B3D52',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 4,
  },
  backedUpText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // 2. Group Cards & Items
  groupCard: {
    backgroundColor: '#27293D',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    textAlign: 'center',
  },
  langIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  flagIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  langBadgeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  langBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34D399',
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginLeft: 52,
  },

  // 2.5. Network Environment Styles (Neo-brutalism Segmented Control)
  networkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  networkIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  networkBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#000000',
  },
  networkBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  networkSegmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#1E1F2E',
  },
  networkSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#27293D',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  networkSegmentBtnActiveDevnet: {
    borderColor: '#000000',
    backgroundColor: '#FFF1A6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  networkSegmentBtnActiveMainnet: {
    borderColor: '#000000',
    backgroundColor: '#D8FAF7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  networkRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkRadioCircleActive: {
    borderColor: '#000000',
  },
  networkRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
  },
  networkSegmentTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  networkSegmentTitleActive: {
    color: '#000000',
    fontWeight: '800',
  },
  networkSegmentDesc: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  langModalContainer: {
    backgroundColor: '#1E1F2E',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalDragHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitleText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#27293D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langListScroll: {
    marginBottom: 16,
  },
  langOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#27293D',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  langOptionCardActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  langOptionCardDisabled: {
    opacity: 0.65,
  },
  langCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langFlagEmoji: {
    fontSize: 26,
  },
  langNativeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  langNativeNameActive: {
    color: '#34D399',
    fontWeight: '700',
  },
  langIntlName: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  langCardRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveRadioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#475569',
  },
  comingSoonPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  comingSoonPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#F59E0B',
  },
});
