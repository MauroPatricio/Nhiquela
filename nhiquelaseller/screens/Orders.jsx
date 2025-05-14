import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const Orders = () => {
  const [userData, setUserData] = useState(null);
  const [ordersHistory, setOrdersHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(false); 
  const navigation = useNavigation();

  useEffect(() => {
    checkIfUserExist();
  }, []);

  useEffect(() => {
    if (userData) {
      fetchData();
    }
  }, [userData]);  

  // Refresh the orders when the screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (userData) {
        fetchData();
      }
    }, [userData])
  );
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
  const fetchData = async () => {
    setIsLoading(true); 
    try {
      const response = await api.get(`orders/sellerview?seller=${userData._id}`, {
        headers: { authorization: `Bearer ${userData.token}` },
      });

      if(response.status === 200) {
        setOrdersHistory(response.data.orders);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false); 
    }
  };

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
      console.error(error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  return (
    <SafeAreaView style={{ backgroundColor: "white",  flex:1 }}>
      <Text style={{ fontSize: 25, fontWeight: '700', marginLeft: 14, marginBottom: 40, color: '#7F00FF', marginTop: 30 }}>
        Histórico de pedidos
      </Text>
      <ScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 15,
        }}
      >
        {ordersHistory && ordersHistory.length > 0 ? (
          ordersHistory.map((product, index) => (
            <TouchableOpacity 
            key={`${product._id}-${index}`} 
            style={[styles.container, { backgroundColor: getStatusColor(product.status) }]} 
            onPress={() => navigation.navigate('OrderDetail', { order: product })}
          >
              <View>
                <Ionicons name="cart-outline" size={25} style={styles.cartIcon} />
              </View>
              <View>
                <Text style={styles.code}>{product.code}</Text>
              </View>
              <View>
                <Text style={styles.status}>{formatDate(product.createdAt)}</Text>
                <Text style={styles.status}>{product.totalPrice} MT</Text>
                <Text style={styles.status}>{product.status}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text>Não possui nenhum pedido disponível</Text>
        )}

        <View style={{ marginBottom: 210 }} />

       </ScrollView>
    </SafeAreaView>
  );
};

export default Orders;

const styles = StyleSheet.create({
  loadingContainer: {
    top: 100,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  wrapper: {
    backgroundColor: '#DCDCDC',
    padding: 10,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#7F00FF',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 10,
    padding: 7,
  },
  cartIcon: {
    color: '#7F00FF',
    padding: 20,
    borderRadius: 22,
    backgroundColor: 'white',
  },
  code: {
    fontWeight: '500',
    fontSize: 17,
    color: 'white',
    marginLeft: 10,
    textAlign: 'center',
    top: 20,
  },
  status: {
    fontWeight: '700',
    fontSize: 15,
    color: 'white',
    marginLeft: 10,
  },
  price: {
    fontSize: 15,
  },
});
