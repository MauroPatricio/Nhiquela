import { Image, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native'
import React from 'react'


const CategoryCard = ({ imgUrl, title }) => {
  const formattedTitle = title.replace(/\s*\(.*?\)\s*/g, '');

  return (
    <TouchableOpacity style={styles.wrapper}>
      <Text >{formattedTitle}</Text>
    </TouchableOpacity>
  )
}

export default CategoryCard

const styles = StyleSheet.create({

  cover: {
    height: 50,
    width: 50,
    resizeMode: "contain",
    marginBottom: 0,
    backgroundColor: 'white',
    borderRadius: 16
  },
  wrapper: {
    letterSpacing: 1,
    marginRight: 7,
    backgroundColor: '#E6E6FA',
    padding: 6,
    borderRadius: 15,
    borderWidth: .5,
    borderColor: '#4B0082',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: .8,
    shadowRadius: 3,
    elevation: 5,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      ':hover': {
        backgroundColor: 'darkred',
      },
    }),
  },

})