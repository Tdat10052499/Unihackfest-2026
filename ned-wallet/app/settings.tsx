import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePrivy, useEmbeddedSolanaWallet } from '@privy-io/expo';
import {
  getLinkedPhone,
  setLinkedPhone as setLinkedPhoneStorage,
  executeHardReset,
} from '../services/storage';
import { getUserPhoneNumberFromDB, getAccountIdentifier } from '../services/identity';
import { uploadUserAvatarFile } from '../services/supabase';
import { useTranslation, changeAppLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '../services/i18n';
import { PhoneManagementModal } from '../components/PhoneManagementModal';
import { useNetworkStore } from '../stores/useNetworkStore';
import { useExternalWallet } from '../src/providers/WalletProvider';
import { useUserStore } from '../stores/useUserStore';

// ==========================================
// 🎨 REUSABLE NEO-BRUTALISM SUB-COMPONENTS
// ==========================================

/**
 * Thẻ Card nền trắng với viền đen dày và bóng đổ cứng (Hard Shadow)
 */
interface NeoCardProps {
  children: React.ReactNode;
  style?: any;
}
const NeoCard: React.FC<NeoCardProps> = ({ children, style }) => (
  <View style={[styles.neoCard, style]}>{children}</View>
);

/**
 * Badge dạng viên thuốc (Pill shape) viền đen, bóng cứng
 */
interface ProfileBadgeProps {
  backgroundColor: string;
  onPress?: () => void;
  children: React.ReactNode;
}
const ProfileBadge: React.FC<ProfileBadgeProps> = ({ backgroundColor, onPress, children }) => (
  <TouchableOpacity
    style={[styles.profileBadgePill, { backgroundColor }]}
    onPress={onPress}
    activeOpacity={onPress ? 0.75 : 1}
    disabled={!onPress}
  >
    {children}
  </TouchableOpacity>
);

/**
 * Container Icon hình tròn viền đen cho menu items
 */
interface CircleIconProps {
  backgroundColor?: string;
  children: React.ReactNode;
}
const CircleIcon: React.FC<CircleIconProps> = ({ backgroundColor = '#F1F5F9', children }) => (
  <View style={[styles.circleIconWrapper, { backgroundColor }]}>{children}</View>
);

/**
 * Đường gạch phân chia giữa các hàng trong Menu Card
 */
const CardDivider: React.FC = () => <View style={styles.cardDividerLine} />;

// ==========================================
// 📱 MAIN SETTINGS SCREEN
// ==========================================

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const externalWallet = useExternalWallet();

  const privy = usePrivy();
  const user = privy?.user || null;
  const logout = privy?.logout || (async () => {});
  const solanaWalletState = useEmbeddedSolanaWallet();

  // State định danh người dùng từ Global Store (Zustand)
  const { username, avatarUrl, setAvatarUrl, fetchUserProfile, loadFromStorage } = useUserStore();

  // State thông tin người dùng & SĐT
  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // State các cài đặt hiển thị (Toggles)
  const [stealthMode, setStealthMode] = useState(false);
  const [showEmptyPockets, setShowEmptyPockets] = useState(false);

  // Lấy ngôn ngữ hiện tại
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi';
  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  // State cấu hình mạng lưới (Solana Network - Helius RPC)
  const { activeNetwork } = useNetworkStore();

  // Lấy địa chỉ ví Solana đã liên kết
  const getSolanaAddress = (): string | null => {
    if (!user) return null;

    const linkedAccounts = (user as any)?.linked_accounts || (user as any)?.linkedAccounts || [];
    const solAccount = linkedAccounts.find(
      (acc: any) =>
        acc.type === 'wallet' &&
        (acc.chain_type === 'solana' ||
          acc.chainType === 'solana' ||
          (!acc.chain_type && !acc.address?.startsWith('0x')))
    );
    if (solAccount?.address) return solAccount.address;

    if (solanaWalletState?.wallets && solanaWalletState.wallets.length > 0) {
      const solWallet = solanaWalletState.wallets[0];
      if (solWallet?.address) return solWallet.address;
    }

    if ((user as any)?.wallet?.address) {
      const addr = (user as any).wallet.address;
      if (!addr.startsWith('0x') || (user as any).wallet.chainType === 'solana') {
        return addr;
      }
    }

    return null;
  };

  const solanaAddress = getSolanaAddress();

  // Đồng bộ User Profile & Username khi vào màn hình Settings
  useFocusEffect(
    useCallback(() => {
      loadFromStorage();
      if (user?.id) {
        fetchUserProfile(user.id);
      }
    }, [user?.id, loadFromStorage, fetchUserProfile])
  );

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

  // Trích xuất tên hiển thị từ Google hoặc Email
  const getUserDisplayName = (): string => {
    if (!user) return 'Dat Ho Du Tuan';
    const googleAcc =
      (user as any)?.google ||
      (user as any)?.linked_accounts?.find(
        (a: any) => a.type === 'google_oauth' || a.type === 'google'
      );
    if (googleAcc?.name) return googleAcc.name;
    if (googleAcc?.email) return googleAcc.email.split('@')[0];

    const emailAcc = (user as any)?.email;
    if (emailAcc?.address) return emailAcc.address.split('@')[0];

    return 'Dat Ho Du Tuan';
  };

  // Trích xuất username động định dạng @username.sol
  const getDisplayHandle = (): string => {
    if (username) {
      const clean = username.startsWith('@') ? username.slice(1) : username;
      const withoutSuffix = clean.endsWith('.sol') ? clean.slice(0, -4) : clean;
      return `@${withoutSuffix}.sol`;
    }
    const fallback = getUserDisplayName().toLowerCase().replace(/\s+/g, '');
    return `@${fallback || 'ned'}.sol`;
  };

  // Trích xuất chữ cái đầu tiên cho Default Avatar
  const getUserInitial = (): string => {
    if (username) {
      const clean = username.replace(/^@/, '');
      return clean.trim().charAt(0).toUpperCase() || 'D';
    }
    const name = getUserDisplayName();
    if (!name) return 'D';
    return name.trim().charAt(0).toUpperCase() || 'D';
  };

  // Xử lý chọn ảnh & Upload lên Supabase Storage bucket 'avatars'
  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập thư viện ảnh',
          'Vui lòng cấp quyền truy cập thư viện ảnh để đổi ảnh đại diện.'
        );
        return;
      }

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Lỗi ảnh', 'Không thể nạp dữ liệu ảnh. Vui lòng thử lại.');
        return;
      }

      setIsUploadingAvatar(true);

      const targetUserId = user?.id || solanaAddress || username || 'ned_user';
      console.log('📸 [Settings] Bắt đầu upload avatar cho user:', targetUserId);

      const uploadRes = await uploadUserAvatarFile({
        userId: targetUserId,
        base64: asset.base64,
        mimeType: asset.mimeType || 'image/jpeg',
      });

      if (uploadRes.success && uploadRes.avatarUrl) {
        setAvatarUrl(uploadRes.avatarUrl);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('Thành công 🎉', 'Đã cập nhật ảnh đại diện mới thành công!');
      } else {
        Alert.alert('Lỗi tải ảnh', uploadRes.error || 'Không thể upload ảnh lên Supabase.');
      }
    } catch (err: any) {
      console.error('❌ [handlePickAvatar] Lỗi chọn/upload avatar:', err);
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi cập nhật ảnh đại diện.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Định dạng hiển thị số điện thoại
  const formatPhoneDisplay = (phone: string | null): string => {
    if (!phone) return '+84938992410';
    return phone;
  };

  // Sao chép nội dung vào bộ nhớ tạm với thông báo & haptic
  const handleCopyText = async (text: string, successMsg: string) => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Sao chép thành công', successMsg);
    } catch (e) {
      console.log('Copy error:', e);
    }
  };

  // Sao chép mã tài khoản
  const handleCopyAccountId = async () => {
    const accId = getAccountIdentifier(user, linkedPhone);
    handleCopyText(accId, `Đã sao chép mã tài khoản: ${accId}`);
  };

  // Xử lý chuyển đổi ngôn ngữ
  const handleSelectLanguage = async (langItem: SupportedLanguage) => {
    if (!langItem.available) {
      Alert.alert(
        `${langItem.flag} ${langItem.nativeName}`,
        t('settings.comingSoonLang', {
          defaultValue: 'Ngôn ngữ này sẽ sớm được hỗ trợ trong bản cập nhật tới.',
        })
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

  // Xử lý Đăng xuất an toàn (Hard Reset)
  const handleLogout = async () => {
    Alert.alert(
      t('settings.signOutConfirmTitle', { defaultValue: 'Đăng xuất tài khoản' }),
      t('settings.signOutConfirmMsg', {
        defaultValue:
          'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng N.E.D không? Phiên đăng nhập và dữ liệu bộ nhớ đệm sẽ được dọn dẹp an toàn.',
      }),
      [
        { text: t('settings.cancel', { defaultValue: 'Hủy' }), style: 'cancel' },
        {
          text: t('settings.signOut', { defaultValue: 'Đăng xuất' }),
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 [handleLogout] Bắt đầu quy trình đăng xuất an toàn...');
              if (externalWallet?.disconnect) {
                await externalWallet.disconnect();
              }
              await executeHardReset(logout);
              console.log('✅ [handleLogout] Đã hoàn tất đăng xuất khỏi Privy & dọn dẹp bộ nhớ');
            } catch (err) {
              console.error('❌ [handleLogout] Lỗi khi đăng xuất:', err);
            } finally {
              try {
                if (externalWallet?.disconnect) {
                  await externalWallet.disconnect();
                }
              } catch {}
              router.replace('/login');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF8F0" />

      {/* ========================================================
          1. HEADER BAR: Nút Back tròn, Viền đen, Shadow cứng
      ======================================================== */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backCircleBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="chevron-left" size={22} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitleText}>{t('settings.title', { defaultValue: 'Settings' })}</Text>

        {/* Cân bằng layout bên phải */}
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================
            2. KHỐI PROFILE TRUNG TÂM (Avatar, Tên & Cụm Badges)
        ======================================================== */}
        <View style={styles.profileCenterSection}>
          {/* Avatar Khối tròn tương tác màu tím nhạt / Ảnh thật, viền đen dày, bóng cứng */}
          <TouchableOpacity
            style={styles.avatarNeoBtn}
            activeOpacity={0.85}
            onPress={handlePickAvatar}
            disabled={isUploadingAvatar}
          >
            <View style={styles.avatarNeoCircle}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarLetterText}>{getUserInitial()}</Text>
              )}

              {/* Loading Spinner khi đang upload */}
              {isUploadingAvatar && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </View>

            {/* Badge icon camera nhỏ ở góc dưới Avatar chuẩn Neo-brutalism */}
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={12} color="#000000" />
            </View>
          </TouchableOpacity>

          {/* Tên người dùng định dạng @username.sol in đậm lớn */}
          <Text style={styles.profileDisplayNameText}>{getDisplayHandle()}</Text>

          {/* Cụm Badges dạng viên thuốc viền đen, bóng cứng */}
          <View style={styles.badgesCol}>
            {/* Badge 1: SĐT (Nền vàng nhạt, icon edit) */}
            <ProfileBadge
              backgroundColor="#FEF08A"
              onPress={() => setShowPhoneModal(true)}
            >
              <Text style={styles.badgeTextDark}>{formatPhoneDisplay(linkedPhone)}</Text>
              <Feather name="edit-2" size={13} color="#000000" style={{ marginLeft: 8 }} />
            </ProfileBadge>

            {/* Badge 2: Google Backed up (Nền tím nhạt, icon Google G) */}
            <ProfileBadge
              backgroundColor="#DDD6FE"
              onPress={() =>
                Alert.alert(
                  'Bảo Mật Tài Khoản Google',
                  'Tài khoản của bạn đã được sao lưu và bảo mật an toàn thông qua Google OAuth & Privy Embedded Wallet.'
                )
              }
            >
              <View style={styles.googleGIconCircle}>
                <Ionicons name="logo-google" size={12} color="#FFFFFF" />
              </View>
              <Text style={styles.badgeTextDark}>Google Backed up &gt;</Text>
            </ProfileBadge>
          </View>
        </View>

        {/* ========================================================
            3. CÁC KHỐI CHỨC NĂNG (MENU CARDS NEO-BRUTALISM)
        ======================================================== */}

        {/* CARD 1: Ngôn ngữ (Languages) */}
        <NeoCard>
          <TouchableOpacity
            style={styles.menuRowItem}
            activeOpacity={0.7}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.menuRowLeft}>
              <CircleIcon backgroundColor="#F1F5F9">
                <Feather name="globe" size={18} color="#000000" />
              </CircleIcon>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitleText}>
                  {t('settings.language', { defaultValue: 'Languages' })}
                </Text>
                <Text style={styles.menuItemSubText}>Select display languages</Text>
              </View>
            </View>

            <View style={styles.langPillRight}>
              <Text style={styles.langPillText}>
                {currentLangObj.flag} {currentLangObj.nativeName} &gt;
              </Text>
            </View>
          </TouchableOpacity>
        </NeoCard>

        {/* CARD 2: Developer Mode */}
        <NeoCard>
          <TouchableOpacity
            style={styles.menuRowItem}
            activeOpacity={0.7}
            onPress={() => router.push('/developer-mode')}
          >
            <View style={styles.menuRowLeft}>
              <CircleIcon backgroundColor="#EDE9FE">
                <Feather name="terminal" size={18} color="#6366F1" />
              </CircleIcon>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitleText}>Developer Mode</Text>
                <Text style={styles.menuItemSubText}>Cấu hình mạng Solana</Text>
              </View>
            </View>

            <View style={styles.devnetPillRight}>
              <Text style={styles.devnetPillText}>
                {activeNetwork === 'mainnet-beta' ? 'Mainnet' : 'Devnet'} &gt;
              </Text>
            </View>
          </TouchableOpacity>
        </NeoCard>

        {/* CARD 3: Tiền tệ địa phương & Lịch sử giao dịch */}
        <NeoCard>
          {/* Row 1: Local Currency */}
          <TouchableOpacity
            style={styles.menuRowItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Tiền tệ định danh', 'Đơn vị tiền tệ hiển thị mặc định là Đồng Việt Nam (VND).')}
          >
            <View style={styles.menuRowLeft}>
              <CircleIcon backgroundColor="#FEE2E2">
                <Text style={{ fontSize: 18 }}>🇻🇳</Text>
              </CircleIcon>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitleText}>
                  {t('settings.localCurrency', { defaultValue: 'Local currency' })}
                </Text>
                <Text style={styles.menuItemSubText}>VND</Text>
              </View>
            </View>
          </TouchableOpacity>

          <CardDivider />

          {/* Row 2: Transaction History */}
          <TouchableOpacity
            style={styles.menuRowItem}
            activeOpacity={0.7}
            onPress={() => router.push('/history')}
          >
            <View style={styles.menuRowLeft}>
              <CircleIcon backgroundColor="#F1F5F9">
                <Feather name="clock" size={18} color="#000000" />
              </CircleIcon>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitleText}>
                  {t('settings.transactionHistory', { defaultValue: 'Transaction history' })}
                </Text>
                <Text style={styles.menuItemSubText}>View transaction details &gt;</Text>
              </View>
            </View>
          </TouchableOpacity>
        </NeoCard>

        {/* CARD 4: Các nút chuyển đổi (Toggles) */}
        <NeoCard>
          {/* Row 1: Stealth mode */}
          <View style={styles.menuRowItem}>
            <View style={styles.menuRowLeft}>
              <CircleIcon backgroundColor="#F1F5F9">
                <Feather name="eye-off" size={18} color="#000000" />
              </CircleIcon>
              <Text style={styles.menuItemTitleText}>
                {t('settings.stealthMode', { defaultValue: 'Stealth mode' })}
              </Text>
            </View>
            <Switch
              value={stealthMode}
              onValueChange={setStealthMode}
              trackColor={{ false: '#CBD5E1', true: '#7C3AED' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <CardDivider />

          {/* Row 2: Show empty pockets */}
          <View style={styles.menuRowItem}>
            <View style={styles.menuRowLeft}>
              <CircleIcon backgroundColor="#F1F5F9">
                <Feather name="briefcase" size={18} color="#000000" />
              </CircleIcon>
              <Text style={styles.menuItemTitleText}>
                {t('settings.showEmptyPockets', { defaultValue: 'Show empty pockets' })}
              </Text>
            </View>
            <Switch
              value={showEmptyPockets}
              onValueChange={setShowEmptyPockets}
              trackColor={{ false: '#CBD5E1', true: '#7C3AED' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </NeoCard>

        {/* CARD 5: Thông tin ứng dụng & Hỗ trợ */}
        <NeoCard>
          {/* Invite friends */}
          <TouchableOpacity
            style={styles.menuRowItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Mời bạn bè 🎉', 'Chia sẻ ví N.E.D Wallet tới bạn bè để cùng trải nghiệm thanh toán Web3 Solana!')}
          >
            <View style={styles.menuRowLeft}>
              <CircleIcon backgroundColor="#F1F5F9">
                <Feather name="user-plus" size={18} color="#000000" />
              </CircleIcon>
              <Text style={styles.menuItemTitleText}>
                {t('settings.inviteFriends', { defaultValue: 'Invite friends' })}
              </Text>
            </View>
          </TouchableOpacity>

          <CardDivider />

          {/* FAQ */}
          <TouchableOpacity
            style={styles.menuRowItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Câu hỏi thường gặp 💡', 'Truy cập trung tâm trợ giúp N.E.D để xem hướng dẫn sử dụng chi tiết.')}
          >
            <View style={styles.menuRowLeft}>
              <CircleIcon backgroundColor="#F1F5F9">
                <Feather name="book-open" size={18} color="#000000" />
              </CircleIcon>
              <Text style={styles.menuItemTitleText}>
                {t('settings.faq', { defaultValue: 'Frequently asked questions' })}
              </Text>
            </View>
          </TouchableOpacity>

          <CardDivider />

          {/* Contact support */}
          <TouchableOpacity
            style={styles.menuRowItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Hỗ trợ kỹ thuật 💬', 'Đội ngũ hỗ trợ N.E.D luôn sẵn sàng 24/7 qua cộng đồng Telegram & Discord.')}
          >
            <View style={styles.menuRowLeft}>
              <CircleIcon backgroundColor="#F1F5F9">
                <MaterialCommunityIcons name="comment-question-outline" size={18} color="#000000" />
              </CircleIcon>
              <Text style={styles.menuItemTitleText}>
                {t('settings.contactSupport', { defaultValue: 'Contact support' })}
              </Text>
            </View>
          </TouchableOpacity>

          <CardDivider />

          {/* About N.E.D */}
          <TouchableOpacity
            style={styles.menuRowItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Về N.E.D Wallet 🚀', 'N.E.D (Next Economy Decentralized) - Ví định danh Web3 tốc độ cao trên Solana Devnet.')}
          >
            <View style={styles.menuRowLeft}>
              <CircleIcon backgroundColor="#F1F5F9">
                <Feather name="info" size={18} color="#000000" />
              </CircleIcon>
              <Text style={styles.menuItemTitleText}>
                {t('settings.about', { defaultValue: 'About N.E.D' })}
              </Text>
            </View>
          </TouchableOpacity>
        </NeoCard>

        {/* ========================================================
            4. VÙNG NGUY HIỂM: Nút Đăng Xuất Đỏ Đậm Neo-brutalism
        ======================================================== */}
        <TouchableOpacity
          style={styles.dangerLogoutBtn}
          activeOpacity={0.85}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.dangerLogoutBtnText}>ĐĂNG XUẤT</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ========================================================
          5. MODAL CHỌN NGÔN NGỮ NEO-BRUTALISM
      ======================================================== */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowLanguageModal(false)}
          />

          <View style={styles.neoModalContainer}>
            <View style={styles.modalHandleBar} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.neoModalTitleText}>
                  {t('settings.selectLanguage', { defaultValue: 'Select Language' })}
                </Text>
                <Text style={styles.neoModalSubText}>
                  {t('settings.selectLanguageDesc', { defaultValue: 'Chọn ngôn ngữ hiển thị cho ứng dụng' })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircleBtn}
                onPress={() => setShowLanguageModal(false)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 16 }} showsVerticalScrollIndicator={false}>
              {SUPPORTED_LANGUAGES.map((langItem) => {
                const isSelected = langItem.code === currentLang;
                return (
                  <TouchableOpacity
                    key={langItem.code}
                    style={[
                      styles.langOptionNeoCard,
                      isSelected && styles.langOptionNeoCardActive,
                      !langItem.available && styles.langOptionNeoCardDisabled,
                    ]}
                    onPress={() => handleSelectLanguage(langItem)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.langCardLeft}>
                      <Text style={{ fontSize: 24 }}>{langItem.flag}</Text>
                      <View style={{ marginLeft: 14 }}>
                        <Text style={styles.langNativeText}>{langItem.nativeName}</Text>
                        <Text style={styles.langSubText}>{langItem.name}</Text>
                      </View>
                    </View>

                    <View style={styles.langCardRight}>
                      {isSelected ? (
                        <View style={styles.activeCheckPill}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      ) : !langItem.available ? (
                        <View style={styles.comingSoonBadge}>
                          <Text style={styles.comingSoonText}>Sắp có</Text>
                        </View>
                      ) : (
                        <View style={styles.inactiveRadioCircle} />
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

// ==========================================
// 💅 NEO-BRUTALISM STYLESHEET
// ==========================================

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FDF8F0', // Nền kem sáng ấm áp chuẩn Neo-brutalism
  },

  // 1. Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 12,
  },
  backCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // 2. Profile Center Section
  profileCenterSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarNeoBtn: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarNeoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#B49BFF', // Tím nhạt nổi bật
    borderWidth: 2.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 3.5, height: 3.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  avatarLetterText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 38,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEF08A', // Vàng nhạt Neo-brutalism
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  profileDisplayNameText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },

  // Badges
  badgesCol: {
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  profileBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 7,
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  badgeTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  badgeBoldDark: {
    fontWeight: '900',
    color: '#000000',
  },
  activeGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00A859',
    marginRight: 8,
  },
  googleGIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  // 3. Menu Cards Neo-brutalism
  neoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 3.5, height: 3.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginBottom: 14,
  },
  menuRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  circleIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
  },
  menuItemTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  menuItemSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  cardDividerLine: {
    height: 1.5,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },

  // Badges in Menu Cards
  langPillRight: {
    backgroundColor: '#DDD6FE', // Tím nhạt
    borderWidth: 1.8,
    borderColor: '#000000',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  devnetPillRight: {
    backgroundColor: '#FEF08A', // Vàng nhạt
    borderWidth: 1.8,
    borderColor: '#000000',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  devnetPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },

  // 4. Danger Zone: Logout Button
  dangerLogoutBtn: {
    backgroundColor: '#D32F2F', // Đỏ đậm cảnh báo
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  dangerLogoutBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // 5. Language Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  neoModalContainer: {
    backgroundColor: '#FDF8F0',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 3,
    borderColor: '#000000',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '75%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  modalHandleBar: {
    width: 44,
    height: 5,
    backgroundColor: '#000000',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  neoModalTitleText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  neoModalSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  langOptionNeoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  langOptionNeoCardActive: {
    backgroundColor: '#DDD6FE', // Nền tím pastel khi active
    borderColor: '#000000',
  },
  langOptionNeoCardDisabled: {
    opacity: 0.6,
  },
  langCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langNativeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  langSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  langCardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCheckPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#7C3AED',
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonBadge: {
    backgroundColor: '#FEF08A',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  inactiveRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
});
