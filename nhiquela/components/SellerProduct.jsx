import React, { useState, useRef, useEffect } from 'react';
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
  selectBasketItemsWithId,
  addSellers,
  removeSeller,
  getItemsBySellerId,
} from '../features/basketSlice';
import { createSelector } from '@reduxjs/toolkit';

const SellerProduct = ({
  id,
  name,
  image,
  description,
  countInStock,
  price,
  seller,
  discount,
  sellerName,
  comissionPercentage,
  sellerEarningsAfterDiscount,
  onSale,
  isSellerOpen
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  // --- Memoized Selectors ---
  const selectItems = createSelector(
    (state) => state.basket.items,
    (items) => items.filter(item => item._id === id)
  );
  const selectRemainingItemsFromSeller = createSelector(
    (state) => state.basket.items,
    () => seller?._id,
    (items, sellerId) => items.filter(item => item.seller._id === sellerId)
  );

  const items = useSelector((state) => selectItems(state));
  const remainingItemsFromSeller = useSelector((state) =>
    selectRemainingItemsFromSeller(state)
  );

  const dispatch = useDispatch();

  const toggleExpand = () => {
    Animated.timing(animation, {
      toValue: isExpanded ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const addItemToBasket = () => {
    if (items.length >= countInStock) return;
    dispatch(
      addToBasket({
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
      })
    );
    dispatch(addSellers({ seller }));
  };

  const removeItem = () => {
    if (items.length === 0) return;
    dispatch(removeFromBasket({ _id: id }));
    if (remainingItemsFromSeller.length === 1) {
      dispatch(removeSeller({ sellerId: seller._id }));
    }
  };

  const cardHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [180, 260], // altura inicial e expandida
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
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: image }} style={styles.image} />
          {!isSellerOpen && (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>Loja fechada</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name}>{name}</Text>
            <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
              <ChevronDownIcon size={20} color="gray" />
            </Animated.View>
          </View>

          <Text style={styles.description}>{description}</Text>
          <Text style={styles.stock}>Quantidade disp.: {countInStock}</Text>

          {onSale ? (
            <View style={{ marginTop: 6 }}>
              <View style={{ backgroundColor: 'green', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 4 }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Em promoção</Text>
              </View>
              <Text style={{ color: 'grey', textDecorationLine: 'line-through', marginBottom: 5 }}>
                {parseFloat(price).toFixed(2)} MT
              </Text>
              <Text style={{ color: 'green', fontWeight: 'bold', fontSize: 16 }}>
                {parseFloat(discount).toFixed(2)} MT
              </Text>
              <Text style={{ color: 'green', marginTop: 4 }}>
                Economiza {(parseFloat(price) - parseFloat(discount)).toFixed(2)} MT
              </Text>
            </View>
          ) : (
            <Text style={styles.price}>
              {parseFloat(price).toFixed(2)} MT
            </Text>
          )}
        </View>

        {isExpanded && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={removeItem}>
              <MinusCircleIcon
                size={35}
                color={items.length > 0 ? 'white' : 'gray'}
                style={styles.iconButton}
              />
            </TouchableOpacity>

            <Text style={styles.quantity}>{items.length}</Text>

            <TouchableOpacity onPress={addItemToBasket}>
              <PlusCircleIcon size={35} color="white" style={styles.iconButton} />
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
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  image: {
    height: 120,
    borderRadius: 10,
    width: '100%',
    resizeMode: 'cover',
  },
  content: {
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: 'bold',
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
  iconButton: {
    backgroundColor: '#7F00FF',
    borderRadius: 50,
    padding: 6,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    borderRadius: 10,
  },
  overlayText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
  },
});
