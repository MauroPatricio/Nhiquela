import { Image, StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function ImgItem(item) {
  return (
    <View>
       <Image
        source={item}
      />
    </View>
  )
}

const styles = StyleSheet.create({})