import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { StarIcon } from 'react-native-heroicons/outline';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge } from 'react-native-paper';
import { addToBasket, selectBasketItemsWithId } from '../features/basketSlice';
import { useDispatch, useSelector } from 'react-redux';

const ProductCard = ({
  id,
  nome,
  name,
  logo,
  description,
  rating,
  numReviews,
  province,
  address,
  latitude,
  longitude,
  priceFromSeller,
  price,
  countInStock,
  seller,
  item
}) => {
  const navigation = useNavigation();

  const items = useSelector((state) =>selectBasketItemsWithId(state, item._id));

  const getShortDescription = (text, wordLimit) => {
    const words = text.split(' ');
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(' ') + '... ';
    }
    return text;
  };

  const dispatch = useDispatch();

  const _id = id
  const addItemToBasket = () => {

    const currentQuantity = items.length; // Current quantity of the item in the basket

    if (currentQuantity >= countInStock) {
      return; // Prevent adding if the stock is exhausted
    }

      if ( countInStock == items.length ) return;
      dispatch(addToBasket({id,_id, 
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
          quantity: currentQuantity + 1 // Increase quantity by 1 when adding
          }));
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ProductDetail", { item })}>
      <View style={styles.card_template}>
        <Image source={{ uri: logo }} style={styles.image} />

        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={1}>{item.item.nome}</Text>
          {/* <Text numberOfLines={1}>{getShortDescription(item.item.description, )}</Text> */}
          <Text style={styles.supplier} numberOfLines={1}>{seller.seller.name}</Text>

          {/* <Text style={styles.countInStock} numberOfLines={1}>{item.item.countInStock} unidade(s)</Text> */}
          <Text style={styles.price} numberOfLines={1}>{item.item.price} MT</Text>
          <Text>
            {item.item.isOrdered ? <Badge style={{ color: 'white', backgroundColor: 'green' }}> Por encomenda </Badge> : item.item.countInStock !== 0 ? item.item.countInStock + ` unidade(s)` : <Badge bg='danger'>Sem stock</Badge>}
          </Text>

        </View>
        <TouchableOpacity style={styles.addBtn} onPress={()=> addItemToBasket(item._id)} >
          <Ionicons name='cart' size={25}
            color={'#7F00FF'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default ProductCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: 'grey',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
    margin: 10,
    width: 200,
  },
  card_template: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 170,
    resizeMode: 'cover',
  },
  textContainer: {
    padding: 2,
  },
  details: {
    padding: 12
},
title: {
    fontSize: 15,
    fontWeight: '500'
},
supplier: {
    fontSize: 12,
    fontWeight: '600'

},
countInStock:{
    fontSize: 14,
    // fontWeight: '700'
},
price: {
    fontSize: 14,
    fontWeight: '700'
},
addBtn: {
    position: "absolute",
    bottom: 10,
    right: 12
}
});
