import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ImageResizeMode,
  ImageStyle,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { MASCOT_IMAGES, MascotMood } from '@/constants/mascot';

export interface MascotProps {
  /**
   * Biểu cảm của mascot:
   * - 'happy': Vui vẻ, ngón tay cái, nháy mắt
   * - 'sad': Buồn bã, rơi nước mắt
   * - 'question': Thắc mắc, suy nghĩ, dấu hỏi
   * - 'angry': Tức giận, bốc khói
   * - 'love': Ngại ngùng, má hồng, trái tim
   * - 'welcome': Vẫy tay chào mừng
   * - 'sleepy': Buồn ngủ
   */
  mood?: MascotMood;
  /** Kích thước vuông (tương đương cả width và height) */
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  /** Bật hiệu ứng chuyển động bồng bềnh nhẹ */
  floatAnimation?: boolean;
}

export const Mascot: React.FC<MascotProps> = ({
  mood = 'happy',
  size,
  width = 100,
  height = 100,
  style,
  containerStyle,
  resizeMode = 'contain',
  floatAnimation = false,
}) => {
  const finalWidth = size ?? width;
  const finalHeight = size ?? height;
  const source = MASCOT_IMAGES[mood] || MASCOT_IMAGES.happy;

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!floatAnimation) {
      translateY.setValue(0);
      return;
    }

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    return () => floatLoop.stop();
  }, [floatAnimation, translateY]);

  return (
    <View style={containerStyle}>
      <Animated.Image
        source={source}
        style={[
          {
            width: finalWidth,
            height: finalHeight,
            transform: floatAnimation ? [{ translateY }] : undefined,
          },
          style,
        ]}
        resizeMode={resizeMode}
      />
    </View>
  );
};

export default Mascot;
