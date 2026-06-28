import React, {useRef} from 'react';
import {Animated, TouchableOpacity} from 'react-native';

export function LiquidPress({children, onPress, style, disabled}: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const squishY = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.93,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
      Animated.spring(squishY, {
        toValue: 0.88,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 15,
      }),
      Animated.spring(squishY, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 15,
      }),
    ]).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      disabled={disabled}>
      <Animated.View style={[style, {transform: [{scale}, {scaleY: squishY}]}]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
