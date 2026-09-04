import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { NEO_COLORS, NEO_SHADOWS } from './tokens';

export interface NeoCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  shadowStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  shadowColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  offset?: number;
  overflow?: 'visible' | 'hidden';
}

/**
 * NeoCard: Component Card phong cách Neo-brutalism với bóng đổ đặc (Solid Offset Shadow)
 * Hoạt động mượt mà và đồng nhất 100% trên cả iOS, Android và Web.
 */
export const NeoCard: React.FC<NeoCardProps> = ({
  children,
  style,
  containerStyle,
  shadowStyle,
  backgroundColor = NEO_COLORS.light.cardPurple,
  borderColor = NEO_COLORS.light.border,
  shadowColor = NEO_COLORS.light.shadow,
  borderWidth = NEO_SHADOWS.md.borderWidth,
  borderRadius = 22,
  offset = NEO_SHADOWS.md.offset,
  overflow = 'visible',
}) => {
  return (
    <View style={[styles.container, { paddingRight: offset, paddingBottom: offset }, containerStyle]}>
      {/* 1. Lớp bóng đen đặc đặt phía dưới */}
      <View
        style={[
          styles.shadowLayer,
          {
            borderRadius,
            backgroundColor: shadowColor,
            top: offset,
            left: offset,
          },
          shadowStyle,
        ]}
      />

      {/* 2. Lớp thẻ chính phía trên */}
      <View
        style={[
          styles.cardLayer,
          {
            borderRadius,
            borderWidth,
            borderColor,
            backgroundColor,
            overflow,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  shadowLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  cardLayer: {
    position: 'relative',
    zIndex: 2,
  },
});
