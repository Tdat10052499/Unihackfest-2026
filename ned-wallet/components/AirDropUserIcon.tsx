import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Path } from 'react-native-svg';

interface AirDropUserIconProps {
  size?: number;
  gradientStart?: string;
  gradientEnd?: string;
  id?: string;
}

/**
 * Icon User phong cách Apple AirDrop chuẩn thiết kế
 * Nền tròn gradient xanh lam với bóng hình người trắng tối giản
 */
export function AirDropUserIcon({
  size = 68,
  gradientStart = '#85A6F8',
  gradientEnd = '#557CE7',
  id = 'airdrop_user_grad',
}: AirDropUserIconProps) {
  const r = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: r }]}>
      <Svg width={size} height={size} viewBox="0 0 72 72">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={gradientStart} />
            <Stop offset="100%" stopColor={gradientEnd} />
          </LinearGradient>
        </Defs>

        {/* Nền tròn gradient xanh AirDrop */}
        <Circle cx="36" cy="36" r="36" fill={`url(#${id})`} />

        {/* Đầu người (Head circle trắng) */}
        <Circle cx="36" cy="24" r="11" fill="#FFFFFF" />

        {/* Thân / Vai (Curved shoulders arc trắng) */}
        <Path
          d="M 12 72 C 12 50, 23 44, 36 44 C 49 44, 60 50, 60 72 Z"
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
