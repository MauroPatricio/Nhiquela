import React from 'react';
import { useColorScheme, TouchableOpacity, StyleSheet, View, useWindowDimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';  // Ícones do Ionicons

export default function BottomSheetComponent({ isOpen, toggleSheet, duration = 300, children }) {
  const colorScheme = useColorScheme();
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = windowHeight * 1;
  const height = useSharedValue(maxHeight);
  const timerOpen = 10;

  const progress = useDerivedValue(() => 
    withTiming(isOpen ? 0 : 1, { timerOpen })
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * height.value }],
  }));

  const backgroundColorSheetStyle = {
    backgroundColor: colorScheme === 'light' ? '#f8f9ff' : '#272B3C',
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    zIndex: isOpen ? 1 : withDelay(duration, withTiming(-1, { duration: 0 })),
  }));

  return (
    <>
      <Animated.View style={[sheetStyles.backdrop, backdropStyle]}>
        <TouchableOpacity style={sheetStyles.flex} onPress={toggleSheet} />
      </Animated.View>
      <Animated.View
        onLayout={(e) => {
          height.value = e.nativeEvent.layout.height;
        }}
        style={[sheetStyles.sheet, sheetStyle, backgroundColorSheetStyle, { height: maxHeight }]}>
        
        {/* Botão de fechar */}
        <View style={sheetStyles.closeButtonContainer}>
          <TouchableOpacity onPress={toggleSheet}>
            <Ionicons name="close-circle" size={30} color="gray" />
          </TouchableOpacity>
        </View>

        {/* Conteúdo do BottomSheet */}
        {children}
      </Animated.View>
    </>
  );
}

const sheetStyles = StyleSheet.create({
  sheet: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 10,
    paddingRight: 10,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  flex: {
    flex: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
});
