import React from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, type Href } from 'expo-router';
import { useNotificationStore, InAppNotification } from '../stores/useNotificationStore';
import { Mascot } from '@/components/Mascot';
import { Badge, Button, DText, IconButton } from '@/components/design';
import { colors, fonts, glass, radius, sizes, space } from '@/constants/design';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

// Helper tính toán thời gian tương đối
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

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
    if (item.route) {
      router.push(item.route as Href);
      return;
    }
    router.push({
      pathname: '/notification-detail',
      params: { id: item.id },
    });
  };

  const renderTypeIcon = (type: InAppNotification['type']) => {
    const icon =
      type === 'RECEIVE_MONEY'
        ? { name: 'arrow-down-left' as const, bg: glass.successFill, fg: colors.successText }
        : type === 'TRANSFER'
          ? { name: 'arrow-up-right' as const, bg: glass.fillStrong, fg: colors.text }
          : type === 'WARNING'
            ? { name: 'alert-triangle' as const, bg: glass.warningFill, fg: colors.warningText }
            : { name: 'bell' as const, bg: glass.iconTint, fg: colors.purple[300] };
    return (
      <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
        <Feather name={icon.name} size={18} color={icon.fg} />
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Pressable accessibilityLabel="Close notifications" style={styles.backdropClickArea} onPress={handleClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <DText variant="h2" accessibilityRole="header">
                Notifications
              </DText>
              {unreadCount > 0 && <Badge label={String(unreadCount)} tone="accent" />}
            </View>
            <View style={styles.headerActions}>
              {unreadCount > 0 && <Button title="Mark all read" variant="ghost" compact onPress={handleMarkAllAsRead} style={styles.markAll} />}
              <IconButton icon="x" accessibilityLabel="Close" color={colors.text} onPress={handleClose} />
            </View>
          </View>

          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Mascot mood="sleepy" size={100} floatAnimation containerStyle={{ marginBottom: space[3] }} />
                <DText variant="h3" align="center">
                  No notifications yet
                </DText>
                <DText variant="body" align="center">
                  Money you receive, alerts and app updates show up here.
                </DText>
              </View>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.isRead;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${isUnread ? 'Unread: ' : ''}${item.title}`}
                    onPress={() => handleSelectNotification(item)}
                    style={({ pressed }) => [styles.card, isUnread ? styles.cardUnread : styles.cardRead, pressed && styles.pressed]}
                  >
                    {renderTypeIcon(item.type)}
                    <View style={styles.cardCenter}>
                      <DText variant="bodyLarge" style={[styles.cardTitle, isUnread && styles.cardTitleUnread]} numberOfLines={1}>
                        {item.title}
                      </DText>
                      <DText variant="caption" tone="secondary" numberOfLines={2}>
                        {item.message}
                      </DText>
                      {item.amount !== undefined && (
                        <Badge
                          label={`+$${Number(item.amount).toFixed(2)} ${item.currency || 'USDC'}`}
                          tone="success"
                          style={styles.amountChip}
                        />
                      )}
                    </View>
                    <View style={styles.cardRight}>
                      <DText variant="caption">{getRelativeTime(item.createdAt)}</DText>
                      {isUnread && <View style={styles.unreadDot} />}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: glass.scrim, justifyContent: 'flex-end' },
  backdropClickArea: { flex: 1 },
  sheetContainer: {
    width: '100%',
    maxWidth: sizes.maxContent,
    alignSelf: 'center',
    backgroundColor: colors.surface1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.5,
    paddingTop: space[2],
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: space[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[5],
    paddingBottom: space[3],
    borderBottomWidth: 1,
    borderBottomColor: glass.divider,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  markAll: { height: sizes.touch, paddingHorizontal: space[3] },
  scrollList: { flex: 1 },
  scrollContent: { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[8], gap: space[3] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space[3],
    gap: space[3],
  },
  cardUnread: { backgroundColor: glass.accentFill, borderColor: glass.accentBorder },
  cardRead: { backgroundColor: glass.fill, borderColor: glass.border },
  pressed: { opacity: 0.85 },
  iconBox: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardCenter: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  cardTitleUnread: { fontFamily: fonts.bodySemi },
  amountChip: { marginTop: space[1] },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between', gap: space[2], alignSelf: 'stretch' },
  unreadDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.purple[400] },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', gap: space[2], paddingVertical: space[12], paddingHorizontal: space[5] },
});
