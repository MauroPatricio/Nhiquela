import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { selectBasketItems } from '../features/basketSlice';
import { Welcome } from './Index';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import style from './home.style'

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null); // Add state to track selected status
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      // Fetch the orders when the screen is focused
      filteredOrders
      fetchData
        }, [])
  );


  // Fetch Orders
  const fetchData = async () => {
    setIsLoading(true);

    try {
      if (userData == null) return;
      const response = await api.get(`/orders/sellerview?seller=${userData._id}`, {
        headers: { authorization: `Bearer ${userData.token}` },
      });

      console.log(response)
      if (response.status === 200) {
        setOrders(response.data.orders);
        const statuses = Array.from(new Set(response.data.orders.map(order => order.status)));
        setAvailableStatuses(statuses);
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

  const handleStatusSelect = (status) => {
    setSelectedStatus(status); // Set the selected status
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const filteredOrders = selectedStatus ? orders.filter(order => order.status === selectedStatus) : orders;

  return (
    <SafeAreaView style={{ backgroundColor: "white" , flex:1, paddingLeft:10, paddingRight: 10}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={style.appBarWrapper}>
        <View style={style.appBar}>
          <Image
            source={require('../assets/default1.jpg')}
            style={style.cover}
          />
          <Text style={style.location}>{userData ? `Olá, ${userData.name}` : 'Faça login'}</Text>

        </View>
          <Text style={{paddingTop:11, paddingBottom: 19, fontSize:20, fontWeight: '500'}}>{userData ? userData.seller.name: ''}</Text>
      </View>

      <Welcome />

      <ScrollView>
        <Text style={{ fontSize: 25, fontWeight: '700', marginLeft: 20, marginBottom: 10, color:'#7F00FF' }}>Pedidos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 15,
          }}
        >
          {availableStatuses?.map((status) => (
            <TouchableOpacity key={status} style={styles.wrapper} onPress={() => handleStatusSelect(status)}>
              <View>
                <Text style={{ color: 'white', fontWeight: '700', margin: 1 }}>{status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ marginBottom: 10 }} />

        {/* Verifique se filteredOrders tem pedidos */}
          {filteredOrders && filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <TouchableOpacity
                key={order._id}
                style={styles.container}
                onPress={() => navigation.navigate('OrderDetail', { order })}
              >
                <View>
                  <Ionicons name="cart-outline" size={25} style={styles.cartIcon} />
                </View>
                <View>
                  <Text style={styles.code}>{order.code}</Text>
                </View>
                <View>
                  <Text style={styles.createAt}>{formatDate(order.createdAt)}</Text>
                  <Text style={styles.price}>{order.totalPrice} MT</Text>
                  <Text style={styles.status}>{order.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            // Mostrar mensagem se não houver pedidos
            <View style={styles.emptyMessageContainer}>
              <Text style={styles.emptyMessage}>Não possui nenhum pedido de momento.</Text>
            </View>
          )}

        <View style={{ marginBottom: 250 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  wrapper: {
    letterSpacing: 1,
    marginRight: 7,
    backgroundColor: '#7F00FF',
    padding: 10,
    borderRadius: 15,
    
  },

  emptyMessage:{ 
    textAlign: 'center',
    marginTop: 100
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#7F00FF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 10,
    padding: 10,
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
    alignContent: 'center',
    alignItems: 'center',
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
    color: 'white',
    fontSize: 15,
    marginLeft: 10,
  },
  createAt: {
    color: 'white',
    fontSize: 15,
    marginLeft: 10,
  },
});
