import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useExternalWallet, WalletType } from '../providers/WalletProvider';

export interface WalletSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onConnected?: (publicKey: string) => void;
}

interface WalletItemConfig {
  type: WalletType;
  name: string;
  description: string;
  badge: string;
  badgeColor: string;
  iconBg: string;
  iconComponent: React.ReactNode;
}

export const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  visible,
  onClose,
  onConnected,
}) => {
  const { connect, connecting, connected, publicKey, walletName } = useExternalWallet();
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);

  // Khi kết nối thành công, tự động trigger callback và đóng modal
  useEffect(() => {
    if (connected && publicKey && visible) {
      if (onConnected) {
        onConnected(publicKey.toBase58());
      }
      onClose();
    }
  }, [connected, publicKey, visible, onConnected, onClose]);

  const handleSelectWallet = async (type: WalletType) => {
    setSelectedWallet(type);
    const pub = await connect(type);
    if (pub && onConnected) {
      onConnected(pub.toBase58());
      onClose();
    }
  };

  const walletList: WalletItemConfig[] = [
    {
      type: 'phantom',
      name: 'Phantom Wallet',
      description: 'Ví Solana phổ biến và tối ưu nhất cho dApp',
      badge: 'Khuyên dùng',
      badgeColor: '#AB9FF2',
      iconBg: '#AB9FF2',
      iconComponent: <MaterialCommunityIcons name="ghost" size={24} color="#FFFFFF" />,
    },
    {
      type: 'solflare',
      name: 'Solflare Wallet',
      description: 'Bảo mật chuẩn Web3, hỗ trợ SPL Token toàn diện',
      badge: 'Bảo mật',
      badgeColor: '#FC6400',
      iconBg: '#FC6400',
      iconComponent: <Ionicons name="flame" size={24} color="#FFFFFF" />,
    },
    {
      type: 'backpack',
      name: 'Backpack Wallet',
      description: 'Ví Web3 thế hệ mới chuẩn xNFT và đa nền tảng',
      badge: 'Web3 Native',
      badgeColor: '#E54D2E',
      iconBg: '#E54D2E',
      iconComponent: <Ionicons name="cube-outline" size={22} color="#FFFFFF" />,
    },
    {
      type: 'mwa',
      name: 'Solana Mobile Wallet',
      description: 'Giao thức kết nối trực tiếp MWA trên Android / Saga',
      badge: 'MWA Protocol',
      badgeColor: '#10B981',
      iconBg: '#10B981',
      iconComponent: <Ionicons name="phone-portrait-outline" size={22} color="#FFFFFF" />,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.title}>Chọn Ví Để Kết Nối</Text>
              <Text style={styles.subtitle}>
                Kết nối ví Solana để trải nghiệm giao dịch Stablecoin on-chain
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Banner Trạng Thái Đang Kết Nối */}
          {connecting && (
            <View style={styles.connectingBanner}>
              <ActivityIndicator size="small" color="#6366F1" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.connectingTitle}>
                  Đang mở ví {walletName || selectedWallet || 'Solana'}...
                </Text>
                <Text style={styles.connectingDesc}>
                  Vui lòng phê duyệt quyền kết nối trên màn hình ứng dụng ví của bạn.
                </Text>
              </View>
            </View>
          )}

          {/* Danh Sách Ví */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.walletListScroll}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {walletList.map((wallet) => {
              const isCurrentConnecting = connecting && selectedWallet === wallet.type;

              return (
                <TouchableOpacity
                  key={wallet.type}
                  style={[
                    styles.walletItemCard,
                    isCurrentConnecting && styles.walletItemCardActive,
                  ]}
                  onPress={() => handleSelectWallet(wallet.type)}
                  disabled={connecting}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconCircle, { backgroundColor: wallet.iconBg }]}>
                    {wallet.iconComponent}
                  </View>

                  <View style={styles.walletInfoCol}>
                    <View style={styles.walletNameRow}>
                      <Text style={styles.walletNameText}>{wallet.name}</Text>
                      <View
                        style={[
                          styles.badgePill,
                          { backgroundColor: `${wallet.badgeColor}25` },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: wallet.badgeColor }]}>
                          {wallet.badge}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.walletDescText}>{wallet.description}</Text>
                  </View>

                  {isCurrentConnecting ? (
                    <ActivityIndicator size="small" color="#6366F1" />
                  ) : (
                    <Feather name="chevron-right" size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer Security Assurance */}
          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.footerNoteText}>
              Bảo mật 100% On-Chain. Ứng dụng không bao giờ truy cập khóa bí mật của bạn.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: '#1F2937',
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#374151',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  connectingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 16,
  },
  connectingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#818CF8',
  },
  connectingDesc: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 2,
  },
  walletListScroll: {
    marginVertical: 4,
  },
  walletItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  walletItemCardActive: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  walletInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  walletNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  walletNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  walletDescText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#1F2937',
  },
  footerNoteText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    flex: 1,
  },
});

export default WalletSelectorModal;
