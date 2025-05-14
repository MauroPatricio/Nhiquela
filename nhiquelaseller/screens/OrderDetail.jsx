import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useRoute } from '@react-navigation/native';
import BackBtn from '../components/BackBtn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';

const OrderDetail = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState(null);

  const { params: { order } } = useRoute();
  const [currentOrder, setCurrentOrder] = useState(order);

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

  const acceptOrder = async (orderId) => {
    try {
      if (!userData) {
        throw new Error('User is not logged in');
      }
      const { data } = await api.put(
        `/orders/${orderId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      setCurrentOrder(data.order);
      console.log('Pedido Aceite com sucesso', data);
      return data;
    } catch (error) {
      console.error('Nao consegui me actualizar o pedido', error);
      throw error;
    }
  };

  const availableToDelivOrder = async (orderId) => {
    try {
      if (!userData) {
        throw new Error('User is not logged in');
      }
      const { data } = await api.put(
        `/orders/${orderId}/toDeliv`,
        {},
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      setCurrentOrder(data.order);
      return data;
    } catch (error) {
      console.error('Nao consegui me actualizar o pedido', error);
      throw error;
    }
  };

  const orderInTransit = async (orderId) => {
    try {
      if (!userData) {
        throw new Error('User is not logged in');
      }
      const { data } = await api.put(
        `/orders/${orderId}/intransit`,
        {},
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      setCurrentOrder(data.order);
      console.log('Pedido a caminho', data);
      return data;
    } catch (error) {
      console.error('Nao consegui me actualizar o pedido', error);
      throw error;
    }
  };

  const deleteOrder = async (id) => {
    try {
      if (!userData) {
        throw new Error('User is not logged in');
      }
      const { data } = await api.delete(
        `/orders/${id}`,
        {},
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      setCurrentOrder(data);
      console.log('Pedido Removido com sucesso', data);
      return data;
    } catch (error) {
      console.error('Nao consegui me actualizar o pedido', error);
      throw error;
    }
  };

  const cancelOrderPop = async (orderId) => {
    try {
      if (!userData) {
        throw new Error('User is not logged in');
      }
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

  const deleteOrderPop = (orderId) => {
    Alert.alert(
      "Sair",
      "Tem a certeza que deseja apagar o pedido?",
      [
        { text: "Cancelar", onPress: () => console.log("Removido") },
        { text: "Continuar", onPress: () => deleteOrder(orderId) },
      ]
    );
  };

  const openCancelModal = () => {
    setModalVisible(true);
  };

  const groupedItems = currentOrder.orderItems.reduce((acc, item) => {
    const itemId = item._id;
    const quantity = Number(item.quantity) || 0; // Ensure quantity is always a number
  
    if (acc[itemId]) {
      acc[itemId].quantity += quantity;
    } else {
      acc[itemId] = { ...item, quantity }; // Store quantity as a number
    }
  
    return acc;
  }, {});

  const groupedItemsArray = Object.values(groupedItems);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <BackBtn onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Detalhes do Pedido</Text>
        <View style={styles.content}>
          <Text style={styles.label}>Código do pedido: </Text>
          <Text style={styles.bold}>{currentOrder.code}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Estado do pedido:</Text>
          <Text style={styles.bold}>{currentOrder.status}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Metodo de pagamento:</Text>
          <Text style={styles.bold}>{currentOrder.paymentMethod}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Pagamento efectuado:</Text>
          <Text style={styles.bold}>{currentOrder.isPaid ? 'Sim' : 'Não'}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Dia e hora do pagamento:</Text>
          <Text style={styles.bold}>{formatDate(currentOrder.paidAt)}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Taxa de entrega: </Text>
          <Text style={styles.bold}>{currentOrder.addressPrice} MT</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Valor total pago: </Text>
          <Text style={styles.bold}>{currentOrder.totalPrice} MT</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Nome do cliente: </Text>
          <Text style={styles.bold}>{currentOrder.user.name}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Contacto do cliente: </Text>
          <Text style={styles.bold}>{currentOrder.user.phoneNumber}</Text>
        </View>
        {currentOrder && currentOrder.stepStatus == 7 &&
          <>
            <Text style={styles.label}>Motivo de cancelamento: </Text>
            <Text style={styles.bold}>{currentOrder.canceledReason}</Text>
          </>
        }
      </View>

      <Text style={{ fontSize: 17, fontWeight: '600' }}>Produtos solicitados</Text>
      {groupedItemsArray.map(item => (
        <View style={styles.itemContainer} key={item._id}>
          <Image source={{ uri: item.image }} style={styles.itemImage} />
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.brand && <Text style={styles.itemText}>Marca/Sabor: {item.brand}</Text>}
            <Text style={styles.itemText}>Preço: {item.price} MT</Text>
            <Text style={styles.itemText}>Quantidade: {item.quantity} solicitada</Text>
            <Text style={styles.itemText}>Em promoção: {item.onSale ? 'Sim' : 'Não'}</Text>
            {item.onSale && (
              <Text style={styles.itemText}>Desconto: {item.onSalePercentage}%</Text>
            )}
            {item.isGuaranteed && (
              <Text style={styles.itemText}>Garantia: {item.guaranteedPeriod}</Text>
            )}
          </View>
        </View>
      ))}

      {currentOrder.status === 'Pendente' &&
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.acceptButton} onPress={() => acceptOrder(currentOrder._id)}>
            <Text style={styles.buttonText}>Aceitar Pedido</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={openCancelModal}>
            <Text style={styles.buttonText}>Rejeitar Pedido</Text>
          </TouchableOpacity>
        </View>
      }

      {currentOrder.status === 'Aceite' &&
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.acceptButton} onPress={() => availableToDelivOrder(currentOrder._id)}>
            <Text style={styles.buttonText}>Disponível para entrega</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={openCancelModal}>
            <Text style={styles.buttonText}>Rejeitar Pedido</Text>
          </TouchableOpacity>
        </View>
      }

      {currentOrder.status === 'Disponível para entrega' &&
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.acceptButton} onPress={() => orderInTransit(currentOrder._id)}>
            <Text style={styles.buttonText}>Em trânsito</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={openCancelModal}>
            <Text style={styles.buttonText}>Rejeitar Pedido</Text>
          </TouchableOpacity>
        </View>
      }

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
  );
};

const styles = StyleSheet.create({
  container: {
    top: 10,
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  section: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  label: {
    fontSize: 16,
  },
  content: {
    justifyContent: 'space-between',
    flexDirection: 'row'
  },
  value: {
    fontSize: 16,
    color: '#555',
  },
  bold: {
    fontWeight: '600',
    fontSize: 14
  },
  listContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  itemText: {
    fontSize: 14,
    color: '#555',
  },
  buttonContainer: {
    top: 9,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  rejectButton: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
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
    alignItems: 'center'
  },
  modalText: {
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center'
  },
  input: {
    width: 250,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%'
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5
  }
});

export default OrderDetail;