import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OrderDetailsScreen = () => {
  const { params: { item } } = useRoute();
  const order = item;
  const navigation = useNavigation();

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

          <Text style={styles.label}>
            Codigo do pedido: <Text style={styles.value}>{order.code}</Text>
          </Text>
          <Text style={styles.label}>
            Forma de pagamento: <Text style={styles.value}>{order.paymentMethod}</Text>
          </Text>
          <Text style={styles.label}>
            Estado: <Text style={styles.value}>{order.status}</Text>
          </Text>
          <Text style={styles.label}>
            Preço total pago: <Text style={styles.price}>{order.totalPrice} MT</Text>
          </Text>

          <Text style={styles.subheading}>Produtos:</Text>
          {order.orderItems.map((item, index) => (
            <View style={styles.itemContainer} key={index}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <Text style={styles.itemStock}>Quantidade solicitada: {item.quantity}</Text>
                <Text style={styles.itemPrice}>Preço: {item.price}MT</Text>
              </View>
            </View>
          ))}
          <View style={{ marginBottom: 210 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  icons:{paddingTop:20},
  back: {
    color: 'black',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Slight transparency for a modern look
    borderRadius: 22,
    padding: 5,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    paddingHorizontal: 5,
  },
  value: {
    fontWeight: '700',
    color: '#333',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A00E0',
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
    marginVertical: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A00E0',
    marginTop: 5,
  },
  itemStock: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
});

export default OrderDetailsScreen;
