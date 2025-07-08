import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Badge } from 'react-native-paper';
import { addToBasket, removeFromBasket, selectBasketItemsWithId, addSellers, removeSeller, getItemsBySellerId } from '../../features/basketSlice';
import { useDispatch, useSelector } from 'react-redux';
import BasketIcon from '../BasketIcon';

const ProductDetail = () => {
  const route = useRoute();
  const item = route.params?.item || {};

  const navigation = useNavigation();
  
  const itemData = item?.item !== undefined ? item?.item : item;
  
  const {
    _id,
    nome = itemData?.nome,
    name = itemData?.name,
    image = itemData?.image,
    description,
    rating = itemData.rating,
    numReviews = itemData?.numReviews,
    countInStock = itemData?.countInStock,
    priceFromSeller =itemData?.priceFromSeller,
    price = itemData?.price,
    onSale = itemData?.onSale,
    discount =itemData?.discount,
    comissionPercentage,
    sellerEarningsAfterDiscount
  } = itemData;

  let seller = itemData?.sellerDetails || itemData?.seller;
  const id = _id;

  const [count, setCount] = useState(0);
  const items = useSelector((state) => selectBasketItemsWithId(state, _id));
  const dispatch = useDispatch();

  const sellerName = seller?.seller?.name || seller?.name;

  const addItemToBasket = () => {
    const currentQuantity = items.length;
    if (currentQuantity + count >= countInStock) return;

    setCount(count + 1);
    dispatch(addToBasket({
      _id,
      nome,
      name,
      image,
      description,
      rating,
      numReviews,
      countInStock,
      priceFromSeller,
      price,
      onSale,
      seller,
      sellerName,
      discount,
      comissionPercentage,
      sellerEarningsAfterDiscount,
      quantity: currentQuantity + count + 1,
    }));

    dispatch(addSellers({ seller }));
  };

  const removeItem = () => {
    if (count === 0) return;
    setCount(count - 1);

    if (count === 1) {
      dispatch(removeFromBasket({ _id }));

      const remainingItemsFromSeller = getItemsBySellerId(seller._id);
      if (remainingItemsFromSeller.length === 0) {
        dispatch(removeSeller({ sellerId: seller._id }));
      }
    }
  };

  return (
    <>
      <BasketIcon />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Image source={{ uri: image }} style={styles.image} />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.details}>
            <Text style={styles.seller}>Fornecedor: <Text style={{ fontWeight: '800' }}>{sellerName || 'N/A'}</Text></Text>
            <Text style={styles.title}>{nome}</Text>
            <View style={styles.priceRow}>
  {onSale && (
    <>
      {/* Badge "Promoção" */}
      <View style={styles.promoBadge}>
        <Text style={styles.promoText}>
          Promoção
        </Text>
      </View>

      {/* Preço com desconto (maior) */}
      <Text style={styles.discountPrice}>
        {discount} MT
      </Text>

      {/* Preço original (riscado e menor) */}
      <Text style={styles.originalPrice}>
        {price} MT
      </Text>
    </>
  )}

  {!onSale && (
    <Text style={styles.normalPrice}>
      {price} MT
    </Text>
  )}

</View>
                  <Text>
                    {countInStock > 0 ? (
                      <Text style={styles.badgeInStock}>{countInStock} unidade(s) disponível(is)</Text>
                    ) : (
                      <Badge style={styles.badgeOutOfStock}>Sem estoque</Badge>
                    )}
                  </Text>
            <View style={styles.ratingRow}>
              {rating > 0 && !isNaN(rating) ? (
                [...Array(Math.round(rating))].map((_, idx) => (
                  <Ionicons key={idx} name="star" size={18} color="#FFD700" />
                ))
              ) : (
                <Text style={styles.noRating}>Sem pontuações</Text>
              )}
              <Text style={styles.ratingValue}>{rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.numReviews}>({numReviews || 0} avaliações)</Text>
            </View>

            <View style={styles.counterContainer}>
              <TouchableOpacity
                style={[styles.counterButton, count === 0 && styles.disabledButton]}
                onPress={removeItem}
                disabled={count === 0}
              >
                <SimpleLineIcons name="minus" size={24} color={count === 0 ? '#aaa' : '#7F00FF'} />
              </TouchableOpacity>
              <Text style={styles.countText}>{count}</Text>
              <TouchableOpacity
                style={[styles.counterButton, (count >= countInStock || countInStock === 0) && styles.disabledButton]}
                onPress={addItemToBasket}
                disabled={count >= countInStock || countInStock === 0}
              >
                <SimpleLineIcons name="plus" size={24} color={(count >= countInStock || countInStock === 0) ? '#aaa' : '#7F00FF'} />
              </TouchableOpacity>
            </View>

            <View style={styles.descriptionWrapper}>
              <Text style={styles.descriptionTitle}>Descrição</Text>
              <Text style={styles.descriptionText}>{description || 'Sem descrição disponível.'}</Text>
            </View>
          </View>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </>
  );
};

export default ProductDetail;

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: '#FAFAFA',
  },
  container: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 360,
    resizeMode: 'cover',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  backButton: {
    position: 'absolute',
    top: 45,
    left: 15,
    backgroundColor: 'rgba(127, 0, 255, 0.7)',
    padding: 8,
    borderRadius: 25,
    elevation: 6,
  },
  details: {
    marginHorizontal: 20,
    marginTop: 5,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    // shadowColor: '#7F00FF',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  seller: {
    fontSize: 16,
    color: '#7F00FF',
    // marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    // marginBottom: 10,
  },
priceRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

promoBadge: {
  backgroundColor: 'green',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},

promoText: {
  color: 'white',
  fontWeight: 'bold',
  fontSize: 12,
},

discountPrice: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#00796B',
},

originalPrice: {
  fontSize: 12,
  color: 'grey',
  textDecorationLine: 'line-through',
},

normalPrice: {
  fontSize: 14,
  fontWeight: 'bold',
},


saving: {
  fontSize: 12,
  color: 'red',
},

normalPrice: {
  fontSize: 14,
  fontWeight: 'bold',
},

  saleBadge: {
    backgroundColor: 'green',
    color: '#fff',
    marginRight: 12,
    fontSize: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  stockText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  noRating: {
    fontSize: 14,
    color: '#AAA',
    marginRight: 6,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginLeft: 6,
  },
  numReviews: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    paddingVertical: 10,
    // paddingHorizontal: 20,
    shadowColor: '#7F00FF',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    marginBottom: 25,
  },
  counterButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    // padding: 6,
    marginHorizontal: 20,
    elevation: 3,
    // shadowColor: '#7F00FF',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  disabledButton: {
    backgroundColor: '#EEE',
  },
  countText: {
    fontSize: 22,
    fontWeight: '700',
    // color: '#7F00FF',
    minWidth: 30,
    textAlign: 'center',
  },
  descriptionWrapper: {
    marginTop: 10,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
  },
  
badgeOrdered: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 13,
  },
  badgeInStock: {
    backgroundColor: '#E0F7FA',
    color: '#00796B',
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 13,
    overflow: 'hidden',
  },
  badgeOutOfStock: {
    backgroundColor: '#FFCDD2',
    color: '#C62828',
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 13,
  },
});
