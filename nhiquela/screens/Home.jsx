import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
import { Badge } from 'react-native-paper';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Notifications from 'expo-notifications';
import FlashMessage, { showMessage } from "react-native-flash-message";
import NetInfo from '@react-native-community/netinfo';
import { io } from "socket.io-client";

const socket = io(`${api}/products`); // Substitua pela URL do seu backend

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const bottomSheetRef = useRef(null);
  const items = useSelector(selectBasketItems);
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    checkIfUserExist();
    fetchData();
    fetchProductData();
    registerForPushNotificationsAsync();
    setupNotificationListeners();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      fetchProductData();
    }, [])
  );

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
  };

  const updatePushToken = async (userId, newPushToken) => {
    try {
      if (!userId) return;
      await api.patch(`/users/updatePushToken/${userId}`, { pushToken: newPushToken });
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

  const fetchData = async () => {
    try {
      const response = await api.get('/categories');
      if (response.status === 200) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProductData = async () => {
    try {
      const response = await api.get('/products/bycategory');
      if (response.status === 200) {
        const products = response.data || [];

        const categoriesMap = new Map();
      products.forEach(product => {
      const category = product.categoryDetails;
      if (category && category._id) {
        if (!categoriesMap.has(category._id)) {
          categoriesMap.set(category._id, {
            ...category,
            products: [],
          });
        }
        categoriesMap.get(category._id).products.push(product);
      }
});

        const categoriesWithProducts = Array.from(categoriesMap.values())
          .filter(category => category.products.length > 0);

        setCategories(categoriesWithProducts);
      }
    } catch (error) {
      console.error(error);
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

  useEffect(() => {
    fetchProductData(); // Carrega os produtos inicialmente

    // Escuta quando um novo produto for adicionado
    socket.on("newProduct", (newProduct) => {
      setProducts((prevProducts) => [newProduct, ...prevProducts]); // Adiciona à lista de produtos
    });

    return () => {
      socket.off("newProduct"); // Limpa o evento ao desmontar
    };
  }, []);

  const handleCategorySelect = (category) => {
    if (category.products && category.products.length > 0) {
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
    await fetchData();
    await fetchProductData();
    setRefreshing(false);
  };

  // Usando useMemo para evitar refazer o filtro a cada renderização
  const filteredCategories = useMemo(() => {
    return categories
      .filter((category) => category.products?.length > 0) // Remove categorias sem produtos
      .map(({ _id, nome, products }) => {
        const description = nome.match(/\((.*?)\)/)?.[1] || ''; // Extrai descrição
        const title = nome.replace(/\(.*?\)/, '').trim(); // Remove parênteses do título

        return {
          _id,
          title,
          description,
          products,
        };
      });
  }, [categories]);

  return (
    <SafeAreaView style={{ backgroundColor: "white" }}>
      <View style={style.appBarWrapper}>
        <View style={style.appBar}>
          <Image
            source={require('../assets/default1.jpg')}
            style={style.cover}
          />
          <Text style={style.location}>{userData ? `Olá, ${userData.name}` : 'Faça login'}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <View style={style.cartCount}>
              <Text style={style.cartNumber}>{items.length}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
              <Ionicons name="cart-outline" size={30} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Welcome />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7F00FF']}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 15,
          }}
        >
          {categories
            .sort((a, b) => {
              const titleA = a.nome.replace(/\(.*?\)/, '').trim().toUpperCase();
              const titleB = b.nome.replace(/\(.*?\)/, '').trim().toUpperCase();
              return titleA.localeCompare(titleB);
            })
            .map((category) => {
              const title = category.nome.replace(/\(.*?\)/, '').trim();
              return (
                <TouchableOpacity
                  key={category._id}
                  style={styles.wrapper}
                  onPress={() => handleCategorySelect(category)}
                >
                  <Text style={styles.title}>{title}</Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        <SellersView title='Fornecedores' description='Nossos fornecedores disponíveis para si' />

        {filteredCategories.map(({ _id, title, description, products }) => (
          <ProductHomeView
            key={`producthomeview-${_id}`}
            title={title}
            description={description}
            categoryid={_id}
            products={products}
          />
        ))}
        <View style={{ marginBottom: 250 }} />
      </ScrollView>

      {selectedCategory && selectedCategory.products && selectedCategory.products.length > 0 && (
        <BottomSheetComponent
          isOpen={isBottomSheetOpen}
          toggleSheet={handleCloseBottomSheet}
        >
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>Produtos em {selectedCategory.nome}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedCategory.products.map((product) => {
                const item = { item: product };
                return (
                  <TouchableOpacity
                    key={product._id}
                    style={styles.productContainer}
                    onPress={() => navigation.navigate("ProductDetail", { item })}
                  >
                    <View style={styles.productRow}>
                      <Image
                        source={{ uri: product.image }}
                        style={styles.logo}
                      />
                      <Text style={styles.productBrand}>{product.name}</Text>
                      <Text style={styles.productPrice}>{product.price} MT</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ marginBottom: 210 }} />
            </ScrollView>
          </View>
        </BottomSheetComponent>
      )}

      <FlashMessage position="top" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomSheetContent: {
    borderTopLeftRadius: 20,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
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
  wrapper: {
    marginRight: 10,
    backgroundColor: '#7F00FF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderColor: '#4B0082',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 10,
  },
  productBrand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F00FF',
  },
  cartCount: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cartNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  appBarWrapper: {
    backgroundColor: '#FFF',
    elevation: 5,
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  cover: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  location: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7F00FF',
    marginTop: 5,
    marginLeft: 10,
  },
});

export default Home;