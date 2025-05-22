import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, SafeAreaView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';

const OrderDetailsScreen = () => {
  const { params: { item } } = useRoute();
  const [currentOrder, setCurrentOrder] = useState(item);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState(null);
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    checkIfUserExist();
  }, []);

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
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
      console.log('Pedido cancelado com sucesso', data);
    } catch (error) {
      console.error('Não consegui atualizar o pedido', error);
    } finally {
      setModalVisible(false);
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      if (!userData) throw new Error('User is not logged in');
      const id = orderId;
      await api.delete(`/orders/${id}`, {
        headers: { Authorization: `Bearer ${userData.token}` },
      });
      Alert.alert('Sucesso', 'Pedido apagado com sucesso!');
      navigation.goBack(); // Navigate back after deleting the order
    } catch (error) {
      console.error('Erro ao apagar o pedido', error);
      Alert.alert('Erro', 'Não foi possível apagar o pedido.');
    }
  };

  const confirmDelivery = async (orderId) => {
    try {
      if (!userData) throw new Error('User is not logged in');
      const { data } = await api.put(
        `/orders/${orderId}/deliver`,
        {},
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      setCurrentOrder(data.order);
      Alert.alert('Sucesso', 'Pedido marcado como entregue com sucesso!');
    } catch (error) {
      console.error('Erro ao confirmar entrega', error);
      Alert.alert('Erro', 'Não foi possível confirmar a entrega.');
    }
  };

  const openCancelModal = () => {
    setModalVisible(true);
  };

  const confirmDeleteOrder = (orderId) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja apagar este pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', onPress: () => deleteOrder(orderId) },
      ]
    );
  };

  const confirmDeliveryOrder = (orderId) => {
    Alert.alert(
      'Confirmar Entrega',
      'Tem certeza que deseja confirmar a entrega deste pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => confirmDelivery(orderId) },
      ]
    );
  };

  return (
    <>
      <View style={styles.icons}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back-circle" size={35} style={styles.back} />
        </TouchableOpacity>
      </View>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white', paddingTop: 1 }}>
        <ScrollView style={styles.container}>
          <Text style={styles.heading}>Detalhes do pedido</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Código do pedido:</Text>
            <Text style={styles.value}>{currentOrder.code}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Estado do pedido:</Text>
            <Text style={styles.value}>{currentOrder.status}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Método de pagamento:</Text>
            <Text style={styles.value}>{currentOrder.paymentMethod}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Pagamento efetuado:</Text>
            <Text style={styles.value}>{currentOrder.isPaid ? 'Sim' : 'Não'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Dia e hora do pagamento:</Text>
            <Text style={styles.value}>{formatDate(currentOrder.paidAt)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Taxa de entrega:</Text>
            <Text style={styles.price}>{currentOrder.addressPrice} Mt</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Total pago:</Text>
            <Text style={styles.price}>{currentOrder.totalPrice} Mt</Text>
          </View>

          {currentOrder.stepStatus === 7 && (
            <>
              <Text style={styles.label}>Motivo de cancelamento: </Text>
              <Text style={styles.value}>{currentOrder.canceledReason}</Text>
            </>
          )}

          <Text style={styles.subheading}>Produtos solicitados:</Text>

          {currentOrder.orderItems?.map((item, index) => (
            <View style={styles.itemContainer} key={index}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.nome}</Text>
                <Text style={styles.itemDescription}>Fornecedor: {currentOrder.seller?.seller?.name}</Text>
                <Text style={styles.itemStock}>Qtd solicitada: {item.quantity} unidade(s)</Text>
                <Text style={styles.itemPrice}>Preço: {item.price} Mt</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
            </View>
          ))}

          {/* Botão de confirmação de entrega (exibido apenas se o status for "em trânsito") */}
          {currentOrder.status === 'Em trânsito' && (
            <TouchableOpacity
              style={styles.deliveryButton}
              onPress={() => confirmDeliveryOrder(currentOrder._id)}
            >
              <Text style={styles.deliveryButtonText}>Confirmar Entrega</Text>
            </TouchableOpacity>
          )}

          {/* Botão de apagar pedido */}

          {currentOrder.status === 'Entregue' && (

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmDeleteOrder(currentOrder._id)}
          >
            <Text style={styles.deleteButtonText}>Apagar pedido</Text>
          </TouchableOpacity>
          )}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Digite o motivo do cancelamento:</Text>
              <TextInput
                style={styles.input}
                placeholder="Motivo"
                value={message}
                onChangeText={setMessage}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.acceptButton]}
                  onPress={() => cancelOrderPop(currentOrder._id)}
                >
                  <Text style={styles.buttonText}>Confirmar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.rejectButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                 
              </View>
            </View>
          </Modal>

          <View style={{ marginBottom: 210 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A00E0',
  },
  icons: {
    paddingTop: 20,
  },
  back: {
    color: 'black',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 22,
    padding: 10,
  },
  container: {
    padding: 16,
    backgroundColor: '#F9FAFC',
    flexGrow: 1,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A00E0',
    marginBottom: 20,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F1F1F1',
  },
  itemDetails: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemDescription: {
    fontSize: 14,
    color: '#777',
  },
  itemPrice: {
    fontWeight: '600',
  },
  itemStock: {
    fontSize: 14,
    color: '#555',
  },
  deleteButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deliveryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  deliveryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalView: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowOpacity: 0.25,
    elevation: 5,
    marginTop: '50%',
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    width: 250,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderDetailsScreen;