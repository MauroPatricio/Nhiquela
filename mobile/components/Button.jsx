import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'

const Button = ({title, onPress}) => {
  return (
   <TouchableOpacity style={styles.btnStyle}>
    <Text style={styles.btnTxt}>{title}</Text>
   </TouchableOpacity>
  )
}

export default Button

const styles = StyleSheet.create({
    btnTxt:{
            color: 'grey',
            fontSize: 18,
            marginTop: 12,
            color: "white",
            fontWeight: "600"
},
btnStyle: {
    height: 50,
    width: "100%",
    marginVertical: 20,
    backgroundColor: "#7F00FF",
    alignItems: "center",
    borderRadius: 12
}
}
)