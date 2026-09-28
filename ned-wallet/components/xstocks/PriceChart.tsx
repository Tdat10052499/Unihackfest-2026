import React, { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Polygon,
  Polyline,
  Stop,
  Line,
} from 'react-native-svg';

export function PriceChart({ values }: { values: number[] }) {
  const gradientId = useId().replace(/:/g, '');
  if (values.length < 2)
    return (
      <View style={styles.empty}>
        <Text style={styles.label}>Chart data unavailable</Text>
      </View>
    );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const coords = values.map((value, index) => [
    8 + (index / (values.length - 1)) * 324,
    192 - ((value - min) / (max - min || 1)) * 174,
  ]);
  const points = coords.map((point) => point.join(',')).join(' ');
  const end = coords[coords.length - 1];
  const color = values.at(-1)! >= values[0] ? '#22C55E' : '#F87171';
  return (
    <Svg
      accessibilityLabel="Price history chart"
      width="100%"
      height={232}
      viewBox="0 0 340 220"
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.2" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Line
        x1="0"
        y1="205"
        x2="340"
        y2="205"
        stroke="#FFFFFF15"
        strokeDasharray="3 4"
      />
      <Polygon
        points={`8,205 ${points} 332,205`}
        fill={`url(#${gradientId})`}
      />
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Circle cx={end[0]} cy={end[1]} r="8" fill={color} opacity="0.18" />
      <Circle cx={end[0]} cy={end[1]} r="3.5" fill={color} />
    </Svg>
  );
}
const styles = StyleSheet.create({
  empty: { height: 232, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#FFFFFF80', fontSize: 12 },
});
