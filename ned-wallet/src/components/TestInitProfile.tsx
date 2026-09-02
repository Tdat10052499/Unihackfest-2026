import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useInitProfile } from '../hooks/useInitProfile';
import { useEmbeddedSolanaWallet } from '@privy-io/expo';
import { AnchorWallet, PROGRAM_ID, createPrivyAnchorWallet } from '../utils/anchorClient';

export interface TestInitProfileProps {
  wallet?: AnchorWallet | null;
  onSuccess?: (txSignature: string) => void;
}

export const TestInitProfile: React.FC<TestInitProfileProps> = ({ wallet: customWallet, onSuccess }) => {
  const [fiatCurrency, setFiatCurrency] = useState<string>('VND');
  const [copied, setCopied] = useState<boolean>(false);

  let solanaWalletState: any = null;
  try {
    solanaWalletState = useEmbeddedSolanaWallet();
  } catch (e) {}

  const activeWallet = customWallet || createPrivyAnchorWallet(solanaWalletState);

  const {
    isLoading,
    error,
    txSignature,
    isSuccess,
    profileData,
    profilePda,
    initialize,
    fetchProfile,
  } = useInitProfile(activeWallet);

  // Tự động kiểm tra xem hồ sơ đã được khởi tạo on-chain chưa khi ví kết nối
  useEffect(() => {
    if (activeWallet?.publicKey) {
      fetchProfile();
    }
  }, [activeWallet?.publicKey, fetchProfile]);

  const handleInitialize = async () => {
    const tx = await initialize(fiatCurrency);
    if (tx && onSuccess) {
      onSuccess(tx);
    }
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExplorer = (signature: string) => {
    const url = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    Linking.openURL(url).catch((err) =>
      console.error('[TestInitProfile] Không thể mở trình duyệt:', err)
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="cube-outline" size={24} color="#6366F1" />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>Khởi Tạo Hồ Sơ Web3 (On-chain)</Text>
          <Text style={styles.subtitle}>Smart Contract: {PROGRAM_ID.toBase58().slice(0, 8)}...{PROGRAM_ID.toBase58().slice(-6)}</Text>
        </View>
      </View>

      {/* Thông tin PDA & Trạng thái ví */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ví Người Dùng:</Text>
          <Text style={styles.infoValue}>
            {activeWallet?.publicKey
              ? `${activeWallet.publicKey.toBase58().slice(0, 6)}...${activeWallet.publicKey.toBase58().slice(-6)}`
              : 'Chưa kết nối ví'}
          </Text>
        </View>

        {profilePda && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Địa Chỉ PDA:</Text>
            <TouchableOpacity
              style={styles.copyableRow}
              onPress={() => handleCopy(profilePda.toBase58())}
            >
              <Text style={styles.infoValue}>
                {profilePda.toBase58().slice(0, 6)}...{profilePda.toBase58().slice(-6)}
              </Text>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={14}
                color={copied ? '#10B981' : '#9CA3AF'}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trạng Thái On-chain:</Text>
          <View
            style={[
              styles.badge,
              profileData ? styles.badgeSuccess : styles.badgePending,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                profileData ? styles.badgeTextSuccess : styles.badgeTextPending,
              ]}
            >
              {profileData
                ? `Đã Khởi Tạo (${profileData.activeFiat})`
                : 'Chưa Khởi Tạo'}
            </Text>
          </View>
        </View>
      </View>

      {/* Input Nhập Mã Tiền Tệ */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Mã Tiền Tệ Định Danh (Active Fiat):</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={fiatCurrency}
            onChangeText={setFiatCurrency}
            placeholder="Ví dụ: VND, USD, EUR"
            placeholderTextColor="#6B7280"
            autoCapitalize="characters"
            maxLength={10}
            editable={!isLoading}
          />
          <View style={styles.charCountBadge}>
            <Text style={styles.charCountText}>{fiatCurrency.length}/10</Text>
          </View>
        </View>
      </View>

      {/* Nút Khởi Tạo */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!activeWallet || isLoading || !fiatCurrency.trim()) && styles.submitButtonDisabled,
        ]}
        onPress={handleInitialize}
        disabled={!activeWallet || isLoading || !fiatCurrency.trim()}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Đang Xác Nhận Giao Dịch...</Text>
          </View>
        ) : (
          <View style={styles.loadingRow}>
            <Ionicons name="flash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.submitButtonText}>Khởi Tạo Hồ Sơ Web3</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Kết Quả Thành Công */}
      {isSuccess && txSignature && (
        <View style={styles.successCard}>
          <View style={styles.successHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.successTitle}>Giao Dịch Đã Phát Sóng Thành Công!</Text>
          </View>
          <Text style={styles.signatureLabel}>Transaction Signature:</Text>
          <TouchableOpacity
            style={styles.signatureBox}
            onPress={() => handleCopy(txSignature)}
          >
            <Text style={styles.signatureText} numberOfLines={1}>
              {txSignature}
            </Text>
            <Ionicons name="copy-outline" size={14} color="#10B981" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.explorerButton}
            onPress={() => handleOpenExplorer(txSignature)}
          >
            <Text style={styles.explorerButtonText}>Xem trên Solana Explorer</Text>
            <Ionicons name="open-outline" size={14} color="#6366F1" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Thông Báo Lỗi */}
      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
    fontFamily: 'monospace',
  },
  copyableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: '#10B981',
  },
  badgeTextPending: {
    color: '#F59E0B',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    height: 44,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  charCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#374151',
    borderRadius: 4,
  },
  charCountText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successCard: {
    marginTop: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 6,
  },
  signatureLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  signatureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  signatureText: {
    fontSize: 11,
    color: '#10B981',
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 8,
  },
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  explorerButtonText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#EF4444',
    lineHeight: 16,
  },
});

export default TestInitProfile;
