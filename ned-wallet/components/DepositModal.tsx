import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

interface DepositModalProps {
  visible: boolean;
  onClose: () => void;
  solanaAddress: string | null;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  visible,
  onClose,
  solanaAddress,
}) => {
  const [currentView, setCurrentView] = useState<'OPTIONS' | 'VNPAY' | 'SOLANA_QR'>('OPTIONS');
  const [vnpayAmount, setVnpayAmount] = useState('100.000');
  const [isProcessingVnpay, setIsProcessingVnpay] = useState(false);

  const handleClose = () => {
    setCurrentView('OPTIONS');
    onClose();
  };

  const copyToClipboard = async (text?: string | null) => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Thông Báo', 'Đã sao chép địa chỉ ví vào bộ nhớ tạm!');
    } catch (err) {
      console.log('Copy error:', err);
    }
  };

  const handleProceedVnpay = () => {
    setIsProcessingVnpay(true);
    setTimeout(() => {
      setIsProcessingVnpay(false);
      Alert.alert(
        'Cổng Thanh Toán VNPAY',
        `Mô phỏng khởi tạo giao dịch nạp ${vnpayAmount} VND qua VNPAY-QR.\nQuy đổi ước tính: ~${(
          parseInt(vnpayAmount.replace(/\D/g, '') || '100000', 10) / 25400
        ).toFixed(2)} USDC`,
        [
          {
            text: 'Xác Nhận Giả Lập Nạp',
            onPress: () => {
              Alert.alert('Thành Công! 🎉', 'Đã ghi nhận giao dịch nạp tiền qua VNPAY.');
              handleClose();
            },
          },
          { text: 'Đóng', style: 'cancel' },
        ]
      );
    }, 800);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlayWrapper} pointerEvents="box-none">
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropDismissArea}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.bottomSheetContainer}>
          {/* Drag Handle Indicator */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.sheetTitle}>
                {currentView === 'OPTIONS'
                  ? 'Nạp Tiền Vào Ví'
                  : currentView === 'VNPAY'
                  ? 'Cổng Nạp VNPAY'
                  : 'Nhận qua Solana Network'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {currentView === 'OPTIONS'
                  ? 'Chọn phương thức nạp tiền phù hợp'
                  : currentView === 'VNPAY'
                  ? 'Nạp tức thì từ tài khoản ngân hàng nội địa'
                  : 'Quét mã QR hoặc sao chép địa chỉ ví ngầm'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={
                currentView === 'OPTIONS'
                  ? handleClose
                  : () => setCurrentView('OPTIONS')
              }
            >
              <Ionicons
                name={currentView === 'OPTIONS' ? 'close' : 'arrow-back'}
                size={22}
                color="#374151"
              />
            </TouchableOpacity>
          </View>

          {/* View 1: 2 Khối Tùy Chọn Nạp Chính (Tối giản) */}
          {currentView === 'OPTIONS' && (
            <View style={styles.optionsWrapper}>
              {/* Khối 1: Cổng thanh toán nội địa VNPAY */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => setCurrentView('VNPAY')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <MaterialCommunityIcons
                    name="bank-transfer"
                    size={26}
                    color="#0284C7"
                  />
                </View>
                <View style={styles.optionInfoCol}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>VNPAY (VND to USDC)</Text>
                    <View style={styles.fastTag}>
                      <Text style={styles.fastTagText}>Tức thì</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSubtitle}>
                    Nạp tiền tức thì qua cổng ngân hàng nội địa
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Khối 2: Mạng lưới Solana */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => setCurrentView('SOLANA_QR')}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBox, { backgroundColor: '#EDE9FE' }]}>
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={24}
                    color="#7C3AED"
                  />
                </View>
                <View style={styles.optionInfoCol}>
                  <Text style={styles.optionTitle}>Receive via Solana Network</Text>
                  <Text style={styles.optionSubtitle}>
                    Gửi SOL, USDC từ Phantom, Binance, OKX...
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}

          {/* View 2: Màn Hình Nạp VNPAY */}
          {currentView === 'VNPAY' && (
            <View style={styles.vnpayContentWrapper}>
              <Text style={styles.inputFieldLabel}>Số tiền nạp (VND):</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="100.000"
                placeholderTextColor="#9CA3AF"
                value={vnpayAmount}
                onChangeText={setVnpayAmount}
                keyboardType="numeric"
              />

              <View style={styles.quickAmountRow}>
                {['50.000', '100.000', '200.000', '500.000'].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickAmountPill,
                      vnpayAmount === amt && styles.quickAmountPillActive,
                    ]}
                    onPress={() => setVnpayAmount(amt)}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        vnpayAmount === amt && styles.quickAmountTextActive,
                      ]}
                    >
                      {amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.mainActionBtn}
                onPress={handleProceedVnpay}
                disabled={isProcessingVnpay}
                activeOpacity={0.85}
              >
                {isProcessingVnpay ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.mainActionBtnText}>Tiếp tục qua VNPAY</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* View 3: Màn Hình Hiển Thị Mã QR & Địa Chỉ Ví Solana */}
          {currentView === 'SOLANA_QR' && (
            <View style={styles.qrContentWrapper}>
              {solanaAddress ? (
                <>
                  <View style={styles.qrCard}>
                    <QRCode
                      value={solanaAddress}
                      size={180}
                      color="#111827"
                      backgroundColor="#FFFFFF"
                    />
                    <Text style={styles.addressDisplayText} numberOfLines={2}>
                      {solanaAddress}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mainActionBtn}
                    onPress={() => copyToClipboard(solanaAddress)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.mainActionBtnText}>Sao chép Địa chỉ Ví</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280' }}>Chưa phát hiện địa chỉ ví Solana.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleCol: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Options List
  optionsWrapper: {
    gap: 12,
    paddingVertical: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
  },
  optionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionInfoCol: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  fastTag: {
    backgroundColor: '#D1F4E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fastTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // VNPAY View
  vnpayContentWrapper: {
    paddingVertical: 6,
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  amountInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  quickAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 14,
    gap: 6,
  },
  quickAmountPill: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
  },
  quickAmountPillActive: {
    backgroundColor: '#00A859',
  },
  quickAmountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  quickAmountTextActive: {
    color: '#FFFFFF',
  },

  // QR View
  qrContentWrapper: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  qrCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    width: '100%',
  },
  addressDisplayText: {
    marginTop: 12,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#334155',
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  // Action Button
  mainActionBtn: {
    width: '100%',
    backgroundColor: '#00A859',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  mainActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
