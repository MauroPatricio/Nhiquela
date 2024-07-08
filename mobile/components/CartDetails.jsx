import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { useSelector } from 'react-redux'
import { selectBasketItems, selectBasketTotal } from '../features/basketSlice'
import {useNavigation} from '@react-navigation/native'

const CartDetails = () => {
    const items = useSelector(selectBasketItems);
    const navigation = useNavigation();
    const basketTotal = useSelector(selectBasketTotal);

    if (items.length===0) return null;
    
  return (

    <View style={styles.popupContent}>
           <View style={styles.barPopup}>
            <Text style={styles.length}>Serviços financeiros</Text>
            <Text style={styles.total}>40 MT</Text>
       </View>
       <View style={styles.barPopup}>
            <Text style={styles.length}>Taxa de entrega</Text>
            <Text style={styles.total}>150 MT</Text>
       </View>
        <View style={styles.barPopup}>
            <Text style={styles.length}>Subtotal</Text>
            <Text style={styles.total}>{basketTotal} MT</Text>
       </View>
       <View style={styles.barPopup}>
            <Text style={styles.totalDescript}>Total a pagar</Text>
            <Text style={styles.totalPrice}>{basketTotal + 40 + 150 } MT</Text>
       </View>
       <TouchableOpacity style={styles.barPayment} onPress={()=>navigation.navigate('PaymentMethod')}>
        <Text style={styles.payment}>Pagar</Text>
       </TouchableOpacity>
    </View>
  )
}

export default CartDetails

const styles = StyleSheet.create({
    popupContent: {
        position: 'absolute',
        alignContent: 'center',
        bottom: 0,
        fontWeight: '500',
        width: '100%',
        zIndex: 500,
        marginLeft: 5,
        paddingRight: 10,
        

 },
    barPopup: {
        alignItems: 'center',
        flexDirection: 'row',   
        padding: 2,
        justifyContent: 'space-between',

        
    },
    barPayment: {
        backgroundColor: '#7F00FF',
         marginTop: 5,
         marginBottom: 10,
        padding: 15,
        borderRadius: 12,          
    },
    length: {

        fontWeight: '600',
        color: 'grey',
        borderRadius:5
    },
    payment:{
        color: 'white',
        fontWeight: '600',
        textAlign: 'center'

   
    },
    total: {
        fontWeight: '600',
        color: 'grey',
    },
    totalDescript:{
        color: 'black',
        fontWeight: '600',
    },
    totalPrice:{
        color: 'black',
        fontWeight: '600',
    }
})