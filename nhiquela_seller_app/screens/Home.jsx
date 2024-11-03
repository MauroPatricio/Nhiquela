import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import FlashMessage, { showMessage } from "react-native-flash-message";
import * as Notifications from 'expo-notifications';
import axios from 'axios';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Home = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null); 
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const updatePushToken = async (userId, newPushToken) => {
    try {
      if (!userId) return;
      await api.patch(`/users/updatePushToken/${userId}`, { pushToken: newPushToken });
    } catch (error) {
      console.error('Erro ao atualizar o PushToken:', error.message);
    }
  };
  
  const registerForPushNotificationsAsync = async () => {
    if (!userData) return;
    let token;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
 
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
 
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notifications!');
      return;
    }
 
    const projectId = "92c183ff-d0ca-4dc4-a4ce-e7c112be9ee0";
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await updatePushToken(userData._id, token);
    setExpoPushToken(token);
  };

  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      showMessage({
        message: "Novo pedido recebido",
        description: notification.request.content.body,
        type: "success",
        icon: "auto",
        duration: 3000,
      });
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { extraData } = response.notification.request.content.data;
      if (extraData) {
        navigation.navigate('OrderDetail', { extraData });
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const checkIfUserExist = async () => {
    const id = await AsyncStorage.getItem('id');
    if (!id) {
      navigation.navigate('Login');
      return;
    }

    const userId = `user${JSON.parse(id)}`;
    try {
      const currentUser = await AsyncStorage.getItem(userId);
      if (currentUser !== null) {
        setUserData(JSON.parse(currentUser));
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error(error);
      navigation.navigate('Login');
    }
  };

  useEffect(() => {
    checkIfUserExist();
  }, [navigation]);

  useEffect(() => {
    if (userData) fetchData();
  }, [userData]);

  const fetchData = async () => {
    if (!userData) return;
    try {
      const response = await api.get(`/orders/sellerview?seller=${userData._id}`, {
        headers: { authorization: `Bearer ${userData.token}` },
      });
      if (response.status === 200) {
        setOrders(response.data.orders);
        setAvailableStatuses(Array.from(new Set(response.data.orders.map(order => order.status))));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusSelect = (status) => setSelectedStatus(status);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const filteredOrders = selectedStatus ? orders.filter(order => order.status === selectedStatus) : orders;

  return (
    <SafeAreaView style={{ backgroundColor: "white", flex: 1, paddingLeft: 10, paddingRight: 10 }}>
      <View style={styles.appBarWrapper}>
        <View style={styles.appBar}>
          <Image source={require('../assets/default1.jpg')} style={styles.cover} />
          <Text>{userData ? `Olá, ${userData.name}` : 'Faça login'}</Text>
        </View>
        <Text style={{ paddingTop: 11, paddingBottom: 19, fontSize: 20, fontWeight: '500' }}>{userData?.seller?.name || ''}</Text>
      </View>

      <ScrollView>
        <Text style={{ fontSize: 25, fontWeight: '700', marginLeft: 20, marginBottom: 10, color: '#7F00FF' }}>Pedidos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {availableStatuses.map((status) => (
            <TouchableOpacity key={status} style={styles.wrapper} onPress={() => handleStatusSelect(status)}>
              <Text style={{ color: 'white', fontWeight: '700', margin: 1 }}>{status}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <TouchableOpacity key={order._id} style={styles.container} onPress={() => navigation.navigate('OrderDetail', { order })}>
              <View><Ionicons name="cart-outline" size={25} style={styles.cartIcon} /></View>
              <Text style={styles.code}>{order.code}</Text>
              <View>
                <Text style={styles.createAt}>{formatDate(order.createdAt)}</Text>
                <Text style={styles.price}>{order.totalPrice} MT</Text>  
                <Text style={styles.status}>{order.status}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyMessageContainer}>
            <Text style={styles.emptyMessage}>Não possui nenhum pedido de momento.</Text>
          </View>
        )}

        <FlashMessage position="top" /> 
        <View style={{ marginBottom: 250 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  wrapper: {
    marginRight: 7,
    backgroundColor: '#7F00FF',
    padding: 10,
    borderRadius: 15,
  },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 100,
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
