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
   * Mascot expression:
   * - 'happy': cheerful, thumbs up, wink
   * - 'sad': sad, tears
   * - 'question': wondering, thinking, question mark
   * - 'angry': angry, steaming
   * - 'love': shy, pink cheeks, heart
   * - 'welcome': waving hello
   * - 'sleepy': sleepy
   */
  mood?: MascotMood;
  /** Square size (width and height) */
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  /** Gentle floating animation */
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
