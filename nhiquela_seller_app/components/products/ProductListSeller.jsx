import { StyleSheet, Text, FlatList, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import api from './../../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProductListSeller = () => {
    const [userData, setUserData] = useState(null);
    const [productsOfSeller, setProductsOfSeller] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // Store available statuses

      
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

      if(response.status==200){
        console.log(response.data.products)
        setProductsOfSeller(response.data.products)
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


    return (
        <View style={styles.container}>
           <Text>Lista de Produtos</Text>     
        </View>
    )
}

export default ProductListSeller

const styles = StyleSheet.create({

    loadingContainer:{
        flex:1,
        alignItems: "center",
        justifyContent: "center",
        alignContent: "center"
    },
    container: {
        alignItems: "center",
        paddingTop: 35,
    },
    separator:{
        height:16,
    
    }
})