import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTransferStablecoin } from '../hooks/useTransferStablecoin';
import { AnchorWallet } from '../utils/anchorClient';
import { USDC_DEVNET_MINT, USD_TO_VND_RATE } from '../../services/solana';

export interface TransferScreenProps {
  wallet?: AnchorWallet | null;
  onSuccess?: (txHash: string) => void;
  onClose?: () => void;
}

export const TransferScreen: React.FC<TransferScreenProps> = ({
  wallet,
  onSuccess,
  onClose,
}) => {
  const [recipient, setRecipient] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [copiedTx, setCopiedTx] = useState<boolean>(false);

  const {
    isLoading,
    error,
    txHash,
    isSuccess,
    statusMessage,
    transfer,
    reset,
  } = useTransferStablecoin(wallet);

  const parsedAmount = parseFloat(amountStr) || 0;
  const equivalentVnd = Math.round(parsedAmount * USD_TO_VND_RATE);

  const handlePasteRecipient = async () => {
    const text = await Clipboard.getStringAsync();
    if (text && text.trim()) {
      setRecipient(text.trim());
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmountStr(val.toString());
  };

  const handleTransfer = async () => {
    if (!recipient.trim() || parsedAmount <= 0) return;

    const signature = await transfer({
      recipientAddress: recipient.trim(),
      amount: parsedAmount,
      mintAddress: USDC_DEVNET_MINT.toBase58(),
    });

    if (signature && onSuccess) {
      onSuccess(signature);
    }
  };

  const handleCopyTx = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  const handleOpenExplorer = (signature: string) => {
    const url = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    Linking.openURL(url).catch((err) =>
      console.error('[TransferScreen] Không thể mở link explorer:', err)
    );
  };

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.cardContainer}>
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="currency-usd" size={26} color="#10B981" />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>Chuyển Stablecoin On-Chain</Text>
            <Text style={styles.subtitle}>Chuẩn SPL Token • Anchor CPI TransferChecked</Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Info Box Token & Network */}
        <View style={styles.tokenInfoBox}>
          <View style={styles.tokenBadge}>
            <Text style={styles.tokenBadgeText}>USDC (Devnet)</Text>
          </View>
          <Text style={styles.tokenMintText} numberOfLines={1}>
            Mint: {USDC_DEVNET_MINT.toBase58()}
          </Text>
        </View>

        {/* Input: Địa chỉ ví người nhận */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Địa Chỉ Ví Người Nhận (Solana Address):</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="Nhập địa chỉ ví Solana (Base58)..."
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.pasteButton}
              onPress={handlePasteRecipient}
              disabled={isLoading}
            >
              <Feather name="clipboard" size={14} color="#6366F1" />
              <Text style={styles.pasteButtonText}>Dán</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Input: Số lượng chuyển */}
        <View style={styles.inputSection}>
          <View style={styles.amountLabelRow}>
            <Text style={styles.inputLabel}>Số Lượng USDC Cần Chuyển:</Text>
            {parsedAmount > 0 && (
              <Text style={styles.vndEquivalentText}>
                ≈ {equivalentVnd.toLocaleString('vi-VN')} đ
              </Text>
            )}
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.textInput, styles.amountInput]}
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="0.00"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
              editable={!isLoading}
            />
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>USDC</Text>
            </View>
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountRow}>
            {[1, 5, 10, 25, 50].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.quickAmountBtn,
                  parsedAmount === val && styles.quickAmountBtnActive,
                ]}
                onPress={() => handleQuickAmount(val)}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    parsedAmount === val && styles.quickAmountTextActive,
                  ]}
                >
                  ${val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nút Thực Thi Chuyển Tiền */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!recipient.trim() || parsedAmount <= 0 || isLoading) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleTransfer}
          disabled={!recipient.trim() || parsedAmount <= 0 || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {statusMessage || 'Đang Thực Thi CPI On-Chain...'}
              </Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>
                Xác Nhận Gửi {parsedAmount > 0 ? `${parsedAmount} USDC` : 'Stablecoin'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Trạng Thái Thành Công */}
        {isSuccess && txHash && (
          <View style={styles.successCard}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={styles.successTitle}>Chuyển Stablecoin Thành Công!</Text>
            </View>

            <Text style={styles.txHashLabel}>Transaction Signature:</Text>
            <TouchableOpacity
              style={styles.txHashBox}
              onPress={() => handleCopyTx(txHash)}
            >
              <Text style={styles.txHashText} numberOfLines={1}>
                {txHash}
              </Text>
              <Ionicons
                name={copiedTx ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={copiedTx ? '#10B981' : '#9CA3AF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.explorerButton}
              onPress={() => handleOpenExplorer(txHash)}
            >
              <Text style={styles.explorerButtonText}>Xem chi tiết trên Solana Explorer</Text>
              <Feather name="external-link" size={14} color="#6366F1" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Trạng Thái Lỗi */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  cardContainer: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginVertical: 10,
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  tokenInfoBox: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tokenBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  tokenMintText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    flex: 1,
    marginLeft: 10,
    textAlign: 'right',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 6,
  },
  amountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  vndEquivalentText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
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
    height: 46,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  pasteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#818CF8',
    marginLeft: 4,
  },
  currencyBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  quickAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quickAmountBtn: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#374151',
  },
  quickAmountBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  quickAmountText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  quickAmountTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#10B981',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
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
    paddingHorizontal: 10,
  },
  successCard: {
    marginTop: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 8,
  },
  txHashLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  txHashBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  txHashText: {
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
    color: '#818CF8',
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 12,
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

export default TransferScreen;
