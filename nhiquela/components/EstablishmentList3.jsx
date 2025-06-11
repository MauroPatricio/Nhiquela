import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../hooks/createConnectionApi';

const { width } = Dimensions.get('window');

const EstablishmentList = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { categoryid, tipoestabelecimentos = [] } = route.params || {};

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = async () => {
    if (loading || !hasMore || !categoryid) return;

    setLoading(true);
    try {
      const response = await api.get(`/products/bycategory/${categoryid}?page=${page}`);
      const data = response.data;
      setProducts((prev) => [...prev, ...data.products]);
      setHasMore(page < data.totalPages);
      setPage((prev) => prev + 1);
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

const renderItem = ({ item }) => (
<TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('SellersByEstablishment' , {
          id: item._id,
          name: item.nome,
          logo: item.logo,
          description: item.description,
          address: item.address,
          contact: item.phoneNumberAccount,
          openstore: item.openstore
        })}
    >
      <Image
        source={{ uri: item.img }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.nome}</Text>
        <Text style={styles.description}>
          {item.description?.length > 60
            ? item.description.slice(0, 60) + '...'
            : item.description}
        </Text>
      </View>
    </TouchableOpacity>  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name='chevron-back-circle' size={35} color="#7F00FF" />
        </TouchableOpacity>
        <Text style={styles.title}>Tipos de Estabelecimentos</Text>
      </View>

      {/* Lista de estabelecimentos */}
      <FlatList
        data={tipoestabelecimentos}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          loading ? <ActivityIndicator size="large" color="#7F00FF" /> : null
        }
      />
    </SafeAreaView>
  );
};

export default EstablishmentList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    marginBottom: 10,
    marginTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7F00FF',
    marginLeft: 10,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#7F00FF',
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
