import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Badge } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { addToBasket, removeFromBasket, selectBasketItemsWithId, addSellers, removeSeller, getItemsBySellerId } from '../../features/basketSlice';
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
    priceFromSeller = itemData?.priceFromSeller,
    price = itemData?.price,
    onSale = itemData?.onSale,
    discount = itemData?.discount,
    comissionPercentage,
    sellerEarningsAfterDiscount
  } = itemData;

  const seller = itemData?.sellerDetails || itemData?.seller;
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
          {/* Imagem com botão de voltar */}
          <View style={styles.imageWrapper}>
            <Image source={{ uri: image }} style={styles.image} />
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Card com detalhes */}
          <View style={styles.details}>
            <Text style={styles.seller}>Fornecedor: <Text style={{ fontWeight: '800' }}>{sellerName || 'N/A'}</Text></Text>
            <Text style={styles.title}>{nome}</Text>

            {/* Preço */}
            <View style={styles.priceRow}>
              {onSale ? (
                <>
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoText}>Promoção</Text>
                  </View>
                  <Text style={styles.discountPrice}>{discount} MT</Text>
                  <Text style={styles.originalPrice}>{price} MT</Text>
                </>
              ) : (
                <Text style={styles.normalPrice}>{price} MT</Text>
              )}
            </View>

               {/* NOVO CAMPO ENDEREÇO */}
            {itemData.province?.name && (
              <Text style={styles.address}>
                Endereço do produto: <Text style={{ fontWeight: '600' }}>{itemData.province.name}</Text>
              </Text>
            )}
            {/* Estoque */}
            {console.log(itemData.isOrdered)}
            <View style={{ marginVertical: 6 }}>
              {itemData.isOrdered ? (
                <>
                  <Badge style={styles.badgeOrdered}>Por encomenda: <Text style={{ fontSize: 13, marginTop: 2 }}>{itemData.orderPeriod} para entrega</Text></Badge>
                  
                </>
              ) : countInStock > 0 ? (
                <Text style={styles.badgeInStock}>{countInStock} unidade(s)</Text>
              ) : (
                <Badge style={styles.badgeOutOfStock}>Sem estoque</Badge>
              )}
            </View>

            {/* Avaliações */}
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

            {/* Contador */}
            <View style={styles.counterContainer}>
              <TouchableOpacity
                style={[styles.counterButton, count === 0 && styles.disabledButton]}
                onPress={removeItem}
                disabled={count === 0}
              >
                <SimpleLineIcons name="minus" size={24} color={count === 0 ? '#aaa' : '#fbfbfbff'} />
              </TouchableOpacity>
              <Text style={styles.countText}>{count}</Text>
              <TouchableOpacity
                style={[styles.counterButton, (count >= countInStock || countInStock === 0) && styles.disabledButton]}
                onPress={addItemToBasket}
                disabled={count >= countInStock || countInStock === 0}
              >
                <SimpleLineIcons name="plus" size={24} color={(count >= countInStock || countInStock === 0) ? '#aaa' : '#fff'} />
              </TouchableOpacity>
            </View>

            {/* Descrição */}
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
  scrollView: { backgroundColor: '#F9F9F9' },
  container: { flex: 1 },

  imageWrapper: { position: 'relative' },
  image: {
    width: '100%',
    height: 360,
    resizeMode: 'cover',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    position: 'absolute',
    top: 45,
    left: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 25,
    elevation: 6,
  },

  details: {
    marginHorizontal: 20,
    marginTop: -20,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  seller: { fontSize: 15, color: '#7F00FF', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#222', marginBottom: 10 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoBadge: { backgroundColor: '#FF5722', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  promoText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  discountPrice: { fontSize: 20, fontWeight: 'bold', color: '#FF5722' },
  originalPrice: { fontSize: 14, color: 'grey', textDecorationLine: 'line-through' },
  normalPrice: { fontSize: 20, fontWeight: 'bold', color: '#333' },

  badgeOrdered: { backgroundColor: '#4CAF50', color: '#fff', fontWeight: '600', paddingHorizontal: 10, borderRadius: 12, fontSize: 13,      alignSelf: 'flex-start', // move para a esquerda
 },
  badgeInStock: { backgroundColor: '#E0F7FA', color: '#00796B', fontWeight: '600', paddingHorizontal: 10, borderRadius: 12, fontSize: 13 },
  badgeOutOfStock: { backgroundColor: '#FFCDD2', color: '#C62828', fontWeight: '700', paddingHorizontal: 12, borderRadius: 12, fontSize: 13 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  noRating: { fontSize: 14, color: '#AAA', marginRight: 6 },
  ratingValue: { fontSize: 16, fontWeight: '600', color: '#444', marginLeft: 6 },
  numReviews: { fontSize: 14, color: '#888', marginLeft: 8 },

  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 254, 255, 1)',
    borderRadius: 15,
    paddingVertical: 5,
    marginBottom: 5,
    elevation: 5,
  },
  counterButton: {
    backgroundColor: '#7F00FF',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 20,
  },
  disabledButton: { backgroundColor: '#CCC' },
  countText: { fontSize: 22, fontWeight: '700', color: '#0e0d0dff', minWidth: 30, textAlign: 'center' },

  descriptionWrapper: { marginTop: 10 },
  descriptionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  descriptionText: { fontSize: 16, color: '#555', lineHeight: 22 },
  address: {
  fontSize: 15,
  color: '#444',
  marginTop: 4,
  marginBottom: 8,
},
});
