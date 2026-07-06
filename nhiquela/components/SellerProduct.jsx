import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MinusCircleIcon, PlusCircleIcon } from 'react-native-heroicons/solid';
import { useDispatch, useSelector } from 'react-redux';
import {
  addToBasket,
  removeFromBasket,
  addSellers,
} from '../features/basketSlice';
import { createSelector } from '@reduxjs/toolkit';
import { useToast } from 'react-native-toast-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const SellerProduct = ({
  id,
  nome,
  name,
  image,
  images,
  description,
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

  const selectItems = createSelector(
    (state) => state.basket.items,
    (items) => items.filter(item => item._id === id)
  );
  const items = useSelector((state) => selectItems(state));
  const dispatch = useDispatch();
  const toast = useToast();
  
  const [isFavorite, setIsFavorite] = React.useState(false);

  React.useEffect(() => {
    checkFavoriteStatus();
  }, []);

  const checkFavoriteStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem('@fav_products');
      if (stored) {
        const favs = JSON.parse(stored);
        const exists = favs.some(item => item._id === id || item.id === id);
        setIsFavorite(exists);
      }
    } catch (e) {
      console.log('Error checking favorite:', e);
    }
  };

  const toggleFavorite = async () => {
    try {
      const stored = await AsyncStorage.getItem('@fav_products');
      let favs = stored ? JSON.parse(stored) : [];
      
      if (isFavorite) {
        favs = favs.filter(item => item._id !== id && item.id !== id);
        toast.show('Removido dos favoritos', { type: 'normal', duration: 1500 });
      } else {
        const productData = {
          _id: id,
          id: id,
          name: name || nome,
          image: image,
          description: description,
          price: price,
          sellerName: sellerName || seller?.name || seller?.seller?.name
        };
        favs.push(productData);
        toast.show('Adicionado aos favoritos ❤️', { type: 'success', duration: 1500 });
      }
      
      await AsyncStorage.setItem('@fav_products', JSON.stringify(favs));
      setIsFavorite(!isFavorite);
    } catch (e) {
      console.log('Error toggling favorite:', e);
    }
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

    toast.show(`${nome || name} adicionado ao carrinho!`, {
      type: 'success',
      placement: 'top',
      duration: 2000,
      animationType: 'slide-in',
    });
  };

  const removeItem = () => {
    if (items.length === 0) return;
    dispatch(removeFromBasket({ _id: id }));
  };

  return (
    <View style={styles.card}>
      <View style={{ position: 'relative' }}>
        <Image source={{ uri: image }} style={styles.image} />
        
        {/* Favorite Button */}
        <TouchableOpacity 
          style={styles.favoriteButton} 
          onPress={toggleFavorite}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={20} 
            color={isFavorite ? "#EF4444" : "#9CA3AF"} 
          />
        </TouchableOpacity>

        {/* Loja fechada */}
        {!isSellerOpen && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Fechado</Text>
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgeContainer}>
          {onSale && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleText}>Promo</Text>
            </View>
          )}
          {isOrdered && orderPeriod && (
            <View style={styles.orderBadge}>
              <Text style={styles.orderText}>Enc: {orderPeriod}</Text>
            </View>
          )}
        </View>

        {/* Sem estoque */}
        {countInStock === 0 && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Esgotado</Text>
          </View>
        )}
      </View>

      {/* Conteúdo */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        <Text style={styles.price}>
          {onSale
            ? `${parseFloat(discount).toFixed(2)} MT`
            : `${parseFloat(price).toFixed(2)} MT`}
        </Text>
        
        {onSale && (
          <Text style={styles.originalPrice}>
            {parseFloat(price).toFixed(2)} MT
          </Text>
        )}
      </View>

      {/* Ações / Controlos de Carrinho */}
      <View style={styles.actionsContainer}>
        {items.length > 0 ? (
          <View style={styles.activeCartControls}>
            <TouchableOpacity onPress={removeItem} style={styles.iconButton}>
              <MinusCircleIcon size={32} color="#9333EA" />
            </TouchableOpacity>
            <Text style={styles.quantity}>{items.length}</Text>
            <TouchableOpacity 
              onPress={addItemToBasket} 
              disabled={items.length >= countInStock}
              style={styles.iconButton}
            >
              <PlusCircleIcon size={32} color={items.length < countInStock ? "#9333EA" : "#D1D5DB"} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.addButton, (!isSellerOpen || countInStock === 0) && styles.disabledButton]} 
            onPress={addItemToBasket}
            disabled={!isSellerOpen || countInStock === 0}
          >
            <Text style={styles.addButtonText}>Adicionar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default SellerProduct;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '48%', // Garante 2 colunas
    marginBottom: 15,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  image: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#F3F4F6',
    contentFit: 'cover',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  overlayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
  },
  badgeContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'column',
    gap: 4,
  },
  saleBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  saleText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  orderBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  orderText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  outOfStockText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  content: {
    padding: 10,
    paddingBottom: 5,
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9333EA',
  },
  originalPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  actionsContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 5,
  },
  addButton: {
    backgroundColor: '#F3E8FF',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  addButtonText: {
    color: '#9333EA',
    fontWeight: '700',
    fontSize: 13,
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  activeCartControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  iconButton: {
    padding: 2,
  },
  quantity: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
});

