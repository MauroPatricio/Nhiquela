import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { Ionicons, SimpleLineIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Badge } from 'react-native-paper';
import { addToBasket, removeFromBasket, selectBasketItemsWithId } from '../../features/basketSlice';
import { useDispatch, useSelector } from 'react-redux';
import BasketIcon from '../BasketIcon';

const ProductDetail = ({ navigation }) => {
  const route = useRoute();
  const { item } = route.params;
  const [count, setCount] = useState(0); // Start count at 0
  const items = useSelector((state) => selectBasketItemsWithId(state, item.item._id));

  const id = item.item._id;
  const name = item.item.nome;
  const image = item.item.image;
  const images = item.item.images;
  const description = item.item.description;
  const rating = item.item.rating;
  const numReviews = item.item.numReviews;
  const province = item.item.province;
  const address = item.item.address;
  const price = item.item.price;
  const onSale = item.item.onSale;
  const countInStock = item.item.countInStock;
  const sellerDetail = item.item.sellerDetails;
  const seller = sellerDetail._id;
  const sellerName = sellerDetail.seller.name;

  const _id = id;

  const dispatch = useDispatch();

  const addItemToBasket = () => {
    const currentQuantity = items.length; // Current quantity of the item in the basket

    if (currentQuantity + count >= countInStock) {
      return; // Prevent adding if the stock is exhausted
    }
    
    setCount(count + 1); // Increase count by 1
    dispatch(addToBasket({
      id,
      _id,
      name,
      image,
      images,
      description,
      rating,
      numReviews,
      province,
      address,
      price,
      onSale,
      countInStock,
      seller,
      sellerName,
      quantity: currentQuantity + count + 1 // Update quantity
    }));
  };

  const removeItem = () => {
    if (count > 0) { // Allow removal only if count is greater than 0
      setCount(count - 1);
    }
    if (count === 1) {
      dispatch(removeFromBasket({ _id }));
    }
  };

  return (
    <>
      <BasketIcon />
      <ScrollView>
        <View style={styles.container}>
          <Image source={{ uri: item.item.image }} style={styles.image} />
          <View style={styles.icons}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name='chevron-back-circle' size={35} style={styles.back} />
            </TouchableOpacity>
          </View>
          <View style={styles.details}>
            <Text style={styles.title}>{item.item.nome}</Text>
            <Text style={styles.price}>{item.item.price} MT</Text>
            <Text>{countInStock} unidade(s) disponível(is)</Text>

            <View style={styles.ratingRow}>
              <View style={styles.rating}>
                {[...Array(Math.round(item.item.rating))].map((_, index) => (
                  <Ionicons key={index} size={15} color="gold" name="star" />
                ))}
                <Text>{item.item.rating}</Text>
              </View>

              <View style={styles.countControl}>
                <TouchableOpacity onPress={removeItem} disabled={count === 0}>
                  <SimpleLineIcons name='minus' size={25} />
                </TouchableOpacity>
                <Text style={styles.countText}>{count}</Text>
                <TouchableOpacity onPress={addItemToBasket} disabled={count >= countInStock}>
                  <SimpleLineIcons name='plus' size={25} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={{ marginLeft: 20 }}>
              {item.item.isOrdered ? (
                <Badge style={{ color: 'white', backgroundColor: 'green' }}>Por encomenda</Badge>
              ) : item.item.countInStock !== 0 ? (
                `${item.item.countInStock} unidade(s)`
              ) : (
                <Badge bg='danger'>Sem stock</Badge>
              )}
            </Text>

            <View style={styles.descriptionWrapper}>
              <Text style={styles.description}>Descrição</Text>
              <Text style={styles.descText}>{item.item.description}</Text>
            </View>
          </View>
        </View>
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
    color: '#7F00FF',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
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
