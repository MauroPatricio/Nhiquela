import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import React from 'react'
import { BackgroundImage } from 'react-native-elements/dist/config'

const Button = ({title, onPress, isValid, loader}) => {
        return (
   <TouchableOpacity onPress={onPress} style={styles.btnStyle(isValid)}>
   {!loader? <Text style={styles.btnTxt}>{title}</Text>: <ActivityIndicator/>}
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
btnStyle:(backgroundColor)=>({
    
        height: 50,
        width: "100%",
        marginVertical: 10,
        backgroundColor: backgroundColor,
        alignItems: "center",
        borderRadius: 12
    
})
}
)