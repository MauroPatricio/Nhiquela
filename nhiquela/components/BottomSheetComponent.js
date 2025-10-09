import React from 'react';
import { useColorScheme, TouchableOpacity, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function BottomSheetComponent({ isOpen, toggleSheet, children, duration = 300 }) {
  const colorScheme = useColorScheme();
  const { height: windowHeight } = useWindowDimensions();
  const translateY = useSharedValue(windowHeight);

  // Atualiza a posição com animação
  React.useEffect(() => {
    translateY.value = withTiming(isOpen ? 0 : windowHeight, { duration });
  }, [isOpen]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, windowHeight], [0.5, 0]),
    zIndex: isOpen ? 1 : -1,
  }));

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[sheetStyles.backdrop, backdropStyle]}>
        <TouchableOpacity style={sheetStyles.flex} onPress={toggleSheet} />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          sheetStyles.sheet,
          sheetStyle,
          { backgroundColor: colorScheme === 'light' ? '#fff' : '#272B3C', height: windowHeight },
        ]}
      >
        {/* Botão de fechar */}
        <View style={sheetStyles.closeButtonContainer}>
          <TouchableOpacity onPress={toggleSheet}>
            <Ionicons name="close-circle" size={30} color="gray" />
          </TouchableOpacity>
        </View>

        {/* Conteúdo */}
        {children}
      </Animated.View>
    </>
  );
}

const sheetStyles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    zIndex: 10,
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  flex: {
    flex: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 20,
  },
});
