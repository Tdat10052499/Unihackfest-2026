import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { usePrivy } from '@privy-io/expo';
import { useExternalWallet, WalletType } from '../providers/WalletProvider';

export interface ConnectWalletButtonProps {
  onConnected?: (publicKey: string) => void;
}

export const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({ onConnected }) => {
  const router = useRouter();
  let privy: any = null;
  try {
    privy = usePrivy();
  } catch (e) {
    // safely ignore
  }
  const user = privy?.user || null;

  const {
    publicKey,
    connected,
    connecting,
    walletName,
    connect,
    disconnect,
  } = useExternalWallet();

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelectWallet = async (type: WalletType) => {
    setModalVisible(false);
    const pub = await connect(type);
    if (pub && onConnected) {
      onConnected(pub.toBase58());
    }
  };

  const handleCopyAddress = async () => {
    if (!publicKey) return;
    await Clipboard.setStringAsync(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  if (connected && publicKey) {
    return (
      <View style={styles.connectedContainer}>
        {/* Badge ví & Địa chỉ rút gọn */}
        <TouchableOpacity
          style={styles.addressPill}
          onPress={handleCopyAddress}
          activeOpacity={0.75}
        >
          <View style={styles.greenDot} />
          <Text style={styles.walletBadgeText}>{walletName || 'Solana'}:</Text>
          <Text style={styles.addressText}>{formattedAddress}</Text>
          <Ionicons
            name={copied ? 'checkmark-circle' : 'copy-outline'}
            size={13}
            color={copied ? '#10B981' : '#9CA3AF'}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        {/* Nút Ngắt Kết Nối */}
        <TouchableOpacity
          style={styles.disconnectBtn}
          onPress={async () => {
            await disconnect();
            if (!user) {
              router.replace('/login');
            }
          }}
          activeOpacity={0.75}
        >
          <Feather name="log-out" size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => setModalVisible(true)}
        disabled={connecting}
        activeOpacity={0.8}
      >
        {connecting ? (
          <View style={styles.rowCenter}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.connectButtonText}>Đang Mở Ứng Dụng Ví...</Text>
          </View>
        ) : (
          <View style={styles.rowCenter}>
            <Ionicons name="wallet-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.connectButtonText}>Kết Nối Ví Phantom / Solflare</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal Lựa Chọn Ví */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Ví Solana Để Kết Nối</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Kết nối qua giao thức Mobile Wallet Adapter & Deep Linking an toàn.
            </Text>

            {/* Option: Phantom */}
            <TouchableOpacity
              style={styles.walletOptionItem}
              onPress={() => handleSelectWallet('phantom')}
              activeOpacity={0.7}
            >
              <View style={[styles.walletIconCircle, { backgroundColor: '#AB9FF2' }]}>
                <MaterialCommunityIcons name="ghost" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.walletOptionTextCol}>
                <Text style={styles.walletOptionName}>Phantom Wallet</Text>
                <Text style={styles.walletOptionDesc}>Ví Solana phổ biến và tối ưu nhất trên di động</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#6B7280" />
            </TouchableOpacity>

            {/* Option: Solflare */}
            <TouchableOpacity
              style={styles.walletOptionItem}
              onPress={() => handleSelectWallet('solflare')}
              activeOpacity={0.7}
            >
              <View style={[styles.walletIconCircle, { backgroundColor: '#FC6400' }]}>
                <Ionicons name="flame" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.walletOptionTextCol}>
                <Text style={styles.walletOptionName}>Solflare Wallet</Text>
                <Text style={styles.walletOptionDesc}>Hỗ trợ bảo mật cao và tương thích chuẩn SPL</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#6B7280" />
            </TouchableOpacity>

            {/* Option: MWA */}
            <TouchableOpacity
              style={styles.walletOptionItem}
              onPress={() => handleSelectWallet('mwa')}
              activeOpacity={0.7}
            >
              <View style={[styles.walletIconCircle, { backgroundColor: '#10B981' }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.walletOptionTextCol}>
                <Text style={styles.walletOptionName}>Solana Mobile Wallet Adapter</Text>
                <Text style={styles.walletOptionDesc}>Chuẩn kết nối trực tiếp MWA trên Android / Saga</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#6B7280" />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  connectButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  addressPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  walletBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginRight: 6,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F9FAFB',
    fontFamily: 'monospace',
    flex: 1,
  },
  disconnectBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 20,
    lineHeight: 18,
  },
  walletOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  walletIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  walletOptionTextCol: {
    flex: 1,
  },
  walletOptionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  walletOptionDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});

export default ConnectWalletButton;
