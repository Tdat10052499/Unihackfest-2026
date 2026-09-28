import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, glass, radius, shadows, space } from '@/constants/design';

// History thay vị trí dApps của thiết kế (mini-app platform đã bị cắt)
const items = [
  { title: 'Home', icon: 'home', route: '/(tabs)' },
  { title: 'History', icon: 'clock', route: '/history' },
  { title: 'xStocks', icon: 'bar-chart-2', route: '/xstocks' },
  { title: 'Settings', icon: 'more-horizontal', route: '/settings' },
] as const;

/** Thanh điều hướng viên thuốc nổi (HomeV4 / Settings): 256×56, chỉ icon, mục đang mở có nền tím */
export function WalletNav({ active = 'Home' }: { active?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, space[6]) }]}>
      <View style={styles.bar}>
        {items.map((item) => {
          const selected = active === item.title;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityState={{ selected }}
              key={item.title}
              onPress={() => router.navigate(item.route as Href)}
              style={[styles.item, selected && styles.active]}
            >
              <Feather name={item.icon} color={selected ? colors.text : colors.textSecondary} size={21} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    width: 256,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[2],
    backgroundColor: glass.nav,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: glass.border,
    boxShadow: shadows.nav,
  },
  item: { width: 52, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: glass.navActive },
});
