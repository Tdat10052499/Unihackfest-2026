import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, space } from '@/constants/design';
import { sanitizeAmountInput } from '@/utils/amountInput';

export function AmountKeypad({
  value,
  decimals,
  onChange,
}: {
  value: string;
  decimals: number;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.keys}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map(
        (key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={
              key === 'back'
                ? 'Delete last digit'
                : key === '.'
                  ? 'Decimal point'
                  : key
            }
            style={styles.key}
            onPress={() =>
              onChange(
                sanitizeAmountInput(
                  key === 'back' ? value.slice(0, -1) : value + key,
                  decimals,
                ).display,
              )
            }
          >
            {key === 'back' ? (
              <Feather name="delete" size={23} color={colors.text} />
            ) : (
              <Text style={styles.digit}>{key}</Text>
            )}
          </Pressable>
        ),
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  keys: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space[5] },
  key: {
    width: '33.333%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { color: colors.text, fontFamily: fonts.displayMedium, fontSize: 24 },
});
