import { Image } from 'expo-image';
// components/OptimizedImage.js
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

const OptimizedImage = ({ source, style, contentFit = 'cover', ...props }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <View style={[style, styles.errorContainer]}>
        <Ionicons name="image-outline" size={24} color="#ccc" />
      </View>
    );
  }

  return (
    <View style={style}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#7F00FF" />
        </View>
      )}
      <Image
        {...props}
        source={source}
        style={[style, isLoading && { opacity: 0 }]}
        contentFit={contentFit}
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default React.memo(OptimizedImage);
