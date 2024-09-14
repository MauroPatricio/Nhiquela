import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import {useNavigation} from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { selectSeller } from '../features/sellerSlice'
import { removeFromBasket, selectBasketItems } from '../features/basketSlice'
import { XCircleIcon } from 'react-native-heroicons/outline'
import CartDetails from '../components/CartDetails'
import BottomSheetComponent from '../components/BottomSheetComponent';

const Cart = () => {

  const navigation = useNavigation();
  const seller = useSelector(selectSeller);
  const items = useSelector(selectBasketItems);
  const dispatch = useDispatch();
  const [groupedItemsInTheCart,setGroupedItemsInTheCart] = useState([]);

  useEffect(()=>{
    const groupedItems = items.reduce((results, item)=>{
      (results[item.id] = results[item.id]|| []).push(item);
      return results
    },{});

    setGroupedItemsInTheCart(groupedItems)

  }, [items])

  return (
<>

  
<CartDetails/>
    <SafeAreaView style={styles.container}>
 <View style={styles.cart}>
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>Carrinha</Text>
        <Text style={styles.subtitle}>Produtos</Text>
      </View>
      <TouchableOpacity onPress={()=>navigation.goBack()} style={styles.closeButton}>
          <XCircleIcon style={styles.icon} height={35} width={35}/>
      </TouchableOpacity>
    </View>
   
    <ScrollView >
      <Text style={styles.itemsLength}>{items.length} produto(s) na carrinha</Text>
      {Object.entries(groupedItemsInTheCart).map(([key, items])=>(
        <>
        

    
  <Text style={styles.sellerName}>Fornecedor: {items[0].sellerName.length<50?items[0].sellerName: items[0].sellerName.substring(0, 25)+`...`}</Text>
        <View  key={key} style={styles.itemLine} >

                    <Text style={{color: 'black', marginTop: 15}}>{items.length}X</Text>
              <Image
              source={{uri: items[0].image, height:50, width:50}}

              />
              <Text style={styles.itemName}>{items[0].name.length<20?items[0].name: items[0].name.substring(0, 25)+`...`}</Text>

              <Text style={styles.price}>{items[0].price} MT</Text>
              <TouchableOpacity onPress={() => dispatch(removeFromBasket({id: items[0].id}))} >
                <Text style={styles.remove}>Remover</Text>
              </TouchableOpacity>
            </View>
        </>
      ))}
    </ScrollView>
</View>

</SafeAreaView>
</>
  )
}

export default Cart
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 20,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 20,
    color: '#4A4A4A',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 20,
    backgroundColor: '#7F00FF',
    borderRadius: 50,
    padding: 5,
    elevation: 3,
  },
  icon: {
    color: '#FFFFFF',
  },
  cart: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  itemsLength: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 15,
  },
  itemLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  itemName: {
    flex: 1,
    marginLeft: 10,
    color: '#4A4A4A',
    fontWeight: '500',
  },
  sellerName: {
    fontSize: 14,
    color: '#7F00FF',
    fontWeight: '600',
    marginBottom: 5,
  },
  price: {
    fontWeight: '600',
    fontSize: 16,
    color: '#4A4A4A',
    marginTop: 5,
  },
  remove: {
    color: '#FF4D4D',
    fontWeight: '500',
    marginLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 10,
  },
  footerName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#4A4A4A',
  },
  footerPrice: {
    fontWeight: '700',
    fontSize: 18,
    color: '#7F00FF',
  },
});
