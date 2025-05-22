import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import {Ionicons } from '@expo/vector-icons'
import {useNavigation} from '@react-navigation/native'
import ProductList from '../components/products/ProductList'

const NewProducts = () => {
    const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container}>
            <View style={styles.wrapper}>
                <View style={styles.upperRow}>
                <TouchableOpacity onPress={()=>navigation.goBack()}>
                    <Ionicons name='chevron-back-circle' size={30} color={'white'}/>
                </TouchableOpacity>
                <Text style={styles.text}>Lista de produtos</Text>
            </View>
                <ProductList/>
            </View>
      </SafeAreaView>

  )
}

export default NewProducts

const styles = StyleSheet.create({

container:{
    flex: 1,
    backgroundColor: '#F5F5F5'
},
wrapper: {
    flex: 1,
    backgroundColor:  'lightwhite'
},
upperRow:{
    width:300,
    marginHorizontal: 20,
    flexDirection: 'row',
    justifyContent: "flex-start",
    alignItems: "center",
    position: "absolute",
    backgroundColor: "black",
    borderRadius: 24,
    top: 22,
    zIndex: 999
},
text:{
    color: "white",
    marginLeft: 10,
}

    
})