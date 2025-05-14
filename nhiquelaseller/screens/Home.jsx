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
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const filteredOrders = selectedStatus ? orders.filter(order => order.status === selectedStatus) : orders;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBarWrapper}>
        <Text style={styles.welcomeText('black', 30, 0)}><Text style={{ color: '#7F00FF' }}>Nhiquela</Text></Text>
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
    backgroundColor: '#F5F5F5',
  },
  appBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cover: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7F00FF',
    marginTop: 10,
  },
  storeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  storeStatusIndicator: {
    width: 18,
    height: 18,
    borderRadius: 20,
    marginRight: 2,
  },
  storeStatusText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7F00FF',
    marginBottom: 16,
  },
  statusScrollContainer: {
    paddingBottom: 10,
  },
  statusButton: {
    backgroundColor: '#7F00FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedStatusButton: {
    backgroundColor: '#5A00B3',
  },
  statusButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  orderIconContainer: {
    backgroundColor: '#7F00FF',
    borderRadius: 12,
    padding: 12,
  },
  cartIcon: {
    color: 'white',
  },
  orderDetails: {
    marginLeft: 16,
    flex: 1,
  },
  orderCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7F00FF',
    marginTop: 4,
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  emptyMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: '#888',
  },
  welcomeText: (color, size, top) => ({
    fontWeight: 'bold',
    fontSize: size,
    marginTop: top,
    paddingBottom: 10,
    color: color,
  }),
});