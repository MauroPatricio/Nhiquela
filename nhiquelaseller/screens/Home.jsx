import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import FlashMessage, { showMessage } from "react-native-flash-message";
import NetInfo from '@react-native-community/netinfo';

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
    const [userLogin,setUserLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const checkPendingNotifications = async () => {
    const pendingNotifications = await Notifications.getPresentedNotificationsAsync();
    if (pendingNotifications.length > 0) {
      pendingNotifications.forEach(notification => {
        showMessage({
          message: "Pedido pendente",
          description: notification.request.content.body,
          type: "info",
          icon: "auto",
          duration: 3000,
        });
      });
    }
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

    // Check for pending notifications when the app comes back online
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        checkPendingNotifications();
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
      unsubscribe();
    };
  }, []);

  // const checkIfUserExist = async () => {
  //   const id = await AsyncStorage.getItem('id');
  //   if (!id) {
  //     navigation.navigate('Login');
  //     return;
  //   }

  //   const userId = `user${JSON.parse(id)}`;
  //   try {
  //     const currentUser = await AsyncStorage.getItem(userId);
  //     if (currentUser !== null) {
  //       setUserData(JSON.parse(currentUser));
  //     } else {
  //       navigation.navigate('Login');
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     navigation.navigate('Login');
  //   }
  // };


  
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
        navigation.navigate('Login');

      }
    } else {
      setIsLoading(false); // ✅ Para o loading se não logado
      navigation.navigate('Login');

    }
  } catch (error) {
    setIsLoading(false); // ✅ Garante parada mesmo em erro
    navigation.navigate('Login');

  }
};


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

  useFocusEffect(
    useCallback(() => {
      checkIfUserExist().then(() => {
        if (userData) {
          fetchData();
        }
      });
    }, [userData])
  );

  // useFocusEffect(
  //   useCallback(() => {
  //     checkIfUserExist().then(() => {
  //       if (userData) {
  //         if (!userData.isApproved) {
  //           showMessage({
  //             message: "Acesso negado",
  //             description: "Você não está aprovado como vendedor.",
  //             type: "danger",
  //             icon: "auto",
  //             duration: 3000,
  //           });
  //           navigation.navigate('NewProduct'); // Ou redirecione para uma tela específica
  //         } else {
  //           fetchData();
  //         }
  //       }
  //     });
  //   }, [userData])
  // );

  const handleStatusSelect = (status) => setSelectedStatus(status);

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

  const filteredOrders = selectedStatus ? orders.filter(order => order.status === selectedStatus) : orders;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBarWrapper}>
        <Text style={styles.welcomeText('black', 30, 0)}><Text style={{ color: '#7F00FF' }}>Nhiquela+</Text></Text>
        <View style={styles.appBar}>
          <Image source={require('../assets/default1.jpg')} style={styles.cover} />
          <Text style={styles.greetingText}>{userData ? `Olá, ${userData?.name}` : 'Faça login'}</Text>
        </View>
        
        {userData?.seller && (
          <View style={styles.storeStatusContainer}>
            <View
              style={[
                styles.storeStatusIndicator,
                { backgroundColor: userData.seller.openstore ? '#4CAF50' : '#F44336' },
              ]}
            />
            <Text style={styles.storeStatusText}>
              {userData.seller.openstore ? 'Loja Aberta' : 'Loja Fechada'} - <Text style={styles.sellerName}>{userData?.seller?.name || ''}</Text>
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.sectionTitle}>Pedidos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScrollContainer}>
          {availableStatuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusButton, selectedStatus === status && styles.selectedStatusButton]}
              onPress={() => handleStatusSelect(status)}
            >
              <Text style={styles.statusButtonText}>{status}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order._id}
              style={styles.orderCard}
              onPress={() => navigation.navigate('OrderDetail', { order })}
            >
              <View style={styles.orderIconContainer}>
                <Ionicons name="cart-outline" size={25} style={styles.cartIcon} />
              </View>
              <View style={styles.orderDetails}>
                <Text style={styles.orderCode}>{order.code}</Text>
                <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                <Text style={styles.orderPrice}>{order.totalPrice} MT</Text>
                <Text style={styles.orderStatus}>{order.status}</Text>
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
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F9FAFB',
  },
  appBarWrapper: {
    paddingHorizontal: 20,
    paddingTop: 30,
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 3,
    borderColor: '#7F00FF',
  },
  greetingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
  },
  storeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: 10,
  },
  storeStatusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  storeStatusText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7F00FF',
    marginBottom: 20,
    marginLeft: 20,
  },
  statusScrollContainer: {
    paddingBottom: 20,
    paddingLeft: 20,
  },
  statusButton: {
    backgroundColor: '#E9D9FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginRight: 10,
  },
  selectedStatusButton: {
    backgroundColor: '#7F00FF',
  },
  statusButtonText: {
    color: '#334155',
    fontWeight: '500',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 20,
  },
  orderIconContainer: {
    backgroundColor: '#7F00FF',
    borderRadius: 18,
    padding: 15,
    marginRight: 20,
  },
  cartIcon: {
    color: 'white',
    fontSize: 30,
  },
  orderDetails: {
    flex: 1,
  },
  orderCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F00FF',
    marginBottom: 4,
  },
  orderStatus: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyMessageContainer: {
    marginTop: 100,
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  welcomeText: (color, size, top) => ({
    fontWeight: 'bold',
    fontSize: size,
    marginTop: top,
    paddingBottom: 10,
    color: color,
  })
});
