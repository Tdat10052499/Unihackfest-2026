import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNotificationStore } from '../stores/useNotificationStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function NotificationInAppBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    bannerNotification,
    dismissBanner,
    setActiveNotification,
    markAsRead,
  } = useNotificationStore();

  const translateY = useSharedValue(-180);
  const opacity = useSharedValue(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (bannerNotification) {
      // 1. Rung nhẹ haptics khi thông báo mới tới
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // 2. Trượt banner từ trên xuống
      translateY.value = withSpring(0, {
        stiffness: 240,
        damping: 20,
        mass: 0.6,
      });
      opacity.value = withTiming(1, { duration: 200 });

      // 3. Tự động ẩn sau 4.5 giây
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        hideBanner();
      }, 4500);
    } else {
      translateY.value = withTiming(-180, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [bannerNotification]);

  const hideBanner = () => {
    translateY.value = withTiming(-180, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(dismissBanner)();
      }
    });
    opacity.value = withTiming(0, { duration: 200 });
  };

  const handlePressBanner = () => {
    if (!bannerNotification) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const item = bannerNotification;
    hideBanner();
    markAsRead(item.id);
    setActiveNotification(item);
    router.push({
      pathname: '/notification-detail',
      params: { id: item.id },
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  if (!bannerNotification) return null;

  const isReceive = bannerNotification.type === 'RECEIVE_MONEY';
  const isWarning = bannerNotification.type === 'WARNING';

  return (
    <Animated.View
      style={[
        styles.container,
        { top: Math.max(insets.top, 12) + 4 },
        animatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bannerWrapper}>
        {/* Bóng đổ đen cứng 4px 4px */}
        <View style={styles.bannerShadow} />

        {/* Thân banner phong cách Neo-brutalism */}
        <TouchableOpacity
          style={[
            styles.bannerBody,
            isWarning ? styles.bannerWarning : styles.bannerNormal,
          ]}
          onPress={handlePressBanner}
          activeOpacity={0.9}
        >
          {/* Icon loại thông báo */}
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isReceive ? '#CCFF00' : isWarning ? '#FDE047' : '#A5F3FC' },
            ]}
          >
            {isReceive ? (
              <Feather name="arrow-down-left" size={18} color="#000" />
            ) : isWarning ? (
              <Ionicons name="warning" size={18} color="#000" />
            ) : (
              <Ionicons name="notifications" size={18} color="#000" />
            )}
          </View>

          {/* Nội dung thông báo */}
          <View style={styles.contentColumn}>
            <View style={styles.titleRow}>
              <Text style={styles.titleText} numberOfLines={1}>
                {bannerNotification.title}
              </Text>
              {bannerNotification.amount !== undefined && (
                <Text style={styles.amountText}>
                  +${Number(bannerNotification.amount).toFixed(2)}
                </Text>
              )}
            </View>
            <Text style={styles.messageText} numberOfLines={1}>
              {bannerNotification.message}
            </Text>
          </View>

          {/* Nút đóng nhanh */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={(e) => {
              e.stopPropagation();
              hideBanner();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color="#000" />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  bannerWrapper: {
    position: 'relative',
    width: '100%',
  },
  bannerShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000000',
    borderRadius: 14,
  },
  bannerBody: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  bannerNormal: {
    backgroundColor: '#FEF9C3', // Vàng chanh pastel ấm
  },
  bannerWarning: {
    backgroundColor: '#FEF08A',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    flex: 1,
    marginRight: 6,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#008000',
  },
  messageText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
