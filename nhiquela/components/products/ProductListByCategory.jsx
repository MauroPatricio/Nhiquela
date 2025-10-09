import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
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

  const truncateText = (text, length) =>
    text.length > length ? `${text.substring(0, length)}...` : text;

  const fetchProducts = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const response = await api.get(`products/bycategory/${categoryid}?page=${page}`);
      const data = await response.data;

      setProducts((prev) => [...prev, ...data.products]);
      setTotalPages(data.totalPages);
      setHasMore(page < data.totalPages);
      setPage((prev) => prev + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryid]);

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => {
        if (item.isSellerOpen) {
          navigation.navigate('ProductDetail', { item });
        }
      }}
      disabled={!item.isSellerOpen}
    >
      <View style={styles.cardWrapper}>
        <Image source={{ uri: item.image }} style={styles.productImage} />

        {/* Overlay quando loja estiver fechada */}
        {!item.isSellerOpen && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Loja fechada</Text>
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{truncateText(item.name, 30)}</Text>
          <Text style={styles.productSeller}>{item.seller?.seller?.name || 'Fornecedor'}</Text>
          <Text style={styles.productPrice}>{`${item.price} MT`}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.icons}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back-circle" size={35} style={styles.back} />
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
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7F00FF',
    textAlign: 'center',
    marginVertical: 20,
  },
  productCard: {
    width: width * 0.95,
    marginVertical: 10,
    alignSelf: 'center',
  },
  cardWrapper: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: 'relative',
  },
  productImage: {
    width: 70,
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
    color: '#333',
  },
  productSeller: {
    fontSize: 16,
    color: '#6C757D',
  },
  productPrice: {
    fontSize: 16,
    color: '#7F00FF',
    fontWeight: '500',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  overlayText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
  },
  icons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: 10,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  back: {
    color: '#7F00FF',
  },
});
