import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useNotificationStore, InAppNotification } from '../stores/useNotificationStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

// Helper tính toán thời gian tương đối
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;

  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function NotificationModal({ visible, onClose }: NotificationModalProps) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    activeNotification,
    setActiveNotification,
  } = useNotificationStore();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleMarkAllAsRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllAsRead();
  };

  const handleSelectNotification = (item: InAppNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markAsRead(item.id);
    setActiveNotification(item);
    onClose();
    router.push({
      pathname: '/notification-detail',
      params: { id: item.id },
    });
  };

  const renderTypeIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'RECEIVE_MONEY':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#CCFF00' }]}>
            <Feather name="arrow-down-left" size={18} color="#000" />
          </View>
        );
      case 'TRANSFER':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#FF8A8A' }]}>
            <Feather name="arrow-up-right" size={18} color="#000" />
          </View>
        );
      case 'WARNING':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#FDE047' }]}>
            <Ionicons name="warning" size={18} color="#000" />
          </View>
        );
      case 'SYSTEM':
      default:
        return (
          <View style={[styles.iconBox, { backgroundColor: '#A5F3FC' }]}>
            <Ionicons name="notifications" size={18} color="#000" />
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdropClickArea}
            activeOpacity={1}
            onPress={handleClose}
          />

          {/* Khung Bottom Sheet trượt lên */}
          <View style={styles.sheetContainer}>
            {/* Thanh tay cầm kéo (Drag Handle) */}
            <View style={styles.dragHandle} />

            {/* Header: Tiêu đề to font Black/Heavy & Nút đánh dấu đã đọc tất cả */}
            <View style={styles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.headerTitle}>Thông báo</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadCountBadge}>
                    <Text style={styles.unreadCountBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={styles.markAllBtn}
                    onPress={handleMarkAllAsRead}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.markAllBtnText}>Đọc tất cả</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.closeIconBtn}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={20} color="#000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Danh sách thông báo */}
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBox}>
                    <FontAwesome5 name="bell-slash" size={32} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
                  <Text style={styles.emptySubtitle}>
                    Các giao dịch nhận tiền, cảnh báo và cập nhật hệ thống sẽ xuất hiện tại đây.
                  </Text>
                </View>
              ) : (
                notifications.map((item) => {
                  const isUnread = !item.isRead;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleSelectNotification(item)}
                      activeOpacity={0.85}
                      style={[
                        styles.cardShadowWrapper,
                        { marginBottom: 12 },
                      ]}
                    >
                      {/* Lớp bóng đổ cứng đen 3px 3px */}
                      <View style={styles.cardShadow} />

                      {/* Lớp thân thẻ: Nền Vàng nhạt (#FFF8DC) nếu chưa đọc, Trắng nếu đã đọc */}
                      <View
                        style={[
                          styles.cardBody,
                          isUnread ? styles.cardUnread : styles.cardRead,
                        ]}
                      >
                        {/* Cột trái: Icon trạng thái */}
                        {renderTypeIcon(item.type)}

                        {/* Cột giữa: Nội dung */}
                        <View style={styles.cardCenter}>
                          <View style={styles.cardTitleRow}>
                            <Text
                              style={[
                                styles.cardTitle,
                                isUnread && styles.cardTitleUnread,
                              ]}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                          </View>

                          <Text style={styles.cardMessage} numberOfLines={2}>
                            {item.message}
                          </Text>

                          {item.amount !== undefined && (
                            <View style={styles.amountChip}>
                              <Text style={styles.amountChipText}>
                                +${Number(item.amount).toFixed(2)} {item.currency || 'USDC'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Cột phải: Thời gian tương đối & Chấm đỏ nếu chưa đọc */}
                        <View style={styles.cardRight}>
                          <Text style={styles.timeText}>
                            {getRelativeTime(item.createdAt)}
                          </Text>
                          {isUnread && <View style={styles.redDot} />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropClickArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FAF5EE', // Nền giấy kem thô cổ điển
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#000000',
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.5,
    paddingTop: 10,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#000000',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },
  unreadCountBadge: {
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  unreadCountBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
  },
  markAllBtn: {
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowOffset: { width: 2, height: 2 },
    shadowColor: '#000000',
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cardShadowWrapper: {
    position: 'relative',
  },
  cardShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: '#000000',
    borderRadius: 12,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  // Nền Vàng nhạt (#FFF8DC) cho thông báo chưa đọc, Trắng cho đã đọc
  cardUnread: {
    backgroundColor: '#FFF8DC', // Cornsilk pastel ấm
  },
  cardRead: {
    backgroundColor: '#FFFFFF',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenter: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cardTitleUnread: {
    fontWeight: '900',
    color: '#000000',
  },
  cardMessage: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  amountChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#008000',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 4,
  },
  amountChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#008000',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1,
    borderColor: '#000000',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
