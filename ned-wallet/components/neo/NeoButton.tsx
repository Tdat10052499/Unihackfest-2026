import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { NEO_COLORS, NEO_SHADOWS } from './tokens';

export interface NeoButtonProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children?: React.ReactNode;
  title?: string;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  backgroundColor?: string;
  borderColor?: string;
  shadowColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  offset?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
  activeOpacity?: number;
}

/**
 * NeoButton: Nút bấm phong cách Neo-brutalism
 * Đảm bảo 100% hiển thị đúng màu nền (vàng/xanh), viền đen sắc nét và bóng đổ cứng không bị đen thui.
 */
export const NeoButton: React.FC<NeoButtonProps> = ({
  onPress,
  onLongPress,
  children,
  title,
  style,
  containerStyle,
  textStyle,
  backgroundColor = NEO_COLORS.light.buttonYellow,
  borderColor = NEO_COLORS.light.border,
  shadowColor = NEO_COLORS.light.shadow,
  borderWidth = NEO_SHADOWS.sm.borderWidth,
  borderRadius = 999, // Mặc định bo tròn dạng viên thuốc (Pill)
  offset = NEO_SHADOWS.sm.offset,
  icon,
  disabled = false,
}) => {
  const animatedPress = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(animatedPress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(animatedPress, {
      toValue: 0,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
  };

  const translateX = animatedPress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, offset],
  });

  const translateY = animatedPress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, offset],
  });

  return (
    <View style={[styles.outerContainer, { paddingRight: offset, paddingBottom: offset }, containerStyle]}>
      {/* 1. Lớp bóng đen đặc ở tầng dưới cùng (zIndex: 1) */}
      <View
        style={[
          styles.shadowUnderlay,
          {
            borderRadius,
            backgroundColor: shadowColor,
            top: offset,
            left: offset,
          },
        ]}
      />

      {/* 2. Lớp Nút bấm ở tầng trên (zIndex: 5), có màu nền rõ ràng */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            borderRadius,
            borderWidth,
            borderColor,
            backgroundColor: disabled ? '#E2E8F0' : backgroundColor,
            transform: [{ translateX }, { translateY }],
          },
          style,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={styles.innerTouchable}
        >
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          {title ? (
            <Text style={[styles.btnText, textStyle]}>{title}</Text>
          ) : (
            children
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
  },
  shadowUnderlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  buttonWrapper: {
    position: 'relative',
    zIndex: 5,
    elevation: 3,
    overflow: 'hidden',
  },
  innerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconContainer: {
    marginRight: 8,
  },
  btnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.1,
  },
});
