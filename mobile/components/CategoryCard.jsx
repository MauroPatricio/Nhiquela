import { Image, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import React from 'react';

const CategoryCard = ({ imgUrl, title, onPress }) => {
  const formattedTitle = title.replace(/\s*\(.*?\)\s*/g, '');

  return (
    <TouchableOpacity style={styles.wrapper} onPress={onPress}>
      {imgUrl != null && <Image source={{ uri: imgUrl }} style={styles.cover} />}
      <Text style={styles.title}>{formattedTitle}</Text>
    </TouchableOpacity>
  );
};

export default CategoryCard;

const styles = StyleSheet.create({
  cover: {
    height: 50,
    width: 50,
    resizeMode: 'contain',
    backgroundColor: 'white',
    borderRadius: 16,
  },
  wrapper: {
    letterSpacing: 1,
    marginRight: 7,
    backgroundColor: '#E6E6FA',
    padding: 6,
    borderRadius: 15,
    borderWidth: 0.5,
    borderColor: '#4B0082',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      ':hover': {
        backgroundColor: 'darkred',
      },
    }),
  },
  title: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B0082',
  },
});
