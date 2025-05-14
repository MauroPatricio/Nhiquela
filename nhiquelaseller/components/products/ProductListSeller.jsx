import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
  Animated,
  SafeAreaView,
} from 'react-native';
import api from '../../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import Toast from 'react-native-toast-message';

const ProductListSeller = () => {
  const [userData, setUserData] = useState(null);
  const [productsOfSeller, setProductsOfSeller] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const navigation = useNavigation();

  useEffect(() => {
    checkIfUserExist();
  }, []);

  // Use useFocusEffect to refresh data when the screen is focused
  useFocusEffect(
    useCallback(() => {
      if (userData) {
        fetchData();
      }
    }, [userData])
  );

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`products?seller=${userData._id}`, {
        headers: { authorization: `Bearer ${userData.token}` },
      });

      if (response.status === 200) {
        setProductsOfSeller(response.data.products);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

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

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const removeItem = async (productId) => {
    try {
      const response = await api.delete(`products/${productId}`, {
        headers: { authorization: `Bearer ${userData.token}` },
      });
      if (response.status === 200) {
        fetchData();
        setModalVisible(false);
        Toast.show({
          type: 'success',
          text1: 'Sucesso',
          text2: 'Produto excluído com sucesso!',
          position: 'top',
        });
      }
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Falha ao excluir o produto.',
        position: 'top',
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7F00FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.headerTitle}>Lista de produtos</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7F00FF']} />
        }
      >
        {productsOfSeller.length > 0 ? (
          productsOfSeller.map((product) => (
            <TouchableOpacity
              key={product._id}
              onPress={() => navigation.navigate('ProductSellerDetail', { product })}
              onLongPress={() => handleLongPress(product)}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[styles.productCard, { transform: [{ scale: scaleAnim }] }]}
              >
                <Image source={{ uri: product.image }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.nome}</Text>
                  <Text style={styles.productPrice}>{product.price} Mt</Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noProductsText}>Não possui nenhum produto disponível.</Text>
        )}
      </ScrollView>

      {/* Modal para opções de long press */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Opções</Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('EditProduct', { product: selectedProduct });
              }}
            >
              <Text style={styles.modalButtonText}>Editar</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, { backgroundColor: '#FF3B30' }]}
              onPress={() => {
                setModalVisible(false);
                removeItem(selectedProduct._id);
              }}
            >
              <Text style={styles.modalButtonText}>Apagar</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, { backgroundColor: '#A9A9A9' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProductListSeller;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    marginTop: 50,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '700',
    marginLeft: 16,
    marginBottom: 20,
    marginTop: 20,
    color: '#7F00FF',
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7F00FF',
    marginTop: 4,
  },
  noProductsText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    fontWeight: '500',
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
  },
  modalButton: {
    width: '100%',
    padding: 12,
    backgroundColor: '#7F00FF',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});