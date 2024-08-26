import { StyleSheet, Text, TextInput, View , Image,TouchableOpacity, Alert} from 'react-native'
import React, { useEffect, useState } from 'react'
import {useNavigation} from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { selectBasketItems, selectBasketTotal, selectTotalToPay } from '../features/basketSlice'
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context'
import { Formik } from 'formik';
import {MaterialCommunityIcons} from '@expo/vector-icons'
import * as Yup from 'yup'
import api from '../hooks/createConnectionApi';
import {Ionicons } from '@expo/vector-icons'
import Button from '../components/Button';

const validationSchema = Yup.object().shape({
  customerNumber: Yup.string()
    .min(9, 'O número de telefone não pode ser inferior a 9 dígitos')
    .max(9, 'O número de telefone não pode ser superior a 9 dígitos')
    .required('Obrigatório'),

  // email: Yup.string().email('Email invalido').required('Obrigatório'),
});

const MpesaScreen = () => {

  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const basketTotal = useSelector(selectBasketTotal);
  const totalToPay = useSelector(selectTotalToPay);
  const [loader, setLoader] = useState(false);

  const [customerNumber, setCustomerNumber] = useState(null)
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(false);
  
  const amount = parseInt(totalToPay)
  
  const navigation = useNavigation();
  const items = useSelector(selectBasketItems);
  const itemsPrice = useSelector(selectBasketTotal);

  const checkIfUserExist = async() =>{
    const id = await AsyncStorage.getItem('id');
    const userId = `user${JSON.parse(id)}`;

    try{
      const currentUser = await AsyncStorage.getItem(userId);

      if(currentUser !== null){
        const parseData = JSON.parse(currentUser);
        setUserData(parseData);
        setUserLogin(true);
      }
    }catch(error){
      console.log(error)
    }
  }

  useEffect(()=>{
    checkIfUserExist();
    },[])
 
  

  const makeThePayment = async () => {
    
    try{
      setLoading(true);

      const { data } = await api.post(`/payments/mpesa`, {customerNumber, amount},  {
        headers: {
          authorization: `Bearer ${userData.token}`,
        },
              
      });
      setPaymentInfo(data)
      if(data.paid){
        setLoading(false);

        const order = await api.post(
          '/orders',
          {
            orderItems: items,
            address: '',
            paymentMethod: 'Mpesa',
            itemsPrice: itemsPrice,
            ivaTax: 0,
            siteTax: 0,
            taxPrice: 0,
            totalPrice: amount,
            addressPrice: 150,
            // itemsPriceForSeller: cart.itemsPriceForSeller,
            isPaid: data.paid,
            paidAt: Date.now(),
            stepStatus: 1
          },
          {
            headers: {
              authorization: `Bearer ${userData.token}`,
            },
          }
        );


        navigation.replace('SuccessPayment')

      }else{

        setLoading(false);
  
        const order = await api.post(
          '/orders',
          {
            orderItems: items,
            address: '',
            paymentMethod: 'Mpesa',
            itemsPrice: itemsPrice,
            ivaTax: itemsPrice*0.16,
            siteTax: 45,
            taxPrice: 40,
            totalPrice: amount,
            addressPrice: 150,
            // itemsPriceForSeller: cart.itemsPriceForSeller,
            isPaid: false,
            paidAt: Date.now(),
            stepStatus: 1
          },
          {
            headers: {
              authorization: `Bearer ${userData.token}`,
            },
          }
        );

        // navigation.replace('FailedPayment',{paymentInfo})

      }
    }catch(error){
      setLoading(false);
      const errorMessage = error.response.data
      console.log(errorMessage)

    }
}


  return (
    <SafeAreaView >
   <View style={styles.icons}>
        <TouchableOpacity onPress={()=>navigation.goBack()}>
        <Ionicons name='chevron-back-circle' size={35} style={styles.back}/>
    </TouchableOpacity>
    </View>
                     <Formik
                        initialValues={{customerNumber: ''}}
                        validationSchema={validationSchema}
                        onSubmit={(values)=>makeThePayment(values)}
                        >
                          {({ handleChange, handleBlur, touched,handleSubmit, values, errors, isValid, setFieldTouched  }) => (
  <>
  <View style={styles.container}>
    <Image
                    source={require('../assets/Mpesa.png')}
                    style={styles.cover}
                    
                    />
    <Text style={styles.label}> <MaterialCommunityIcons 
                        name='cellphone'
                        size={20}
                        color={'grey'}
                        style={styles.iconStyle}
                        /> Número de telefone:</Text>
    
      <TextInput
        style={styles.input}
        value={customerNumber}
        onChangeText={setCustomerNumber}
        placeholder="Informe o número para o pagamento"
                          name="customerNumber"
                />
  {touched.customerNumber && errors.customerNumber && (
                        <Text style={styles.errorMessage}>{errors.customerNumber}</Text>

                    )}
      <Text style={styles.label}>Total a pagar:</Text>
          <Text>{amount} MT</Text>
      </View>

      <Button  loader={loader} title={"Pagar"} onPress={isValid? handleSubmit: (values)=>makeThePayment(values)} isValid={isValid?'#7F00FF':'red'}/>
        </>
    )}
    </Formik>
           
    </SafeAreaView>
  )
}

export default MpesaScreen

const styles = StyleSheet.create({
    container: {
      // flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      marginTop: 60
    },
    icons:{
      position: 'absolute',
      top: 50,
      marginLeft: 25,
      flexDirection: "row",
      justifyContent: 'space-between', // Distributes space between the icons
      alignItems: 'center',
    },
    cover:{
    width: 350,
    height: 250,
    marginBottom: 20
    // borderRadius: 100, // Example of rounding the image to make it circular
    },
    label:{

    },
    errorMessage:{
      color: 'red'
    }
  
})