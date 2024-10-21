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
import FlashMessage, { showMessage } from "react-native-flash-message";

import style from './home.style'

import * as Notifications from 'expo-notifications';

import * as TaskManager from 'expo-task-manager';
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
  const [isLoading, setIsLoading] = useState(false);

  // useEffect(() => {
  //   if (userData) {
  //     fetchData();
  //   }
  //   checkIfUserExist();
  // }, [userData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      checkIfUserExist()

      fetchData();

    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      // Fetch the orders when the screen is focused
      filteredOrders
    }, [])
  );

  // const mostrarNotificacaoInApp = (mensagem) => {
  //   showMessage({
  //     message: "Novo pedido recebido",
  //     description: mensagem,
  //     type: "success", // You can customize this (success, info, warning, danger)
  //     icon: "auto", // Auto-detects or you can specify
  //     duration: 3000, // Duration for the banner to appear
  //   });
  // };

  const updatePushToken = async (userId, newPushToken) => {
    try {
      if(userId == null){
        return;
      }
      const response = await api.patch(`/users/updatePushToken/${userId}`, {
        pushToken: newPushToken,
      });
      // console.log('PushToken atualizado com sucesso:', response.data);
    } catch (error) {
      console.log(error)
      console.error('Erro ao atualizar o PushToken:', error.response ? error.response.data : error.message);
    }
  };
  
  async function registerForPushNotificationsAsync() {
    if (userData === null) return;
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

    // notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
    //   console.log(finalStatus)
    //   if (finalStatus === 'active') {
    //     // App is open, show an in-app notification or modal
    //     mostrarNotificacaoInApp(notification.request.content.body);
    //   } else {
    //     // App is in background, handle push notification
    //      mostrarNotificacao(notification.request.content.body);
    //     setNotification(notification);
    //   }
    // });
 
    projectId = "92c183ff-d0ca-4dc4-a4ce-e7c112be9ee0"
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    // console.log('Push Token:', token);
    await updatePushToken(userData._id, token);
    return token;
 }

let lastNotificationTime = null;

// const mostrarNotificacao = (mensagem) => {
//   const now = new Date();
//   if (!lastNotificationTime || (now - lastNotificationTime) > 5000) {
//     Notifications.scheduleNotificationAsync({
//       content: {
//         title: "Pedido de cliente recebido",
//         body: mensagem,
//         sound: true,
//       },
//       trigger: null, 
//     });
//     lastNotificationTime = now;
//   }
// };


useEffect(() => {
  
  registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

  // notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
  //   if (!notification || notification.request.content.body !== 'mensagem ja tratada') {
  //    // mostrarNotificacao(notification.request.content.body);
  //     setNotification(notification);
  //   }
  // });

  // Listener para quando o usuário clica ou interage com uma notificação
  responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
    console.log(response.notification.request.content.data)
    const { extraData } = response.notification.request.content.data;


    if (extraData) {
      // Navigate to the order details screen
      navigation.navigate('OrderDetail', { extraData });
    }
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener.current);
    Notifications.removeNotificationSubscription(responseListener.current);
  };
}, []);



  const navigation = useNavigation();





  // Fetch Orders
  const fetchData = async () => {
    setIsLoading(true);

    try {
      if (userData == null) return;
      const response = await api.get(`/orders/sellerview?seller=${userData._id}`, {
        headers: { authorization: `Bearer ${userData.token}` },
      });

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
    if (!id) {
      // Navigate to login screen if no user id found
      navigation.navigate('Login'); // Redirect to Login if not logged in
      return;
    }

    const userId = `user${JSON.parse(id)}`;
    try {
      const currentUser = await AsyncStorage.getItem(userId);
      if (currentUser !== null) {
        const parseData = JSON.parse(currentUser);
        setUserData(parseData);
      } else {
        navigation.navigate('Login'); // Redirect if user data is missing
      }
    } catch (error) {
      console.error(error);
      navigation.navigate('Login'); // Redirect on error
    }
  };

   // Redirect if user is not logged in
   useEffect(() => {

    checkIfUserExist();
  }, [navigation]);

  useEffect(() => {
    if (userData) {
      fetchData();
    }
  }, [userData]);


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
    <SafeAreaView style={{ backgroundColor: "white", flex: 1, paddingLeft: 10, paddingRight: 10 }}
   
    >
      <View style={style.appBarWrapper}>
        <View style={style.appBar}>
          <Image
            source={require('../assets/default1.jpg')}
            style={style.cover}
          />
          <Text>{userData ? `Olá, ${userData.name}` : 'Faça login'}</Text>

        </View>
        <Text style={{ paddingTop: 11, paddingBottom: 19, fontSize: 20, fontWeight: '500' }}>{userData ? userData.seller.name : ''}</Text>
      </View>

      <Welcome />

      <ScrollView>
        <Text style={{ fontSize: 25, fontWeight: '700', marginLeft: 20, marginBottom: 10, color: '#7F00FF' }}>Pedidos</Text>
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

      <FlashMessage position="top" /> 
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

  emptyMessage: {
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
