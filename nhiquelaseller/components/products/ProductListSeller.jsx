import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../../hooks/createConnectionApi';
import { Ionicons } from "@expo/vector-icons";

const ProductListSeller = () => {
  const [userData, setUserData] = useState(null);
  const [productsOfSeller, setProductsOfSeller] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    checkIfUserExist();
  }, []);

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
        headers: { authorization: `Bearer ${userData?.token}` },
      });

      if (response?.status === 200) {
        setProductsOfSeller(response?.data?.products);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
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

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Meus produtos
        </Text>
        <View style={{ width: 28 }}></View>
      </View>

      {/* Loading Indicator */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#1E90FF" style={{ marginTop: 20 }}/>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {productsOfSeller?.length > 0 ? productsOfSeller?.map((product) => (
            <TouchableOpacity 
              key={product._id}
              style={styles.card}
              onPress={() => navigation.navigate('ProductSellerDetail', { product })}
            >

              {/* Barra colorida */}
              <View style={styles.statusBar} />

              {/* Ícone ou imagem do produto */}
              <View style={styles.iconWrapper}>
                {product.image ? (
                   <Image source={{ uri: product.image }} style={styles.productImage} />
                 ) : (
                   <Ionicons name="cube-outline" style={styles.productIcon} />
                 )}

              </View>

              {/* Detalhes do Produto */}
              <View style={styles.content}>
                <Text style={styles.code}>
                   {product?.nome}
                </Text>
                <Text style={styles.createAt}>
                   {product?.price} MT
                </Text>
              </View>

            </TouchableOpacity>
          )) : <Text style={styles.empty}>
            Nenhum produto encontrado.
          </Text>}
        </ScrollView>
      )}

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
  }
});  
