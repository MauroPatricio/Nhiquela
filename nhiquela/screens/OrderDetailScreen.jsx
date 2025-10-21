import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../hooks/createConnectionApi';
import { sendOrderNotificationToUser } from '../utils/notificationUtils';
import Toast from 'react-native-toast-message';
import TripMap from "../components/TripMap";
import TripControls from '../components/TripControls'; // certifique-se de ter esse componente

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
  const navigation = useNavigation();

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedido #{currentOrder.code}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.container}>
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

        <TripControls
          onCancelTrip={handleCancelTrip}
          onFinishTrip={handleFinishTrip}
          canFinishTrip={canFinishTrip}
          routeDrawn={routeDrawn}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{currentOrder.status}</Text>

          <Text style={styles.label}>Pagamento:</Text>
          <Text style={styles.value}>{currentOrder.paymentMethod} - {currentOrder.isPaid ? 'Pago' : 'Pendente'}</Text>

          <Text style={styles.label}>Data de Pagamento:</Text>
          <Text style={styles.value}>{formatDate(currentOrder.paidAt)}</Text>

          <Text style={styles.label}>Taxa de entrega:</Text>
          <Text style={styles.value}>{currentOrder.addressPrice} Mt</Text>

          <Text style={styles.label}>Total pago:</Text>
          <Text style={styles.value}>{currentOrder.totalPrice} Mt</Text>

          {currentOrder.stepStatus === 7 && (
            <>
              <Text style={styles.label}>Motivo de cancelamento:</Text>
              <Text style={styles.value}>{currentOrder.canceledReason}</Text>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Produtos</Text>
        {currentOrder.orderItems?.map((item, idx) => (
          <View style={styles.itemCard} key={idx}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.itemInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.itemName}>{item.nome}</Text>
                {item.onSale && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Promoção</Text>
                  </View>
                )}
              </View>

              <Text style={styles.itemText}>Qtd: {item.quantity}</Text>

              {item.onSale && item.discount > 0 ? (
                <>
                  <Text style={[styles.itemText, { textDecorationLine: 'line-through', color: 'gray' }]}>
                    Preço: {item.price} Mt
                  </Text>
                  <Text style={[styles.itemText, { color: 'green', fontWeight: 'bold' }]}>
                    Desconto: {item.discount} Mt
                  </Text>
                </>
              ) : (
                <Text style={styles.itemText}>Preço: {item.price} Mt</Text>
              )}

              <Text style={styles.itemText}>Fornecedor: {currentOrder.seller?.seller?.name}</Text>
              <Text style={styles.itemText}>{item.description}</Text>
            </View>
          </View>
        ))}

        {currentOrder.status === 'Em trânsito' && (
          <TouchableOpacity style={styles.greenButton} onPress={() => confirmDeliveryOrder(currentOrder._id)}>
            <Text style={styles.buttonText}>Confirmar Entrega</Text>
          </TouchableOpacity>
        )}

        {currentOrder.status === 'Entregue' && (
          <TouchableOpacity style={styles.redButton} onPress={() => confirmDeleteOrder(currentOrder._id)}>
            <Text style={styles.buttonText}>Apagar Pedido</Text>
          </TouchableOpacity>
        )}

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
      </ScrollView>

      <View style={{ paddingBottom: 50 }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F4F8' },
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  scrollContainer: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  label: { fontWeight: '600', color: '#555', marginBottom: 4 },
  value: { fontSize: 16, marginBottom: 12, color: '#000' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  itemCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  image: { width: 80, height: 80, borderRadius: 8 },
  itemInfo: { marginLeft: 12, flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemText: { fontSize: 14, color: '#555' },
  greenButton: { backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  redButton: { backgroundColor: '#F44336', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  badge: { backgroundColor: '#FF5733', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  container: { flex: 1, marginBottom: 10 },
});

export default OrderDetailsScreen;
