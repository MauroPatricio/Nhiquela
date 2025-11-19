import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { MinusCircleIcon, PlusCircleIcon, ChevronDownIcon } from 'react-native-heroicons/outline';
import { useDispatch, useSelector } from 'react-redux';
import {
  addToBasket,
  removeFromBasket,
  addSellers,
} from '../features/basketSlice';
import { createSelector } from '@reduxjs/toolkit';
import { useToast } from 'react-native-toast-notifications';

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
  countInStock,
  priceFromSeller,
  price,
  seller,
  discount,
  sellerName,
  comissionPercentage,
  sellerEarningsAfterDiscount,
  onSale,
  isSellerOpen,
  isOrdered,
  orderPeriod
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const selectItems = createSelector(
    (state) => state.basket.items,
    (items) => items.filter(item => item._id === id)
  );
  const items = useSelector((state) => selectItems(state));
  const dispatch = useDispatch();
    const toast = useToast(); // ← inicializa o toast

  const toggleExpand = () => {
    Animated.timing(animation, {
      toValue: isExpanded ? 0 : 1.5,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const addItemToBasket = () => {
    if (items.length >= countInStock) return;
    dispatch(addToBasket({
      id,
      _id: id,
      name,
      image,
      description,
      countInStock,
      price,
      seller,
      sellerName,
      discount,
      onSale,
      comissionPercentage,
      sellerEarningsAfterDiscount,
      quantity: items.length + 1,
    }));
    dispatch(addSellers({ seller }));

      toast.show(`${nome} adicionado ao carrinho!`, {
      type: 'success',
      placement: 'top',
      duration: 3000,
      animationType: 'slide-in',
    });
  };

  const removeItem = () => {
    if (items.length === 0) return;
    dispatch(removeFromBasket({ _id: id }));
      toast.show(`${nome} removido do carrinho!`, {
      type: 'warning',
      placement: 'top',
      duration: 3000,
      animationType: 'slide-in',
    });
  };

  const cardHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [220, 300], // altura inicial e expandida
  });

  const rotateChevron = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={[styles.card, { height: cardHeight }]}>
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.9}
        disabled={!isSellerOpen}
        style={{ flex: 1 }}
      >
        {/* Imagem */}
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: image }} style={styles.image} />

          {/* Loja fechada */}
          {!isSellerOpen && (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>Loja fechada</Text>
            </View>
          )}

          {/* Badges */}
          <View style={styles.badgeContainer}>
            {onSale && (
              <View style={styles.saleBadge}>
                <Text style={styles.saleText}>Promoção</Text>
              </View>
            )}
            {isOrdered && orderPeriod && (
              <View style={styles.orderBadge}>
                <Text style={styles.orderText}>Por encomenda: {orderPeriod}</Text>
              </View>
            )}
          </View>

          {/* Sem estoque */}
          {countInStock === 0 && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Sem estoque</Text>
            </View>
          )}
        </View>

        {/* Conteúdo */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name}>{name}</Text>
            <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
              <ChevronDownIcon size={20} color="gray" />
            </Animated.View>
          </View>

          <Text style={styles.description}>{description}</Text>
          <Text style={styles.stock}>
            {countInStock > 0 ? `Disponível: ${countInStock}` : 'Indisponível'}
          </Text>
          <Text style={styles.price}>
            {onSale
              ? `${parseFloat(discount).toFixed(2)} MT`
              : `${parseFloat(price).toFixed(2)} MT`}
          </Text>
        </View>

        {/* Ações */}
        {isExpanded && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={removeItem} disabled={items.length === 0}>
              <MinusCircleIcon size={40} color={items.length > 0 ? '#7F00FF' : 'gray'} />
            </TouchableOpacity>
            <Text style={styles.quantity}>{items.length}</Text>
            <TouchableOpacity onPress={addItemToBasket} disabled={items.length >= countInStock}>
              <PlusCircleIcon size={40} color={items.length < countInStock ? '#7F00FF' : 'gray'} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default SellerProduct;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  image: {
    height: 150,
    borderRadius: 12,
    width: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  overlayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  saleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  orderBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  orderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#C62828',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  outOfStockText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginVertical: 4,
  },
  stock: {
    fontSize: 12,
    color: '#888',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
    color: '#7F00FF',
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  },
});
