import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge } from 'react-native-paper';
import { selectBasketItemsWithId } from '../features/basketSlice';
import { useDispatch, useSelector } from 'react-redux';

const ProductCard = ({ id, name, logo, description, rating, numReviews, seller, isSellerOpen, item }) => {
  const navigation = useNavigation();
  const items = useSelector((state) => selectBasketItemsWithId(state, item._id));
  const dispatch = useDispatch();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ProductDetail", { item })}
      disabled={!isSellerOpen}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: logo }} style={styles.image} />

        {!isSellerOpen && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Loja Fechada</Text>
          </View>
        )}

        {item.item.onSale && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoText}>-{item.item.onSalePercentage}%</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>{item.item.nome}</Text>
        <Text style={styles.supplier} numberOfLines={1}>{seller.seller.name}</Text>

              <Text style={styles.supplier}>{item.item.province?.name}</Text>

  
        <View style={styles.stockRow}>
          {item.item.isOrdered ? (
            <Badge style={styles.badgeOrdered}>Por encomenda</Badge>
          ) : item.item.countInStock > 0 ? (
            <Badge style={styles.badgeInStock}>{item.item.countInStock} unidades</Badge>
          ) : (
            <Badge style={styles.badgeOutOfStock}>Sem estoque</Badge>
          )}
        </View>

        <View style={styles.priceRow}>
          {item.item.onSale ? (
            <>
              <Text style={styles.priceDiscount}>{item.item.discount} MT</Text>
              <Text style={styles.priceOriginal}>{item.item.price} MT</Text>
            </>
          ) : (
            <Text style={styles.priceDiscount}>{item.item.price} MT</Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.cartBtn}>
        <Ionicons name="cart" size={20} color="#7F00FF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default ProductCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    margin: 6,
    overflow: 'hidden',
    width: 150,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 120,
    contentFit: 'cover',
  },
  promoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FF4D4D',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  promoText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  infoContainer: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 1,
  },
  supplier: {
    fontSize: 11,
    color: 'grey',
    marginBottom: 5,
  },
  stockRow: {
    // marginBottom: 4,
      alignSelf: 'flex-start', // move para a esquerda

  },
  badgeOrdered: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
  badgeInStock: {
    backgroundColor: '#E0F7FA',
    color: '#00796B',
    fontWeight: '600',
    fontSize: 11,
  },
  badgeOutOfStock: {
    backgroundColor: '#FFCDD2',
    color: '#C62828',
    fontWeight: '700',
    fontSize: 11,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceDiscount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  priceOriginal: {
    fontSize: 11,
    color: 'grey',
    textDecorationLine: 'line-through',
  },
  cartBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#F5F0FF',
    padding: 5,
    borderRadius: 18,
  },
});

