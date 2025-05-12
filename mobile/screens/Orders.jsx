import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native'
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons";

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

  return (
    <SafeAreaView style={{backgroundColor:'white', flex:1}}>
      <Text style={styles.title}>Meus Pedidos</Text>
      <ScrollView
        style={{ backgroundColor: "white" }}
        contentContainerStyle={{
          paddingHorizontal: 10,
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#E85A4F" />
        ) : orders.length > 0 ? (
          orders.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.container}
              onPress={() => {
              navigation.navigate('OrderDetailsScreen', { item });
              }}
            >
              <Ionicons name="cart-outline" size={25} style={styles.cartIcon} />
              <View>
                <Text style={styles.code}>{item.code}</Text>
              </View>
              <View>
                <Text style={styles.createAt}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.price}>{item.totalPrice} MT</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>Sem pedidos disponíveis.</Text>
        )}
        <View style={{ marginBottom: 210 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Orders;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#E85A4F',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 10,
    padding: 7,
  },
  title: {
    marginTop: 20,
    fontSize: 30,
    fontWeight: '700',
    padding: 15,
    color: '#E85A4F',
    marginBottom: 20
  },
  cartIcon: {
    color: '#E85A4F',
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


