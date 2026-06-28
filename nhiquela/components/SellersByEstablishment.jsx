import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator,
  Dimensions, Image, TouchableOpacity, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../hooks/createConnectionApi';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectUserLocation } from '../features/locationSlice';
import { getDistance } from 'geolib';

const { width } = Dimensions.get('window');

const SellersByEstablishment = () => {
  const route = useRoute();
  const { id } = route.params;
  const navigation = useNavigation();
  const userLocation = useSelector(selectUserLocation);

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

const fetchSellers = async (pageNum = page, isRefresh = false) => {
  if (loading || (!hasMore && !isRefresh)) return;

  setLoading(!isRefresh);
  try {
    const response = await api.get(`users/byestablishment/${id}?page=${pageNum}`);
    const data = response.data;

    const newSellers = data.users;
    
    setSellers(prevSellers => {
      const combinedSellers = isRefresh ? newSellers : [...prevSellers, ...newSellers];
      const uniqueSellersMap = new Map();
      combinedSellers.forEach((seller) => {
        uniqueSellersMap.set(seller._id, seller);
      });
      return Array.from(uniqueSellersMap.values());
    });

    setTotalPages(data.pages);
    setHasMore(pageNum < data.pages);
    setPage(pageNum + 1);
  } catch (error) {
    console.error("Erro ao buscar fornecedores:", error);
  } finally {
    setLoading(false);
    if (isRefresh) setRefreshing(false);
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSellers(1, true);
  };

  // Reset states quando o ID do estabelecimento mudar
  useEffect(() => {
    setSellers([]);
    setPage(1);
    setHasMore(true);
  }, [id]);

  useEffect(() => {
    if (page === 1) {
      fetchSellers();
    }
  }, [page]);

  const truncateDescription = (desc) =>
    desc?.length > 30 ? desc.substring(0, 30) + '...' : desc;

  const renderSeller = ({ item, index }) => {
    const {
      name,
      logo,
      description,
      rating,
      numReviews,
      province,
      address,
      latitude,
      longitude,
      isOpen, 
      tipoEstabelecimento
    } = item?.seller || {};

    const _id = item._id;

    let distanceText = '';
    if (userLocation && latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        const dist = getDistance(
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          { latitude: lat, longitude: lng }
        );
        distanceText = `${(dist / 1000).toFixed(1)} km`;
      }
    }

    return (
      <TouchableOpacity
        style={styles.sellerCard}
        onPress={() =>
          navigation.navigate('SellerScreen', {
            id: _id,
            name,
            logo,
            description,
            rating,
            numReviews,
            province,
            address,
            latitude,
            longitude,
            openstore: isOpen,
            tipoEstabelecimento
          })
        }
      >
        <Image source={{ uri: logo }} style={styles.sellerLogo} />
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerName}>{name}</Text>
          <Text style={styles.sellerDescription}>
            {truncateDescription(description || '')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 4, fontWeight: '500' }}>
              {distanceText ? `${distanceText} de si` : 'Distância Indisponível'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#E5E7EB" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name='chevron-back' size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Lista de Fornecedores</Text>
      </View>
      
      <FlatList
        data={sellers}
        renderItem={renderSeller}
        keyExtractor={(item, index) => item._id ? `${item._id}-${index}` : index.toString()}
        contentContainerStyle={styles.listContent}
        onEndReached={() => fetchSellers(page)}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={["#9333EA"]} // Android loading spinner color for refresh
        tintColor="#9333EA" // iOS loading spinner color for refresh
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#9333EA" /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum fornecedor encontrado</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default SellersByEstablishment;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Fundo mais premium
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  listContent: {
    paddingVertical: 10,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    elevation: 3,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sellerLogo: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: '#9333EA',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  sellerDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});