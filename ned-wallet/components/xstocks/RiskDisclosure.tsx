import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

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
      <Text style={styles.box}>{checked ? '☑' : '☐'}</Text>
      <Text style={styles.text}>{RISK_TEXT}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
    marginVertical: 14,
  },
  box: { color: '#FBBF24', fontSize: 18 },
  text: {
    flex: 1,
    color: 'rgba(255,255,255,0.76)',
    fontSize: 11,
    lineHeight: 16,
  },
});
