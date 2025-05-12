import {  StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native'
import React, { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {  addTotalToPay, selectBasketItems, selectBasketTotal, selectTotalToPay } from '../features/basketSlice'
import {useNavigation} from '@react-navigation/native'
import BottomSheetComponent from './BottomSheetComponent'
import { SafeAreaView } from 'react-native-safe-area-context'

const CartDetails =  () => {
    const items = useSelector(selectBasketItems);
    const navigation = useNavigation();
    const basketTotal = useSelector(selectBasketTotal);
    const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
    const bottomSheetRef = useRef(null);

    const totalToPay = basketTotal + 40 + 150;
    const iva = basketTotal * 0.16
    // const total = useSelector(selectTotalToPay);

    const handleOpenBottomSheet = () => {
        setBottomSheetOpen(true);
        bottomSheetRef.current?.expand();
      };
    
      const handleCloseBottomSheet = () => {
        setBottomSheetOpen(false);
        bottomSheetRef.current?.close();
      };

    const dispatch = useDispatch()


    dispatch(addTotalToPay(totalToPay))
    if (items.length===0) return null;
    
  return (

   
    <View style={styles.popupContent}>
       {/* <View style={styles.barPopup}>
            <Text style={styles.length}>Taxa de entrega</Text>
            <Text style={styles.total}>150 MT</Text>
            </View> */}
        <View style={styles.barPopup}>
            <Text style={styles.length}>Subtotal</Text>
            <Text style={styles.total}>{basketTotal} MT</Text>
       </View>
         <View style={styles.barPopup}>
            <Text style={styles.length}>IVA (16%)</Text>
            <Text style={styles.total}>{iva} MT</Text>
       </View>
            <View style={styles.barPopup}>
             <Text style={styles.length}>Serviços financeiros</Text>
             <Text style={styles.total}>40 MT</Text>
        </View>
       {/* <View style={styles.barPopup}>
            <Text style={styles.totalDescript}>Total a pagar</Text>
            <Text style={styles.totalPrice}>{totalToPay} MT</Text>
       </View> */}
       <TouchableOpacity style={styles.barPayment} onPress={()=>handleOpenBottomSheet(true)}>
        <Text style={styles.payment}>Informar endereço de entrega</Text>
       </TouchableOpacity>



       <SafeAreaView>
       <BottomSheetComponent
        isOpen={isBottomSheetOpen}
        toggleSheet={handleCloseBottomSheet}
      >
        
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>Endereço de entrega</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
                    <View  >
                        <Text>s</Text>
                    </View> 
            </ScrollView>
          </View>
        

<TouchableOpacity style={styles.barPayment} onPress={()=>navigation.navigate('PaymentMethod')}>
        <Text style={styles.payment}>Finalizar compra</Text>
       </TouchableOpacity>
      </BottomSheetComponent>
     

      </SafeAreaView>
    </View>
  )
}

export default CartDetails

const styles = StyleSheet.create({
    bottomSheetContent: {
        flex: 1,
        padding: 16,
        // height: 150
        backgroundColor: 'red'
      },
      bottomSheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
      },
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