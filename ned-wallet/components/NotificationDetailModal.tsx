import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { InAppNotification } from '../stores/useNotificationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NotificationDetailModalProps {
  visible: boolean;
  notification: InAppNotification | null;
  onClose: () => void;
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

  let d = `M 0 ${toothHeight} `;

  // Răng cưa mép trên
  for (let i = 0; i < numTeeth; i++) {
    const xMid = (i + 0.5) * tw;
    const xEnd = (i + 1) * tw;
    d += `L ${xMid} 0 L ${xEnd} ${toothHeight} `;
  }

  // Cạnh phải thẳng xuống
  d += `L ${width} ${height - toothHeight} `;

  // Răng cưa mép dưới
  for (let i = numTeeth - 1; i >= 0; i--) {
    const xMid = (i + 0.5) * tw;
    const xStart = i * tw;
    d += `L ${xMid} ${height} L ${xStart} ${height - toothHeight} `;
  }

  // Cạnh trái thẳng lên điểm bắt đầu
  d += `L 0 ${toothHeight} Z`;

  return d;
}

export function NotificationDetailModal({
  visible,
  notification,
  onClose,
}: NotificationDetailModalProps) {
  const router = useRouter();
  const cardWidth = Math.min(SCREEN_WIDTH - 48, 330);
  const [contentHeight, setContentHeight] = useState(480);

  if (!notification) return null;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  const handleOpenExplorer = () => {
    if (!notification.txHash) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://solscan.io/tx/${notification.txHash}?cluster=devnet`;
    Linking.openURL(url).catch((err) =>
      console.warn('Cannot open explorer URL:', err)
    );
  };

  const truncateTxHash = (hash?: string) => {
    if (!hash) return '';
    const clean = hash.trim();
    if (clean.length <= 16) return clean;
    return `${clean.slice(0, 8)}...${clean.slice(-6)}`;
  };

  const formatAmount = (val?: number | string) => {
    if (val === undefined || val === null) return null;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    if (isNaN(num)) return null;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isReceive = notification.type === 'RECEIVE_MONEY';
  const isWarning = notification.type === 'WARNING';
  const isSystem = notification.type === 'SYSTEM';

  const ticketPath = getScallopedTicketPath(cardWidth, contentHeight, 14, 8);
  const amountFormatted = formatAmount(notification.amount);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Vỏ bao ngoài toàn bộ Receipt Container */}
        <View style={[styles.receiptWrapper, { width: cardWidth }]}>
          {/* Lớp SVG Vỏ ngoài tím pastel + Răng cưa cuống vé + Đổ bóng cứng khổng lồ 8px 8px */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg
              width={cardWidth + 12}
              height={contentHeight + 12}
              viewBox={`0 0 ${cardWidth + 12} ${contentHeight + 12}`}
            >
              {/* Bóng đổ cứng đen lệch 8px 8px */}
              <Path d={ticketPath} fill="#000000" transform="translate(8, 8)" />
              {/* Vỏ tím pastel (#E6D7FF) viền đen 3px */}
              <Path
                d={ticketPath}
                fill={isWarning ? '#FEF3C7' : '#E6D7FF'}
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
            {/* Lớp trong (Inner Card): Nền trắng, bo góc 12px */}
            <View style={styles.innerCard}>
              {/* Con dấu trạng thái viền nét đứt */}
              <View
                style={[
                  styles.paidStamp,
                  isWarning && { borderColor: '#D97706', backgroundColor: '#FEF3C7' },
                ]}
              >
                <Text
                  style={[
                    styles.paidStampText,
                    isWarning && { color: '#B45309' },
                  ]}
                >
                  • {isReceive ? 'THÀNH CÔNG' : isWarning ? 'CẢNH BÁO' : 'THÔNG BÁO'} •
                </Text>
              </View>

              {/* Mascot Gấu tím vui vẻ + Tia sáng vàng tỏa ra 2 bên */}
              <View style={styles.mascotSection}>
                <View style={styles.sparkleGroupLeft}>
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '-35deg' }] }]} />
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '0deg' }], marginVertical: 3 }]} />
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '35deg' }] }]} />
                </View>

                {isWarning ? (
                  <View style={styles.iconCircleWarning}>
                    <Ionicons name="alert-circle" size={44} color="#D97706" />
                  </View>
                ) : isSystem ? (
                  <View style={styles.iconCircleSystem}>
                    <Ionicons name="shield-checkmark" size={42} color="#4F46E5" />
                  </View>
                ) : isReceive ? (
                  <Image
                    source={require('../assets/images/mascot teddy - embarrassed.png')}
                    style={styles.mascotImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    source={require('../assets/images/mascot teddy - exciting.png')}
                    style={styles.mascotImage}
                    resizeMode="contain"
                  />
                )}

                <View style={styles.sparkleGroupRight}>
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '35deg' }] }]} />
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '0deg' }], marginVertical: 3 }]} />
                  <View style={[styles.sparkleRay, { transform: [{ rotate: '-35deg' }] }]} />
                </View>
              </View>

              {/* Tiêu đề thông báo */}
              <View style={styles.titleRow}>
                <MaterialCommunityIcons
                  name="receipt-text-outline"
                  size={18}
                  color="#000000"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.receiptTitleText}>{notification.title}</Text>
              </View>

              {/* Số dư thay đổi: Tô màu Xanh lá đậm #008000 */}
              {amountFormatted ? (
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>Số dư thay đổi:</Text>
                  <Text
                    style={styles.amountValueText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    + $ {amountFormatted}{' '}
                    <Text style={styles.currencySubText}>
                      {notification.currency || 'USDC'}
                    </Text>
                  </Text>
                </View>
              ) : null}

              {/* Lời nhắn của người gửi / Nội dung thông báo */}
              <View style={styles.messageBox}>
                <View style={styles.messageHeaderRow}>
                  <Feather name="message-square" size={13} color="#000" />
                  <Text style={styles.messageBoxHeader}>
                    {notification.sender ? `Từ ${notification.sender}:` : 'Chi tiết thông báo:'}
                  </Text>
                </View>
                <Text style={styles.messageBoxContent}>
                  {notification.senderNote || notification.message}
                </Text>
              </View>

              {/* Thông tin ví gửi & ví gửi đến */}
              <View style={styles.walletsCardMini}>
                <View style={styles.walletMiniRow}>
                  <Text style={styles.walletMiniLabel}>Ví gửi:</Text>
                  <Text style={styles.walletMiniAddress} numberOfLines={1}>
                    {truncateTxHash(notification.senderWallet || '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin')}
                  </Text>
                </View>
                <View style={styles.walletMiniRow}>
                  <Text style={styles.walletMiniLabel}>Ví gửi đến:</Text>
                  <Text style={[styles.walletMiniAddress, { color: '#008000' }]} numberOfLines={1}>
                    {truncateTxHash(notification.recipientWallet || 'H6ARHf6YXhGYeQfUzQngk6rDNnLBQKrenN712K4AQJEG')}
                  </Text>
                </View>
              </View>

              {/* Đường phân cách nét đứt */}
              <View style={styles.dashedDivider} />

              {/* Mã giao dịch & Nút xem trên Explorer */}
              {notification.txHash ? (
                <View style={styles.explorerSection}>
                  <Text style={styles.txHashText} numberOfLines={1}>
                    Chữ ký: {truncateTxHash(notification.txHash)}
                  </Text>
                  <TouchableOpacity
                    style={styles.explorerBtn}
                    onPress={handleOpenExplorer}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.explorerBtnText}>Xem trên Explorer</Text>
                    <Feather name="external-link" size={13} color="#000" />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Nút mở trang chi tiết on-chain đầy đủ */}
              <TouchableOpacity
                style={styles.fullDetailBtn}
                onPress={() => {
                  handleClose();
                  router.push({
                    pathname: '/notification-detail',
                    params: { id: notification.id },
                  });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.fullDetailBtnText}>Xem chi tiết on-chain đầy đủ</Text>
                <Feather name="arrow-up-right" size={13} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          {/* NÚT "ĐÓNG": Nền đỏ san hô, viền đen, bóng đổ cứng 3px 3px */}
          <View style={styles.closeButtonWrapper}>
            <View style={styles.closeButtonShadow} />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Text style={styles.closeButtonText}>ĐÓNG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  receiptWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  receiptContentPadding: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 28, // Chừa khoảng trống cho nút Đóng đè lên
  },
  innerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  paidStamp: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#008000',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    transform: [{ rotate: '-12deg' }],
    zIndex: 10,
  },
  paidStampText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#008000',
    letterSpacing: 0.5,
  },
  mascotSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 8,
    height: 70,
  },
  mascotImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  iconCircleWarning: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSystem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E7FF',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleGroupLeft: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 10,
  },
  sparkleGroupRight: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sparkleRay: {
    width: 12,
    height: 3,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  amountContainer: {
    alignItems: 'center',
    marginVertical: 4,
    width: '100%',
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountValueText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#008000', // Xanh lá đậm như yêu cầu
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  currencySubText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#008000',
  },
  messageBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginVertical: 8,
  },
  messageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  messageBoxHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  messageBoxContent: {
    fontSize: 12,
    color: '#1F2937',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  dashedDivider: {
    width: '100%',
    height: 1,
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  explorerSection: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  txHashText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#4B5563',
    fontWeight: '700',
  },
  explorerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFF00',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowOffset: { width: 2, height: 2 },
    shadowColor: '#000000',
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  explorerBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  closeButtonWrapper: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    width: 140,
    height: 38,
  },
  closeButtonShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 10,
  },
  closeButton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FF6B6B', // Đỏ san hô
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  walletsCardMini: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 8,
    width: '100%',
    gap: 4,
    marginVertical: 6,
  },
  walletMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletMiniLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
  },
  walletMiniAddress: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#111827',
  },
  fullDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF5EE',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    paddingVertical: 7,
    width: '100%',
    marginTop: 8,
  },
  fullDetailBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
});
