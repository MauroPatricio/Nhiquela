import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React from 'react'
import {MaterialIcons} from '@expo/vector-icons'
import {useNavigation} from '@react-navigation/native'

const SubmitPaymentButton = ({Confirmar, selectedPayment}) => {

  const navigation = useNavigation();



  const navigateToPage = async (selectedPayment) =>{
    if(selectedPayment=='Mpesa'){
      return navigation.navigate('MpesaScreen')
    }
  }

  return (
   <TouchableOpacity style={styles.container} onPress={()=>navigateToPage(selectedPayment)}>
      <Text style={styles.text}>{Confirmar + " "}</Text>
      <MaterialIcons name='check-circle' size={20}
      color={'white'}/>
   </TouchableOpacity>
  )
}

export default SubmitPaymentButton

const styles = StyleSheet.create({
  container: {
    height: 60,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#7F00FF'
  },
  text:{
    fontSize: 16,
    color: '#f9fafb'
  }
})