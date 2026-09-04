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
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  interpolate,
} from 'react-native-reanimated';
import { useTranslation } from '../../services/i18n';
import { NEO_COLORS } from '../../components/neo/tokens';

const TAB_ROUTES = ['index', 'card', 'transfer-hub', 'miniapps'];

// Cấu hình vật lý cơ học dứt khoát và nhanh (Snappy & Mechanical Spring)
const SPRING_CONFIG = {
  damping: 26,
  stiffness: 280,
  mass: 0.8,
};

const ICON_SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
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
 * - Trục X & Chiều rộng (Width) tự co giãn đàn hồi với withSpring({ damping: 26, stiffness: 280, mass: 0.8 })
 * - Icon Scale Pop bật nảy nhẹ khi được click (1.0 -> 1.1 -> 1.0) với { damping: 20, stiffness: 300 }
 * - Text Label xuất hiện mượt mà
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
  const activeProgress = useSharedValue(isFocused ? 1 : 0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    activeProgress.value = withSpring(isFocused ? 1 : 0, SPRING_CONFIG);

    if (isFocused) {
      // Hiệu ứng Bật nảy Icon (Scale Pop): Phóng to 1.1 rồi nhả về 1.0 với phản hồi cơ học dứt khoát
      iconScale.value = withSequence(
        withSpring(1.1, ICON_SPRING_CONFIG),
        withSpring(1.0, ICON_SPRING_CONFIG)
      );
    } else {
      iconScale.value = withSpring(1.0, ICON_SPRING_CONFIG);
    }
  }, [isFocused]);

  // Animated style cho Khung viên thuốc (Pill)
  const animatedContainerStyle = useAnimatedStyle(() => {
    const width = interpolate(activeProgress.value, [0, 1], [44, 104]);
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

  // Animated style cho Icon bật nảy (Scale Pop)
  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: iconScale.value }],
    };
  });

  // Animated style cho Text Label
  const animatedLabelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(activeProgress.value, [0, 0.4, 1], [0, 0, 1]);
    const translateX = interpolate(activeProgress.value, [0, 1], [6, 0]);

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

    if (route.name === 'card') {
      return (
        <Ionicons
          name={isFocused ? 'card' : 'card-outline'}
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
        <Animated.View style={animatedIconStyle}>
          {renderIcon()}
        </Animated.View>

        {isFocused && (
          <Animated.Text
            style={[
              styles.activeTabText,
              { color: colors.tabActiveText },
              animatedLabelStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
        )}
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
 * - Chuyển động vật lý nảy nhẹ với withSpring(damping: 14, stiffness: 120)
 * - Tách biệt component render độc lập, không giật cục trên Main Thread
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
      {/* Thanh Điều Hướng Dạng Nổi (Floating Pill) */}
      <View
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

            // Đánh chặn tab Card đang phát triển
            if (route.name === 'card') {
              Alert.alert(
                t('tabs.cardInDev', { defaultValue: 'Đang phát triển' }),
                t('tabs.cardInDevMsg', {
                  defaultValue: 'Tính năng quản lý Thẻ N.E.D sẽ ra mắt trong bản cập nhật tới. Cùng đón chờ nhé!',
                })
              );
              return;
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
            if (route.name === 'card') return t('tabs.card', { defaultValue: 'Thẻ' });
            if (route.name === 'transfer-hub') return t('tabs.transfer', { defaultValue: 'Chuyển' });
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
      </View>
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
        name="card"
        options={{
          title: t('tabs.card', { defaultValue: 'Thẻ' }),
          tabBarLabel: t('tabs.card', { defaultValue: 'Thẻ' }),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            Alert.alert(
              t('tabs.cardInDev', { defaultValue: 'Đang phát triển' }),
              t('tabs.cardInDevMsg', {
                defaultValue: 'Tính năng quản lý Thẻ N.E.D sẽ ra mắt trong bản cập nhật tới. Cùng đón chờ nhé!',
              })
            );
          },
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
    borderWidth: 2,
    borderColor: '#000000',
    gap: 8,
    // Solid offset shadow phong cách Neo-brutalism
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
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
  activeTabText: {
    fontSize: 13.5,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
});
