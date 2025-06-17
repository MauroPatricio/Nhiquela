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
          <Text style={styles.label}>Valor recebido: </Text>
          <Text style={styles.bold}>{currentOrder.itemsPriceForSeller} MT</Text>
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
     {groupedItemsArray.map(item => {
  // Cálculo do preço original, se estiver em promoção
  const originalPrice = item.onSale && item.onSalePercentage
    ? (item.price / (1 - item.onSalePercentage / 100)).toFixed(2)
    : item.price;

  return (
    <View style={styles.itemContainer} key={item._id}>
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      <View style={styles.itemDetails}>
        {/* Título e Badge de Promoção */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.onSale && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Promoção</Text>
            </View>
          )}
        </View>

        {/* Marca/Sabor */}
        {item.brand && <Text style={styles.itemText}>Marca/Sabor: {item.brand}</Text>}

        {/* Preço com ou sem desconto */}
        {item.onSale  ? (
          <>
            <Text style={[styles.itemText, { textDecorationLine: 'line-through', color: 'gray' }]}>
              Preço venda: {item.priceFromSeller} MT
            </Text>
            <Text style={[styles.itemText, { color: 'green', fontWeight: 'bold' }]}>
              Preço com Desconto: {item.discount} MT
            </Text>
          </>
        ) : (
          <Text style={styles.itemText}>Preço: {item.price} MT</Text>
        )}

        <Text style={styles.itemText}>Quantidade solici.: {item.quantity} unid.</Text>

        {item.isGuaranteed && (
          <Text style={styles.itemText}>Garantia: {item.guaranteedPeriod}</Text>
        )}
      </View>
    </View>
  );
})}

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
    backgroundColor: '#edf2f7',
  },
  section: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#334155',
  },
  label: {
    fontSize: 15,
    color: '#64748b',
  },
  content: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    alignItems:'center',
  },
  bold: {
    fontWeight: 'bold',
    color: '#1e293b',
    fontSize: 15,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
    alignItems:'center',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 18,
    fontWeight:'bold',
    color: "#334155",
    marginBottom: 5,
  },
  itemText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 2,
  },
  buttonContainer: {
    marginTop: 20,
    flexDirection:'row',
    justifyContent:'space-around',
  },
  acceptButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight:'bold',
    fontSize: 15,
  },
  modalView: {
    margin: 20,
    backgroundColor:'white',
    padding: 30,
    borderRadius: 20,
    alignItems:'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    fontSize: 18,
    fontWeight:'bold',
    marginBottom: 20,
    color: "#334155",
  },
  input: {
    width:'100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
    backgroundColor:'#edf2f7',
  },
  modalButtons: {
    flexDirection:'row',
    justifyContent:'space-around',
    width:'100%',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 10,
    alignItems:'center',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  badge: {
  backgroundColor: '#FF5733',
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 5,
  alignSelf: 'flex-start',
},
badgeText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: 'bold',
},
});

export default OrderDetail;