import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DText } from '@/components/design';
import { colors, glass, radius, space } from '@/constants/design';

export const RISK_TEXT =
  'This token tracks the share price but is not the share, does not give you ownership or shareholder rights, and may have different risks.';

export function RiskDisclosure({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onChange}
      style={styles.row}
    >
      <Feather
        name={checked ? 'check-square' : 'square'}
        size={18}
        color={colors.warningText}
      />
      <DText variant="caption" tone="primary" style={styles.text}>
        {RISK_TEXT}
      </DText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: glass.warningFill,
    borderWidth: 1,
    borderColor: glass.warningBorder,
    marginVertical: space[4],
  },
  text: { flex: 1 },
});
