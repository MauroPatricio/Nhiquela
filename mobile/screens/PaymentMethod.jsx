import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import api from '../hooks/createConnectionApi';
import Radio from '../components/Radio';
import SubmitPaymentButton from '../components/SubmitPaymentButton';
import {Ionicons } from '@expo/vector-icons'
import {useNavigation} from '@react-navigation/native'

const PaymentMethod = () => {

  const navigation = useNavigation();

  const [selectedPayment, setSelectedPayment] = useState("");
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(false);

  const fechtData = async () => {

    try{
      setLoading(true);

      const response = await api.get(`/payments`);

      if(response.status==200){
        setLoading(false);
        setPayments(response.data)
      }
    }catch(error){
      setLoading(false);
    }
}

useEffect(()=>{

  fechtData()

}, [])


  return (
    <SafeAreaView >
    <View style={styles.icons}>
        <TouchableOpacity onPress={()=>navigation.goBack()}>
        <Ionicons name='chevron-back-circle' size={35} style={styles.back}/>
    </TouchableOpacity>
    </View>
    <View style={styles.container} >
      <Ionicons name='card' size={100} style={{textAlign: 'center', marginBottom: 10, }}/>
      <Ionicons name='checkmark-circle' size={40} style={{textAlign: 'center',color: 'green', position:'absolute', top:0,marginLeft: 200}}/>

      <Text style={styles.mainHeader}>Selecione a forma de pagamento</Text>
      {payments && payments.map((payment)=>
      <View key={payment._id}>
       <Radio 
       key={payment._id}
       options={[{label:payment.shortName, value: payment.shortName}]}
       checkedValue={selectedPayment}
       onChange={setSelectedPayment}
       style={{marginBottom: 15}}
       />
      </View>
      )}

      <SubmitPaymentButton Confirmar='Confirmar' selectedPayment={selectedPayment}/>
    </View>
    </SafeAreaView>
  )
}

export default PaymentMethod

const styles = StyleSheet.create({
  icons:{
    position: 'absolute',
    top: 50,
    marginLeft: 25,
    flexDirection: "row",
    justifyContent: 'space-between', // Distributes space between the icons
    alignItems: 'center',
  },
  container: {
    // flex: 1,
    paddingHorizontal: 25,
    // backgroundColor: 'red',
    justifyContent: 'center',
    marginTop: 150

  },

  mainHeader: {
    marginBottom: 15,
    fontSize: 19,
    fontWeight: 'bold',
    textAlign:'center',
    marginBottom: 20,
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
  paymentMethod:{
    margin:10
  },
  radio: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    marginRight: 10,
  },
  selected: {
    backgroundColor: '#000',
  },
  label: {
    fontSize: 16,
  },
})