import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { onbColors, onbFonts } from '@/components/onboarding/theme';
import { Feather } from '@expo/vector-icons';

export function Screen({
  children,
  scroll = true,
  style,
  footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  footer?: React.ReactNode;
}) {
  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, style]}>{children}</View>
  );
  return (
    <LinearGradient
      colors={['#110822', '#0D0618', '#080812', '#06060E']}
      style={styles.fill}
    >
      <SafeAreaView style={styles.safe}>
        {body}
        {footer ? (
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 12,
              backgroundColor: '#0B0814',
            }}
          >
            {footer}
          </View>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

export function Header({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={styles.back}
      >
        <Feather name="chevron-left" size={20} color={onbColors.textMuted} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        disabled && styles.disabled,
      ]}
    >
      {!secondary && (
        <LinearGradient
          colors={['#7B2FBE', '#9B4FDE', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}
export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  content: { padding: 20, paddingBottom: 36, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: onbColors.surface,
    borderWidth: 1,
    borderColor: onbColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: onbColors.text,
    fontFamily: onbFonts.heading,
    fontSize: 18,
  },
  right: { minWidth: 44, alignItems: 'flex-end' },
  button: {
    overflow: 'hidden',
    alignSelf: 'stretch',
    backgroundColor: onbColors.purple,
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: onbColors.border,
    borderWidth: 1,
  },
  disabled: { opacity: 0.42 },
  buttonText: {
    color: onbColors.text,
    fontFamily: onbFonts.bodyBold,
    fontSize: 14,
  },
  card: {
    alignSelf: 'stretch',
    padding: 16,
    marginVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
  },
  label: {
    color: onbColors.textMuted,
    fontFamily: onbFonts.bodyMedium,
    marginBottom: 8,
    fontSize: 12,
  },
  muted: {
    color: onbColors.textMuted,
    fontFamily: onbFonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  infoLabel: { color: onbColors.textMuted, fontSize: 12 },
  infoValue: {
    color: onbColors.text,
    fontFamily: onbFonts.bodyMedium,
    fontSize: 12,
    textAlign: 'right',
    maxWidth: '65%',
  },
});
