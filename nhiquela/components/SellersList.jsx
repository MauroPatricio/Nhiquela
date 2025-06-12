import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Dimensions, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../hooks/createConnectionApi';
import {Ionicons, SimpleLineIcons, MaterialCommunityIcons, Fontisto  } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native';
import { Pressable } from 'react-native';


const { width } = Dimensions.get('window');

const SellersList = () => {
  const navigation = useNavigation();
  const [sellers, setSellers] = useState([]); // Store all fetched sellers
  const [loading, setLoading] = useState(false); // Loading state for data fetch
  const [page, setPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(0); // Total pages available
  const [hasMore, setHasMore] = useState(true); // Flag to check if more sellers can be loaded

  // Fetch sellers from API with pagination
  const fetchSellers = async () => {
    if (loading || !hasMore) return; // Avoid multiple requests at once or loading when no more sellers

    setLoading(true);

    try {
      const response = await api.get(`users/sellers?page=${page}`);
      const data = await response.data;

      setSellers((prevSellers) => [...prevSellers, ...data.sellers]); // Append new sellers to the list
      setTotalPages(data.pages); // Set total number of pages
      setHasMore(page < data.pages); // Disable loading more if current page reaches total pages
      setPage((prevPage) => prevPage + 1); // Increment the page number for the next request
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Limit description length to 30 characters
  const truncateDescription = (description) => {
    return description.length > 30 ? description.substring(0, 30) + '...' : description;
  };

  // Initially load sellers
  useEffect(() => {
    fetchSellers();
  }, []);

  // Render each seller card
  const renderSeller = ({ item }) => (
    <TouchableOpacity 
      style={styles.sellerCard}  
      onPress={() => {
  
        const {
          _id,
          name,
          logo,
          description,
          rating,
          numReviews,
          province,
          address,
          latitude,
          longitude,
          openstore
        } = item.seller; // Destructure properties from item.seller
    
        // Navigate to the SellerScreen with the seller's details
        navigation.navigate('SellerScreen', {
          id: _id, // Pass the ID correctly
          name,
          logo,
          description,
          rating,
          numReviews,
          province, // Ensure province is the correct type expected by SellerScreen
          address,
          latitude,
          longitude,
          openstore
        });
      }}
    >
      {/* Seller's Logo */}
      <Image source={{ uri: item.seller.logo }} style={styles.sellerLogo} />
      
      {/* Seller's Information */}
      <View style={styles.sellerInfo}>
        <Text style={styles.sellerName}>{item.seller.name}</Text>
        <Text style={styles.sellerDescription}>
          {truncateDescription(item.seller.description)}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  

  return (
    <SafeAreaView style={styles.container}>
          <View style={styles.icons}>

<TouchableOpacity onPress={()=>navigation.goBack()}>
   <Ionicons name='chevron-back-circle' size={35} style={styles.back}/>
</TouchableOpacity>
</View>
     <Text style={styles.title}>Lista de Fornecedores</Text>

      <FlatList
        data={sellers}
        renderItem={renderSeller}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        onEndReached={fetchSellers} // Trigger fetching more sellers when the user scrolls to the bottom
        onEndReachedThreshold={0.5} // Adjust the threshold to trigger loading earlier
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#007BFF" /> : null} // Show a loading spinner at the bottom
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
    fontSize: 20,
    fontWeight: '600',
    color: '#7F00FF',
    paddingLeft: 20
  },
  listContent: {
    paddingVertical: 10,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sellerLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#7F00FF',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  