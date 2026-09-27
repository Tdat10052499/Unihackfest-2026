import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { onbColors, onbFonts } from '@/components/onboarding/theme';

export function Screen({ children, scroll = true, style }: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const body = scroll ? <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[styles.content, styles.fill]}>{children}</View>;
  return <LinearGradient colors={['#110822', '#0D0618', '#080812', '#06060E']} style={styles.fill}><SafeAreaView style={styles.safe}>{body}</SafeAreaView></LinearGradient>;
}

export function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return <View style={styles.header}><Pressable accessibilityLabel="Go back" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><Text style={styles.title}>{title}</Text><View style={styles.right}>{right}</View></View>;
}

export function ActionButton({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

export function Card({ children }: { children: React.ReactNode }) { return <View style={styles.card}>{children}</View>; }
export function Label({ children }: { children: React.ReactNode }) { return <Text style={styles.label}>{children}</Text>; }
export function Muted({ children }: { children: React.ReactNode }) { return <Text style={styles.muted}>{children}</Text>; }

const styles = StyleSheet.create({
  fill: { flex: 1 }, safe: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }, content: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  back: { width: 34 }, backText: { color: onbColors.text, fontSize: 32, lineHeight: 36 },
  title: { flex: 1, color: onbColors.text, fontFamily: onbFonts.heading, fontSize: 21 }, right: { minWidth: 34, alignItems: 'flex-end' },
  button: { backgroundColor: onbColors.purple, borderRadius: 15, minHeight: 52, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  secondary: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: onbColors.border, borderWidth: 1 },
  disabled: { opacity: 0.42 }, buttonText: { color: onbColors.text, fontFamily: onbFonts.bodyBold, fontSize: 14 },
  card: { padding: 16, marginVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
  label: { color: onbColors.textMuted, fontFamily: onbFonts.bodyMedium, marginBottom: 8, fontSize: 12 },
  muted: { color: onbColors.textMuted, fontFamily: onbFonts.body, fontSize: 12, lineHeight: 18, marginVertical: 5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  infoLabel: { color: onbColors.textMuted, fontSize: 12 }, infoValue: { color: onbColors.text, fontFamily: onbFonts.bodyMedium, fontSize: 12, textAlign: 'right', maxWidth: '65%' },
});
