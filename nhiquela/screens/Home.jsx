// screens/Home.js (versão otimizada)
import api from '../hooks/createConnectionApi';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  RefreshControl, ActivityIndicator, FlatList, Linking,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import SellersView from '../components/SellersView';
import ProductHomeView from '../components/ProductHomeView';
import style from './home.style';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { selectBasketItems } from '../features/basketSlice';
import { setLocationSuccess, setLocationFailure, selectUserLocation } from '../features/locationSlice';
import { getDistance } from 'geolib';
import { Welcome } from './Index';
import BottomSheetComponent from '../components/BottomSheetComponent';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import FlashMessage, { showMessage } from "react-native-flash-message";
import NetInfo from '@react-native-community/netinfo';
import { io } from "socket.io-client";
import EstablishmentsView from '../components/EstablishmentsView1';
import OptimizedImage from '../components/OptimizedImage';
import useDebounce from '../hooks/useDebounce';
import useThrottle from '../hooks/useThrottle';

const { width } = Dimensions.get('window');
const isDev = process.env.NODE_ENV !== 'production';
const SOCKET_URL = typeof api === 'string' ? api : (api.defaults?.baseURL?.replace('/api', '') || (isDev ? 'http://192.168.0.5:5002' : 'https://deliveryshop.herokuapp.com'));
const socket = io(`${SOCKET_URL}/products`, { transports: ['websocket'] });

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Componente memoizado para item de produto
const ProductItem = React.memo(({ item, onPress, userLocation }) => {
  let distanceText = '';
  if (userLocation && (item.seller?.location?.lat || item.seller?.latitude || item.seller?.seller?.latitude)) {
    const prodLat = parseFloat(item.seller?.location?.lat || item.seller?.seller?.latitude || item.seller?.latitude);
    const prodLng = parseFloat(item.seller?.location?.lng || item.seller?.seller?.longitude || item.seller?.longitude);
    if (!isNaN(prodLat) && !isNaN(prodLng)) {
      const dist = getDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: prodLat, longitude: prodLng }
      );
      distanceText = ` • ${(dist / 1000).toFixed(1)} km`;
    }
  }

  return (
  <TouchableOpacity
    style={styles.productCard}
    onPress={() => onPress(item)}
  >
    <OptimizedImage 
      source={{ uri: item.image }} 
      style={styles.productImage}
    />
    <View style={styles.productDetails}>
      <Text style={styles.productName} numberOfLines={1}>
        {item.nome || item.name}
      </Text>
      <Text style={styles.productPrice}>
        {item.discount > 0 ? (
          <View style={styles.discountContainer}>
            <Text style={styles.originalPrice}>{item.price} MT</Text>
            <Text style={styles.discountPrice}>{item.discount} MT</Text>
          </View>
        ) : (
          `${item.price} MT`
        )}
      </Text>
      <Text style={[styles.productName, { fontSize: 11, color: '#9CA3AF', marginTop: 2 }]} numberOfLines={1}>
        <Ionicons name="location-outline" size={10} />{distanceText || ' Distância N/A'}
      </Text>
    </View>
  </TouchableOpacity>
)});

// Componente memoizado para item de categoria
const CategoryPill = React.memo(({ item, onPress }) => (
  <TouchableOpacity 
    style={styles.wrapper} 
    onPress={() => onPress(item)}
    testID={`category-pill-${item._id}`}
  >
    <Text style={styles.title}>{item.name}</Text>
    {(item.productCount > 0 || item.count > 0) && (
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {item.productCount || item.count || 0}
        </Text>
      </View>
    )}
  </TouchableOpacity>
));

// Componente memoizado para linha de produto no BottomSheet
const ProductRow = React.memo(({ item, onPress, userLocation }) => {
  let distanceText = '';
  if (userLocation && (item.seller?.location?.lat || item.seller?.latitude || item.seller?.seller?.latitude)) {
    const prodLat = parseFloat(item.seller?.location?.lat || item.seller?.seller?.latitude || item.seller?.latitude);
    const prodLng = parseFloat(item.seller?.location?.lng || item.seller?.seller?.longitude || item.seller?.longitude);
    if (!isNaN(prodLat) && !isNaN(prodLng)) {
      const dist = getDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: prodLat, longitude: prodLng }
      );
      distanceText = ` • ${(dist / 1000).toFixed(1)} km`;
    }
  }

  return (
  <TouchableOpacity
    style={styles.productContainer}
    onPress={() => onPress(item)}
  >
    <View style={styles.productRow}>
      <OptimizedImage 
        source={{ uri: item.image }} 
        style={styles.logo}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productBrand}>{item.nome || item.name}</Text>
        <Text style={styles.productPrice}>
          {item.discount > 0 ? (
            <View style={styles.rowDiscountContainer}>
              <Text style={styles.rowOriginalPrice}>{item.price} MT</Text>
              <Text style={styles.rowDiscountPrice}>{item.discount} MT</Text>
            </View>
          ) : (
            `${item.price} MT`
          )}
        </Text>
        <Text>Fornecedor: {item.seller?.name || item.seller?.seller?.name} <Text style={{ color: '#9CA3AF', fontWeight: 'bold' }}>{distanceText}</Text></Text>
      </View>
    </View>
  </TouchableOpacity>
)});

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingFeaturedProducts, setLoadingFeaturedProducts] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState({});
  const [loadingCategoryProducts, setLoadingCategoryProducts] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [catProducts, setCatProducts] = useState([]);
  const [catPage, setCatPage] = useState(1);
  const [catTotalPages, setCatTotalPages] = useState(1);
  const [loadingCatProducts, setLoadingCatProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  const fetchWalletBalance = async (token) => {
    try {
      const res = await api.get('/wallet/balance', {
        headers: { authorization: `Bearer ${token}` }
      });
      setWalletBalance(res.data.available_balance || 0);
    } catch (err) {
      console.log('Erro ao buscar saldo', err.message);
    }
  };

  const bottomSheetRef = useRef(null);
  const items = useSelector(selectBasketItems);
  const userLocation = useSelector(selectUserLocation);
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Memoizar dados para evitar recálculos desnecessários
  const memoizedCategories = useMemo(() => categories, [categories]);
  const memoizedFeaturedProducts = useMemo(() => featuredProducts, [featuredProducts]);

  // ------------------- EFEITOS INICIAIS -------------------
  useEffect(() => {
    checkIfUserExist();
    registerForPushNotificationsAsync();
    setupNotificationListeners();
    loadFeaturedProducts();
    requestUserLocation();
  }, []);

  const requestUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        dispatch(setLocationSuccess({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }));
      } else {
        dispatch(setLocationFailure('Permission denied'));
      }
    } catch (err) {
      dispatch(setLocationFailure(err.message));
    }
  };

  // Carrega/recupera categorias na volta do foco com cache
  useFocusEffect(
    useCallback(() => {
      let intervalId;
      const loadDataWithCache = async () => {
        try {
          // Tentar carregar do cache primeiro
          const cachedCategories = await AsyncStorage.getItem('cachedCategories');
          const cachedTimestamp = await AsyncStorage.getItem('cachedCategoriesTimestamp');
          
          const now = Date.now();
          const isCacheValid = cachedTimestamp && (now - parseInt(cachedTimestamp)) < 5 * 60 * 1000; // 5 minutos
          
          if (cachedCategories && isCacheValid) {
            const parsedCategories = JSON.parse(cachedCategories);
            setCategories(parsedCategories);
            
            // Carregar produtos para categorias que têm produtos
            parsedCategories.forEach(category => {
              if (category.productCount > 0) {
                loadCategoryProductsForHome(category._id);
              }
            });
          }
          
          // Sempre atualizar em background
          loadCategories(true);
          
          const storedUserData = await AsyncStorage.getItem('userData');
          if (storedUserData) {
            const parsedUser = JSON.parse(storedUserData);
            if (parsedUser && parsedUser.token) {
              fetchWalletBalance(parsedUser.token);
              // Sincronização em tempo real (polling)
              intervalId = setInterval(() => {
                fetchWalletBalance(parsedUser.token);
              }, 5000);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar cache:', error);
          loadCategories(true);
        }
      };
      
      loadDataWithCache();

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }, [])
  );

  // Debounce para evitar muitas chamadas ao socket
  const throttledNewProductHandler = useThrottle((newProduct) => {
    if (!newProduct?.category) return;
    
    setCategories(prev =>
      prev.map(c =>
        String(c._id) === String(newProduct.category)
          ? { ...c, count: (c.count || 0) + 1, productCount: (c.productCount || 0) + 1 }
          : c
      )
    );
    
    if (selectedCategory && String(selectedCategory._id) === String(newProduct.category)) {
      loadCategoryProducts(selectedCategory._id, 1, false);
    }
    
    setFeaturedProducts(prev => [newProduct, ...prev.slice(0, 19)]);
  }, 500);

  const throttledProductDeletedHandler = useThrottle(({ _id, category }) => {
    if (!category) return;
    
    setCategories(prev =>
      prev.map(c =>
        String(c._id) === String(category)
          ? { ...c, count: Math.max(0, (c.count || 1) - 1), productCount: Math.max(0, (c.productCount || 1) - 1) }
          : c
      )
    );
    
    if (selectedCategory && String(selectedCategory._id) === String(category)) {
      setCatProducts(prev => prev.filter(p => String(p._id) !== String(_id)));
    }
    
    setFeaturedProducts(prev => prev.filter(p => String(p._id) !== String(_id)));
  }, 500);

  // Sockets: atualiza contadores de categorias quando chega novo produto
  useEffect(() => {
    socket.on("newProduct", throttledNewProductHandler);
    socket.on("productDeleted", throttledProductDeletedHandler);
    socket.on("storeStatusChanged", () => {
      loadCategories(true);
    });

    return () => {
      socket.off("newProduct", throttledNewProductHandler);
      socket.off("productDeleted", throttledProductDeletedHandler);
      socket.off("storeStatusChanged");
    };
  }, [selectedCategory, throttledNewProductHandler, throttledProductDeletedHandler]);

  // ------------------- USER / PUSH -------------------
  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');

      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
          setUserLogin(true);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar usuário:', error);
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
      return;
    }

    const projectId = "7467ac64-89c0-432d-ae88-f427f7c65da9";
    const deviceToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    updatePushToken(userData._id, deviceToken);
  };

  const updatePushToken = async (userId, deviceToken) => {
    try {
      await api.patch(`/users/updateDeviceToken/${userId}`, { deviceToken });
    } catch (error) {
      console.error('Erro ao atualizar PushToken:', error.message);
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
    notificationListener.remove();
responseListener.remove();
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

  // ------------------- CATEGORIAS -------------------
  const loadCategories = async (replace = false) => {
    setLoadingCategories(true);
    try {
      const response = await api.get('/products/categoriesWithCount');

      
      const list = response.data?.categories || [];



      
      // Adiciona productCount se não existir (para compatibilidade)
      const categoriesWithCount = list.map(category => ({
        ...category,
        productCount: category.productCount || category.count || 0
      }));
      
      setCategories(replace ? categoriesWithCount : [...categories, ...categoriesWithCount]);
      
      // Salvar no cache
      await AsyncStorage.setItem('cachedCategories', JSON.stringify(categoriesWithCount));
      await AsyncStorage.setItem('cachedCategoriesTimestamp', Date.now().toString());
      
      // Carrega produtos para categorias que têm produtos
      categoriesWithCount.forEach(category => {
        if (category.productCount > 0) {
          loadCategoryProductsForHome(category._id);
        }
      });
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      showMessage({
        message: "Erro",
        description: "Não foi possível carregar as categorias",
        type: "danger",
      });
    } finally {
      setLoadingCategories(false);
      setRefreshing(false);
    }
  };

  // ------------------- PRODUTOS EM DESTAQUE -------------------
  const loadFeaturedProducts = async () => {
    setLoadingFeaturedProducts(true);
    try {
      // Usando a rota principal com filtros para produtos ativos
      const response = await api.get('/products?page=1&pageSize=20&order=newest');
      const products = response.data?.products || [];
      setFeaturedProducts(products);
    } catch (error) {
      console.error('Erro ao buscar produtos em destaque:', error);
    } finally {
      setLoadingFeaturedProducts(false);
    }
  };

  // ------------------- PRODUTOS POR CATEGORIA PARA HOME -------------------
  const loadCategoryProductsForHome = async (categoryId) => {
    if (loadingCategoryProducts[categoryId] || categoryProducts[categoryId]) return;
    
    setLoadingCategoryProducts(prev => ({ ...prev, [categoryId]: true }));
    
    try {
      const response = await api.get(`/products?category=${categoryId}&pageSize=5`);
      const products = response.data?.products || [];
      
      setCategoryProducts(prev => ({
        ...prev,
        [categoryId]: products
      }));
    } catch (error) {
      console.error(`Erro ao buscar produtos da categoria ${categoryId}:`, error);
    } finally {
      setLoadingCategoryProducts(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories(true);
    loadFeaturedProducts();
  };

  // ------------------- PRODUTOS DA CATEGORIA COM PAGINAÇÃO INFINITA -------------------
  const openCategory = (category) => {
    setSelectedCategory(category);
    setCatProducts([]);
    setCatPage(1);
    setCatTotalPages(1);
    setBottomSheetOpen(true);
    
    // Pequeno delay para garantir que o bottomsheet está aberto antes de carregar
    setTimeout(() => {
      bottomSheetRef.current?.expand?.();
      loadCategoryProducts(category._id, 1, false);
    }, 100);
  };

  const loadCategoryProducts = async (categoryId, page = 1, append = false) => {
    if (loadingCatProducts && !append) return;
        
    // Se for carregar mais produtos (scroll), usar loading diferente
    if (append) {
      setLoadingMoreProducts(true);
    } else {
      setLoadingCatProducts(true);
    }
    
    try {
      const response = await api.get(`/products/bycategory/${categoryId}?page=${page}&pageSize=20`);
      
      // Ajuste para a estrutura do seu backend
      const products = response.data?.products || [];
      const totalPages = response.data?.totalPages || response.data?.pages || 1;
      const currentPage = response.data?.currentPage || response.data?.page || page;
      
      setCatProducts(prev => {
        if (append) {
          // Evitar duplicatas ao fazer append
          const newProducts = products.filter(newProduct => 
            !prev.some(existingProduct => existingProduct._id === newProduct._id)
          );
          return [...prev, ...newProducts];
        } else {
          return products;
        }
      });
      
      setCatTotalPages(totalPages);
      setCatPage(currentPage);
    } catch (error) {
      console.error('Erro ao buscar produtos da categoria:', error);
      showMessage({
        message: "Erro",
        description: "Não foi possível carregar os produtos",
        type: "danger",
      });
    } finally {
      setLoadingCatProducts(false);
      setLoadingMoreProducts(false);
    }
  };

  // Debounce para evitar muitas chamadas durante scroll
  const debouncedLoadMore = useDebounce(loadMoreProducts, 300);

  const loadMoreProducts = () => {
    if (!selectedCategory || loadingMoreProducts || loadingCatProducts) return;
    if (catPage < catTotalPages) {
      loadCategoryProducts(selectedCategory._id, catPage + 1, true);
    }
  };

  // Função para renderizar o footer da lista com loading
  const renderFooter = () => {
    if (!loadingMoreProducts) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#7F00FF" />
        <Text style={styles.loadingText}>Carregando mais produtos...</Text>
      </View>
    );
  };

  // Handlers memoizados para evitar recriação
  const handleProductPress = useCallback((product) => {
    navigation.navigate("ProductDetail", { item: product });
  }, [navigation]);

  const handleCategoryPress = useCallback((category) => {
    openCategory(category);
  }, []);

  // ------------------- RENDER -------------------
  const renderCategoryPill = useCallback(({ item }) => (
    <CategoryPill item={item} onPress={handleCategoryPress} />
  ), [handleCategoryPress]);

  // Renderizar produto individual para featured
  const renderProductItem = useCallback(({ item }) => (
    <ProductItem item={item} onPress={handleProductPress} userLocation={userLocation} />
  ), [handleProductPress, userLocation]);

  // Renderizar bloco de categoria com produtos
  const renderCategoryBlock = useCallback(({ item }) => (
    <ProductHomeView
      key={`producthomeview-${item._id}`}
      title={item.name}
      description={`${item.productCount || item.count || 0} produtos disponíveis`}
      categoryid={item._id}
      products={categoryProducts[item._id] || []}
      onPress={() => handleCategoryPress(item)}
      productCount={item.productCount || item.count || 0}
      loading={loadingCategoryProducts[item._id]}
      userLocation={userLocation}
    />
  ), [categoryProducts, loadingCategoryProducts, handleCategoryPress]);

  const renderProductRow = useCallback(({ item }) => (
    <ProductRow item={item} onPress={handleProductPress} userLocation={userLocation} />
  ), [handleProductPress, userLocation]);

  // Renderizar seção de produtos em destaque
  const renderFeaturedProducts = () => (
    <View style={styles.featuredSection}>
      <Text style={styles.sectionTitle}>Produtos em Destaque</Text>
      {loadingFeaturedProducts ? (
        <ActivityIndicator size="small" color="#7F00FF" style={{ marginVertical: 20 }} />
      ) : (
        <FlatList
          horizontal
          data={memoizedFeaturedProducts}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderProductItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
          ListEmptyComponent={
            <View style={styles.emptyFeaturedContainer}>
              <Ionicons name="gift-outline" size={24} color="#9CA3AF" />
              <Text style={styles.emptyFeaturedText}>Sem destaques disponíveis de momento</Text>
            </View>
          }
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ backgroundColor: "white", flex: 1 }} testID="home-screen">
      {/* AppBar */}
      <View style={style.appBarWrapper}>
        <View style={style.appBar}>
          <View style={style.userInfoContainer}>
            <OptimizedImage source={require('../assets/nhiquela.png')} style={style.cover} resizeMode="contain" />
            <View style={style.textContainer}>
              <Text style={style.greetingText}>Olá, bem-vindo</Text>
              <Text style={style.location}>{userData ? userData.name : 'Faça login'}</Text>
            </View>
          </View>

          <View style={style.appBarRight}>
            <View style={{ backgroundColor: '#F3E8FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginRight: 10, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="wallet-outline" size={16} color="#7F00FF" style={{ marginRight: 5 }} />
              <Text style={{ color: '#7F00FF', fontWeight: 'bold', fontSize: 12 }}>{parseFloat(walletBalance).toFixed(2)} MT</Text>
            </View>

            <TouchableOpacity style={style.cartBtn} onPress={() => navigation.navigate('Cart')} activeOpacity={0.8}>
              <View style={style.cartCount}>
                <Text style={style.cartNumber}>{items.length}</Text>
              </View>
              <Ionicons name="basket-outline" size={24} color="#7F00FF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Welcome />

      {/* Lista principal com FlatList */}
      {loadingCategories ? (
        <ActivityIndicator size="large" color="#7F00FF" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={memoizedCategories}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderCategoryBlock}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7F00FF']} />
          }
          ListHeaderComponent={
            <>
              {/* Pílulas horizontais de categorias */}
              <FlatList
                horizontal
                data={memoizedCategories}
                keyExtractor={(item) => String(item._id)}
                renderItem={renderCategoryPill}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 8 }}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={5}
              />
              
              {/* Botão Upload Documento */}
              <TouchableOpacity 
                style={styles.documentUploadCard}
                onPress={() => navigation.navigate('DocumentUploadScreen')}
                activeOpacity={0.9}
              >
                <View style={styles.documentUploadContent}>
                  <Text style={styles.documentUploadTitle}>Tem uma lista de compras ou receita?</Text>
                  <Text style={styles.documentUploadDesc}>Faça upload e nós tratamos de tudo!</Text>
                </View>
                <Ionicons name="document-text" size={40} color="#FFF" style={{ opacity: 0.8 }} />
              </TouchableOpacity>

              {/* Produtos em Destaque */}
              {renderFeaturedProducts()}

              <EstablishmentsView title='Tipos de estabelecimentos' />
              <SellersView title='Fornecedores' description='Nossos fornecedores disponíveis para si' />
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cloud-offline-outline" size={56} color="#9CA3AF" style={{ marginBottom: 12 }} />
              <Text style={styles.empty}>Oops! Não conseguimos carregar as categorias de momento.</Text>
              <Text style={styles.emptySub}>Verifique a sua ligação à internet ou tente novamente.</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryButton} activeOpacity={0.8}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          }
          initialNumToRender={5}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}

      {/* BottomSheet com produtos paginados da categoria */}
<BottomSheetComponent
  isOpen={bottomSheetOpen}
  toggleSheet={() => {
    setBottomSheetOpen(false);
    bottomSheetRef.current?.close?.();
  }}
  ref={bottomSheetRef}
  height={600} // ← aumenta um pouco para melhor experiência
>
  <View style={styles.bottomSheetContent}>
    {/* Header do BottomSheet */}
    <View style={styles.bottomSheetHeader}>
      <Text style={styles.bottomSheetTitle}>
        Produtos em {selectedCategory?.name}
      </Text>
      <Text style={styles.productCountText}>
        {catProducts.length} de {selectedCategory?.productCount || selectedCategory?.count || 0} produtos
      </Text>

      {/* Botão de fechar fixo */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => {
          setBottomSheetOpen(false);
          bottomSheetRef.current?.close?.();
        }}
      >
        <Ionicons name="close" size={26} color="#fff" />
      </TouchableOpacity>
    </View>

    {/* Lista de produtos */}
    {loadingCatProducts && catProducts.length === 0 ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7F00FF" />
        <Text style={styles.loadingText}>Carregando produtos...</Text>
      </View>
    ) : (
      <FlatList
        data={catProducts}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderProductRow}
        onEndReached={debouncedLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loadingCatProducts && (
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>Nenhum produto nesta categoria.</Text>
            </View>
          )
        }
        contentContainerStyle={[
          { paddingBottom: 90 }, // espaço extra para o botão flutuante
          catProducts.length === 0 ? { flexGrow: 1 } : {}
        ]}
      />
    )}
  </View>
</BottomSheetComponent>

      <FlashMessage position="top" />

      {/* Botão do WhatsApp Oculto a pedido
      {userData && (
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() => Linking.openURL('https://wa.me/message/2HLEYV6VTD7BF1')}
        >
          <Ionicons name="logo-whatsapp" size={30} color="white" />
        </TouchableOpacity>
      )}
      */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  documentUploadCard: {
    backgroundColor: '#9333EA',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  documentUploadContent: {
    flex: 1,
    marginRight: 10,
  },
  documentUploadTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  documentUploadDesc: {
    color: '#E9D5FF',
    fontSize: 13,
  },
  // Estilos para produtos em destaque
  featuredSection: {
    marginVertical: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  featuredList: {
    paddingBottom: 10,
  },
  productCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 15,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productImage: {
    width: '100%',
    height: 150,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#9333EA',
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F00FF',
  },
  addButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#7F00FF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },

  // Estilos para o BottomSheet
  bottomSheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 5,
    backgroundColor: '#fff',
    flex: 1,
  },
 closeButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  backgroundColor: '#7F00FF',
  borderRadius: 20,
  width: 36,
  height: 36,
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 3,
  zIndex: 10,
},
bottomSheetHeader: {
  marginBottom: 16,
  alignItems: 'center',
  paddingTop: 15,
  paddingHorizontal: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},

  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#7F00FF',
  },
  productCountText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Estilos para lista de produtos
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
    gap: 12,
  },
  productInfo: {
    flex: 1,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  productBrand: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rowDiscountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowOriginalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  rowDiscountPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F00FF',
  },

  // Estilos para categorias
  wrapper: {
    marginRight: 10,
    backgroundColor: '#F9F5FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9333EA',
  },
  countBadge: {
    backgroundColor: '#9333EA',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Estilos gerais
  emptyContainer: {
    paddingVertical: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  empty: {
    textAlign: 'center',
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 22,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#7F00FF',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  retryText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyFeaturedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    width: width - 40,
    height: 100,
    gap: 10,
    marginVertical: 10,
  },
  emptyFeaturedText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  whatsappButton: {
    position: 'absolute',
    bottom: 160, // Aumentado bastante para criar um espaçamento limpo entre o menu e o botão
    right: 20,
    backgroundColor: '#25D366', // Cor oficial do WhatsApp para maior reconhecimento (ou #9333EA se preferir manter o tema)
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingText: {
    color: '#7F00FF',
    fontSize: 14,
    marginTop: 10,
  },
});

export default Home;