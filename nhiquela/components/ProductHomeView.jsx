import { Image } from 'expo-image';
// components/ProductHomeView.js (atualizado)
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
  userLocation
}) => {
  const navigation = useNavigation();

const renderProductItem = ({ item }) => {
  let distanceText = '';
  if (userLocation && (item.seller?.latitude || item.seller?.seller?.latitude)) {
    const prodLat = parseFloat(item.seller?.seller?.latitude || item.seller?.latitude);
    const prodLng = parseFloat(item.seller?.seller?.longitude || item.seller?.longitude);
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
    style={styles.productItem}
    onPress={() => navigation.navigate('ProductDetail', { item })}
  >
    <View style={styles.imageContainer}>
      <Image 
        source={{ uri: item.image }} 
        style={styles.productImage}
        contentFit="cover"
      />

      {/* Badge de promoção */}
      {item.discount > 0 && (
        <View style={styles.promoBadge}>
          <Text style={styles.promoText}>PROMO</Text>
        </View>
      )}

      {/* Badge de estoque/encomenda */}
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
        <Text style={styles.infoTextB} numberOfLines={1}>Forn.: {item.sellerName || item.seller?.seller?.name || 'N/A'}</Text>
        <Text style={styles.infoText}>
          {item.province?.name || 'N/A'}
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
    // backgroundColor: '#F8F8F8',
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
  textAlign: 'right'
},
badgeTextQ: {
  fontSize: 10,
  fontWeight: 'bold',
  color: 'black',
},

});




export default ProductHomeView;

