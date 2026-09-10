import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../hooks/createConnectionApi';
import {Ionicons, SimpleLineIcons, MaterialCommunityIcons, Fontisto  } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native';
import { Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { selectUserLocation } from '../features/locationSlice';
import { getDistance } from 'geolib';


const { width } = Dimensions.get('window');

const SellersList = () => {
  const navigation = useNavigation();
  const userLocation = useSelector(selectUserLocation);
  const [sellers, setSellers] = useState([]); // Store all fetched sellers
  const [loading, setLoading] = useState(false); // Loading state for data fetch
  const [refreshing, setRefreshing] = useState(false); // Refreshing state
  const [page, setPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(0); // Total pages available
  const [hasMore, setHasMore] = useState(true); // Flag to check if more sellers can be loaded

  // Fetch sellers from API with pagination
const fetchSellers = async (pageNum = page, isRefresh = false) => {
  if (loading || (!hasMore && !isRefresh)) return; // Evita múltiplas requisições

  setLoading(!isRefresh);

  try {
    const response = await api.get(`providers?type=BUSINESS&page=${pageNum}`);
    const data = response.data;

    const newSellers = data.providers;
    
    setSellers(prevSellers => {
      const combinedSellers = isRefresh ? newSellers : [...prevSellers, ...newSellers];
      const uniqueSellersMap = new Map();
      combinedSellers.forEach((seller) => {
        uniqueSellersMap.set(seller._id, seller);
      });
      return Array.from(uniqueSellersMap.values());
    });

    // Assume the backend returns pages or just use hasMore based on count
    const totalPagesCount = data.pages || Math.ceil(data.count / 10);
    setTotalPages(totalPagesCount);
    setHasMore(pageNum < totalPagesCount);
    setPage(pageNum + 1);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
    if (isRefresh) setRefreshing(false);
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSellers(1, true);
  };

  // Limit description length to 30 characters
  const truncateDescription = (description) => {
    if (!description) return '';
    return description.length > 30 ? description.substring(0, 30) + '...' : description;
  };

  // Initially load sellers
  useEffect(() => {
    fetchSellers();
  }, []);

  // Render each seller card
  const renderSeller = ({ item }) => {
    let distanceText = '';
    if (userLocation && item.location?.lat && item.location?.lng) {
      const lat = parseFloat(item.location.lat);
      const lng = parseFloat(item.location.lng);
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
      onPress={() => {
  
        const sellerDetails = item.userId?.seller || item.seller || {};
        const sellerUserId = item.userId?._id || item.userId || item._id;

        const name = sellerDetails.name || item.name;
        const address = sellerDetails.address || item.location?.address;
        const latitude = sellerDetails.latitude || item.location?.lat;
        const longitude = sellerDetails.longitude || item.location?.lng;
        const rating = sellerDetails.rating || item.rating;
        const numReviews = sellerDetails.numReviews || item.numReviews;
        const isOpen = sellerDetails.openstore === true || item.openstore === true || item.seller?.openstore === true;

        // Navigate to the SellerScreen with the seller's details
        navigation.navigate('SellerScreen', {
          id: sellerUserId, // Pass the correct User ID
          name,
          logo: sellerDetails.logo || item.logo,
          description: sellerDetails.description || item.description,
          rating,
          numReviews,
          address,
          latitude,
          longitude,
          openstore: isOpen,
          tipoEstabelecimento: item.categoryId,
          province: item.location?.province
        });
      }}
    >
      {/* Seller's Logo */}
      <Image source={{ uri: (item.userId?.seller?.logo || item.seller?.logo || item.logo || 'https://via.placeholder.com/65') }} style={styles.sellerLogo} />
      
      {/* Seller's Information */}
      <View style={styles.sellerInfo}>
        <Text style={styles.sellerName}>{item.userId?.seller?.name || item.seller?.name || item.name}</Text>
        <Text style={styles.sellerDescription}>
          {truncateDescription(item.userId?.seller?.description || item.seller?.description || item.description)}
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
      <View style={styles.icons}>
        <TouchableOpacity onPress={()=>navigation.goBack()}>
          <Ionicons name='chevron-back-circle' size={35} color="#9333EA" style={styles.back}/>
        </TouchableOpacity>
      </View>
     <Text style={styles.title}>Lista de Fornecedores</Text>

      <FlatList
        data={sellers}
        renderItem={renderSeller}
        keyExtractor={(item, index) => item._id ? `${item._id}-${index}` : index.toString()}
        contentContainerStyle={styles.listContent}
        onEndReached={() => fetchSellers(page)} // Trigger fetching more sellers when the user scrolls to the bottom
        onEndReachedThreshold={0.5} // Adjust the threshold to trigger loading earlier
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={["#9333EA"]} // Android loading spinner color for refresh
        tintColor="#9333EA" // iOS loading spinner color for refresh
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#9333EA" /> : null} // Show a loading spinner at the bottom
      />
    </SafeAreaView>
  );
};

export default SellersList;
const styles = StyleSheet.create({
   container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    paddingLeft: 20,
    marginBottom: 10,
    marginTop: 5,
  },
  listContent: {
    paddingVertical: 10,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 24,
    marginVertical: 10,
    marginHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sellerLogo: {
    width: 65,
    height: 65,
    borderRadius: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
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
  loadingSpinner: {
    marginVertical: 20,
  },
  });
  