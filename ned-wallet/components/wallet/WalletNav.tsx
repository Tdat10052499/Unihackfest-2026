import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onbFonts } from '@/components/onboarding/theme';

const items = [
  { title: 'Home', icon: 'home', route: '/(tabs)' },
  { title: 'History', icon: 'clock', route: '/history' },
  { title: 'xStocks', icon: 'bar-chart-2', route: '/xstocks' },
  { title: 'Settings', icon: 'more-horizontal', route: '/settings' },
] as const;

export function WalletNav({ active = 'Home' }: { active?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.bar}>
        {items.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityState={{ selected: active === item.title }}
            key={item.title}
            onPress={() => router.navigate(item.route as Href)}
            style={[styles.item, active === item.title && styles.active]}
          >
            <Feather
              name={item.icon}
              color={active === item.title ? '#D5A7F4' : '#AAA5B5'}
              size={21}
            />
            <Text
              style={[
                styles.label,
                active === item.title && styles.selectedLabel,
              ]}
            >
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    padding: 6,
    gap: 4,
    backgroundColor: '#201B2B',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#3C3449',
    boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
  },
  item: {
    width: 66,
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  active: { backgroundColor: '#482568' },
  label: { fontSize: 9, fontFamily: onbFonts.body, color: '#AAA5B5' },
  selectedLabel: { color: '#D5A7F4' },
});
