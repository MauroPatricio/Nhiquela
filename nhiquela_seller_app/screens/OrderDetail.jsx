import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import {useRoute} from '@react-navigation/native'
import BackBtn from '../components/BackBtn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';


const OrderDetail = ({navigation}) => {
  const [userData, setUserData] = useState(null);

  const [message, setMessage] = useState(null);

  const {params: {
    order
          } }= useRoute();

  const [currentOrder, setCurrentOrder] = useState(order); // Initialize with passed order


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
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
            const year = date.getFullYear();

            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
          
            return `${day}/${month}/${year} ${hours}:${minutes}`;
          };



          const acceptOrder = async (orderId) => {
            try {
              // Retrieve user info from AsyncStorage
            
              if (!userData) {
                throw new Error('User is not logged in');
              }
          
              // Send the request to accept the currentOrder
              const { data } = await api.put(
                `/orders/${orderId}/accept`,
                {},
                { headers: { Authorization: `Bearer ${userData.token}` } }
              );

              setCurrentOrder(data.order) 
              console.log(data)
          
              // Handle success response
              console.log('Pedido Aceite com sucesso', data);
              return data;
            } catch (error) {
              // Handle error response
              console.error('Nao consegui me actualizar o pedido', error);
              throw error;
            }
          }

          const availableToDelivOrder = async (orderId) => {
            try {
              // Retrieve user info from AsyncStorage
            
              if (!userData) {
                throw new Error('User is not logged in');
              }
          
              // Send the request to accept the order
              const { data } = await api.put(
                `/orders/${orderId}/availableToDeliver`,
                {},
                { headers: { Authorization: `Bearer ${userData.token}` } }
              );

              
              setCurrentOrder(data.order) 

              // Handle success response
              console.log('Pedido Aceite com sucesso', data);
              return data;
            } catch (error) {
              // Handle error response
              console.error('Nao consegui me actualizar o pedido', error);
              throw error;
            }
          }

          const cancelOrder = async (orderId) => {
            try {
              // Retrieve user info from AsyncStorage
            
              if (!userData) {
                throw new Error('User is not logged in');
              }
          
              // Send the request to accept the order
              const { data } = await api.put(
                `/orders/${orderId}/cancel`,
                {message},
                { headers: { Authorization: `Bearer ${userData.token}` } }
              );
          
              setCurrentOrder(data.order) 

              // Handle success response
              console.log('Pedido cancelado com sucesso', data);
              return data;
            } catch (error) {
              // Handle error response
              console.error('Nao consegui me actualizar o pedido', error);
              throw error;
            }
          }


          const deleteOrder = async (id) => {
            try {
              // Retrieve user info from AsyncStorage
            
              if (!userData) {
                throw new Error('User is not logged in');
              }
          
              // Send the request to delete the order
              const { data } = await api.delete(
                `/orders/${id}`,
                {},
                { headers: { Authorization: `Bearer ${userData.token}` } }
              );
          
              setCurrentOrder(data) 

              // Handle success response
              console.log('Pedido Removido com sucesso', data);
              return data;
            } catch (error) {
              // Handle error response
              console.error('Nao consegui me actualizar o pedido', error);
              throw error;
            }
          }

          const cancelOrderPop = (orderId) => {
            Alert.alert(
              "Sair",
              "Tem a certeza que deseja cancelar o pedido?",
              [
                {
                  text: "Cancelar", onPress: () => console.log("cancelado")
                },
                {
                  text: "Continuar", onPress: () => cancelOrder(orderId)
                },
              ]
            )
          }

          const deleteOrderPop = (orderId) => {
            Alert.alert(
              "Sair",
              "Tem a certeza que deseja apagar o pedido?",
              [
                {
                  text: "Cancelar", onPress: () => console.log("Removido")
                },
                {
                  text: "Continuar", onPress: () => deleteOrder(orderId)
                },
              ]
            )
          }


          
        

          

          
          
  return (  
    <ScrollView style={styles.container}>
      <View style={styles.section}>
      <BackBtn onPress={()=>navigation.goBack()}/>

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
        <Text style={styles.label}>Pago:</Text>
        <Text style={styles.bold}>{currentOrder.isPaid ? 'Sim' : 'Não'}</Text>
        </View>

        
        <View style={styles.content}>
        <Text style={styles.label}>Pagamento (Dia e hora):</Text>
        <Text style={styles.bold}>{formatDate(currentOrder.paidAt)}</Text>
       </View>

        <View style={styles.content}>
        <Text style={styles.label}>Valor total: </Text>
        <Text style={styles.bold}>{currentOrder.totalPrice} MT</Text>
        </View>
        </View>

      {/* <View style={styles.section}>
        <Text style={styles.title}>Destino da entrega</Text>
        <Text style={styles.label}>Full Name:</Text>
        <Text style={styles.value}>{currentOrder.deliveryAddress.fullName}</Text>

        <Text style={styles.label}>Contacto:</Text>
        <Text style={styles.value}>{currentOrder.deliveryAddress.phoneNumber}</Text>

        <Text style={styles.label}>Cidade:</Text>
        <Text style={styles.value}>{currentOrder.deliveryAddress.city}</Text>

        <Text style={styles.label}>Endereco:</Text>
        <Text style={styles.value}>{currentOrder.deliveryAddress.address}</Text>

        <Text style={styles.label}>Reference Address:</Text>
        <Text style={styles.value}>{currentOrder.deliveryAddress.referenceAddress}</Text>
      </View> */}

<Text style={{fontSize: 17, fontWeight: '600'
}}>Produtos</Text>
      {currentOrder.orderItems.map(item=>{
        return (
          <View style={styles.itemContainer}>
          {/* Item Image */}
          <Image source={{ uri: item.image }} style={styles.itemImage} />
    
          {/* Item Details */}
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemText}>Marca/Sabor: {item.brand}</Text>
            {/* <Text style={styles.itemText}>Categoria: {item.category.nome}</Text> */}
            <Text style={styles.itemText}>Preço: {item.price} MT</Text>
            <Text style={styles.itemText}>Quantidade: {item.quantity}</Text>
            <Text style={styles.itemText}>Cor: {item.color}</Text>
            <Text style={styles.itemText}>Tamanho: {item.size}</Text>
            {/* <Text style={styles.itemText}>Condition: {item.conditionStatus}</Text> */}
            {/* <Text style={styles.itemText}>Quality: {item.qualityType}</Text> */}
            {/* <Text style={styles.itemText}>In Stock: {item.countInStock}</Text> */}
            {/* <Text style={styles.itemText}>Rating: {item.rating} ({item.numReviews} Reviews)</Text> */}
            <Text style={styles.itemText}>Em promoção:  {item.onSale ? 'Sim' : 'Nao'}</Text>
            {item.onSale && (
              <Text style={styles.itemText}>Desconto: {item.onSalePercentage}%</Text>
            )}
            {item.isGuaranteed && (
              <Text style={styles.itemText}>Garantia: {item.guaranteedPeriod}</Text>
            )}
          </View>
        </View>


        )}
      )}

      {/* <View style={styles.section}>
        <Text style={styles.title}>Price Details</Text>
        <Text style={styles.label}>Items Price:</Text>
        <Text style={styles.value}>${order.itemsPrice}</Text>

        <Text style={styles.label}>Address Price:</Text>
        <Text style={styles.value}>${order.addressPrice}</Text>

        <Text style={styles.label}>IVA Tax:</Text>
        <Text style={styles.value}>${order.ivaTax}</Text>

        <Text style={styles.label}>Site Tax:</Text>
        <Text style={styles.value}>${order.siteTax}</Text>

        <Text style={styles.label}>Total Price:</Text>
        <Text style={styles.value}>${order.totalPrice}</Text>
      </View> */}

      {currentOrder.status === 'Pendente' &&
       <View style={styles.buttonContainer}>
        {/* Accept Button */}
        <TouchableOpacity style={styles.acceptButton} onPress={()=>acceptOrder(currentOrder._id)}>
          <Text style={styles.buttonText}>Aceitar Pedido</Text>
        </TouchableOpacity>

        {/* Reject Button */}
        <TouchableOpacity style={styles.rejectButton} onPress={()=>cancelOrderPop(currentOrder._id)}>
          <Text style={styles.buttonText}>Rejeitar Pedido</Text>
        </TouchableOpacity>
      </View>}


      {currentOrder.status === 'Aceite' &&
       <View style={styles.buttonContainer}>
        {/* Accept Button */}
        <TouchableOpacity style={styles.acceptButton} onPress={()=>availableToDelivOrder(currentOrder._id)}>
          <Text style={styles.buttonText}>Disponível para entrega</Text>
        </TouchableOpacity>

        {/* Reject Button */}
        <TouchableOpacity style={styles.rejectButton} onPress={()=>cancelOrderPop(currentOrder._id)}>
          <Text style={styles.buttonText}>Rejeitar</Text>
        </TouchableOpacity>
      </View>}
   
      <View style={{ marginBottom: 210 }} />
    </ScrollView>
    

    // Adicionar botoes para actualizacao de status
    

  );
};

const styles = StyleSheet.create({
  container: {
    top:10,
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
    // fontWeight: '600',
    // marginTop: 10,
  
  },
  content: {
    justifyContent: 'space-between',
    flexDirection: 'row'
  },
  value: {
    fontSize: 16,
    color: '#555',
  },
  bold:{
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
    top:9,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  acceptButton: {
    backgroundColor: '#4CAF50', // Green color for Accept
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  rejectButton: {
    backgroundColor: '#F44336', // Red color for Reject
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderDetail;
