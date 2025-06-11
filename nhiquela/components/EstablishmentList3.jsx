import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import api from '../hooks/createConnectionApi';

const { width } = Dimensions.get('window');

const EstablishmentList = () => {
  const route = useRoute();
  const { img, nome, categoryid, tipoestabelecimentos = [] } = route.params || {};

  const [currentPage, setCurrentPage] = useState(0);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const handlePageChange = (event) => {
    const { position } = event.nativeEvent;
    setCurrentPage(position);
  };

  const fetchProducts = async () => {
    if (loading || !hasMore || !categoryid) return;

    setLoading(true);

    try {
      const response = await api.get(`/products/bycategory/${categoryid}?page=${page}`);
      const data = response.data;

      setProducts((prev) => [...prev, ...data.products]);
      setTotalPages(data.totalPages);
      setHasMore(page < data.totalPages);
      setPage((prevPage) => prevPage + 1);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setProducts([]);
    setHasMore(true);
    fetchProducts();
  }, [categoryid]);

  return (
    <SafeAreaView style={styles.container}>
      <PagerView
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageChange}
      >
        {tipoestabelecimentos.map((seller, index) => (
          <View style={styles.sellerCard} key={index}>
            <Text style={styles.sellerName}>{seller.img}</Text>
            <Text style={styles.sellerDescription}>{seller.nome}</Text>
            {/* Você pode adicionar os produtos do seller aqui, se quiser */}
          </View>
        ))}
      </PagerView>

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {tipoestabelecimentos.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.paginationDot,
              currentPage === index && styles.activeDot,
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

export default EstablishmentList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pagerView: {
    flex: 1,
    width: '100%',
  },
  sellerCard: {
    width: width * 0.9,
    padding: 20,
    margin: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sellerDescription: {
    fontSize: 14,
    color: '#666',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#007BFF',
  },
});
