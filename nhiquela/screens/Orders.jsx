import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, ScrollView, Animated, Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../hooks/createConnectionApi';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoute } from '../src/services/routingService';

const { width } = Dimensions.get('window');

const Orders = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [userLogin, setUserLogin] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const blinkAnim = useRef(new Animated.Value(1)).current;

  // Animação de piscar para o tempo estimado
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: false }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);
    } catch (error) {
      console.error(error);
    }
  };

  const checkIfUserExist = async () => {
    try {
      setIsLoading(true);
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');
      
      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
          setUserLogin(true);
          return; // fetchData será chamado pelo useEffect do userData
        }
      }
      setUserLogin(false);
      setIsLoading(false);
    } catch (error) {
      setUserLogin(false);
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente': return '#F59E0B'; // Amber
      case 'Em trânsito': return '#3B82F6'; // Blue
      case 'Entregue': return '#10B981'; // Green
      case 'Cancelado': return '#EF4444'; // Red
      default: return '#9333EA'; // Purple
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

  const fetchData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      if (!userData?.token) {
        setIsLoading(false);
        if (isRefresh) setRefreshing(false);
        return;
      }
      const { data } = await api.get('/orders/mine', {
        headers: { Authorization: `Bearer ${userData.token}` },
      });
      setOrders(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [userData]);

  useEffect(() => {
    checkIfUserExist();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userData) fetchData();
  }, [userData]);

  useFocusEffect(
    useCallback(() => {
      checkIfUserExist();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (userData) fetchData();
    }, [userData])
  );

  const [etas, setEtas] = useState({});

  useEffect(() => {
    const fetchEtas = async () => {
      if (!currentLocation || !orders || orders.length === 0) return;

      const newEtas = { ...etas };
      let updated = false;

      for (const item of orders) {
        if (
          (item.status === 'Pendente' || item.status === 'Em trânsito') &&
          item.deliveryAddress?.latitude &&
          item.deliveryAddress?.longitude &&
          !newEtas[item._id]
        ) {
          try {
            const result = await getRoute(
              currentLocation.latitude,
              currentLocation.longitude,
              item.deliveryAddress.latitude,
              item.deliveryAddress.longitude
            );
            if (result && result.durationMinutes) {
              newEtas[item._id] = Math.round(result.durationMinutes);
              updated = true;
            }
          } catch (error) {
            console.warn('Erro ao calcular ETA do pedido:', error);
          }
        }
      }

      if (updated) {
        setEtas(newEtas);
      }
    };

    fetchEtas();
  }, [orders, currentLocation]);

  const renderItem = ({ item }) => {
    if (!item) return null;

    let timeMinutes = etas[item._id] || null;

    const sellerName = item?.seller?.seller?.name || item?.goodType || 'Serviço';
    const sellerLogo = item?.seller?.seller?.logo || 'https://via.placeholder.com/60';
    const code = item?.code || '---';

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate('OrderDetailsScreen', {
            item: item,
            deliveryman: item.deliveryman,
          })
        }
      >
        {/* Indicador lateral de status */}
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />

        {/* Logo do Fornecedor */}
        <Image source={{ uri: sellerLogo }} style={styles.supplierLogo} />

        {/* Informações do pedido */}
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle} numberOfLines={1}>
            {sellerName}
          </Text>
          <Text style={styles.orderCode}>Código: {code}</Text>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.orderPrice}>{item.totalPrice ?? item.deliveryPrice ?? '---'} MT</Text>
          {item.deliveryman && item.deliveryman.transport_color && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="car-outline" size={14} color="#666" style={{ marginRight: 4 }} />
              <View style={{ 
                width: 10, height: 10, borderRadius: 5, marginRight: 4, borderWidth: 1, borderColor: '#ddd',
                backgroundColor: (() => {
                  const c = String(item.deliveryman.transport_color).toLowerCase().trim();
                  const map = {
                    'branco': '#F8FAFC', 'preto': '#000000', 'cinzento': '#9CA3AF', 'cinza': '#9CA3AF', 'prata': '#D1D5DB', 
                    'vermelho': '#EF4444', 'azul': '#3B82F6', 'verde': '#10B981', 'amarelo': '#F59E0B', 
                    'laranja': '#F97316', 'castanho': '#78350F', 'marrom': '#78350F', 'rosa': '#EC4899', 'roxo': '#8B5CF6'
                  };
                  return map[c] || '#D1D5DB';
                })()
              }} />
              <Text style={{ fontSize: 11, color: '#666' }}>{item.deliveryman.transport_type || 'Viatura'}</Text>
            </View>
          )}
        </View>

        {/* Status e tempo estimado na direita */}
        <View style={styles.rightColumn}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status ?? 'Pendente'}
            </Text>
          </View>
          
          {timeMinutes !== null && item.status !== 'Entregue' && item.status !== 'Cancelado' && (
            <Animated.View style={[styles.timeContainer, { opacity: blinkAnim }]}>
              <Ionicons name="time-outline" size={14} color="#EF4444" />
              <Text style={styles.timeText}>{timeMinutes} min</Text>
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Pedidos</Text>
        <View style={styles.headerDivider} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#9333EA" />
        </View>
      ) : !userLogin ? (
        /* Estado: Não Logado */
        <View style={styles.centerContainer}>
          <View style={styles.restrictedCard}>
            <MaterialCommunityIcons name="shield-lock-outline" size={54} color="#9CA3AF" />
            <Text style={styles.restrictedTitle}>Acesso Restrito</Text>
            <Text style={styles.restrictedSubtitle}>
              Inicie sessão para poder ver o histórico dos seus pedidos e acompanhar as suas entregas em tempo real.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
              style={styles.loginBtnContainer}
            >
              <LinearGradient
                colors={['#9333EA', '#7E22CE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtn}
              >
                <Text style={styles.loginBtnText}>Iniciar Sessão</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : orders.length > 0 ? (
        /* Lista de Pedidos */
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#9333EA"]}
          tintColor="#9333EA"
        />
      ) : (
        /* Estado: Lista Vazia */
        <View style={styles.centerContainer}>
          <View style={styles.emptyCircle}>
            <Ionicons name="document-text-outline" size={44} color="#9333EA" />
          </View>
          <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
          <Text style={styles.emptySubtitle}>
            Os seus pedidos e entregas aparecerão aqui assim que realizar a sua primeira compra ou solicitação de serviço.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Início')}
            activeOpacity={0.8}
            style={styles.actionBtnContainer}
          >
            <LinearGradient
              colors={['#9333EA', '#7E22CE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>Começar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Orders;

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerDivider: {
    width: 32,
    height: 3,
    backgroundColor: '#9333EA',
    borderRadius: 2,
    marginTop: 6,
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  statusIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  supplierLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginRight: 16,
    marginLeft: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  orderInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  orderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  orderCode: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9333EA',
    marginTop: 2,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 56,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  restrictedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 14,
    marginBottom: 6,
  },
  restrictedSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  loginBtnContainer: {
    width: '100%',
  },
  loginBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    width: '80%',
  },
  actionBtnContainer: {
    width: '80%',
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
