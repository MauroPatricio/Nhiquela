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

  const removeItems=(item)=>{
    dispatch(removeFromBasket({id: item.id}))
    dispatch(removeSeller( item.seller._id ));
  }

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
        
    
  <Text style={styles.sellerName}>Fornecedor: {items[0].name.length<50?items[0].seller: items[0].seller.substring(0, 25)+`...`}</Text>
        <View  key={key} style={styles.itemLine} >

                    <Text style={{color: 'grey', marginTop: 15}}>{items.length}x</Text>
              <Image
              source={{uri: items[0].image, height:50, width:50}}

              />
              <Text style={styles.itemName}>{items[0].name.length<20?items[0].name: items[0].name.substring(0, 25)+`...`}</Text>

              <Text style={styles.price}>{items[0].price} MT</Text>
              <TouchableOpacity onPress={() => removeItems(items[0])} >
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
    container:{
    flex:1,
    backgroundColor: 'white',
  },
    header:{
    borderWidth:1 ,
    borderTopColor: 'white',
    borderLeftColor: 'white',
    borderRightColor:'white',
    borderBottomColor: '#7F00FF',
    padding:20,
    marginBottom: 10,
},
  footer: {
    position: 'absolute',
    alignContent: 'center',
    bottom: 0,
    fontWeight: '500',
    width: '100%',
    zIndex: 500,
    padding:10,
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
    marginTop: 10,
    // padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e7e7e7',
    alignItems: 'center',
    backgroundColor: 'white',
    justifyContent: 'space-between',
    borderWidth:3 ,
    borderTopColor: '#7F00FF',
    borderLeftColor: 'white',
    borderRightColor:'white',
    borderBottomColor: 'white',
    borderRadius: 5,
  },
  itemsLength:{
        textAlign: 'center',
        fontWeight: '400',
        fontSize: 18,
        marginTop: 10,
        marginBottom: 15
  },
  itemLine:{
        flexDirection: 'row',
        justifyContent:'space-between',
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
        marginBottom: 10,
  },
  itemName:{
        width:80,
        marginTop:2
  },

  


  cart:{
    paddingBottom: 250
  },

  title: {
      fontWeight: '500',
      textAlign: 'center',
      fontSize: 18,
  },
  subtitle: {
    fontWeight: '500',
    textAlign: 'center',
    color: 'grey'
  },
  closeButton:{
    position: 'absolute',
    top: 9,
    right:40,
    backgroundColor: '#7F00FF',
    borderRadius: 50,
    marginTop: 10

  },
  icon: {
    color: 'white',
    // marginTop: 10
  },
  image:{
    marginLeft: 20
  },
  sellerDescription:{
    flexDirection: 'row',
    textAlign: 'center',
    justifyContent: 'space-between',
    padding: 4,
    backgroundColor: '#F5F5F5'
  },
  price:{
    marginTop: 15
  },
  sellerName:{
    // top: 12,
    bottom: 5,
    fontWeight: '500'
  },
  remove:{
    color: '#7F00FF',
    fontWeight: '500',
    marginTop: 15

  },

  componentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop:10,
    marginLeft: 5,
    marginRight: 5
  },
  footerName:{
    fontWeight: '500'
  },
  footerPrice:{
    fontWeight: '500'
  }
})