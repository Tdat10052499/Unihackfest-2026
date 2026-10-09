// Main navigation (HomeVN / HomeIntl boards): white bottom bar, Home · Contracts · Records · Settings, icon + label;
// the open item is accent purple.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, palette, sizes } from '@/constants/design';

export type NavItem = 'Home' | 'Contracts' | 'Records' | 'Settings';

const items: { title: NavItem; icon: React.ComponentProps<typeof Feather>['name']; route: string }[] = [
  { title: 'Home', icon: 'home', route: '/(tabs)' },
  { title: 'Contracts', icon: 'file-text', route: '/contracts' },
  { title: 'Records', icon: 'bar-chart-2', route: '/records' },
  { title: 'Settings', icon: 'settings', route: '/settings' },
];

/** Height of the bar above the safe area; screens keep at least this much bottom padding */
export const NAV_HEIGHT = 62;

export function WalletNav({ active = 'Home' }: { active?: NavItem }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]} accessibilityRole="tablist" accessibilityLabel="Main">
      <View style={styles.row}>
        {items.map((item) => {
          const selected = active === item.title;
          const color = selected ? palette.accent : palette.caption;
          return (
            <Pressable
              key={item.title}
              accessibilityRole="tab"
              accessibilityLabel={item.title}
              accessibilityState={{ selected }}
              onPress={() => (selected ? undefined : router.navigate(item.route as Href))}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <Feather name={item.icon} size={22} color={color} />
              <Text style={[styles.label, { color }, selected && styles.labelActive]}>{item.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 4,
    backgroundColor: palette.card,
    boxShadow: '0 -10px 30px -12px rgba(17,17,22,0.10)',
  },
  row: { flexDirection: 'row', width: '100%', maxWidth: sizes.maxContent, alignSelf: 'center', paddingHorizontal: 8 },
  item: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', gap: 3 },
  pressed: { opacity: 0.7 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 14 },
  labelActive: { fontFamily: fonts.bodySemi, fontWeight: '700' },
});
