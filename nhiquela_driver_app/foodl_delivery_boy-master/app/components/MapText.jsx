import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { COLORS } from '../constants/theme'

const MapText = ({text, color}) => {
  return (
    <Text
    numberOfLines={1}
    style={{
      fontFamily: "regular",
      fontSize: 13,
      left: 10,
      top: 5,
      color: color,
    }}
  >
    {text}
  </Text>
  )
}

export default MapText

const styles = StyleSheet.create({})