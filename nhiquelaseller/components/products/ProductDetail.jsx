import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import React, { useState } from 'react'
import {Ionicons, SimpleLineIcons, MaterialCommunityIcons, Fontisto  } from '@expo/vector-icons'
import {useNavigation} from '@react-navigation/native'
import {useRoute} from '@react-navigation/native'
import { Badge } from 'react-native-paper'

import {   addToBasket, removeFromBasket,selectBasketItemsWithId } from '../../features/basketSlice';
import { useDispatch, useSelector } from 'react-redux'
import BasketIcon from '../BasketIcon'


// LogBox.ignoreLogs(['Non-serializable values were found in navigation state'])

const ProductDetail = ({navigation}) => {

    const route = useRoute();
    const {item} = route.params;
    // const navigation = useNavigation();
    const [count, setCount] = useState(1);
    const items = useSelector((state) =>selectBasketItemsWithId(state, item.item._id));
    
    
     const id =item.item._id                
     const name=item.item.name
     const nome = item.item.nome
     const image=item.item.image
     const images=item.item.images
     const description=item.item.description
     const rating=item.item.rating
     const numReviews=item.item.numReviews
     const province=item.item.province
      const address=item.item.address
      const priceFromSeller = item.item.priceFromSeller
      const price=item.item.price
      const onSale=item.item.onSale
      const countInStock=item.item.countInStock
      const sellerDetail = item.item.sellerDetails
      const seller = sellerDetail.seller.name

        const _id = id
        const dispatch = useDispatch();

        const addItemToBasket = () => {
            const currentQuantity = items.length; // Current quantity of the item in the basket

            if (currentQuantity >= countInStock) {
              return; // Prevent adding if the stock is exhausted
            }
            if ( countInStock == items.length ) return;
            dispatch(addToBasket({id, _id,
                nome,                 
                name,
                image,
                images,
                description,
                rating,
                numReviews,
                province,
                address,
                priceFromSeller,
                price,
                onSale,
                countInStock,
                seller,
                quantity: currentQuantity + 1 // Increase quantity by 1 when adding

                }));
        }

        const removeItem = () => {
            if (items.length == 0){
                return;
            }
            dispatch(removeFromBasket({id}))
        }
  return (
      <>
                   <BasketIcon/>
          <ScrollView>

      <View style={styles.container}>
      {/* <View style={styles.upperRow}>
            <TouchableOpacity onPress={()=>navigation.goBack()}>
                <Ionicons name='chevron-back-circle' color={'#3e2465'} size={35} style={styles.icon} />
            </TouchableOpacity>

            <TouchableOpacity onPress={()=>navigation.goBack()}>
                <Ionicons name='heart' color={'red'} size={35}/>
            </TouchableOpacity>
      </View> */}

      <Image source={{uri:item.item.image}}
      style={styles.image}
      />
        <View style={styles.icons}>

        <TouchableOpacity onPress={()=>navigation.goBack()}>
        <Ionicons name='chevron-back-circle' size={35} style={styles.back}/>
        </TouchableOpacity>

     

{/* <View style={{ alignItems: "flex-end" }}>
            <View style={styles.cartCount}>
              <Text style={styles.cartNumber}>{items.length}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
              <Ionicons name="cart-outline" size={35} style={styles.cartoutline}/>
            </TouchableOpacity>
          </View> */}
        </View>
      <View style={styles.details}>
      <View style={styles.countInStock}>
        <Text style={{fontWeight: '500', top: 20, fontSize: 20, bottom: 10, fontWeight: '700'}}>Fornecedor: {item.item.sellerDetails.seller.name}</Text>
        </View>
        <View style={styles.titleRow}>
            <Text style={styles.title}>{item.item.nome}</Text>
        </View>
        <View style={styles.priceWrapper}>
            <Text style={styles.price}>{item.item.price} MT</Text>
        </View>
       
        <View style={styles.countInStock}>
        <Text>{countInStock} unidade(s) disponivel/(is)</Text>
        </View>

        <View style = {styles.ratingRow}>
        <View style={styles.rating}>
        {[item.item.rating].map((index)=>(
                        
                        <Ionicons
                        key={index}
                        size={15}
                        color="gold"
                        name="star"
                        />
                    ))}
                    <Text>{item.item.rating}</Text>
                    </View>


            <View style={styles.rating}>
              
                <TouchableOpacity onPress={()=> removeItem(item._id)}>
                    <SimpleLineIcons
                    name='minus'
                    size={25}/>
                </TouchableOpacity>
                
                <Text style={styles.ratingText}>{count}</Text>
                
                <TouchableOpacity onPress={()=> addItemToBasket(item._id)} >
                    <SimpleLineIcons
                    name='plus'
                    size={25}/>
                </TouchableOpacity>
            </View>
        </View>
        <Text style={{marginLeft: 20}}>
            {item.item.isOrdered?<Badge style={{color: 'white', backgroundColor: 'green'}}> Por encomenda </Badge>:item.item.countInStock !== 0 ?item.item.countInStock +` unidade(s)`: <Badge bg='danger'>Sem stock</Badge> }
        </Text>  
            <View style={styles.descriptionWraper}>
                <Text style={styles.description}>
                Descrição
                </Text>
                <Text style={styles.descText}>
                    {item.item.description}
                </Text>
            </View>

            <View style={{marginBottom: 10}}>
                <View style={styles.location}>
                    <View style={{flexDirection: "row"}}>

                            <Ionicons
                            name="location-outline"
                            size={20}
                            />
                            <Text> {item.item.provinceDetails?.name}</Text>
                    </View>

                    <View style={{flexDirection: "row"}}>

<MaterialCommunityIcons
name="truck-delivery-outline"
size={20}
/>
<Text> Entrega disponível</Text>
</View>
                </View>
            </View>
            <View style={{marginBottom:50, backgroundColor:'white'}}>
            </View>


            {/* <View style={styles.cartRow}>
            <TouchableOpacity style={styles.cartBtn}  onPress={() => navigation.navigate("Cart", { item })}>
                <Text style={styles.cartText}>Pagar</Text>
            </TouchableOpacity>

                {/* <TouchableOpacity onPress={()=> addItemToBasket()} style={styles.addCart}>

                    <Ionicons name="cart-outline"
                    size={24}
                    color="white"
                    />
               </TouchableOpacity>
            </View> */}


      </View>
    </View>
 </ScrollView> 
      </>
  )
}

export default ProductDetail


const styles = StyleSheet.create({
container: {
    flex:1,
    backgroundColor: 'white'

},
cartoutline:{
    marginLeft:250,
    color: 'white',
    borderRadius:28,
    backgroundColor: '#F0777F'
},
upperRow:{
    // flex:1 , 
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    top: 50,
    zIndex: 999,
},
image:{
    aspectRatio: 1,
    resizeMode: "cover"

},
details:{
    marginTop: -20,
    top:10

},
titleRow:{
    marginHorizontal: 20,
    // paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
},
title: {
    fontWeight: "500",
    fontSize: 20,
    // bottom: 10

},
countInStock:{
    marginLeft: 20,
    fontSize:18
},
priceWrapper:{
    marginLeft: 10,
    // marginRight: 10,
    // marginTop: 15,
    // backgroundColor: "#7F00FF",
    // borderRadius: 10,
    // alignItems: "center"
},
price:{
    fontSize: 20,
    marginLeft: 10,
    color: "#7F00FF",
    fontWeight: '800'
},
ratingRow:{
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // top: 5
},

cartCount: {
    position: "absolute",
    bottom: 16,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: '#7F00FF',
    justifyContent: 'center',
    zIndex: 999,

},
cartNumber: {
    fontWeight: '600',
    fontSize: 10,
    color: 'white',

},
rating:{
    // top:9,
    justifyContent: "flex-start",
    flexDirection: "row",
    marginLeft: 20,
    marginRight: 20,
    alignItems: "center"
},
ratingText:{
    color: "grey",
    paddingHorizontal: 10,
    
},
descriptionWraper:{
    marginTop: 14,
    marginHorizontal: 22,
},
description: {
    fontSize: 15,
    fontWeight: '500'
},
descText: {
textAlign: "justify",
marginBottom: 12,

},
location: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    padding: 5,
    borderRadius: 25,
    marginLeft: 22,
    marginRight: 25,

},
cartRow:{
    paddingBottom: 33,
    flexDirection: "row",
    // justifyContent: "space-around",
    alignItems: "center",
    width: 25,
},
cartBtn: {
    padding: 10,
    width: 250,
    backgroundColor: '#7F00FF',
    borderRadius: 22,
    marginLeft:22
},
cartText: {
    color: "white",
    marginLeft: 12

},
addCart:{
        width: 37,
        height: 37,
        borderRadius: 50,
        // margin: 12,
        backgroundColor: '#7F00FF',
        marginLeft:20,
        alignItems: "center",
        justifyContent: "center"
    },
    icons:{
        position: 'absolute',
        top: 30,
        // marginLeft: 10,
        flexDirection: "row",
        justifyContent: 'space-between', // Distributes space between the icons
        alignItems: 'center',
      },
    back:{
        marginLeft: 20,
        color: 'black',
        backgroundColor: 'white',
        borderRadius: 22
      },
    heart:{
        marginLeft: 240,
        // color: 'red',
        // bottom: 18,
        // width: 18,
        // height: 18,
        borderRadius: 22,
        alignItems: "center",
        backgroundColor: 'white',
        justifyContent: 'center',
    
      }


})