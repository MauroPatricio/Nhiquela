import { Image } from 'expo-image';
// components/ProductHomeView.js
import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getDistance } from 'geolib';
import { Ionicons } from '@expo/vector-icons';

const ProductHomeView = ({
  title,
  description,
  categoryid,
  products,
  loading = false,
  userLocation,
  onPress
}) => {
  const navigation = useNavigation();

  const renderProductItem = ({ item }) => {
    // A API retorna seller.location.lat/.lng com fallback para campos directos
    const sellerLat = parseFloat(
      item.seller?.location?.lat ?? item.seller?.latitude ?? item.seller?.seller?.latitude
    );
    const sellerLng = parseFloat(
      item.seller?.location?.lng ?? item.seller?.longitude ?? item.seller?.seller?.longitude
    );

    let distanceText = '';
    if (userLocation && !isNaN(sellerLat) && !isNaN(sellerLng)) {
      const dist = getDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: sellerLat, longitude: sellerLng }
      );
      distanceText = ` • ${(dist / 1000).toFixed(1)} km`;
    }

    const isSellerClosed = item.isSellerOpen === false ||
      item.seller?.status === 'inactive' ||
      item.seller?.status === 'suspended';

    const sellerName = item.sellerName || item.seller?.name || item.seller?.seller?.name || 'N/A';

    return (
      <TouchableOpacity
        style={[styles.productItem, isSellerClosed && { opacity: 0.9 }]}
        onPress={() => !isSellerClosed && navigation.navigate('ProductDetail', { item })}
        disabled={isSellerClosed}
        activeOpacity={0.85}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.productImage}
            contentFit="cover"
          />

          {/* Overlay Fechado */}
          {isSellerClosed && (
            <View style={styles.closedOverlay}>
              <Text style={styles.closedText}>Fechado</Text>
            </View>
          )}

          {/* Badge de promoção */}
          {item.discount > 0 && (
            <View style={styles.promoBadge}>
              <Text style={styles.promoText}>PROMO</Text>
            </View>
          )}

          {/* Badge de estoque/encomenda/digital */}
          {(() => {
            const type = String(item?.productType || '').toUpperCase().trim();
            const isDig = item?.isDigital;
            if (type === 'PHYSICAL') return null;
            if (type === 'DIGITAL' || isDig === true || isDig === 'true') {
              return (
                <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#9333EA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>⚡ Digital</Text>
                </View>
              );
            }
            return null;
          })()}
          {item.isOrdered ? (
            <View style={styles.badgeOrdered}>
              <Text style={styles.badgeText}>Por encomenda</Text>
              <Text style={styles.badgePeriodOrder}>{item.orderPeriod}</Text>
            </View>
          ) : item.countInStock > 0 ? (
            <View style={styles.badgeInStock}>
              <Text style={styles.badgeTextQ}>{item.countInStock} unidade(s)</Text>
            </View>
          ) : (
            <View style={styles.badgeOutOfStock}>
              <Text style={styles.badgeText}>Sem estoque</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.nome || item.name}
          </Text>

          {item.discount > 0 ? (
            <View style={styles.priceContainer}>
              <Text style={styles.originalPrice}>{item.price} MT</Text>
              <Text style={styles.discountPrice}>{item.discount} MT</Text>
            </View>
          ) : (
            <Text style={styles.productPrice}>{item.price} MT</Text>
          )}

          <View style={styles.extraInfo}>
            {/* Nome do Fornecedor */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="storefront-outline" size={10} color="#7F00FF" />
              <Text style={styles.infoTextB} numberOfLines={1}>{sellerName}</Text>
            </View>

            {/* Estado Fechado */}
            {isSellerClosed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                <Ionicons name="lock-closed-outline" size={10} color="#DC2626" />
                <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '700' }}>Loja fechada</Text>
              </View>
            )}

            <Text style={styles.infoText}>
              {item.province?.name || ''}
              <Text style={{ color: '#9CA3AF', fontWeight: 'bold' }}>{distanceText}</Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{title}</Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>
          <ActivityIndicator size="small" color="#7F00FF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductListByCategory', { title, categoryid })}
        >
          <Text style={styles.seeAll}>Ver tudo</Text>
        </TouchableOpacity>
      </View>

      {products && products.length > 0 ? (
        <FlatList
          horizontal
          data={products}
          keyExtractor={(item) => item._id.toString()}
          renderItem={renderProductItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhum produto disponível</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  seeAll: {
    color: '#7F00FF',
    fontWeight: '700',
    fontSize: 14,
  },
  productsList: {
    paddingBottom: 15,
    paddingLeft: 5,
  },
  productItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: 'grey',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
    marginRight: 12,
    width: 150,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 130,
    contentFit: 'cover',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  closedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  closedText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  promoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF3B30',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  promoText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#333',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7F00FF',
    marginBottom: 5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  originalPrice: {
    fontSize: 12,
    color: '#AAA',
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  extraInfo: {
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
    fontWeight: '900',
  },
  infoTextB: {
    fontSize: 12,
    color: '#7F00FF',
    lineHeight: 16,
    fontWeight: '900',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#AAA',
    fontSize: 14,
    fontStyle: 'italic',
  },
  badgeOrdered: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeInStock: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E0F7FA',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeOutOfStock: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'red',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  badgePeriodOrder: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'right',
  },
  badgeTextQ: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'black',
  },
});

export default ProductHomeView;
