// src/components/PremiumLoading/PremiumLoadingOverlay.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';

const { width, height } = Dimensions.get('window');

export interface PremiumLoadingProps {
  visible: boolean;
  message?: string;
  type?: 'default' | 'upload' | 'processing' | 'success' | 'dots';
  size?: 'small' | 'medium' | 'large';
  overlayColor?: string;
  textColor?: string;
  spinnerColor?: string;
}

const PremiumLoadingOverlay: React.FC<PremiumLoadingProps> = ({
  visible,
  message = "Processando...",
  type = 'default',
  size = 'medium',
  overlayColor = 'rgba(0, 0, 0, 0.85)',
  textColor = '#1E293B',
  spinnerColor = COLORS.primary,
}) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animação de entrada
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Spinner rotation
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: type === 'dots' ? 1000 : 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Pulse animation
      if (type !== 'dots') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    } else {
      // Animação de saída
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      rotation.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible, type]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getSpinnerSize = (): number => {
    switch (size) {
      case 'small': return 60;
      case 'large': return 120;
      default: return 80;
    }
  };

  const getContainerStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: '#FFF',
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    };

    switch (size) {
      case 'small':
        return {
          ...baseStyle,
          width: '70%',
          maxWidth: 250,
          padding: 20,
        };
      case 'large':
        return {
          ...baseStyle,
          width: '85%',
          maxWidth: 350,
          padding: 40,
        };
      default:
        return {
          ...baseStyle,
          width: '80%',
          maxWidth: 300,
          padding: 32,
        };
    }
  };

  const renderDefaultSpinner = () => {
    const spinnerSize = getSpinnerSize();
    
    return (
      <View style={[styles.spinnerContainer, { width: spinnerSize, height: spinnerSize }]}>
        <Animated.View 
          style={[
            styles.spinnerOuter,
            { 
              width: spinnerSize,
              height: spinnerSize,
              borderRadius: spinnerSize / 2,
              borderTopColor: spinnerColor,
              borderRightColor: spinnerColor,
              transform: [{ rotate: rotateInterpolate }] 
            }
          ]}
        >
          <View style={[
            styles.spinnerArc,
            { 
              width: spinnerSize - 10,
              height: spinnerSize - 10,
              borderRadius: (spinnerSize - 10) / 2,
              borderTopColor: spinnerColor + '80',
            }
          ]} />
        </Animated.View>
        
        <View style={styles.spinnerIcon}>
          <Ionicons 
            name={getSpinnerIcon()} 
            size={spinnerSize / 2.5} 
            color={spinnerColor} 
          />
        </View>
      </View>
    );
  };

  const renderDotsSpinner = () => (
    <View style={styles.dotsContainer}>
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: spinnerColor,
              transform: [{
                scale: pulseAnim.interpolate({
                  inputRange: [1, 1.1],
                  outputRange: [1, 1.3]
                })
              }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.1],
                outputRange: [0.5, 1]
              }),
            }
          ]}
        />
      ))}
    </View>
  );

  const getSpinnerIcon = (icon?: React.ComponentProps<typeof Ionicons>['name']): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (type) {
      case 'upload': return 'cloud-upload-outline';
      case 'processing': return 'sync-outline';
      case 'success': return 'checkmark-circle-outline';
      default: return 'car-sport-outline';
    }
  };

  const getDefaultMessage = (): string => {
    switch (type) {
      case 'upload': return 'Enviando arquivos...';
      case 'processing': return 'Processando dados...';
      case 'success': return 'Concluído!';
      default: return 'Processando...';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.loadingOverlay,
        { 
          backgroundColor: overlayColor,
          opacity: fadeAnim 
        }
      ]}
    >
      <Animated.View 
        style={[
          getContainerStyles(),
          { 
            transform: [{ scale: pulseAnim }],
          }
        ]}
      >
        {type === 'dots' ? renderDotsSpinner() : renderDefaultSpinner()}

        <View style={styles.loadingContent}>
          <Text style={[styles.loadingTitle, { color: textColor }]}>
            {message || getDefaultMessage()}
          </Text>
          
          {type !== 'dots' && (
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    backgroundColor: spinnerColor,
                    transform: [{
                      translateX: pulseAnim.interpolate({
                        inputRange: [1, 1.1],
                        outputRange: ['-100%', '100%']
                      })
                    }]
                  }
                ]} 
              />
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  spinnerContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  spinnerOuter: {
    borderWidth: 3,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerArc: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  spinnerIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '30%',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
  },
});

export default PremiumLoadingOverlay;