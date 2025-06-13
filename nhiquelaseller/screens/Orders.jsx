import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const Orders = () => {
  const [userData, setUserData] = useState(null);
  const [ordersHistory, setOrdersHistory] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    checkIfUserExist();
  }, []);

  useEffect(() => {
    if (userData) {
      fetchData();
    }
  }, [userData]);

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
        return '#FFD700';
      case 'Em trânsito':
        return '#1E90FF';
      case 'Entregue':
        return '#32CD32';
      case 'Cancelado':
        return '#FF4500';
      default:
        return '#7F00FF';
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`orders/sellerview?seller=${userData._id}`, {
        headers: { authorization: `Bearer ${userData?.token}` },
      });

      if (response?.status === 200) {
        setOrdersHistory(response?.data?.orders);
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

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;

  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Histórico de Pedidos
        </Text>
        <View style={{ width: 28 }}></View>
      </View>

      {/* Loading Indicator */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#1E90FF" style={{ marginTop: 20 }}/>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {ordersHistory?.length > 0 ? ordersHistory?.map((order) => (
            <TouchableOpacity 
              key={order._id}
              style={styles.card}
              onPress={() => navigation.navigate('OrderDetail', { order })}
            >
              {/* Barra colorida mostrando o status */}
              <View style={[styles.statusBar, { backgroundColor: getStatusColor(order?.status) }]} />

              {/* Ícone do pedido */}
              <View style={styles.iconWrapper}>
                <Ionicons name="cart-outline" style={styles.cartIcon} />
              </View>

              {/* Detalhes do pedido */}
              <View style={styles.content}>
                <Text style={styles.code}>
                   Pedido #{order?.code}
                </Text>
                <Text style={styles.createAt}>
                   {formatDate(order?.createdAt)}
                </Text>
                <Text style={styles.price}>
                   {order?.totalPrice} MT
                </Text>
                <Text style={styles.status}>
                   {order?.status}
                </Text>
              </View>
            </TouchableOpacity>
          )) : <Text style={styles.empty}>
            Nenhum pedido encontrado.
          </Text>}
        </ScrollView>
      )}

    </SafeAreaView>
  )
}

export default Orders;

const styles = StyleSheet.create({  
  safe: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },
  header: {
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight:'bold',
    color: '#333',
  },
  scroll: {
    padding: 16,
  },
  card: {
    flexDirection:'row',
    alignItems:'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow:'hidden',
  },
  statusBar: {
    width: 6,
    height:'100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: 16,
  },
  iconWrapper: {
    backgroundColor: '#edf2ff',
    padding: 12,
    borderRadius: 50,
    marginRight: 16,
    alignItems:'center',
    justifyContent:'center',
  },
  cartIcon: {
    fontSize: 24,
    color: '#7F00FF',
  },
  content: {
    flex: 1,
  },
  code: {
    fontSize: 16,
    fontWeight:'bold',
    color: '#333',
    marginBottom: 4,
  },
  createAt: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  price: {
    fontSize: 15,
    color: '#7F00FF',
    fontWeight:'500',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: '#666',
    fontWeight:'500',
    textTransform:'capitalize',
  },
  empty: {
    textAlign:'center',
    color: '#555',
    marginTop: 20,
    fontSize: 16,
  }
}); 
