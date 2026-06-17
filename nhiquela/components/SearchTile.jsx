import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectUserLocation } from '../features/locationSlice';
import { getDistance } from 'geolib';

const SearchTile = ({ item }) => {
  const navigation = useNavigation();

  // Compatibilidade com diferentes formas de passar o item
  const product = item.item ? item.item : item;

  const productName = product.nome || product.name || 'Produto sem nome';
  const supplierName = product.seller?.seller?.name || product.seller?.name || 'Fornecedor N/A';
  const imageUrl = product.image;
  
  const userLocation = useSelector(selectUserLocation);
  let distanceText = '';
  if (userLocation && (product.seller?.latitude || product.seller?.seller?.latitude)) {
      const prodLat = parseFloat(product.seller?.seller?.latitude || product.seller?.latitude);
      const prodLng = parseFloat(product.seller?.seller?.longitude || product.seller?.longitude);
      if (!isNaN(prodLat) && !isNaN(prodLng)) {
          const dist = getDistance(
              { latitude: userLocation.latitude, longitude: userLocation.longitude },
              { latitude: prodLat, longitude: prodLng }
          );
          distanceText = ` • ${(dist / 1000).toFixed(1)} km`;
      }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.container}
      onPress={() => navigation.navigate('ProductDetail', { item: product })}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.productImg}
        />
        {/* Badges Flutuantes */}
        <View style={styles.badgesContainer}>
            {product.onSale && (
                <View style={[styles.badge, styles.badgePromo]}>
                    <Text style={styles.badgeText}>Promoção</Text>
                </View>
            )}
        </View>
      </View>

      <View style={styles.textContainer}>
        {/* Fornecedor */}
        <View style={styles.supplierRow}>
            <Ionicons name="storefront-outline" size={12} color="#7F00FF" />
            <Text style={styles.supplier} numberOfLines={1}>
                 {' '}{supplierName}
                 <Text style={styles.distanceText}>{distanceText}</Text>
            </Text>
        </View>
        
        {/* Título */}
        <Text style={styles.productTitle} numberOfLines={2}>
          {productName}
        </Text>

        {/* Avaliações Simples (Opcional, se existir) */}
        {product.rating > 0 && (
            <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            </View>
        )}

        {/* Preços e Ações */}
        <View style={styles.priceRow}>
            <View>
                {product.onSale ? (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={styles.promoPrice}>{product.discount} MT</Text>
                        <Text style={styles.originalPrice}>{product.price} MT</Text>
                    </View>
                ) : (
                    <Text style={styles.price}>{product.price} MT</Text>
                )}
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ProductDetail', { item: product })}>
                <Ionicons name="cart-outline" size={18} color="#FFF" />
            </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default SearchTile;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
    marginHorizontal: 16,
    overflow: 'hidden', // Para a borda não passar o raio
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  imageContainer: {
    width: 100,
    height: 110,
    backgroundColor: '#F8F9FA',
    position: 'relative',
  },
  productImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgesContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePromo: {
    backgroundColor: '#FF3B30',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  textContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  supplier: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  distanceText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  promoPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FF3B30',
  },
  addBtn: {
    backgroundColor: '#7F00FF',
    padding: 6,
    borderRadius: 8,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  }
});