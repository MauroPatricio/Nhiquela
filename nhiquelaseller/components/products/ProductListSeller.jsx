import { showMessage } from "react-native-flash-message";
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, Image, Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from "@expo/vector-icons";
import api from '../../hooks/createConnectionApi';
// import FastImage from 'react-native-fast-image'; // <- use se instalar cache

const ProductListSeller = () => {
  const [userData, setUserData] = useState(null);
  const [productsOfSeller, setProductsOfSeller] = useState([]);
  const [userLogin, setUserLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1); // paginação
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    checkIfUserExist();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userData) {
        fetchData(1, true); // recarrega do zero quando volta
      }
    }, [userData])
  );

  const fetchData = async (pageNumber = 1, replace = false) => {
    if (pageNumber > 1) setIsFetchingMore(true);
    else setIsLoading(true);

    try {
      const response = await api.get(`products?seller=${userData._id}&page=${pageNumber}&limit=20`, {
        headers: { authorization: `Bearer ${userData?.token}` },
      });

      if (response?.status === 200) {
        const newProducts = response?.data?.products || [];
        setProductsOfSeller(prev => replace ? newProducts : [...prev, ...newProducts]);
        setPage(pageNumber);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');

      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData); 
          setUserLogin(true);
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    try {
      const confirm = await new Promise((resolve) => {
        Alert.alert(
          'Confirmação',
          'Tem certeza que deseja apagar este produto?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Apagar', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
      if (!confirm) return;

      const response = await api.delete(`products/${productId}`, {
        headers: { Authorization: `Bearer ${userData.token}` },
      });

      if (response.status === 200) {
        setProductsOfSeller(productsOfSeller.filter(p => p._id !== productId));
      }
    } catch (error) {
      console.error('Erro ao apagar produto:', error?.response?.data || error.message);
      showMessage({
        message: 'Erro',
        description: 'Não foi possível apagar o produto.',
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
    }
  };

const handleToggleStatus = async (product) => {
  try {
    const response = await api.patch(
      `products/${product._id}/toggle-status`,
      {},
      { headers: { Authorization: `Bearer ${userData.token}` } }
    );

    if (response.status === 200) {
      setProductsOfSeller(prev =>
        prev.map(p =>
          p._id === product._id ? { ...p, isActive: response.data.product.isActive } : p
        )
      );
    }
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    showMessage({
        message: 'Erro',
        description: 'Não foi possível alterar o status do produto.',
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
  }
};

  const renderProduct = ({ item: product }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('ProductSellerDetail', { product })}
    >
      <View style={styles.statusBar} />
      <View style={styles.iconWrapper}>
        {product.image ? (
          // <FastImage source={{ uri: product.image }} style={styles.productImage} resizeMode={FastImage.resizeMode.cover}/>
          <Image source={{ uri: product.image }} style={styles.productImage} />
        ) : (
          <Ionicons name="cube-outline" style={styles.productIcon} />
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.code}>{product?.nome}</Text>
        <Text style={styles.createAt}>{product?.countInStock} unidade(s)</Text>
        <Text style={styles.createAt}>{product?.price} MT</Text>
        <Text style={[styles.statusText, { color: product?.isActive ? 'green' : 'red' }]}>
          {product?.isActive ? 'Produto visível na loja' : 'Produto oculto para os clientes'}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('NewProduct', { productToEdit: product })}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(product._id)}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={product.isActive ? styles.deactivateButton : styles.activateButton}
            onPress={() => handleToggleStatus(product)}
          >
            <Ionicons name={product.isActive ? "eye-off" : "eye"} size={20} color="#fff" />
            <Text style={styles.buttonText}>
              {product.isActive ? "Inati." : "Ativar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus produtos</Text>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1E90FF" style={{ marginTop: 20 }}/>
      ) : (
        <FlatList
          data={productsOfSeller}
          keyExtractor={(item) => item._id}
          renderItem={renderProduct}
          contentContainerStyle={styles.scroll}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum produto encontrado.</Text>}
          ListFooterComponent={
            isFetchingMore ? <ActivityIndicator size="small" color="#1E90FF"/> : <View style={{ paddingBottom: 100 }}/>
          }
          onEndReached={() => fetchData(page + 1)}
          onEndReachedThreshold={0.5}
        />
      )}

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('NewProduct')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

export default ProductListSeller;


const styles = StyleSheet.create({  
  safe: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },
  header: {
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight:'bold',
    color: '#333',
  },
  scroll: {
    padding: 16,
  },
  card: {
    flexDirection:'row',
    alignItems:'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow:'hidden',
  },
  statusBar: {
    width: 6,
    height:'100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: 16,
    backgroundColor: '#7F00FF',
  },
  iconWrapper: {
    backgroundColor: '#edf2ff',
    padding: 12,
    borderRadius: 50,
    marginRight: 16,
    alignItems:'center',
    justifyContent:'center',
  },
  productIcon: {
    fontSize: 24,
    color: '#7F00FF',
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  code: {
    fontSize: 16,
    fontWeight:'bold',
    color: '#333',
    marginBottom: 4,
  },
  createAt: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  empty: {
    textAlign:'center',
    color: '#555',
    marginTop: 20,
    fontSize: 16,
  },
  buttonRow: {
  flexDirection: 'row',
  marginTop: 8,
  gap: 10,
},
editButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#007bff',
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 8,
},
deleteButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#dc3545',
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 8,
},
buttonText: {
  color: '#fff',
  marginLeft: 6,
  fontSize: 14,
  fontWeight: 'bold',
},
floatingButton: {
  position: 'absolute',
  right: 20,
  bottom: 80,
  backgroundColor: '#1E90FF',
  width: 56,
  height: 56,
  borderRadius: 28,
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 6,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
},

activateButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#28a745', // verde
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 8,
},
deactivateButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#6c757d', // cinza escuro
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 8,
},

});  
