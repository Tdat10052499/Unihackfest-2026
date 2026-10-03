// Round flags of the Home / wallet boards: VND (Vietnam view) and USD (USDC is a dollar stablecoin)
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';

const STARS: [number, number][] = [[2.55, 2.2], [5.85, 2.2], [4.2, 5.4], [7.5, 5.4], [2.55, 8.6], [5.85, 8.6]];

export function FlagVN({ size = 40 }: { size?: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Vietnamese đồng (VND)" style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Rect width={20} height={20} fill="#DA251D" />
        <Polygon points="10.00,4.00 11.35,8.15 15.71,8.15 12.18,10.71 13.53,14.85 10.00,12.29 6.47,14.85 7.82,10.71 4.29,8.15 8.65,8.15" fill="#FFCD00" />
      </Svg>
    </View>
  );
}

export function FlagUS({ size = 40 }: { size?: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="US dollar · USDC is a dollar stablecoin" style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        {Array.from({ length: 13 }, (_, i) => (
          <Rect key={i} y={(i * 20) / 13} width={20} height={20 / 13} fill={i % 2 ? '#FFFFFF' : '#B22234'} />
        ))}
        <Rect width={10} height={10.769} fill="#3C3B6E" />
        {STARS.map(([cx, cy]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0.6} fill="#FFFFFF" />
        ))}
      </Svg>
    </View>
  );
}
