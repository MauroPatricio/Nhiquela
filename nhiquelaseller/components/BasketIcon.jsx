import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { useSelector } from 'react-redux'
import { selectBasketItems, selectBasketTotal } from '../features/basketSlice'
import {useNavigation} from '@react-navigation/native'

const BasketIcon = () => {
    const items = useSelector(selectBasketItems);
    const navigation = useNavigation();
    const basketTotal = useSelector(selectBasketTotal);

    if (items.length===0) return null;
    
  return (

    <View style={styles.popupContent}>
        <TouchableOpacity style={styles.barPopup} onPress={()=>navigation.navigate('Cart')}>

            <Text style={styles.length}>{items.length}</Text>
            <Text style={styles.cart}>Ver carrinha</Text>
            <Text style={styles.total}>{basketTotal} MT</Text>
       </TouchableOpacity>
    </View>
  )
}

export default BasketIcon

const styles = StyleSheet.create({
    popupContent: {
        position: 'absolute',
        alignContent: 'center',
        bottom: 0,
        fontWeight: '500',
        width: '100%',
        zIndex: 500,
        padding:10
 },
    barPopup: {
        alignItems: 'center',
        backgroundColor: '#7F00FF',
        flexDirection: 'row',   
        justifyContent: 'space-between',
        flex: 1,
        margin: 5,
        padding: 9,
        borderRadius: 12
        
    },
    length: {

        fontWeight: '600',
        color: '#7F00FF',
        backgroundColor: 'white',
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop:10,
        paddingBottom:10,
        borderRadius:5
    },
    cart: {
        fontWeight: '600',
        color: 'white',
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop:10,
        paddingBottom:10

    },
    total: {
        fontWeight: '600',
        color: 'white',
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop:10,
        paddingBottom:10
    }
})