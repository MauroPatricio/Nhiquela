import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import {useNavigation} from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { selectSeller } from '../features/sellerSlice'
import { removeFromBasket, removeSeller, selectBasketItems } from '../features/basketSlice'
import { XCircleIcon } from 'react-native-heroicons/outline'
import CartDetails from '../components/CartDetails'
import { TrashIcon } from 'react-native-heroicons/outline';

const Cart = () => {

  const navigation = useNavigation();
  const seller = useSelector(selectSeller);
  const items = useSelector(selectBasketItems);
  const dispatch = useDispatch();
  const [groupedItemsInTheCart,setGroupedItemsInTheCart] = useState([]);

  useEffect(()=>{
    const groupedItems = items.reduce((results, item)=>{
      (results[item._id] = results[item._id]|| []).push(item);
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
              <Text style={styles.title}>Carrinho</Text>
              <Text style={styles.subtitle}>Produtos</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <XCircleIcon style={styles.icon} height={35} width={35} />
            </TouchableOpacity>
          </View>



          <ScrollView>
            <Text style={styles.itemsLength}>{items.length} produto(s) no carrinho</Text>

            {Object.entries(groupedItemsInTheCart).map(([key, groupedItems]) => (
              <View key={key}>
                <Text style={styles.sellerName}>
                  Fornecedor: {groupedItems[0]?.sellerName?.length < 50
                    ? groupedItems[0]?.sellerName || 'Sem nome do fornecedor'
                    : (groupedItems[0]?.sellerName || 'Sem nome do fornecedor').substring(0, 25) + '...'}
                </Text>

                <View style={styles.itemLine}>
                  <Text style={styles.quantity}>{groupedItems.length}x</Text>
                  <Image
                    source={{ uri: groupedItems[0]?.image }}
                    style={styles.itemImage}
                  />
                  <Text style={styles.itemName}>
                    {groupedItems[0]?.name?.length < 20
                      ? groupedItems[0]?.name
                      : groupedItems[0]?.name.substring(0, 25) + '...'}
                  </Text>
                  <Text style={styles.price}>{parseFloat(groupedItems[0]?.price || 0).toFixed(2)} MT</Text>
                  
                  <TouchableOpacity
                    onPress={() => {
                      const itemInBasket = items.find((basketItem) => basketItem._id === groupedItems[0]._id);
                      
                      if (itemInBasket) {
                        dispatch(removeFromBasket({ _id: groupedItems[0]._id }));
                        dispatch(removeSeller( groupedItems[0].seller._id ));

                      } else {
                        console.warn(`Can't remove product (id: ${groupedItems[0]._id}) as it's not in the basket!`);
                      }
                    }}
                  >
<TrashIcon color="#7F00FF" size={28} />
                  </TouchableOpacity>
                </View>
              </View>
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
    paddingHorizontal: 10

  },
  header: {
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#7F00FF',
    padding: 20,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5, // Adds a subtle shadow
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

  itemImage: {
    width: 50,
    height: 50,
    marginRight: 10,
    borderRadius: 5,
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
    fontWeight: '500',
    color: '#7F00FF',
    paddingHorizontal: 10
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