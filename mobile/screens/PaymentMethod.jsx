import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import api from '../hooks/createConnectionApi';

const PaymentMethod = () => {

  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(false);

  const fechtData = async () => {

    try{
      setLoading(true);

      const response = await api.get(`/payments`);

      if(response.status==201){
          setLoading(false);
          setPayments(response.data.payments)
      }
    }catch(error){
      setLoading(false);
    }
}

useEffect(()=>{

  fechtData()

}, [])


  return (
    <SafeAreaView>

    <View>
      <Text style={styles.title}>Selecione a forma de pagamento</Text>

    </View>
    </SafeAreaView>
  )
}

export default PaymentMethod

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign:'center',
    marginTop: 50,
    // marginBottom: 16,
  },
  option: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  optionText: {
    fontSize: 16,
  },
  selectedOptionText: {
    color: '#fff',
  },
})