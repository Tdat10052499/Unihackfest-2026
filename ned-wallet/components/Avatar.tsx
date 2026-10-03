// Generated avatar (Avatar.dc.html), drawn with react-native-svg. Seed = wallet address, so it never changes.
import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { avatarSpec } from '@/services/avatar';

export function Avatar({
  seed,
  size = 40,
  decorative = false,
  style,
}: {
  seed: string;
  size?: number;
  /** true when a name next to it already says who it is */
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const spec = useMemo(() => avatarSpec(seed), [seed]);
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : spec.label}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: spec.bg }, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Rect width={40} height={40} fill={spec.bg} />
        <G transform={`rotate(${spec.rotate} 20 20)`}>
          {spec.shapes.map((s, i) => (
            <Path key={i} d={s.d} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} fillOpacity={s.fillOpacity} />
          ))}
        </G>
      </Svg>
    </View>
  );
}
