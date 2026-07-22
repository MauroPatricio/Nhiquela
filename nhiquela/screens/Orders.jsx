import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, ScrollView, Animated, Dimensions, Alert, Modal
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
  const [deleteModalId, setDeleteModalId] = useState(null);

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

  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const { data } = await api.get('/provider-subcategories');
        setSubcategories(data);
      } catch (error) {
        console.error('Erro ao buscar subcategorias', error);
      }
    };
    fetchSubcategories();
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

  const deleteOrder = (id) => {
    setDeleteModalId(id);
  };

  const confirmDeleteOrder = async () => {
    const id = deleteModalId;
    setDeleteModalId(null);
    try {
      await api.delete(`/orders/${id}`, {
        headers: { Authorization: `Bearer ${userData.token}` },
      });
      setOrders(prev => prev.filter(o => o._id !== id));
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível apagar o pedido.");
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

  const [currentTimes, setCurrentTimes] = useState({});
  useEffect(() => {
    let interval = setInterval(() => {
      if (orders && orders.length > 0) {
        const newTimes = {};
        const now = new Date().getTime();
        orders.forEach(order => {
          const isTripActive = order.status === 'No destino indicado' || 
                               order.status === 'Em Trânsito' || 
                               order.status === 'A Caminho do Destino' ||
                               order.stepStatus === 5;
          if (isTripActive && order.updatedAt) {
            const startTime = new Date(order.updatedAt).getTime();
            const diffInSeconds = Math.floor((now - startTime) / 1000);
            newTimes[order._id] = diffInSeconds > 0 ? diffInSeconds : 0;
          }
        });
        setCurrentTimes(newTimes);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [orders]);

  // Mapa de serviço -> ícone
  const getServiceIcon = (name) => {
    if (!name) return { icon: 'help-circle-outline', color: '#6B7280', bg: '#F3F4F6' };
    const n = name.toLowerCase();
    if (n.includes('reboque') || n.includes('tow'))      return { icon: 'tow-truck',                color: '#F59E0B', bg: '#FEF3C7' };
    if (n.includes('delivery') || n.includes('entrega')) return { icon: 'moped-outline',            color: '#10B981', bg: '#D1FAE5' };
    if (n.includes('mudança') || n.includes('mudanca'))  return { icon: 'truck-outline',            color: '#3B82F6', bg: '#DBEAFE' };
    if (n.includes('taxi') || n.includes('viagem'))      return { icon: 'car-outline',              color: '#8B5CF6', bg: '#EDE9FE' };
    if (n.includes('compras') || n.includes('shopping')) return { icon: 'shopping-outline',         color: '#EC4899', bg: '#FCE7F3' };
    if (n.includes('médico') || n.includes('medico') || n.includes('saúde')) 
      return { icon: 'medical-bag',                                                                  color: '#EF4444', bg: '#FEE2E2' };
    return { icon: 'cube-send',                                                                       color: '#9333EA', bg: '#F3E8FF' };
  };

  const renderItem = ({ item }) => {
    if (!item) return null;

    let timeMinutes = etas[item._id] || null;

    const sellerName = item?.seller?.seller?.name || item?.name || item?.goodType || 'Serviço';
    const sellerLogo = item?.seller?.seller?.logo || 'https://via.placeholder.com/60';
    const code = item?.code || '---';

    const serviceInfo = getServiceIcon(item.name);

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
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {/* Service Icon Badge */}
            <View style={{
              width: 48, height: 48, borderRadius: 16,
              backgroundColor: serviceInfo.bg,
              justifyContent: 'center', alignItems: 'center',
              marginRight: 12,
              shadowColor: serviceInfo.color,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 3,
            }}>
              <MaterialCommunityIcons name={serviceInfo.icon} size={26} color={serviceInfo.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderTitle} numberOfLines={1}>
                {item.name || sellerName}
              </Text>
              <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status ?? 'Pendente'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.priceRow}>
            <Text style={styles.orderCode}>Pedido: #{code}</Text>
            <Text style={styles.orderPrice}>{item.totalPrice ?? item.deliveryPrice ?? '---'} MT</Text>
          </View>

          {/* Início Histórico Origem e Destino */}
          {(item.originDetails || item.origin) && (
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <Ionicons name="location" size={16} color="#EF4444" />
                <Text style={styles.routeText} numberOfLines={2}>
                  {item.originDetails?.address || item.origin}
                </Text>
              </View>
              <Ionicons name="arrow-down" size={16} color="#9CA3AF" style={{ marginLeft: 2, marginVertical: 4 }} />
              <View style={styles.routePoint}>
                <Ionicons name="location" size={16} color="#10B981" />
                <Text style={styles.routeText} numberOfLines={2}>
                  {item.destinationDetails?.address || item.destination || '---'}
                </Text>
              </View>
            </View>
          )}
          {/* Fim Histórico Origem e Destino */}
          {item.deliveryman && item.deliveryman.name && (() => {
            const drv = item.deliveryman.deliveryman || item.deliveryman || {};
            const picPath = drv.vihicle_picture_front
              || drv.vihicle_picture
              || drv.vehicle_picture
              || drv.vihicle_picture_back
              || item.deliveryman.vihicle_picture_front
              || item.deliveryman.vihicle_picture
              || item.deliveryman.vehicle_picture
              || '';
            const baseUrl = api.defaults.baseURL.replace('/api', '');
            const vehicleUri = picPath
              ? (picPath.startsWith('http') || picPath.startsWith('data:image') ? picPath : picPath.startsWith('/') ? `${baseUrl}${picPath}` : `${baseUrl}/${picPath}`)
              : null;

            const colorMap = {
              branco: '#E5E7EB', preto: '#1F2937', vermelho: '#EF4444',
              azul: '#3B82F6', verde: '#10B981', amarelo: '#F59E0B',
              cinza: '#9CA3AF', cinzento: '#9CA3AF', laranja: '#F97316',
              rosa: '#EC4899', violeta: '#8B5CF6', castanho: '#92400E',
            };
            const colorHex = colorMap[(drv.transport_color || item.deliveryman.transport_color || '').toLowerCase()] || '#6B7280';
            const tColor = drv.transport_color || item.deliveryman.transport_color;
            const tType = drv.transport_type || item.deliveryman.transport_type;
            const tReg = drv.transport_registration || item.deliveryman.transport_registration;

            return (
              <View style={[styles.deliverymanContainer, { flexDirection: 'column', padding: 0, overflow: 'hidden' }]}>

                {/* Imagem da viatura */}
                {vehicleUri && (
                  <View style={{ width: '100%', height: 120, backgroundColor: '#F3F4F6', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
                    <Image source={{ uri: vehicleUri }} style={{ width: '100%', height: '100%', contentFit: 'cover' }} />
                    {tReg && (
                      <View style={{
                        position: 'absolute', bottom: 8, right: 8,
                        backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 8,
                        paddingHorizontal: 10, paddingVertical: 5,
                        flexDirection: 'row', alignItems: 'center'
                      }}>
                        <MaterialCommunityIcons name="card-text-outline" size={13} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>
                          {tReg}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Linha do motorista */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={{ uri: item.deliveryman.photo || 'https://via.placeholder.com/40' }}
                    style={styles.deliverymanPhoto}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deliverymanName}>{item.deliveryman.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 3 }}>
                      {tType && (
                        <Text style={[styles.deliverymanVehicle, { marginBottom: 0 }]} numberOfLines={1}>
                          🚗 {(() => {
                            const subcat = subcategories.find(s => s._id === tType || s.id === tType);
                            return subcat ? subcat.name : tType;
                          })()}
                        </Text>
                      )}
                      {tColor && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colorHex, marginRight: 5, borderWidth: 1, borderColor: '#E5E7EB' }} />
                          <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>{tColor}</Text>
                        </View>
                      )}
                      {/* Matrícula inline se não houver imagem da viatura */}
                      {!vehicleUri && tReg && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
                          <MaterialCommunityIcons name="card-text-outline" size={11} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 11, color: '#FFF', fontWeight: '800', letterSpacing: 0.8 }}>{tReg}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {currentTimes[item._id] !== undefined ? (
                    <Animated.View style={[styles.timeContainer, { opacity: blinkAnim }]}>
                      <Ionicons name="stopwatch-outline" size={14} color="#EF4444" />
                      <Text style={styles.timeText}>
                        {(() => {
                          const seconds = currentTimes[item._id];
                          const hrs = Math.floor(seconds / 3600);
                          const mins = Math.floor((seconds % 3600) / 60);
                          const secs = seconds % 60;
                          if (hrs > 0) return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                          return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                        })()}
                      </Text>
                    </Animated.View>
                  ) : timeMinutes !== null && item.status !== 'Entregue' && item.status !== 'Cancelado' ? (
                    <Animated.View style={[styles.timeContainer, { opacity: blinkAnim }]}>
                      <Ionicons name="navigate-outline" size={14} color="#EF4444" />
                      <Text style={styles.timeText}>{timeMinutes} min</Text>
                    </Animated.View>
                  ) : null}
                </View>

                {/* Alerta Motorista Chegou */}
                {(item.status === 'No destino indicado' || item.arrivedAtDestination) && item.status !== 'Finalizado' && item.status !== 'Cancelado' && item.status !== 'Concluído' && item.status !== 'Entregue' && (
                  <View style={{ 
                    marginTop: 12, 
                    backgroundColor: '#10B981', 
                    paddingVertical: 10, 
                    paddingHorizontal: 12, 
                    borderRadius: 8, 
                    flexDirection: 'row', 
                    alignItems: 'center' 
                  }}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                        O motorista chegou ao destino
                      </Text>
                      {currentTimes[item._id] !== undefined && (
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#FFF', marginTop: 2 }}>
                          Tempo de espera: {(() => {
                            const secs = currentTimes[item._id];
                            return `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;
                          })()}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

              </View>
            );
          })()}

          {['Entregue', 'Cancelado', 'Finalizado', 'Concluído', 'Motorista indisponível'].includes(item.status) && (
            <TouchableOpacity 
              onPress={() => deleteOrder(item._id)} 
              style={styles.deleteButton}

            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Remover Histórico</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Calculate stats for Dashboard
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => ['Entregue', 'Finalizado', 'Concluído'].includes(o.status)).length;
  const canceledOrders = orders.filter(o => o.status === 'Cancelado').length;
  const totalSpent = orders
    .filter(o => ['Entregue', 'Finalizado', 'Concluído'].includes(o.status))
    .reduce((acc, order) => acc + (Number(order.amount) || 0), 0);

  const renderDashboard = () => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 12 }}>Resumo (KPIs)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        
        <View style={{ width: '48%', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="documents-outline" size={18} color="#3B82F6" />
            <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 6, fontWeight: '600' }}>Total</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>{totalOrders}</Text>
        </View>

        <View style={{ width: '48%', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
            <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 6, fontWeight: '600' }}>Concluídos</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>{completedOrders}</Text>
        </View>

        <View style={{ width: '48%', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 6, fontWeight: '600' }}>Cancelados</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>{canceledOrders}</Text>
        </View>

        <View style={{ width: '48%', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="wallet-outline" size={18} color="#9333EA" />
            <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 6, fontWeight: '600' }}>Gasto (MT)</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>{totalSpent.toFixed(2)}</Text>
        </View>

      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 10, marginBottom: 8 }}>Histórico de Viagens</Text>
    </View>
  );

  return (
    <>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Top Header */}
      <LinearGradient
        colors={['#9333EA', '#7E22CE']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Meus Pedidos</Text>
      </LinearGradient>

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
          ListHeaderComponent={renderDashboard}
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

      {/* PREMIUM DELETE ORDER MODAL */}
      <Modal visible={deleteModalId !== null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            width: '100%',
            maxWidth: 340,
            padding: 28,
            alignItems: 'center',
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 12,
          }}>
            {/* Icon */}
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
              <Ionicons name="trash-outline" size={34} color="#EF4444" />
            </View>

            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 10, textAlign: 'center' }}>
              Remover Pedido
            </Text>

            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 28, lineHeight: 21 }}>
              Tem a certeza que deseja remover este pedido do seu histórico? Esta ação não pode ser desfeita.
            </Text>

            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                onPress={() => setDeleteModalId(null)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#4B5563' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 14,
                  backgroundColor: '#EF4444', alignItems: 'center',
                  shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
                }}
                onPress={confirmDeleteOrder}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Apagar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Orders;

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    backgroundColor: '#FAFAFA',
  },
  supplierLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCode: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  routeContainer: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E2E8F0',
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 6,
    flex: 1,
  },
  deliverymanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  deliverymanPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
  },
  deliverymanName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  deliverymanVehicle: {
    fontSize: 11,
    color: '#64748B',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
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
    borderRadius: 24,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  restrictedSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  loginBtnContainer: {
    width: '100%',
  },
  loginBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    width: '90%',
  },
  actionBtnContainer: {
    width: '100%',
  },
  actionBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

