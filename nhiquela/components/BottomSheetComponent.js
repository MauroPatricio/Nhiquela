import React, { useEffect } from 'react';
import { Modal, useColorScheme, TouchableOpacity, StyleSheet, View, useWindowDimensions, TouchableWithoutFeedback } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';

export default function BottomSheetComponent({ isOpen, toggleSheet, children, duration = 300, height }) {
  const colorScheme = useColorScheme();
  const { height: windowHeight } = useWindowDimensions();
  const translateY = useSharedValue(windowHeight);
  const [visible, setVisible] = React.useState(isOpen);
  const finalHeight = height || windowHeight * 0.8;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      translateY.value = withTiming(0, { duration });
    } else {
      translateY.value = withTiming(windowHeight, { duration }, (finished) => {
        if (finished) {
          runOnJS(setVisible)(false);
        }
      });
    }
  }, [isOpen]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible && !isOpen) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={toggleSheet}>
      <View style={sheetStyles.overlay}>
        <TouchableWithoutFeedback onPress={toggleSheet}>
          <View style={sheetStyles.backdrop} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            sheetStyles.sheet,
            sheetStyle,
            { backgroundColor: colorScheme === 'light' ? '#fff' : '#272B3C', height: finalHeight },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
});
