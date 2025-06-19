import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ScrollView
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const Orders = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [userLogin, setUserLogin] = useState(false);

const checkIfUserExist = async () => {
  try {
    const storedUserData = await AsyncStorage.getItem('userData');
    const storedUserId = await AsyncStorage.getItem('id');

    if (storedUserData && storedUserId) {
      const parsedUserData = JSON.parse(storedUserData);

      if (parsedUserData._id === storedUserId) {
        setUserData(parsedUserData); 
        setUserLogin(true);
      } else {
        setIsLoading(false); // ✅ Para o loading se inconsistente
      }
    } else {
      console.log('⚠️ Usuário não está logado');
      setIsLoading(false); // ✅ Para o loading se não logado
    }
  } catch (error) {
    console.error('❌ Erro ao verificar se o usuário existe:', error);
    setIsLoading(false); // ✅ Garante parada mesmo em erro
  }
};


  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente': return '#FFD700';
      case 'Em trânsito': return '#1E90FF';
      case 'Entregue': return '#32CD32';
      case 'Cancelado': return '#FF4500';
      default: return '#7F00FF';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const fetchData = async () => {
  try {
    setIsLoading(true);
    if (!userData?.token) {
      setIsLoading(false); // ✅ Garante fim do loading
      return;
    }

    const { data } = await api.get('/orders/mine', {
      headers: { Authorization: `Bearer ${userData.token}` },
    });

    setOrders(data || []);

  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
     setIsLoading(false); // ✅ Garante parada mesmo em erro

  } finally {
    setIsLoading(false); // ✅ Sempre finaliza o loading
  }
};

  useEffect(() => {
    checkIfUserExist();
  }, []);

  useEffect(() => {
    if (userData) fetchData();
  }, [userData]);

  useFocusEffect(
    useCallback(() => {
      if (userData) fetchData();
    }, [userData])
  );

  const renderItem = ({ item }) => (
      <TouchableOpacity
    style={styles.container}
    onPress={() => navigation.navigate('OrderDetailsScreen', { item })}
  >
    {/* Barra lateral colorida */}
    <View
      style={[styles.statusBar, { backgroundColor: getStatusColor(item.status) }]}
    />

    {/* Conteúdo principal */}
    <Image
      source={{ uri: item?.seller?.seller?.logo }}
      style={styles.supplierImage}
    />
    <View style={{ flex: 1, marginLeft: 10 }}>
      <Text style={styles.code}>
        {item?.seller?.seller?.name} - {item.code}
      </Text>
      <Text style={styles.createAt}>{formatDate(item.createdAt)}</Text>
      <Text style={styles.price}>{item.totalPrice} Mt</Text>
      <Text style={styles.status}>{item.status}</Text>
    </View>
  </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <Text style={styles.title}>Meus Pedidos</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#7F00FF" style={styles.loader} />
      ) : orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.noOrdersText}>Sem pedidos disponíveis.</Text>
        </ScrollView>
      )}
      
      <View style={{ paddingBottom: 65 }} />
    </SafeAreaView>
  );
};

export default Orders;
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  statusBar: {
    width: 6,
    height: '100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingVertical: 15,
    color: '#7F00FF',
    textAlign: 'center',
  },
  supplierImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  code: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  createAt: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noOrdersText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#7F00FF',
    marginTop: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
