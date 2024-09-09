import {useRoute} from '@react-navigation/native'
import React from 'react';
import { View, Text, StyleSheet,  Image, ScrollView } from 'react-native';

const OrderDetailsScreen = () => {
  const {params: {
    item
          } }= useRoute();

  const order = item

      return (
     
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Detalhes do pedido</Text>
      
      <Text style={styles.label}>Codigo do pedido: <Text style={styles.value}>{order.code}</Text></Text>
      <Text style={styles.label}>Forma de pagamento: <Text style={styles.value}>{order.paymentMethod}</Text></Text>
      <Text style={styles.label}>Preco total pago: <Text style={styles.price}>{order.totalPrice} MT</Text></Text>
      <Text style={styles.label}>Estado: <Text style={styles.value}>{order.status}</Text></Text>
      {/* <Text style={styles.label}>Items Price: <Text style={styles.value}>${order.itemsPrice}</Text></Text>
      <Text style={styles.label}>Site Tax: <Text style={styles.value}>${order.siteTax}</Text></Text>
      <Text style={styles.label}>IVA Tax: <Text style={styles.value}>${order.ivaTax}</Text></Text>
      <Text style={styles.label}>Address Price: <Text style={styles.value}>${order.addressPrice}</Text></Text> */}

      <Text style={styles.subheading}>Produtos:</Text>
      {order.orderItems.map((item, index) => (
        <View key={index} style={styles.itemContainer}>
          <Image source={{ uri: item.image }} style={styles.itemImage} />
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
            <Text style={styles.itemPrice}>Preco: {item.price}MT</Text>
            <Text style={styles.itemStock}>disponivel: {item.countInStock}</Text>
            <Text style={styles.itemRating}>pontuacao: {item.rating}</Text>
          </View>
        </View>
      ))}
    <View style={{marginBottom: 210}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    top:20
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    top:10
  },
  subheading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  value: {
    fontWeight: 'bold',
    

  },
  price: {
    fontWeight: 'bold',
    

  },
  itemContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  itemDetails: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'space-around',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemStock: {
    fontSize: 14,
    color: '#333',
  },
  itemRating: {
    fontSize: 14,
    color: '#333',
  },
});

export default OrderDetailsScreen;