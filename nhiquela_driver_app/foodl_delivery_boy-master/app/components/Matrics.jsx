import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { COLORS } from '../constants/theme'

const Matrics = () => {
  return (
    <View
    style={{
      backgroundColor: COLORS.secondary,
      borderRadius: 8,
      height: 40,
    }}
  >
    <Text
      style={[
        styles.restaurant,
        { color: COLORS.lightWhite, marginHorizontal: 5 },
      ]}
    >
      Pick up
    </Text>
  </View>
  )
}

export default Matrics

const styles = StyleSheet.create({
    restaurant: { fontFamily: "regular", fontSize: 11 },
})