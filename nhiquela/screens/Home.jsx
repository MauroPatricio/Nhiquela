import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import SellersView from '../components/SellersView';
import ProductHomeView from '../components/ProductHomeView';
import style from './home.style';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { selectBasketItems } from '../features/basketSlice';
import { Welcome } from './Index';
import BottomSheetComponent from '../components/BottomSheetComponent';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Notifications from 'expo-notifications';
import FlashMessage, { showMessage } from "react-native-flash-message";
import NetInfo from '@react-native-community/netinfo';
import { io } from "socket.io-client";
import EstablishmentsView from '../components/EstablishmentsView1';
import { Linking } from 'react-native';

const socket = io(`${api}/products`);


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const bottomSheetRef = useRef(null);
  const items = useSelector(selectBasketItems);
  const navigation = useNavigation();
  const [userLogin,setUserLogin ] = useState(false);

  useEffect(() => {
    checkIfUserExist();
    fetchProductData();
    registerForPushNotificationsAsync();
    setupNotificationListeners();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProductData();
    }, [])
  );

  useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    fetchProductData();
  });

  return unsubscribe;
}, [navigation]);

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
        console.warn('⚠️ ID inconsistente entre userData e id');
      }
    } else {
      console.log('⚠️ Usuário não está logado');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar se o usuário existe:', error);
  }
};

  const registerForPushNotificationsAsync = async () => {
    if (!userData) return;
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
    const deviceToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    updatePushToken(userData._id, deviceToken);
  };

  const updatePushToken = async (userId, deviceToken) => {
    try {
      await api.patch(`/users/updateDeviceToken/${userId}`, { deviceToken: deviceToken });
    } catch (error) {
      console.error('Erro ao atualizar o PushToken:', error.message);
    }
  };

  const setupNotificationListeners = () => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      showMessage({
        message: "Novo pedido recebido",
        description: notification.request.content.body,
        type: "success",
        icon: "auto",
        duration: 3000,
      });
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const { extraData } = response.notification.request.content.data;
      if (extraData) {
        navigation.navigate('OrderDetail', { extraData });
      }
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        checkPendingNotifications();
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
      unsubscribe();
    };
  };

  const checkPendingNotifications = async () => {
    const pending = await Notifications.getPresentedNotificationsAsync();
    pending.forEach(notification => {
      showMessage({
        message: "Pedido pendente",
        description: notification.request.content.body,
        type: "info",
        icon: "auto",
        duration: 3000,
      });
    });
  };

  const fetchProductData = async () => {
    try {
      const response = await api.get('/products/bycategory');
      if (response.status === 200) {
        const data = response.data || [];
        const categories = data.categoriesWithProducts
          .filter(item => item.products && item.products.length > 0)
          .map(item => {
            const nome = item.category.nome || '';
            const title = nome.replace(/\(.*?\)/, '').trim();
            const description = nome.match(/\((.*?)\)/)?.[1] || '';
            return {
              _id: item.category._id,
              title,
              description,
              products: item.products,
            };
          });

        setFilteredCategories(categories);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    socket.on("newProduct", newProduct => {
      setFilteredCategories(prev => {
        const updated = [...prev];
        const index = updated.findIndex(cat => cat._id === newProduct.categoryId);
        if (index !== -1) {
          updated[index].products.unshift(newProduct);
        }
        return [...updated];
      });
    });
    return () => socket.off("newProduct");
  }, []);

 useEffect(() => {
  socket.on('storeStatusChanged', ({ sellerId, isOpen }) => {
    console.log('Loja atualizada:', sellerId, isOpen);
    fetchProductData(); // Atualize os produtos ao receber o evento
  });

  return () => socket.off('storeStatusChanged');
}, []);

  const handleCategorySelect = category => {
    if (category.products?.length) {
      setSelectedCategory(category);
      setBottomSheetOpen(true);
      bottomSheetRef.current?.expand();
    } else {
      showMessage({
        message: "Sem produtos",
        description: "Esta categoria não possui produtos disponíveis.",
        type: "info",
        icon: "auto",
        duration: 3000,
      });
    }
  };

  const handleCloseBottomSheet = () => {
    setBottomSheetOpen(false);
    bottomSheetRef.current?.close();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProductData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ backgroundColor: "white", flex: 1 }}>
      <View style={style.appBarWrapper}>
        <View style={style.appBar}>
          <Image source={require('../assets/default1.jpg')} style={style.cover} />
          <Text style={style.location}>{userData ? `Olá, ${userData.name}` : 'Faça login'}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <View style={style.cartCount}>
              <Text style={style.cartNumber}>{items.length}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
              <Ionicons name="cart-outline" size={35} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Welcome />

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7F00FF']} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {filteredCategories.map(category => (
            <TouchableOpacity key={category._id} style={styles.wrapper} onPress={() => handleCategorySelect(category)}>
              <Text style={styles.title}>{category.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <EstablishmentsView title='Tipos de Estabelecimentos' />
        <SellersView title='Fornecedores' description='Nossos fornecedores disponíveis para si' />

        {filteredCategories.map(category => (
          <ProductHomeView
            key={`producthomeview-${category._id}`}
            title={category.title}
            description={category.description}
            categoryid={category._id}
            products={category.products}
          />
        ))}

        <View style={{ marginBottom: 350 }} />
      </ScrollView>

      {selectedCategory && (
        <BottomSheetComponent isOpen={isBottomSheetOpen} toggleSheet={handleCloseBottomSheet}>
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>Produtos em {selectedCategory.title}</Text>
            {!!selectedCategory.description && (
              <Text style={styles.bottomSheetDescription}>{selectedCategory.description}</Text>
            )}
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedCategory.products.map(product => (
                <TouchableOpacity
                  key={product._id}
                  style={styles.productContainer}
                  onPress={() => navigation.navigate("ProductDetail", { item: { item: product } })}>
                  <View style={styles.productRow}>
                    <Image source={{ uri: product.image }} style={styles.logo} />
                    <Text style={styles.productBrand}>{product.name}</Text>
                    {product.discount ? (
    <Text style={styles.productPrice}>{product.discount} MT</Text>

) : (
  <Text style={styles.productPrice}>{product.price} MT</Text>
)} 
                 </View>
                </TouchableOpacity>
              ))}
              <View style={{ marginBottom: 210 }} />
            </ScrollView>
          </View>
        </BottomSheetComponent>
      )}

      <FlashMessage position="top" />
      {userData && <TouchableOpacity
              style={styles.whatsappButton}
              onPress={() => {
                Linking.openURL('https://wa.me/message/2HLEYV6VTD7BF1');
              }}
>
      <Ionicons name="logo-whatsapp" size={30} color="white" />
    </TouchableOpacity>}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomSheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    backgroundColor: '#fff',
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bottomSheetDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  productContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginVertical: 5,
    elevation: 2,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  productBrand: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F00FF',
  },
  wrapper: {
    marginRight: 3,
    backgroundColor: '#7F00FF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    // borderColor: '#4B0082',
    // borderWidth: 1,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.2,
    // shadowRadius: 5,
    // elevation: 5,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  whatsappButton: {
  position: 'absolute',
  bottom: 80,
  right: 20,
  backgroundColor: '#7F00FF',
  width: 60,
  height: 60,
  borderRadius: 30,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
  zIndex: 999,
},
});

export default Home;
