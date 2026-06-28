import React, {useRef} from 'react';
import {Animated, TouchableOpacity, View} from 'react-native';

export function RippleIcon({children, onPress, color = '#C9956C', size = 44}: any) {
  const scale1 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;

  const triggerRipple = () => {
    scale1.setValue(1);
    opacity1.setValue(0.7);
    Animated.parallel([
      Animated.timing(scale1, {toValue: 2, duration: 500, useNativeDriver: true}),
      Animated.timing(opacity1, {toValue: 0, duration: 500, useNativeDriver: true}),
    ]).start();
    setTimeout(() => {
      scale2.setValue(1);
      opacity2.setValue(0.5);
      Animated.parallel([
        Animated.timing(scale2, {toValue: 2.2, duration: 500, useNativeDriver: true}),
        Animated.timing(opacity2, {toValue: 0, duration: 500, useNativeDriver: true}),
      ]).start();
    }, 150);
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={triggerRipple}
      activeOpacity={0.8}
      style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, borderWidth: 1.5, borderColor: color,
        opacity: opacity1, transform: [{scale: scale1}],
      }} />
      <Animated.View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, borderWidth: 1, borderColor: color,
        opacity: opacity2, transform: [{scale: scale2}],
      }} />
      <View style={{zIndex: 2}}>{children}</View>
    </TouchableOpacity>
  );
}
