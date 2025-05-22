import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

const Orders = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true); // Initially true to show loader
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);

  const checkIfUserExist = async () => {
    const id = await AsyncStorage.getItem('id');
    const userId = `user${JSON.parse(id)}`;

    try {
      const currentUser = await AsyncStorage.getItem(userId);

      if (currentUser !== null) {
        const parseData = JSON.parse(currentUser);
        setUserData(parseData);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente':
        return '#FFD700'; // Amarelo
      case 'Em trânsito':
        return '#1E90FF'; // Azul
      case 'Entregue':
        return '#32CD32'; // Verde
      case 'Cancelado':
        return '#FF4500'; // Vermelho
      default:
        return '#7F00FF'; // Roxo padrão
    }
  };

  useEffect(() => {
    checkIfUserExist();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true); // Start loading when fetching data
      if (userData == null) return;

      const { data } = await api.get('/orders/mine', {
        headers: { Authorization: `Bearer ${userData.token}` },
      });

      setOrders(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false); // End loading after data is fetched or error occurs
    }
  };

  useEffect(() => {
    if (userData) {
      fetchData(); // Fetch data when userData is available
    }
  }, [userData]); // Depend on userData

  useFocusEffect(
    useCallback(() => {
      fetchData(); // Fetch new data when tab is focused
    }, [userData]) // Depend on userData
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month starts at 0
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: getStatusColor(item.status) }]}
      onPress={() => {
        navigation.navigate('OrderDetailsScreen', { item });
      }}
    >
      {/* Replace Ionicons with supplier image */}
      <Image
        source={{ uri: item?.seller?.seller?.logo }} // Assuming the image URL is available here
        style={styles.supplierImage}
      />
      <View>
        <Text style={styles.code}>{item?.seller?.seller?.name} - {item.code}</Text>
      </View>
      <View>
        <Text style={styles.createAt}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.price}>{item.totalPrice} Mt</Text>
        <Text style={styles.status}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ backgroundColor: 'white', flex: 1 }}>
      <Text style={styles.title}>Meus Pedidos</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#7F00FF" style={styles.loader} />
      ) : orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        />
      ) : (
        <Text style={styles.noOrdersText}>Sem pedidos disponíveis.</Text>
      )}
    </SafeAreaView>
  );
};

export default Orders;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Align items vertically in the center
    backgroundColor: '#7F00FF',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 10,
    padding: 10,
  },
  title: {
    marginTop: 20,
    fontSize: 30,
    fontWeight: '700',
    padding: 15,
    color: '#7F00FF',
    marginBottom: 20,
  },
  supplierImage: {
    width: 50,
    height: 50,
    borderRadius: 5, // Make it circular
    backgroundColor: 'white', // Fallback background color
  },
  code: {
    fontWeight: '500',
    fontSize: 17,
    color: 'white',
    marginLeft: 10,
    textAlign: 'center',
  },
  status: {
    fontWeight: '700',
    fontSize: 15,
    color: 'white',
    marginLeft: 10,
  },
  price: {
    color: 'white',
    fontSize: 15,
    marginLeft: 10,
  },
  createAt: {
    color: 'white',
    fontSize: 15,
    marginLeft: 10,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noOrdersText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#7F00FF',
  },
});