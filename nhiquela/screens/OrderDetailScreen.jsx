import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../hooks/createConnectionApi';
import { sendOrderNotificationToUser } from '../utils/notificationUtils';
import { useToast } from "react-native-toast-notifications";
import TrackingMap from '../components/TrackingMap';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';

const { width, height } = Dimensions.get('window');

const OrderDetailsScreen = () => {
  const route = useRoute();
  const params = route.params || {};
  const item = params.item;
  const deliveryman = params.deliveryman;
  
  const [currentOrder, setCurrentOrder] = useState(item);
  const [currentDeliveryMan, setDeliveryMan] = useState(deliveryman);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [showFinishConfirmationModal, setShowFinishConfirmationModal] = useState(false);
  const [showFinishSuccessModal, setShowFinishSuccessModal] = useState(false);
  const [isRequestService, setIsRequestService] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(!item);
  const navigation = useNavigation();
  const toast = useToast();

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['15%', '50%', '90%'], []);

  const [driverSpeed, setDriverSpeed] = useState(null);
  const [etaDistance, setEtaDistance] = useState(null);
  const [etaDuration, setEtaDuration] = useState(null);

  const handleUpdateTracking = useCallback(({ speed, distance, duration }) => {
    if (speed !== undefined) setDriverSpeed(speed);
    if (distance !== undefined) setEtaDistance(distance);
    if (duration !== undefined) setEtaDuration(duration);
  }, []);

  useEffect(() => {
    checkIfUserExist();
  }, []);

  const orderIdParam = params?.orderId || params?.item?._id;

  useEffect(() => {
    if (!currentOrder && orderIdParam) {
      fetchOrderDetails();
    } else {
      setLoadingOrder(false);
    }
  }, [orderIdParam]);

  useEffect(() => {
    if (currentOrder) {
      const isReq = !currentOrder.deliveryAddress;
      setIsRequestService(isReq);
    }
  }, [currentOrder]);

  const fetchOrderDetails = async () => {
    setLoadingOrder(true);
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      if (!token) return;

      const { data } = await api.get(`/request-service/${orderIdParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentOrder(data);
    } catch (e) {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const token = storedUserData ? JSON.parse(storedUserData).token : '';
        const { data } = await api.get(`/orders/${orderIdParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentOrder(data);
      } catch (e2) {
        console.error("Erro ao buscar pedido", e2);
      }
    } finally {
      setLoadingOrder(false);
    }
  };

  const checkIfUserExist = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permissão para acessar localização é necessária.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const storedUserData = await AsyncStorage.getItem('userData');

      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        setUserLogin(true);
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    }
  };

  const cancelOrderPop = async (orderId) => {
    try {
      if (!userData) throw new Error('User is not logged in');
      const endpoint = isRequestService 
        ? `/request-service/${orderId}/cancel` 
        : `/orders/${orderId}/cancel`;

      const { data } = await api.put(
        endpoint,
        { message },
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      setCurrentOrder(data.order);
      Alert.alert('Sucesso', 'Pedido cancelado com sucesso.');
    } catch (error) {
      console.error('Erro ao cancelar pedido', error);
      Alert.alert('Erro', 'Não foi possível cancelar o pedido.');
    } finally {
      setModalVisible(false);
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      if (!userData) throw new Error('User is not logged in');
      await api.delete(`/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${userData.token}` },
      });
      Alert.alert('Sucesso', 'Pedido apagado com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao apagar o pedido', error);
      Alert.alert('Erro', 'Não foi possível apagar o pedido.');
    }
  };

  const confirmDelivery = async (orderId) => {
    try {
      if (!userData) throw new Error('User is not logged in');

      const endpoint = isRequestService 
        ? `/request-service/${orderId}/deliver` 
        : `/orders/${orderId}/deliver`;

      const { data } = await api.put(endpoint, {}, {
        headers: { Authorization: `Bearer ${userData.token}` },
      });

      const finalOrder = data.order || {
        ...currentOrder,
        status: 'Finalizado',
        stepStatus: 6,
        isDelivered: true,
        deliveredAt: Date.now()
      };

      setCurrentOrder(finalOrder);

      if (finalOrder.seller?._id) {
        await sendOrderNotificationToUser({
          userId: finalOrder.seller._id,
          orderId: finalOrder._id,
          orderCode: finalOrder.code,
          title: 'Pedido entregue com sucesso!',
          body: `O cliente confirmou a recepção do pedido nº ${finalOrder.code}.`,
          status: 'Confirmado',
        });
      }

      setShowFinishSuccessModal(true);
    } catch (error) {
      console.error('Erro ao confirmar entrega', error);
      Alert.alert('Erro', 'Não foi possível confirmar a entrega.');
    }
  };

  const confirmDeleteOrder = (orderId) => {
    Alert.alert('Confirmar Exclusão', 'Deseja apagar este pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', onPress: () => deleteOrder(orderId) },
    ]);
  };

  const confirmDeliveryOrder = (orderId) => {
    setShowFinishConfirmationModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente': return '#F59E0B';
      case 'Aceite': return '#FCD34D';
      case 'Em trânsito': return '#3B82F6';
      case 'No destino indicado': return '#8B5CF6';
      case 'Entregue': return '#10B981';
      case 'Finalizado': return '#10B981';
      case 'Cancelado': return '#EF4444';
      default: return '#6B7280';
    }
  };

  // Compute destination based on order type (store or service)
  let destination = null;
  if (currentOrder) {
    if (currentOrder.stepStatus === 4) {
      // Motorista a caminho do local de recolha
      const lat = currentOrder.originDetails?.lat || currentOrder.seller?.latitude || currentOrder.originLocation?.latitude;
      const lng = currentOrder.originDetails?.lng || currentOrder.seller?.longitude || currentOrder.originLocation?.longitude;
      if (lat && lng) {
        destination = { latitude: Number(lat), longitude: Number(lng) };
      }
    } else {
      // Em transito (stepStatus 5)
      const lat = currentOrder.destinationDetails?.lat || currentOrder.deliveryAddress?.latitude || currentOrder.destinationLocation?.latitude || currentOrder.latitude;
      const lng = currentOrder.destinationDetails?.lng || currentOrder.deliveryAddress?.longitude || currentOrder.destinationLocation?.longitude || currentOrder.longitude;
      if (lat && lng) {
        destination = { latitude: Number(lat), longitude: Number(lng) };
      }
    }
  }

  if (loadingOrder || !currentOrder) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <ActivityIndicator size="large" color="#9333EA" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Carregando viagem...</Text>
      </View>
    );
  }

  const renderContent = () => (
    <View style={styles.sheetContent}>
      {/* Resumo Rápido para a aba inicial (15%) */}
      <View style={styles.quickSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.storeName}>
            {currentOrder.seller?.seller?.name || currentOrder.name || currentOrder.goodType || 'Serviço'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentOrder.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(currentOrder.status) }]}>{currentOrder.status}</Text>
          </View>
        </View>
        {currentOrder.totalPrice ? <Text style={styles.totalPrice}>{currentOrder.totalPrice} Mt</Text> : null}
      </View>

      <View style={styles.divider} />

      {/* Motorista e Veículo */}
      {currentOrder.deliveryman && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transporte</Text>
          
          <View style={styles.driverCard}>
            <View style={styles.driverRow}>
              <Image 
                source={{ uri: currentOrder.deliveryman.photo || 'https://via.placeholder.com/60' }} 
                style={styles.driverImage} 
              />
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{currentOrder.deliveryman.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>
                    {currentOrder.deliveryman.transport_type} • {currentOrder.deliveryman.transport_registration}
                  </Text>
                  {currentOrder.deliveryman.transport_color && (
                    <View style={{
                      width: 14, height: 14, borderRadius: 7, 
                      backgroundColor: (() => {
                        const c = currentOrder.deliveryman.transport_color.toLowerCase();
                        const map = { 'vermelho': 'red', 'azul': 'blue', 'verde': 'green', 'preto': 'black', 'branco': 'white', 'cinzento': 'gray', 'cinza': 'gray', 'amarelo': 'yellow', 'laranja': 'orange', 'castanho': 'brown', 'prata': 'silver', 'roxo': 'purple', 'rosa': 'pink', 'ouro': 'gold' };
                        return map[c] || c;
                      })(),
                      marginLeft: 8, borderWidth: 1, borderColor: '#D1D5DB'
                    }} />
                  )}
                </View>
              </View>
            </View>

            {/* Foto da Viatura */}
            {(currentOrder.deliveryman.vihicle_picture_front || currentOrder.deliveryman.vihicle_picture) && (
              <View style={styles.vehicleImageContainer}>
                <Text style={styles.vehicleLabel}>Foto da viatura:</Text>
                <Image 
                  source={{ uri: currentOrder.deliveryman.vihicle_picture_front || currentOrder.deliveryman.vihicle_picture }} 
                  style={styles.vehicleImage} 
                  contentFit="cover"
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Live Stats Container (Velocidade, Distância, Tempo) */}
      {(etaDistance !== null || driverSpeed !== null) && (
        <View style={styles.liveStatsContainer}>
          {etaDistance !== null && (
            <View style={styles.liveStatBox}>
              <Ionicons name="navigate-outline" size={22} color="#9333EA" />
              <Text style={styles.liveStatValue}>
                {etaDistance >= 1000 ? `${(etaDistance / 1000).toFixed(1)} km` : `${Math.round(etaDistance)} m`}
              </Text>
              <Text style={styles.liveStatLabel}>Distância</Text>
            </View>
          )}

          {etaDuration !== null && (
            <View style={styles.liveStatBox}>
              <Ionicons name="time-outline" size={22} color="#9333EA" />
              <Text style={styles.liveStatValue}>
                {etaDuration >= 60 ? `${Math.round(etaDuration / 60)} min` : `${Math.round(etaDuration)} s`}
              </Text>
              <Text style={styles.liveStatLabel}>Tempo de Chegada</Text>
            </View>
          )}

          {driverSpeed !== null && (
            <View style={styles.liveStatBox}>
              <Ionicons name="speedometer-outline" size={22} color="#9333EA" />
              <Text style={styles.liveStatValue}>
                {Math.round(driverSpeed)} km/h
              </Text>
              <Text style={styles.liveStatLabel}>Velocidade</Text>
            </View>
          )}
        </View>
      )}

      {/* Informações do Pedido */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalhes do Pagamento</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Método:</Text>
          <Text style={styles.infoValue}>{currentOrder.paymentMethod} ({currentOrder.isPaid ? 'Pago' : 'Pendente'})</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Taxa de Serviço:</Text>
          <Text style={styles.infoValue}>{currentOrder.addressPrice || currentOrder.deliveryPrice || 0} Mt</Text>
        </View>
      </View>

      {/* Produtos */}
      {currentOrder.orderItems && currentOrder.orderItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produtos ({currentOrder.orderItems.length})</Text>
          {currentOrder.orderItems.map((item, idx) => (
            <View key={idx} style={styles.productItem}>
              <Image source={{ uri: item.image }} style={styles.productImage} />
              <View style={styles.productDetails}>
                <Text style={styles.productName}>{item.nome}</Text>
                <Text style={styles.productQty}>Qtd: {item.quantity}</Text>
                <Text style={styles.productPriceItem}>{item.price} Mt</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Ações */}
      <View style={styles.actionsContainer}>
        {currentOrder.status === 'No destino indicado' && (
          <TouchableOpacity onPress={() => confirmDeliveryOrder(currentOrder._id)} style={styles.actionBtn}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.gradientBtn}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Confirmar Receção</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {currentOrder.status === 'Entregue' && (
          <TouchableOpacity onPress={() => confirmDeleteOrder(currentOrder._id)} style={styles.actionBtn}>
            <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.gradientBtn}>
              <Ionicons name="trash" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Apagar do Histórico</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Full Map Background */}
      <View style={styles.mapWrapper}>
        <TrackingMap 
          orderId={currentOrder._id}
          destination={destination}
          vehicleType={currentOrder.deliveryman?.transport_type}
          vehicleColor={currentOrder.deliveryman?.transport_color}
          onUpdateTracking={handleUpdateTracking}
          darkMode={false}
        />
      </View>

      {/* Back Button Overlay */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {renderContent()}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Modal de Cancelamento */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Motivo do cancelamento</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Descreva o motivo..."
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#EF4444' }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalBtnText}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#10B981' }]} onPress={() => cancelOrderPop(currentOrder._id)}>
                <Text style={styles.modalBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🏁 MODAL PREMIUM — CONFIRMAR ENTREGA (CLIENTE) */}
      <Modal
        visible={showFinishConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFinishConfirmationModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={[styles.premiumIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-done-circle-outline" size={44} color="#059669" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Confirmar Receção?</Text>
            
            <Text style={styles.premiumModalMessage}>
              Confirma que recebeu o seu pedido em conformidade? Esta ação finalizará a entrega e notificará o fornecedor.
            </Text>

            <View style={styles.premiumModalButtons}>
              <TouchableOpacity 
                style={styles.premiumCancelButton}
                activeOpacity={0.8}
                onPress={() => setShowFinishConfirmationModal(false)}
              >
                <Text style={styles.premiumCancelButtonText}>Voltar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.premiumConfirmButton}
                activeOpacity={0.85}
                onPress={() => {
                  setShowFinishConfirmationModal(false);
                  confirmDelivery(currentOrder._id);
                }}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.premiumConfirmGradient}
                >
                  <Text style={styles.premiumConfirmButtonText}>Confirmar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🎉 MODAL PREMIUM — ENTREGA CONCLUÍDA COM SUCESSO (CLIENTE) */}
      <Modal
        visible={showFinishSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="trophy" size={44} color="#059669" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Pedido Concluído! 🎉</Text>
            
            <Text style={styles.premiumModalMessage}>
              Obrigado por utilizar a Nhiquela
            </Text>

            <TouchableOpacity 
              style={{
                width: '100%',
                borderRadius: 16,
                overflow: 'hidden',
              }}
              activeOpacity={0.85}
              onPress={() => {
                setShowFinishSuccessModal(false);
                navigation.goBack();
              }}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumConfirmGradient}
              >
                <Text style={styles.premiumConfirmButtonText}>Voltar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sheetBackground: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  handleIndicator: {
    backgroundColor: '#ccc',
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  quickSummary: {
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#9333EA',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  driverCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#ddd',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  driverSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  vehicleImageContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  vehicleLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  vehicleImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  productItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  productQty: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  productPriceItem: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9333EA',
    marginTop: 2,
  },
  actionsContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  actionBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  gradientBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  liveStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  liveStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  liveStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 6,
  },
  liveStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  premiumModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 14,
  },
  premiumIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 12,
    textAlign: 'center',
  },
  premiumModalMessage: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  premiumConfirmButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumConfirmGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumConfirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  premiumModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  premiumCancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCancelButtonText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 15,
  }
});

export default OrderDetailsScreen;