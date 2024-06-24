import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'


const CategoryCard = ({imgUrl, title}) => {
  return (
      <TouchableOpacity style={styles.wrapper}>
        <Text >{title}</Text>
    </TouchableOpacity>
  )
}

export default CategoryCard

const styles = StyleSheet.create({

    cover: {
       height:50,
      width: 50,
      resizeMode: "contain",
      marginBottom: 0,
      backgroundColor: 'white',
      borderRadius: 16
    },
    wrapper: {
    

    }

})