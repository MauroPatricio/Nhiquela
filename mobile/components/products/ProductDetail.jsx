import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Badge } from 'react-native-paper';
import { addToBasket, removeFromBasket, selectBasketItemsWithId, addSellers, removeSeller, checkIfSellerExists, getItemsBySellerId } from '../../features/basketSlice';
import { useDispatch, useSelector } from 'react-redux';
import BasketIcon from '../BasketIcon';

const ProductDetail = () => {
  const route = useRoute();
  const item = route.params?.item || {}; // Fallback in case `item` is undefined


  const navigation = useNavigation()

  // Destructure properties from `item` or `item.item`
  const itemData = item.item !== undefined ? item.item : item;
  const {
    _id,
    name = itemData?.name || itemData?.nome,
    image,
    images,
    description,
    rating,
    numReviews,
    countInStock,
    province,
    price,
    onSale,
  } = itemData;
  let seller = itemData?.sellerDetails;

  const id = _id


  seller = seller?itemData.sellerDetails:itemData.seller;



  const [count, setCount] = useState(0); // Start count at 0

  const items = useSelector((state) => selectBasketItemsWithId(state, _id));
  const dispatch = useDispatch();

  const sellerName = seller?.seller?.name;

  // console.log(seller)

  const addItemToBasket = () => {
    const currentQuantity = items.length;
    if (currentQuantity + count >= countInStock) {
      return; // Prevent adding if the stock is exhausted
    }

    setCount(count + 1); // Increase count by 1
    dispatch(addToBasket({
      _id,
      name,
      image,
      images,
      description,
      rating,
      numReviews,
      province,
      price,
      onSale,
      countInStock,
      seller,
      sellerName,
      quantity: currentQuantity + count + 1
    }));

      dispatch(addSellers({ seller }));
    
  };

  const removeItem = () => {
    if (count > 0) {
      setCount(count - 1);
    }
    if (count === 1) {
      if (_id) {
         dispatch(removeFromBasket({ _id }));
  
        const remainingItemsFromSeller = getItemsBySellerId(seller._id);
        if (remainingItemsFromSeller.length === 0) {
          dispatch(removeSeller({ sellerId: seller._id }));
        }
      } 
    }
  };

  return (
    <>
      <BasketIcon />
      <ScrollView>
        <View style={styles.container}>
          <Image source={{ uri: image }} style={styles.image} />
          <View style={styles.icons}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back-circle" size={35} style={styles.back} />
            </TouchableOpacity>
          </View>
          <View style={styles.details}>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.price}>{price} MT</Text>
            <Text>{countInStock} unidade(s) disponível(is)</Text>

            <View style={styles.ratingRow}>
              {/* <View style={styles.rating}>
                {[...Array(Math.round(rating))].map((_, index) => (
                  <Ionicons key={index} size={15} color="gold" name="star" />
                ))}
                <Text>{rating}</Text>
              </View> */}

              {/* <View style={styles.rating}>
  {rating > 0 && !isNaN(rating) ? (
    [...Array(Math.round(rating))].map((_, index) => (
      <Ionicons key={index} size={15} color="gold" name="star" />
    ))
  ) : (
    <Text>Sem pontuações </Text>
  )}
  <Text>{rating || 0}</Text>
</View> */}

              <View style={styles.countControl}>
                <TouchableOpacity onPress={removeItem} disabled={count === 0}>
                  <SimpleLineIcons name="minus" size={25} />
                </TouchableOpacity>
                <Text style={styles.countText}>{count}</Text>
                <TouchableOpacity onPress={addItemToBasket} disabled={count >= countInStock || countInStock === 0}>
                  <SimpleLineIcons name="plus" size={25} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={{ marginLeft: 20 }}>
              {itemData.isOrdered ? (
                <Badge style={{ color: 'white', backgroundColor: 'green' }}>Por encomenda</Badge>
              ) : countInStock !== 0 ? (
                `${countInStock} unidade(s)`
              ) : (
                <Badge bg="danger">Sem stock</Badge>
              )}
            </Text>

            <View style={styles.descriptionWrapper}>
              <Text style={styles.description}>Descrição</Text>
              <Text style={styles.descText}>{description}</Text>
            </View>
          </View>
        </View>
        <View style={{ marginBottom: 100 }} />
      </ScrollView>
    </>
  );
};

export default ProductDetail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  image: {
    width: '100%',
    height: 350,
    resizeMode: 'cover',
  },
  icons: {
    position: 'absolute',
    top: 40,
    left: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
  },
  back: {
    color: 'black',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 22,
    padding: 5,
  },
  details: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 3,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  price: {
    fontSize: 22,
    color: '#7F00FF',
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countControl: {
    marginTop: 0, 
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F4F4F4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  countText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 10,
  },
  descriptionWrapper: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  description: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  descText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
