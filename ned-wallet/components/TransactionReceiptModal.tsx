import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface TransactionReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number | string;
  currency?: string;
  note?: string;
  txHash?: string;
  title?: string;
  paidStatusText?: string;
}

/**
 * Tạo đường dẫn SVG cho viền cuống vé/hóa đơn ziczac (Scalloped / Serrated Edges)
 * Mép trên có răng cưa hướng lên, mép dưới có răng cưa hướng xuống
 */
function getScallopedTicketPath(
  width: number,
  height: number,
  toothWidth: number = 14,
  toothHeight: number = 8
): string {
  if (width <= 0 || height <= 0) return '';

  const numTeeth = Math.max(1, Math.round(width / toothWidth));
  const tw = width / numTeeth;

  // Điểm bắt đầu: mép trái bên dưới răng cưa trên cùng (0, toothHeight)
  let d = `M 0 ${toothHeight} `;

  // Răng cưa mép trên (chóp nhọn hướng lên y = 0)
  for (let i = 0; i < numTeeth; i++) {
    const xMid = (i + 0.5) * tw;
    const xEnd = (i + 1) * tw;
    d += `L ${xMid} 0 L ${xEnd} ${toothHeight} `;
  }

  // Cạnh phải thẳng xuống (width, height - toothHeight)
  d += `L ${width} ${height - toothHeight} `;

  // Răng cưa mép dưới (chóp nhọn hướng xuống y = height)
  for (let i = numTeeth - 1; i >= 0; i--) {
    const xMid = (i + 0.5) * tw;
    const xStart = i * tw;
    d += `L ${xMid} ${height} L ${xStart} ${height - toothHeight} `;
  }

  // Cạnh trái thẳng lên điểm bắt đầu
  d += `L 0 ${toothHeight} Z`;

  return d;
}

export function TransactionReceiptModal({
  visible,
  onClose,
  amount,
  currency = 'USD',
  note = 'Group lunch',
  txHash,
  title = 'Chi tiết hóa đơn',
  paidStatusText = 'PAID',
}: TransactionReceiptModalProps) {
  const cardWidth = Math.min(SCREEN_WIDTH - 56, 320);
  const [contentHeight, setContentHeight] = useState(450);

  // Format số tiền tối đa 2-4 chữ số thập phân, tránh tràn chữ
  const formatReceiptAmount = (val: number | string): string => {
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(num)) return '0.00';
    if (Number.isInteger(num)) {
      return num.toFixed(2);
    }
    const str = num.toString();
    const decimalPart = str.split('.')[1] || '';
    if (decimalPart.length <= 2) {
      return num.toFixed(2);
    }
    return parseFloat(num.toFixed(4)).toString();
  };

  // Truncate Tx Hash trên Solana: 2Jcp9sb...W4YK
  const truncateTxHash = (hash?: string) => {
    if (!hash) return '';
    const clean = hash.trim();
    if (clean.length <= 16) return clean;
    return `${clean.slice(0, 8)}...${clean.slice(-6)}`;
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  const ticketPath = getScallopedTicketPath(cardWidth, contentHeight, 14, 8);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      {/* 1. BỐ CỤC MODAL & NỀN (OVERLAY) */}
      <View style={styles.modalBackdrop}>
        {/* Vỏ bao ngoài toàn bộ Receipt Container */}
        <View style={[styles.receiptWrapper, { width: cardWidth }]}>
          {/* Lớp SVG Vỏ ngoài tím pastel + Răng cưa cuống vé + Đổ bóng cứng khổng lồ 8px 8px */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg
              width={cardWidth + 10}
              height={contentHeight + 10}
              viewBox={`0 0 ${cardWidth + 10} ${contentHeight + 10}`}
            >
              {/* Bóng đổ cứng đen lệch 8px 8px */}
              <Path
                d={ticketPath}
                fill="#000000"
                transform="translate(8, 8)"
              />
              {/* Vỏ tím pastel (#E6D7FF) viền đen 3px */}
              <Path
                d={ticketPath}
                fill="#E6D7FF"
                stroke="#000000"
                strokeWidth={3}
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          {/* Nội dung bên trong lọt lòng vỏ tím */}
          <View
            style={[styles.receiptContentPadding, { width: cardWidth }]}
            onLayout={(e) => {
              const h = Math.round(e.nativeEvent.layout.height);
              if (h > 0 && Math.abs(h - contentHeight) > 2) {
                setContentHeight(h);
              }
            }}
          >
            {/* 2. LỚP TRONG (INNER CARD): Nền trắng, bo góc 12px */}
            <View style={styles.innerCard}>
              {/* 3. CHI TIẾT ĐỒ HỌA: Con dấu "PAID" viền nét đứt, xoay -15 độ */}
              <View style={styles.paidStamp}>
                <Text style={styles.paidStampText}>• {paidStatusText} •</Text>
              </View>

              {/* Mascot Gấu tím vui vẻ + Tia sáng vàng tỏa ra 2 bên */}
              <View style={styles.mascotSection}>
                {/* Tia sáng vàng bên trái */}
                <View style={styles.sparkleGroupLeft}>
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '-35deg' }] }]} />
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '0deg' }], marginVertical: 3 }]} />
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '35deg' }] }]} />
                </View>

                {/* Mascot Gấu */}
                <Image
                  source={require('../assets/images/mascot-happy.png')}
                  style={styles.mascotImage}
                />

                {/* Tia sáng vàng bên phải */}
                <View style={styles.sparkleGroupRight}>
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '35deg' }] }]} />
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '0deg' }], marginVertical: 3 }]} />
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '-35deg' }] }]} />
                </View>
              </View>

              {/* 4. KHỐI CHI TIẾT HÓA ĐƠN (TYPOGRAPHY & DATA) */}
              <View style={styles.titleRow}>
                <MaterialCommunityIcons
                  name="receipt-text-outline"
                  size={19}
                  color="#000000"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.receiptTitleText}>{title}</Text>
              </View>

              {/* Label Số tiền */}
              <Text style={styles.amountLabel}>Số tiền đã thanh toán:</Text>

              {/* Số tiền siêu to màu Tím đậm, font Black/Heavy, chống tràn */}
              <Text
                style={styles.amountValueText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                $ {formatReceiptAmount(amount)}{' '}
                <Text style={styles.currencySubText}>{currency}</Text>
              </Text>

              {/* Ghi chú: in nghiêng, màu xám */}
              {note ? (
                <Text style={styles.noteText} numberOfLines={2}>
                  Ghi chú: {note}
                </Text>
              ) : null}

              {/* Đường phân cách nét đứt mờ */}
              <View style={styles.dashedDivider} />

              {/* Mã giao dịch (Tx Hash): chữ siêu nhỏ, cắt giữa */}
              {txHash ? (
                <Text style={styles.txHashText} numberOfLines={1}>
                  Chữ ký: {truncateTxHash(txHash)}
                </Text>
              ) : null}
            </View>
          </View>

          {/* 5. NÚT HÀNH ĐỘNG "OK": Đè lên mép viền dưới, nền đỏ san hô, bóng đổ cứng 3px 3px */}
          <View style={styles.okButtonWrapper}>
            <View style={styles.okButtonShadow} />
            <TouchableOpacity
              style={styles.okButton}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // 1. MODAL & BACKDROP
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  receiptWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  receiptContentPadding: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 28,
  },

  // 2. INNER CARD
  innerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000000',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
    position: 'relative',
  },

  // 3. GRAPHIC ELEMENTS
  paidStamp: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    transform: [{ rotate: '-15deg' }],
    borderWidth: 2,
    borderColor: '#FF4C4C',
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  paidStampText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF4C4C',
    letterSpacing: 1.5,
  },
  mascotSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  mascotImage: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  sparkleGroupLeft: {
    marginRight: 6,
    alignItems: 'flex-end',
  },
  sparkleGroupRight: {
    marginLeft: 6,
    alignItems: 'flex-start',
  },
  sparkleRay: {
    width: 10,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#FFD700',
  },

  // 4. TYPOGRAPHY & DATA
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  receiptTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
  },
  amountValueText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#5B21B6',
    marginTop: 2,
    textAlign: 'center',
  },
  currencySubText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5B21B6',
  },
  noteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  dashedDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB',
    borderStyle: 'dashed',
    width: '85%',
    marginVertical: 12,
  },
  txHashText: {
    fontSize: 9.5,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },

  // 5. ACTION BUTTON (OK)
  okButtonWrapper: {
    position: 'absolute',
    bottom: -18,
    alignSelf: 'center',
    zIndex: 20,
  },
  okButtonShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: '#000000',
    borderRadius: 22,
  },
  okButton: {
    backgroundColor: '#FF4C4C',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 22,
    paddingHorizontal: 48,
    paddingVertical: 9,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
