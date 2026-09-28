// Khung màn xStocks / Swap — lớp mỏng trên DesignKit (components/design) để giữ API cũ của các màn.
import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import {
  Button,
  Card as KitCard,
  DText,
  Header as KitHeader,
  InfoRow as KitInfoRow,
  Screen as KitScreen,
} from '@/components/design';
import { space } from '@/constants/design';

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
  return (
    <KitScreen scroll={scroll} footer={footer} contentStyle={[styles.content, style]}>
      {children}
    </KitScreen>
  );
}

export function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return <KitHeader title={title} onBack={onBack} right={right} />;
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
    <Button
      title={title}
      onPress={onPress}
      disabled={disabled}
      variant={secondary ? 'secondary' : 'primary'}
      style={styles.action}
    />
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return <KitInfoRow label={label} value={value} />;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <KitCard style={styles.card}>{children}</KitCard>;
}
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <DText variant="label" style={styles.label}>
      {children}
    </DText>
  );
}
export function Muted({ children }: { children: React.ReactNode }) {
  return (
    <DText variant="caption" tone="secondary" style={styles.muted}>
      {children}
    </DText>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[5] },
  action: { marginTop: space[3] },
  card: { marginVertical: space[3] },
  label: { marginBottom: space[2] },
  muted: { marginVertical: space[1] },
});
