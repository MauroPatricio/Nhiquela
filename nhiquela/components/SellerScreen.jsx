import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import React, { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../hooks/createConnectionApi';
import SellerProduct from './SellerProduct';
import BasketIcon from './BasketIcon';
import { useDispatch } from 'react-redux';
import { setSeller } from '../features/sellerSlice';
import { SafeMapView as MapView, SafeMarker as Marker } from './SafeMapView';
import * as Location from 'expo-location';
import { StarIcon } from 'react-native-heroicons/solid';

const SellerScreen = () => {
  const {
    params: {
      id,
      name,
      logo,
      description,
      rating,
      numReviews,
      province,
      address,
      latitude,
      longitude,
      openstore,
      tipoEstabelecimento
    },
  } = useRoute();

  const navigation = useNavigation();
  const sellerId = id;

  const [productsBySeller, setProductsBySeller] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [distance, setDistance] = useState('Calculando...');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setSeller({ id, name, logo, description, rating, numReviews, province, address, latitude, longitude }));
  }, []);

  useEffect(() => {
    const getUserLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permissão de localização negada');
        setDistance('Indisponível');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const userLat = location.coords.latitude;
      const userLon = location.coords.longitude;

      if (latitude && longitude) {
        setDistance(calculateDistance(userLat, userLon, parseFloat(latitude), parseFloat(longitude)) + ' km');
      } else {
        setDistance('Indisponível');
      }
    };

    getUserLocation();
  }, [latitude, longitude]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const fetchData = async (pageNum = 1, isRefresh = false) => {
    try {
      if (loading || (!hasMore && !isRefresh)) return;
      setLoading(!isRefresh);
      
      const response = await api.get(`/products?seller=${sellerId}&page=${pageNum}`);
      
      if (response.status === 200) {
        const newProducts = response.data.products || response.data;
        
        setProductsBySeller(prev => {
          const combined = isRefresh ? newProducts : [...(prev || []), ...newProducts];
          const uniqueMap = new Map();
          combined.forEach(p => uniqueMap.set(p._id, p));
          return Array.from(uniqueMap.values());
        });
        
        if (response.data.pages !== undefined) {
          setHasMore(pageNum < response.data.pages);
        } else {
          setHasMore(newProducts.length >= 10);
        }
        setPage(pageNum + 1);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchData(1, true);
    setRefreshing(false);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const renderHeader = () => (
    <>
      <Image source={{ uri: logo }} style={styles.logo} />

      <View style={styles.icons}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name='chevron-back' size={28} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.view}>
        <Text style={styles.sellerName}>{name}</Text>
        <Text style={styles.establish}>{tipoEstabelecimento?.nome}</Text>

        <View style={styles.ratingRowTop}>
          <View style={styles.ratingBadge}>
            <StarIcon color="#F59E0B" size={16} />
            <Text style={styles.ratingText}>{rating}</Text>
            <Text style={styles.reviewsText}>({numReviews} comentários)</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={14} color="#9333EA" />
            <Text style={styles.distanceBadgeText}>{distance}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: openstore ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[styles.statusText, { color: openstore ? '#059669' : '#DC2626' }]}>
              {openstore ? 'Estamos abertos' : 'Estamos fechados'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Endereço:</Text>
        <View style={styles.details}>
          <Ionicons name='location-outline' color="#9333EA" size={22} />
          <Text style={styles.addressText}>
            <Text style={{ fontWeight: '600', color: '#1F2937' }}>{province?.name}</Text> - {address}
          </Text>
        </View>

        <View style={styles.description}>
          <Text style={styles.sectionTitle}>Especialidade:</Text>
          <Text style={styles.descriptionText}>{description}</Text>
        </View>
      </View>

      <Text style={styles.title}>Nossos Produtos</Text>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <BasketIcon />

      <FlatList
        data={productsBySeller || []}
        keyExtractor={(item, index) => item._id ? `${item._id}-${index}` : index.toString()}
        ListHeaderComponent={renderHeader}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 10 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#9333EA"]} />
        }
        onEndReached={() => {
          if (hasMore && !loading) {
            fetchData(page);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && page > 1 ? <ActivityIndicator size="large" color="#9333EA" style={{ marginVertical: 20 }} /> : null
        }
        renderItem={({ item: product }) => (
          <SellerProduct
            id={product._id}
            nome={product.nome}
            name={product.name}
            image={product.image}
            images={product.images}
            description={product.description}
            rating={product.rating}
            numReviews={product.numReviews}
            province={product.province}
            address={product.address}
            priceFromSeller={product.priceFromSeller}
            price={product.price}
            onSale={product.onSale}
            countInStock={product.countInStock}
            seller={product.seller}
            sellerName={product.seller?.name}
            discount={product.discount}
            comissionPercentage={product.comissionPercentage}
            sellerEarningsAfterDiscount={product.sellerEarningsAfterDiscount}
            isSellerOpen={product.seller?.businessData?.isOpen || product.isSellerOpen}
            isOrdered={product.isOrdered}
            orderPeriod={product.orderPeriod}
          />
        )}
      />
    </View>
  );
};

export default SellerScreen;

const styles = StyleSheet.create({
  logo: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
  },
  icons: {
    position: 'absolute',
    top: 40,
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  view: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    marginTop: -30, // Sobrepõe a imagem
    marginHorizontal: 10,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  sellerName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  establish: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  distanceBadgeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#9333EA',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  addressText: {
    fontSize: 15,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  mapContainer: {
    marginTop: 15,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  map: {
    height: 150,
    width: '100%',
    borderRadius: 10,
  },
  description: {
    marginTop: 20,
  },
  descriptionText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginLeft: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  ratingRowTop: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  reviewsText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#92400E',
  },
  productView: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  padding:{
    paddingBottom:100
  }
});
