import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TAB_ROUTES = ['index', 'card', 'transfer-hub', 'miniapps'];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Chỉ lọc đúng 4 route tab chính thức
  const visibleRoutes = state.routes.filter((route) =>
    TAB_ROUTES.includes(route.name)
  );

  const numTabs = visibleRoutes.length || 4;
  const tabWidth = SCREEN_WIDTH / numTabs;

  const activeIndex = visibleRoutes.findIndex(
    (r) => r.name === state.routes[state.index]?.name
  );
  const currentTabIdx = activeIndex >= 0 ? activeIndex : 0;

  // Animation trượt Indicator
  const translateX = useRef(new Animated.Value(currentTabIdx * tabWidth)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: currentTabIdx * tabWidth,
      useNativeDriver: true,
      friction: 7,
      tension: 65,
    }).start();
  }, [currentTabIdx, tabWidth]);

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          height: 60 + Math.max(insets.bottom, 12),
        },
      ]}
    >
      {/* Animated Sliding Indicator (Vệt sáng trượt mượt mà) */}
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            width: tabWidth * 0.5,
            transform: [
              {
                translateX: Animated.add(
                  translateX,
                  new Animated.Value(tabWidth * 0.25)
                ),
              },
            ],
          },
        ]}
      />

      <View style={styles.tabsRow}>
        {visibleRoutes.map((route, index) => {
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

          const renderIcon = (focused: boolean) => {
            const color = focused ? '#00A859' : '#94A3B8';
            if (route.name === 'index') {
              return (
                <Ionicons
                  name={focused ? 'home' : 'home-outline'}
                  size={24}
                  color={color}
                />
              );
            }
            if (route.name === 'card') {
              return (
                <Ionicons
                  name={focused ? 'card' : 'card-outline'}
                  size={24}
                  color={color}
                />
              );
            }
            if (route.name === 'transfer-hub') {
              return <Feather name="send" size={22} color={color} />;
            }
            if (route.name === 'miniapps') {
              return (
                <Ionicons
                  name={focused ? 'grid' : 'grid-outline'}
                  size={24}
                  color={color}
                />
              );
            }
            return <Ionicons name="apps-outline" size={24} color={color} />;
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
              activeOpacity={0.75}
            >
              <View style={styles.iconContainer}>
                {renderIcon(isFocused)}
                {isFocused && <View style={styles.activeGlowDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
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
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="card"
        options={{
          title: 'Card',
        }}
      />
      <Tabs.Screen
        name="transfer-hub"
        options={{
          title: 'Send',
        }}
      />
      <Tabs.Screen
        name="miniapps"
        options={{
          title: 'MiniApps',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: '#00A859',
    borderRadius: 1.5,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeGlowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00A859',
    marginTop: 4,
  },
});
