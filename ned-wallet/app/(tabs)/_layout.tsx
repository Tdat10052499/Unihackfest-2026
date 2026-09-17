import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  interpolate,
  LinearTransition,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from '../../services/i18n';
import { NEO_COLORS } from '../../components/neo/tokens';

const TAB_ROUTES = ['index', 'overview', 'transfer-hub', 'miniapps'];

// Cấu hình chuyển động nhanh, dứt khoát, không hiệu ứng lò xo bật nảy
const TIMING_CONFIG = {
  duration: 160,
  easing: Easing.out(Easing.cubic),
};

interface AnimatedTabItemProps {
  route: any;
  index: number;
  isFocused: boolean;
  options: any;
  colors: any;
  onPress: () => void;
  onLongPress: () => void;
  label: string;
}

/**
 * AnimatedTabItem: Tách biệt render độc lập cho từng tab,
 * Sử dụng react-native-reanimated trên UI Thread:
 * - Co giãn dứt khoát, nhanh gọn (160ms) không lò xo bật nảy
 * - Giảm biên độ co giãn (76px - 102px), gọn gàng và thanh thoát
 * - Text Label xuất hiện dứt khoát
 */
const AnimatedTabItem = React.memo(function AnimatedTabItem({
  route,
  index,
  isFocused,
  options,
  colors,
  onPress,
  onLongPress,
  label,
}: AnimatedTabItemProps) {
  // Ước tính chiều rộng chuẩn xác theo độ dài ký tự: ~7.5px mỗi ký tự + 56px (icon + gap + margin 2 bên)
  const defaultExpandedWidth = React.useMemo(() => {
    const approx = Math.round(label.length * 7.5 + 56);
    return Math.min(Math.max(approx, 84), 145);
  }, [label]);

  const targetWidth = useSharedValue(defaultExpandedWidth);
  const activeProgress = useSharedValue(isFocused ? 1 : 0);

  React.useEffect(() => {
    targetWidth.value = defaultExpandedWidth;
  }, [defaultExpandedWidth]);

  useEffect(() => {
    // Chuyển động dứt khoát bằng withTiming, không dùng withSpring để tránh bập bênh lò xo
    activeProgress.value = withTiming(isFocused ? 1 : 0, TIMING_CONFIG);
  }, [isFocused]);

  // Animated style cho Khung viên thuốc (Pill) - Co giãn dứt khoát và gọn gàng
  const animatedContainerStyle = useAnimatedStyle(() => {
    const width = interpolate(activeProgress.value, [0, 1], [44, targetWidth.value]);
    const backgroundColor = interpolateColor(
      activeProgress.value,
      [0, 1],
      [colors.tabInactiveCircle, colors.tabActiveBg]
    );

    return {
      width,
      backgroundColor,
    };
  });

  // Animated style cho Text Label
  const animatedLabelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(activeProgress.value, [0, 0.35, 1], [0, 0, 1]);
    const translateX = interpolate(activeProgress.value, [0, 1], [4, 0]);

    return {
      opacity,
      transform: [{ translateX }],
    };
  });

  const renderIcon = () => {
    const iconColor = isFocused ? colors.tabActiveText : colors.tabInactiveIcon;
    const iconSize = isFocused ? 18.5 : 20;

    if (route.name === 'index') {
      return (
        <Ionicons
          name={isFocused ? 'home' : 'home-outline'}
          size={iconSize}
          color={iconColor}
        />
      );
    }

    if (route.name === 'overview' || route.name === 'card') {
      return (
        <Ionicons
          name={isFocused ? 'stats-chart' : 'stats-chart-outline'}
          size={iconSize}
          color={iconColor}
        />
      );
    }

    if (route.name === 'transfer-hub') {
      return (
        <Ionicons
          name={isFocused ? 'navigate' : 'navigate-outline'}
          size={iconSize}
          color={iconColor}
          style={{ transform: [{ rotate: '45deg' }] }}
        />
      );
    }

    if (route.name === 'miniapps') {
      return (
        <MaterialCommunityIcons
          name={isFocused ? 'view-grid-plus' : 'view-grid-plus-outline'}
          size={iconSize + 1}
          color={iconColor}
        />
      );
    }

    return <Ionicons name="apps-outline" size={iconSize} color={iconColor} />;
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel || options.title}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.88}
    >
      <Animated.View style={[styles.tabItemBase, animatedContainerStyle]}>
        <View style={styles.iconContainer}>
          {renderIcon()}
        </View>

        {isFocused && (
          <Animated.Text
            style={[
              styles.activeTabText,
              { color: colors.tabActiveText },
              animatedLabelStyle,
            ]}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {label}
          </Animated.Text>
        )}

        {/* Đo lường độ dài thực tế của text để co giãn width chuẩn xác 100%, không bị mất chữ */}
        <Text
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) {
              const exactWidth = Math.min(Math.max(Math.round(w + 56), 84), 145);
              targetWidth.value = exactWidth;
            }
          }}
          style={styles.hiddenMeasureText}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets?: any;
  darkMode?: boolean;
}

/**
 * Custom Floating Pill Tab Bar theo phong cách Neo-brutalism
 * Được nâng cấp bằng react-native-reanimated:
 * - Co giãn dứt khoát, giảm biên độ co giãn (76px - 102px)
 * - Chuyển động nhanh gọn, không dùng lò xo bật nảy
 * - Tách biệt component render độc lập trên UI Thread
 */
function CustomTabBar({ state, descriptors, navigation, darkMode = false }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = darkMode ? NEO_COLORS.dark : NEO_COLORS.light;

  // Lọc đúng 4 route chính thức
  const visibleRoutes = state.routes.filter((route: any) =>
    TAB_ROUTES.includes(route.name)
  );

  const activeIndex = visibleRoutes.findIndex(
    (r: any) => r.name === state.routes[state.index]?.name
  );
  const currentTabIdx = activeIndex >= 0 ? activeIndex : 0;

  return (
    <View
      style={[
        styles.floatingContainer,
        {
          bottom: Math.max(insets.bottom, 12) + 4,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Thanh Điều Hướng Dạng Nổi (Floating Pill) - Co giãn dứt khoát, gọn gàng không hiệu ứng lò xo */}
      <Animated.View
        layout={LinearTransition.duration(160).easing(Easing.out(Easing.cubic))}
        style={[
          styles.pillBar,
          {
            backgroundColor: colors.tabBarBg,
            borderColor: colors.border,
          },
        ]}
      >
        {visibleRoutes.map((route: any, index: number) => {
          const isFocused = currentTabIdx === index;
          const { options } = descriptors[route.key];

          const onPress = () => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const getTabLabel = () => {
            if (route.name === 'index') return 'Home';
            if (route.name === 'overview' || route.name === 'card') return 'Overview';
            if (route.name === 'transfer-hub') return t('tabs.transfer', { defaultValue: 'Chuyển tiền' });
            if (route.name === 'miniapps') return t('tabs.miniapps', { defaultValue: 'Tiện ích' });
            return options.title || 'Tab';
          };

          return (
            <AnimatedTabItem
              key={route.key}
              route={route}
              index={index}
              isFocused={isFocused}
              options={options}
              colors={colors}
              onPress={onPress}
              onLongPress={onLongPress}
              label={getTabLabel()}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home', { defaultValue: 'Trang chủ' }),
          tabBarLabel: t('tabs.home', { defaultValue: 'Trang chủ' }),
        }}
      />
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Overview',
          tabBarLabel: 'Overview',
        }}
      />
      <Tabs.Screen
        name="transfer-hub"
        options={{
          title: t('tabs.transfer', { defaultValue: 'Chuyển tiền' }),
          tabBarLabel: t('tabs.transfer', { defaultValue: 'Chuyển tiền' }),
        }}
      />
      <Tabs.Screen
        name="miniapps"
        options={{
          title: t('tabs.miniapps', { defaultValue: 'Tiện ích' }),
          tabBarLabel: t('tabs.miniapps', { defaultValue: 'Tiện ích' }),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  pillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: '#000000',
    gap: 8,
    // Solid offset shadow phong cách Neo-brutalism
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  tabItemBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabText: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.1,
    flexShrink: 0,
    includeFontPadding: false,
  },
  hiddenMeasureText: {
    position: 'absolute',
    opacity: 0,
    zIndex: -9999,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
});
