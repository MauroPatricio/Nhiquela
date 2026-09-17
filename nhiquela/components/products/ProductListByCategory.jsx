import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
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

  const renderProduct = ({ item }) => {
    const isClosed = !item.isSellerOpen;
    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() => {
          if (!isClosed) navigation.navigate('ProductDetail', { item });
        }}
        activeOpacity={isClosed ? 1 : 0.8}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          {isClosed && (
            <View style={styles.closedOverlay}>
              <Text style={styles.closedText}>Indisponível</Text>
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <View style={styles.supplierRow}>
            <Ionicons name="storefront-outline" size={12} color="#7F00FF" />
            <Text style={styles.productSeller} numberOfLines={1}>
              {' '}{item.seller?.seller?.name || 'Fornecedor'}
            </Text>
          </View>
          <Text style={styles.productName} numberOfLines={2}>{item.name || item.nome}</Text>
          
          <View style={styles.priceRow}>
            {item.onSale ? (
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Text style={styles.promoPrice}>{item.discount} MT</Text>
                 <Text style={styles.originalPrice}>{item.price} MT</Text>
               </View>
            ) : (
               <Text style={styles.productPrice}>{item.price} MT</Text>
            )}
            
            {!isClosed && (
              <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ProductDetail', { item })}>
                <Ionicons name="cart-outline" size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginVertical: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  imageContainer: {
    width: 100,
    height: 110,
    backgroundColor: '#F8F9FA',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    contentFit: 'cover',
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedText: {
    backgroundColor: '#FF3B30',
    color: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
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
  productSeller: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F00FF',
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  promoPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FF3B30',
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textDecorationLine: 'line-through',
    marginLeft: 6,
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

