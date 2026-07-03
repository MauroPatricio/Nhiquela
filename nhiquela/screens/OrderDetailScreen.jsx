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
  const { params: { item, deliveryman } } = useRoute();
  const [currentOrder, setCurrentOrder] = useState(item);
  const [currentDeliveryMan, setDeliveryMan] = useState(deliveryman);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const navigation = useNavigation();
  const toast = useToast();

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['15%', '50%', '90%'], []);

  useEffect(() => {
    checkIfUserExist();
  }, []);

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
      const storedUserId = await AsyncStorage.getItem('id');

      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
          setUserLogin(true);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    }
  };

  const cancelOrderPop = async (orderId) => {
    try {
      if (!userData) throw new Error('User is not logged in');
      const { data } = await api.put(
        `/orders/${orderId}/cancel`,
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

      const { data } = await api.put(`/orders/${orderId}/deliver`, {}, {
        headers: { Authorization: `Bearer ${userData.token}` },
      });

      setCurrentOrder(data.order);

      await sendOrderNotificationToUser({
        userId: data.order.seller._id,
        orderId: data.order._id,
        orderCode: data.order.code,
        title: 'Pedido entregue com sucesso!',
        body: `O cliente confirmou a recepção do pedido nº ${data.order.code}.`,
        status: 'Confirmado',
      });

      toast.show('O fornecedor será notificado.', {
        type: 'success',
        placement: 'top',
        duration: 4000,
        animationType: 'slide-in',
      });
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
    Alert.alert('Confirmar Entrega', 'Confirmar entrega deste pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => confirmDelivery(orderId) },
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente': return '#F59E0B';
      case 'Em trânsito': return '#3B82F6';
      case 'Entregue': return '#10B981';
      case 'Cancelado': return '#EF4444';
      default: return '#6B7280';
    }
  };

  // Compute destination based on order type (store or service)
  const destination = currentOrder.deliveryAddress 
    ? { latitude: currentOrder.deliveryAddress.latitude, longitude: currentOrder.deliveryAddress.longitude }
    : (currentOrder.latitude ? { latitude: currentOrder.latitude, longitude: currentOrder.longitude } : null);

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
        <Text style={styles.totalPrice}>{currentOrder.totalPrice} Mt</Text>
      </View>

      <View style={styles.divider} />

      {/* Informações do Pedido */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalhes do Pagamento</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Método:</Text>
          <Text style={styles.infoValue}>{currentOrder.paymentMethod} ({currentOrder.isPaid ? 'Pago' : 'Pendente'})</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Taxa de Entrega:</Text>
          <Text style={styles.infoValue}>{currentOrder.addressPrice || currentOrder.deliveryPrice || 0} Mt</Text>
        </View>
      </View>

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
                <Text style={styles.driverSub}>
                  {currentOrder.deliveryman.transport_type} • {currentOrder.deliveryman.transport_registration}
                </Text>
              </View>
            </View>

            {/* Foto da Viatura */}
            {currentOrder.deliveryman.vihicle_picture && (
              <View style={styles.vehicleImageContainer}>
                <Text style={styles.vehicleLabel}>Foto da viatura:</Text>
                <Image 
                  source={{ uri: currentOrder.deliveryman.vihicle_picture }} 
                  style={styles.vehicleImage} 
                  contentFit="cover"
                />
              </View>
            )}
          </View>
        </View>
      )}

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
        {currentOrder.status === 'Em trânsito' && (
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
  }
});

export default OrderDetailsScreen;