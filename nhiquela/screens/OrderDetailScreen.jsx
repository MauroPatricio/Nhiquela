import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../hooks/createConnectionApi';
import { sendOrderNotificationToUser } from '../utils/notificationUtils';
import Toast from 'react-native-toast-message';
import TripMap from "../components/TripMap";
import TripControls from '../components/TripControls';

const { width, height } = Dimensions.get('window');

const OrderDetailsScreen = () => {
  const { params: { item } } = useRoute();
  const [currentOrder, setCurrentOrder] = useState(item);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [canFinishTrip, setCanFinishTrip] = useState(false);
  const [routeDrawn, setRouteDrawn] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const navigation = useNavigation();

  // Animações para o bottom sheet
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(new Animated.Value(120)).current;
  const mapScale = useRef(new Animated.Value(1)).current;

  // Configurar PanResponder para o sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sheetHeight.setValue(Math.max(120, 500 - gestureState.dy));
        } else {
          sheetHeight.setValue(Math.min(600, 120 - gestureState.dy));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          collapseSheet();
        } else if (gestureState.dy < -50) {
          expandSheet();
        } else {
          if (isSheetExpanded) {
            expandSheet();
          } else {
            collapseSheet();
          }
        }
      },
    })
  ).current;

  const expandSheet = () => {
    setIsSheetExpanded(true);
    Animated.parallel([
      Animated.timing(sheetHeight, {
        toValue: 600,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(mapScale, {
        toValue: 0.75,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const collapseSheet = () => {
    setIsSheetExpanded(false);
    Animated.parallel([
      Animated.timing(sheetHeight, {
        toValue: 120,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(mapScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const toggleSheet = () => {
    if (isSheetExpanded) {
      collapseSheet();
    } else {
      expandSheet();
    }
  };

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
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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

      Toast.show({
        type: 'success',
        text1: 'Confirmação de Recepção',
        text2: 'O fornecedor será notificado.',
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

  const handleCancelTrip = () => {
    Alert.alert('Cancelar Viagem', 'Deseja cancelar a viagem?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim', onPress: () => console.log('Viagem cancelada') },
    ]);
  };

  const handleFinishTrip = () => {
    Alert.alert('Finalizar Viagem', 'Deseja finalizar a viagem?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim', onPress: () => console.log('Viagem finalizada') },
    ]);
  };

  // Renderizar informações compactas quando o sheet estiver recolhido
  const renderCompactInfo = () => (
    <View style={styles.compactInfo}>
      <View style={styles.compactMain}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>#{currentOrder.code}</Text>
        </View>
        <View style={styles.compactTexts}>
          <Text style={styles.compactStore}>{currentOrder.seller?.seller?.name || 'Loja'}</Text>
          <Text style={styles.compactStatus}>{currentOrder.status}</Text>
        </View>
      </View>
      <View style={styles.compactPrice}>
        <Text style={styles.compactPriceText}>{currentOrder.totalPrice} Mt</Text>
        <Text style={styles.compactItems}>{currentOrder.orderItems?.length || 0} itens</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Pedido</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Mapa - Ocupa quase toda a tela */}
      <Animated.View style={[styles.mapContainer, { transform: [{ scale: mapScale }] }]}>
        {currentLocation && (
          <TripMap
            origin={currentLocation}
            destination={{
              latitude: currentLocation.latitude + 0.005,
              longitude: currentLocation.longitude + 0.005,
            }}
            onRouteReady={() => {
              setRouteDrawn(true);
              setCanFinishTrip(true);
            }}
          />
        )}
      </Animated.View>

      {/* Bottom Sheet Premium */}
      <Animated.View 
        style={[
          styles.sheetContainer,
          { 
            height: sheetHeight,
          }
        ]}
        {...panResponder.panHandlers}
      >
        {/* Handle do Sheet */}
        <View style={styles.sheetHandle}>
          <View style={styles.handleBar} />
        </View>

        {/* Conteúdo quando RECOLHIDO */}
        <View style={styles.compactContent}>
          {renderCompactInfo()}
          
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={toggleSheet}
          >
            <Ionicons 
              name={isSheetExpanded ? "chevron-down" : "chevron-up"} 
              size={20} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>

        {/* Conteúdo quando EXPANDIDO */}
        <Animated.View 
          style={[
            styles.expandedContent,
            {
              opacity: sheetAnim,
              display: isSheetExpanded ? 'flex' : 'none'
            }
          ]}
        >
          <ScrollView 
            style={styles.expandedScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.expandedScrollContent}
          >
            {/* Informações do Pedido */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informações do Pedido</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={[styles.infoValue, styles[`status${currentOrder.status}`]]}>
                    {currentOrder.status}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Pagamento</Text>
                  <Text style={styles.infoValue}>
                    {currentOrder.paymentMethod} - {currentOrder.isPaid ? 'Pago' : 'Pendente'}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Taxa de entrega</Text>
                  <Text style={styles.infoValue}>{currentOrder.addressPrice} Mt</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Total</Text>
                  <Text style={[styles.infoValue, styles.totalPrice]}>{currentOrder.totalPrice} Mt</Text>
                </View>
              </View>
            </View>

            {/* Produtos */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Produtos ({currentOrder.orderItems?.length || 0})</Text>
              {currentOrder.orderItems?.map((item, idx) => (
                <View style={styles.productCard} key={idx}>
                  <Image source={{ uri: item.image }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <View style={styles.productHeader}>
                      <Text style={styles.productName}>{item.nome}</Text>
                      {item.onSale && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>Promoção</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.productText}>Quantidade: {item.quantity}</Text>
                    
                    {item.onSale && item.discount > 0 ? (
                      <View style={styles.priceContainer}>
                        <Text style={styles.originalPrice}>{item.price} Mt</Text>
                        <Text style={styles.discountPrice}>
                          {item.price - item.discount} Mt
                        </Text>
                        <Text style={styles.discountText}>-{item.discount} Mt</Text>
                      </View>
                    ) : (
                      <Text style={styles.productPrice}>{item.price} Mt</Text>
                    )}

                    <Text style={styles.productDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Controles */}
            <View style={styles.controlsSection}>
              {/* <TripControls
                onCancelTrip={handleCancelTrip}
                onFinishTrip={handleFinishTrip}
                canFinishTrip={canFinishTrip}
                routeDrawn={routeDrawn}
              /> */}

              {currentOrder.status === 'Em trânsito' && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deliveryButton]} 
                  onPress={() => confirmDeliveryOrder(currentOrder._id)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.actionButtonText}>Confirmar Entrega</Text>
                </TouchableOpacity>
              )}

              {currentOrder.status === 'Entregue' && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]} 
                  onPress={() => confirmDeleteOrder(currentOrder._id)}
                >
                  <Ionicons name="trash" size={20} color="#FFF" />
                  <Text style={styles.actionButtonText}>Apagar Pedido</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>

      {/* Modal de Cancelamento */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Motivo do cancelamento</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite aqui..."
              value={message}
              onChangeText={setMessage}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.greenButton} onPress={() => cancelOrderPop(currentOrder._id)}>
                <Text style={styles.buttonText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.redButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F2F4F8' 
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  mapContainer: {
    flex: 1,
  },
  // Sheet Styles
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 2,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    height: 60,
  },
  compactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  compactMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderBadge: {
    backgroundColor: '#7F00FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
  },
  orderBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  compactTexts: {
    flex: 1,
  },
  compactStore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  compactStatus: {
    fontSize: 12,
    color: '#7F00FF',
    fontWeight: '500',
    marginTop: 2,
  },
  compactPrice: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  compactPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  compactItems: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7F00FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  expandedContent: {
    flex: 1,
  },
  expandedScroll: {
    flex: 1,
  },
  expandedScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoGrid: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalPrice: {
    color: '#7F00FF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusEntregue: {
    color: '#32CD32',
  },
  statusPendente: {
    color: '#FFD700',
  },
  statusCancelado: {
    color: '#FF4500',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  productText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7F00FF',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7F00FF',
    marginRight: 8,
  },
  discountText: {
    fontSize: 11,
    color: '#32CD32',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#FF5733',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  controlsSection: {
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  deliveryButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  // Modal Styles
  modalContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 10, 
    width: '80%' 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 12 
  },
  input: { 
    borderColor: '#ccc', 
    borderWidth: 1, 
    borderRadius: 6, 
    padding: 10, 
    marginBottom: 12 
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  greenButton: { 
    backgroundColor: '#4CAF50', 
    paddingVertical: 12, 
    borderRadius: 10, 
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  redButton: { 
    backgroundColor: '#F44336', 
    paddingVertical: 12, 
    borderRadius: 10, 
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});

export default OrderDetailsScreen;