import { Image } from 'expo-image';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { removeFromBasket, removeSeller, selectBasketItems } from '../features/basketSlice';
import CartDetails from '../components/CartDetails';
import { XCircleIcon, TrashIcon } from 'react-native-heroicons/outline';
import { LinearGradient } from 'expo-linear-gradient';

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
              <Text style={styles.title}>Meu Carrinho</Text>
              <Text style={styles.subtitle}>{items.length} produto(s) adicionados</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <XCircleIcon style={styles.icon} height={32} width={32} color="#9333EA" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

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

                    <View style={styles.priceContainer}>
                      {parseFloat(item.discount || 0) > 0 ? (
                        <>
                          <Text style={styles.originalPrice}>
                            {parseFloat(item.price || 0).toFixed(2)} MT
                          </Text>
                          <Text style={styles.discountPrice}>
                            {parseFloat(item.discount).toFixed(2)} MT
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.price}>{parseFloat(item.price || 0).toFixed(2)} MT</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        const itemInBasket = items.find(basketItem => basketItem._id === item._id);
                        if (itemInBasket) {
                          dispatch(removeFromBasket({ _id: item._id }));
                          dispatch(removeSeller(item.seller._id));
                        }
                      }}
                    >
                      <TrashIcon color="#EF4444" size={24} />
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 16,
  },
  cart: { paddingBottom: 250, flex: 1 },
  title: { fontWeight: '800', fontSize: 24, color: '#1F2937' },
  subtitle: { fontWeight: '500', color: '#6B7280', fontSize: 13, marginTop: 4 },
  closeButton: {
    padding: 6,
    backgroundColor: '#F3E8FF',
    borderRadius: 50,
  },
  icon: { color: '#9333EA' },
  itemsLength: { textAlign: 'center', fontWeight: '600', fontSize: 15, marginVertical: 15, color: '#6B7280' },
  itemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  quantity: { 
    fontWeight: '800', 
    fontSize: 14, 
    color: '#9333EA', 
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  itemName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#374151' },
  itemImage: { width: 60, height: 60, marginRight: 12, borderRadius: 12, backgroundColor: '#F3F4F6' },
  priceContainer: { alignItems: 'flex-end', marginRight: 12 },
  price: { fontWeight: '800', color: '#1F2937', fontSize: 15 },
  discountPrice: { color: '#10B981', fontWeight: '800', fontSize: 15 },
  originalPrice: { color: '#9CA3AF', textDecorationLine: 'line-through', fontSize: 11, marginBottom: 2 },
  sellerName: { 
    fontWeight: '800', 
    color: '#9333EA', 
    paddingHorizontal: 20, 
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  }
});
