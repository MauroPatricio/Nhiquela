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
    // Neste momento devo apresentar a opcao de pagamento da tela do BCI
    // E para pagar com PCI devo apresentar o campo de confirmacao do pagamento por mensagem.
    // QUe por sua vez nos confirmamos a mensagem do pagamento.
    // Colocando um cole a informacao desta transacao aqui. Onde iremos a valiar se deve ser ou nao validado o pagamento
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