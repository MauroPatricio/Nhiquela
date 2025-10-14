import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator,
  Dimensions, Image, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../hooks/createConnectionApi';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const SellersByEstablishment = () => {
  const route = useRoute();
  const { id } = route.params;
  const navigation = useNavigation();

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [existingIds, setExistingIds] = useState(new Set()); // Set para controle de IDs
const fetchSellers = async () => {
  if (loading || !hasMore) return;

  setLoading(true);
  try {
    const response = await api.get(`users/byestablishment/${id}?page=${page}`);
    const data = response.data;

    // Filtra apenas novos sellers que não estão no Set
    const uniqueNewSellers = data.users.filter(user => !existingIds.has(user._id));

    if (uniqueNewSellers.length > 0) {
      // Atualiza o Set com IDs novos
      const newIds = new Set([...existingIds, ...uniqueNewSellers.map(u => u._id)]);
      setExistingIds(newIds);

      // Adiciona apenas sellers únicos
      setSellers(prev => [...prev, ...uniqueNewSellers]);
    }

    setTotalPages(data.pages);
    setHasMore(page < data.pages);
    setPage(prev => prev + 1);
  } catch (error) {
    console.error("Erro ao buscar fornecedores:", error);
  } finally {
    setLoading(false);
  }
};

  // Reset states quando o ID do estabelecimento mudar
  useEffect(() => {
    setSellers([]);
    setPage(1);
    setExistingIds(new Set());
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
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.icons}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name='chevron-back-circle' size={35} style={styles.back} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Lista de Fornecedores</Text>
      
      <FlatList
        data={sellers}
        renderItem={renderSeller}
        keyExtractor={item => `${item._id}`} // Chave mais única
        contentContainerStyle={styles.listContent}
        onEndReached={fetchSellers}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#7F00FF" /> : null}
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
    backgroundColor: '#fff',
  },
  icons: {
    marginTop: 10,
    marginLeft: 10,
  },
  back: {
    color: '#7F00FF',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7F00FF',
    paddingLeft: 20,
    marginBottom: 10,
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