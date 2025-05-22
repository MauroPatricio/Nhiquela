import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import api from '../../hooks/createConnectionApi';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ProductListByCategory = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { title, categoryid } = route.params;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const truncateText = (text, length) => {
    return text.length > length ? `${text.substring(0, length)}...` : text;
  };

  // Fetch products by category from API with pagination
  const fetchProducts = async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    try {
      const response = await api.get(`products/bycategory/${categoryid}?page=${page}`);
      const data = await response.data;

      setProducts((prevProducts) => [...prevProducts, ...data.products]); // Append new products to the list
      setTotalPages(data.totalPages);
      setHasMore(page < data.totalPages); // Disable loading more if current page reaches total pages
      setPage((prevPage) => prevPage + 1); // Increment page for next fetch
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products when component mounts and when categoryid changes
  useEffect(() => {
    fetchProducts();
  }, [categoryid]);

  // Render a single product item
  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { item })}
    >
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
      <Text style={styles.productName}>{truncateText(item.name, 30)}</Text>
      <Text style={styles.productSeller}>{`${item.seller.seller.name}`}</Text>
        <Text style={styles.productPrice}>{`${item.price} MT`}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.icons}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name='chevron-back-circle' size={35} style={styles.back} />
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>{`Categoria: ${title}`}</Text>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id.toString()}
        onEndReached={fetchProducts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#7F00FF" /> : null}
      />
    </SafeAreaView>
  );
};

export default ProductListByCategory;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white', // Light background for contrast
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7F00FF', // Main color for title
    textAlign: 'center',
    marginVertical: 20,
  },
  productCard: {
    flexDirection: 'row',
    width: width * 0.95,
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#FFFFFF', // White background for cards
    borderRadius: 15,
    alignSelf: 'center',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  productImage: {
    width: 70, // Slightly larger image for visibility
    height: 70,
    borderRadius: 12,
    marginRight: 15,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333', // Dark text for product name
  },
  productPrice: {
    fontSize: 16,
    color: '#7F00FF', // Green color for price
    fontWeight: '500'
  },
  productSeller: {
    fontSize: 16, // Size for seller name
    color: '#6C757D', // Grey color for seller
  },
  icons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  back: {
    color: '#7F00FF', // Color for the back icon
  },
});
