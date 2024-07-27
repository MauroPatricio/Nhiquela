import { StyleSheet, Text, View, Button, TouchableOpacity} from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import {useRoute} from '@react-navigation/native'
import {useNavigation} from '@react-navigation/native'
import {Ionicons} from "@expo/vector-icons"
import {MaterialCommunityIcons} from '@expo/vector-icons'


const FailedPayment = () => {
  const {params: {
    paymentInfo
          } }= useRoute();

          const navigation = useNavigation()
          const [errorMessage, setErrorMessage] = useState(null);


          useEffect(()=>{

            if(paymentInfo.code == 'INS-4'){
              setErrorMessage('Conta inactiva')
            }
            
            if(paymentInfo.code == 'INS-9'){
              setErrorMessage('Demora na resposta do pagamento')
            }
            if(paymentInfo.code == 'INS-2006'){
              setErrorMessage('Saldo Insuficiente')
            }
            if(paymentInfo.code == 'INS-2051'){
              setErrorMessage('Número de telefone inválido')
            }
            
          },[paymentInfo])

  return (
    <SafeAreaView>

<View style={styles.icons}>
        <TouchableOpacity onPress={()=>navigation.goBack()}>
        <Ionicons name='chevron-back-circle' size={35} style={styles.back}/>
    </TouchableOpacity>
    </View>

<View style={styles.container}>
      <MaterialCommunityIcons 
                        name='close-circle'
                        size={200}
                        color={'grey'}
                        style={styles.iconStyle}
                        />
      <View style={styles.errorContainer}>
        
      <Text style={styles.title}>Falha no pagamento</Text>
        <Text style={styles.errorTitle}>Motivo:
        <Text style={styles.errorMessage}> {errorMessage}</Text>
        </Text>
      </View>
        <Button title="Voltar" onPress={()=>navigation.goBack()}  />
    </View>
    </SafeAreaView>
  )
}

export default FailedPayment

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginTop:200
  },
  icons:{
    position: 'absolute',
    top: 50,
    marginLeft: 25,
    flexDirection: "row",
    justifyContent: 'space-between', // Distributes space between the icons
    alignItems: 'center',
  },
  errorContainer: {
    // padding: 20,
    // backgroundColor: '#ffe5e5',
    // borderRadius: 10,
    // borderWidth: 1,
    // borderColor: '#ff4d4d',
    // width: '80%',
    // alignItems: 'center',
  },
  title:{
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',

  },
  errorTitle: {
    fontSize: 16,
    // fontWeight: 'bold',
    // color: '#ff4d4d',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#ff4d4d',
    marginBottom: 20,
    textAlign: 'center',
  },
  iconStyle:{
    color:'red'
  },

})