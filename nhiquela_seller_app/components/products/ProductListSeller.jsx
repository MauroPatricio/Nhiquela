import { StyleSheet, Text, View, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import api from './../../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProductListSeller = () => {
  const [userData, setUserData] = useState(null);
  const [productsOfSeller, setProductsOfSeller] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading by default

  useEffect(() => {
    checkIfUserExist();
  }, []);

  useEffect(() => {
    if (userData) {
      fetchData();
    }
  }, [userData]);

  const fetchData = async () => {
    setIsLoading(true); // Start loading
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
      setIsLoading(false); // End loading
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: "white",  flex:1 }}>
        <Text style={{ fontSize: 25, fontWeight: '700', marginLeft: 14, marginBottom: 40, marginTop: 30,color: '#7F00FF' }}>Lista de produtos</Text>

    <ScrollView
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{
      paddingHorizontal: 15,
    }}
    >
      {productsOfSeller.length > 0 ? (productsOfSeller.map((product)=>(
        <TouchableOpacity onPress={()=>{}}>

        <View key={product._id}  style={styles.wrapper}>
                 <Image source={{ uri: product.image }} style={styles.image} />
                 <Text style={styles.title}>{product.name}</Text>
                 <Text style={styles.price}>{product.price} MT</Text>
        </View>

        </TouchableOpacity>
      )))
      
      : (
             <Text>Não possui nenhum produto disponível.</Text>
           )}
      
    </ScrollView>
    </SafeAreaView>
  );
};

export default ProductListSeller;

const styles = StyleSheet.create({

  loadingContainer:{
      top: 100
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 8,
    // marginBottom: 10,
    resizeMode: 'cover',
  },
  wrapper: {
    // letterSpacing: 1,
    backgroundColor: '#DCDCDC',
    padding: 10,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'

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
  cartIcon: {
    color: '#7F00FF',
    // padding: 20,
    borderRadius: 22,
    backgroundColor: 'white',
  },
  code: {
    fontWeight: '500',
    fontSize: 17,
    color: 'white',
    marginLeft: 10,
    alignContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    top: 20,
  },
  status: {
    fontWeight: '700',
    fontSize: 15,
    color: 'white',
    marginLeft: 10,
  },
  price: {
    // color: 'white',
    fontSize: 15,
    fontWeight: '600'
  }
});
