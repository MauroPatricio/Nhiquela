import { StyleSheet, Text, View, TouchableOpacity, Image} from 'react-native'
import React, { useState } from 'react'
import { MinusCircleIcon, PlusCircleIcon } from 'react-native-heroicons/outline';
import { useDispatch, useSelector } from 'react-redux';
import { selectBasketItemsWithId } from '../features/basketSlice';
import { addToBasket, removeFromBasket } from '../features/basketSlice';


const SellerProduct = ({
    id,  
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
seller, quantity}) => {

    const _id = id

        const [isPressed, setIsPressed] = useState(false); 

        const items = useSelector((state) =>selectBasketItemsWithId(state, id));
        
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
    <TouchableOpacity style={styles.container} onPress={()=>setIsPressed(!isPressed)}>
        <View style={styles.wrapper}>
                        <View>
                                <Text style={styles.productName}>{name}</Text>
                                <Text style={styles.details}>{description}</Text>
                                <Text>{countInStock} unidade(s)</Text>
                                <Text style={styles.price}>{price} MT</Text>
                        </View>
                        <View>
                            <Image source={{uri: image, height:70, width:70}} style={styles.image}/>
                        </View>
        </View>
    </TouchableOpacity>

    {isPressed && (
        <View>
            <View style={styles.circleIcons}>
                <TouchableOpacity onPress={()=> removeItem(id)}>
                    <MinusCircleIcon style={styles.minusIcon} size={35}
                    
                    color= { items.length > 0 ? 'white': 'grey'}
                    />
                </TouchableOpacity>
                <Text>{items.length}</Text>
                <TouchableOpacity onPress={()=> addItemToBasket()}>
                    <PlusCircleIcon style={styles.plusIcon} size={35}/>
                </TouchableOpacity>
            </View>
        </View>
    )}
    </>
  )
}

export default SellerProduct

const styles = StyleSheet.create({

    container :{
        backgroundColor: 'white',
        
        // marginLeft: 10,
        borderWidth: 0.5,
        borderColor: '#E0E0E0',
        marginLeft: 10,
    },
    wrapper:{
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'space-between'
        
    },

    productName: {
        fontSize: 15,
        fontWeight: '500',
        width: 240
    },
    details:{
        fontSize:13,
        color: 'grey',
        width: 280,
    },
    price:{
        fontWeight: '500'
    },
    image:{
        marginTop:5,
        marginBottom:5,
        borderRadius: 1,
        marginRight:5

    },
    minusIcon:{
        // color: 'white',
        backgroundColor:'#7F00FF',
        borderRadius: 50,
        marginRight: 10,
      
    },
    plusIcon: {
        color: 'white',
        backgroundColor:'#7F00FF',
        borderRadius: 22,
        marginLeft: 10

    },
    circleIcons: {
        flexDirection: 'row',
        flex: 1,
        alignContent: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom:10,
        marginTop:10,

    }
})