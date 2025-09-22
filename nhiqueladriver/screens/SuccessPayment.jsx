import { StyleSheet, Text, View, Button, TouchableOpacity} from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import {useRoute} from '@react-navigation/native'
import {useNavigation} from '@react-navigation/native'
import {Ionicons} from "@expo/vector-icons"
import {MaterialCommunityIcons} from '@expo/vector-icons'
import { color } from 'react-native-elements/dist/helpers'


const SuccessPayment = () => {
          const navigation = useNavigation()
  return (
    <SafeAreaView>

<View style={styles.container}>
      <MaterialCommunityIcons 
                        name='check-circle'
                        size={200}
                        color={'grey'}
                        style={styles.iconStyle}
                        />
      <View style={styles.errorContainer}>
        
      <Text style={styles.title}>Pagamento efectuado com sucesso</Text>
      </View>
        <Button  title="Pagina principal" onPress={()=>navigation.navigate('Home')}  />
    </View>
    </SafeAreaView>
  )
}

export default SuccessPayment

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
    marginBottom: 60,
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
    color:'green'
  },

})