import { StyleSheet, Text, View, ScrollView, Image, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, TouchableWithoutFeedback, Pressable  } from 'react-native';
import React, { useEffect, useState } from 'react';
import api from './../../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const ProductListSeller = () => {
  const [userData, setUserData] = useState(null);
  const [productsOfSeller, setProductsOfSeller] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // State for RefreshControl
  const [selectedProduct, setSelectedProduct] = useState(null); // Track selected product
  const [modalVisible, setModalVisible] = useState(false); // Modal visibility

  const navigation = useNavigation();

  useEffect(() => {
    checkIfUserExist();
  }, []);

  useEffect(() => {
    if (userData) {
      fetchData();
    }
  }, [userData]);

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
      setRefreshing(false); // Stop the refreshing indicator
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

  const handleLongPress = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const onRefresh = () => {
    setRefreshing(true); // Start the refreshing indicator
    fetchData(); // Fetch new data
  };

  const removeItem = async (productId) => {
    const id = productId;
    console.log(id)
    const response = await api.delete(`${id}`, {
      headers: { authorization: `Bearer ${userData.token}` },
    });
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7F00FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: "white",  flex:1 }}>
      <Text style={{ fontSize: 25, fontWeight: '700', marginLeft: 14, marginBottom: 40, marginTop: 30,color: '#7F00FF' }}>
        Lista de produtos
      </Text>

      <ScrollView
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {productsOfSeller.length > 0 ? (
          productsOfSeller.map((product) => (
            <TouchableWithoutFeedback  key={product._id} onPress={() => navigation.navigate('ProductSellerDetail', {product})}
            onLongPress={() => handleLongPress(product)}

            >
              <View style={styles.wrapper}>
                <Image source={{ uri: product.image }} style={styles.image} />
                <Text style={styles.title}>{product.name}</Text>
                <Text style={styles.price}>{product.price} MT</Text>
              </View>
            </TouchableWithoutFeedback >
            
          ))
        ) : (
          <Text style={styles.noProductsText}>Não possui nenhum produto disponível.</Text>
        )}
      </ScrollView>
      {/* Modal for Long Press Options */}
        <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Opções</Text>
            {/* <Pressable 
              style={styles.modalButton} 
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('EditProduct', { product: selectedProduct });
              }}
            >
              <Text style={styles.modalButtonText}>Editar</Text>
            </Pressable> */}
            <Pressable 
              style={styles.modalButton} 
              onPress={() => {
                setModalVisible(false);
                console.log(`Deleting product: ${selectedProduct._id}`);
                removeItem(`${selectedProduct._id}`)
                // Add delete logic here

               
              }}
            >
              <Text style={styles.modalButtonText}>Apagar</Text>
            </Pressable>
            <Pressable 
              style={[styles.modalButton, { backgroundColor: 'gray' }]} 
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
    resizeMode: 'cover',
  },
  wrapper: {
    backgroundColor: '#7F00FF',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    shadowColor: '#7F00FF',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 6,
    elevation: 5,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#7F00FF',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 10,
    padding: 7,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  noProductsText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    fontWeight: '500',
    color: '#888',
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  modalButton: {
    width: '100%',
    padding: 10,
    backgroundColor: '#7F00FF',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
