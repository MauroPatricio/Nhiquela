import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { removeFromBasket, removeSeller, selectBasketItems } from '../features/basketSlice';
import CartDetails from '../components/CartDetails';
import { XCircleIcon, TrashIcon } from 'react-native-heroicons/outline';

const Cart = () => {
  const navigation = useNavigation();
  const items = useSelector(selectBasketItems);
  const dispatch = useDispatch();
  const [groupedItemsInTheCart, setGroupedItemsInTheCart] = useState({});

  // Agrupa itens por fornecedor e por produto
  useEffect(() => {
    const groupedBySeller = items.reduce((acc, item) => {
      const sellerId = item?.seller?._id || 'unknown';
      if (!acc[sellerId]) acc[sellerId] = {};

      const productId = item._id;
      if (!acc[sellerId][productId]) acc[sellerId][productId] = { ...item, quantity: 0 };
      acc[sellerId][productId].quantity += 1;

      return acc;
    }, {});

    setGroupedItemsInTheCart(groupedBySeller);
  }, [items]);

  return (
    <>
      <CartDetails />
      <SafeAreaView style={styles.container}>
        <View style={styles.cart}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Carrinho</Text>
              <Text style={styles.subtitle}>Produtos</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <XCircleIcon style={styles.icon} height={35} width={35} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={styles.itemsLength}>{items.length} produto(s) no carrinho</Text>

            {Object.entries(groupedItemsInTheCart).map(([sellerId, products]) => (
              <View key={sellerId} style={{ marginBottom: 10 }}>
                {/* Fornecedor */}
                <Text style={styles.sellerName}>
                  Fornecedor: {Object.values(products)[0]?.sellerName?.length < 50
                    ? Object.values(products)[0]?.sellerName || 'Sem nome do fornecedor'
                    : (Object.values(products)[0]?.sellerName || 'Sem nome do fornecedor').substring(0, 25) + '...'}
                </Text>

                {/* Lista de produtos do fornecedor */}
                {Object.values(products).map((item) => (
                  <View key={item._id} style={styles.itemLine}>
                    <Text style={styles.quantity}>{item.quantity}x</Text>
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                    <Text style={styles.itemName}>
                      {item.name?.length < 20 ? item.name : item.name.substring(0, 25) + '...'}
                    </Text>

                    <View>
                      {parseFloat(item.discount || 0) > 0 ? (
                        <>
                          <Text style={{ color: 'grey', textDecorationLine: 'line-through' }}>
                            {parseFloat(item.price || 0).toFixed(2)} MT
                          </Text>
                          <Text style={{ color: 'green', fontWeight: 'bold' }}>
                            {parseFloat(item.discount).toFixed(2)} MT
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.price}>{parseFloat(item.price || 0).toFixed(2)} MT</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        const itemInBasket = items.find(basketItem => basketItem._id === item._id);
                        if (itemInBasket) {
                          dispatch(removeFromBasket({ _id: item._id }));
                          dispatch(removeSeller(item.seller._id));
                        }
                      }}
                    >
                      <TrashIcon color="#7F00FF" size={28} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
};

export default Cart;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', paddingHorizontal: 10 },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#7F00FF',
    padding: 20,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  cart: { paddingBottom: 250 },
  title: { fontWeight: '500', textAlign: 'center', fontSize: 18 },
  subtitle: { fontWeight: '500', textAlign: 'center', color: 'grey' },
  closeButton: {
    position: 'absolute',
    top: 9,
    right: 40,
    backgroundColor: '#7F00FF',
    borderRadius: 50,
    marginTop: 10,
  },
  icon: { color: 'white' },
  itemsLength: { textAlign: 'center', fontWeight: '400', fontSize: 18, marginTop: 10, marginBottom: 15 },
  itemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 10,
    alignItems: 'center'
  },
  quantity: { fontWeight: '600', width: 25 },
  itemName: { width: 80, marginTop: 2 },
  itemImage: { width: 50, height: 50, marginRight: 10, borderRadius: 5 },
  price: { marginTop: 15 },
  sellerName: { bottom: 5, fontWeight: '500', color: '#7F00FF', paddingHorizontal: 10 },
});
