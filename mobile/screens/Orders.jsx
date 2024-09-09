import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native'
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import OrderDetails from './OrderDetailScreen';
import OrderList from './OrderList';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons";


const Orders = () => {
  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [orders, setOrders] = useState(null);

  const checkIfUserExist = async() =>{
    const id = await AsyncStorage.getItem('id');
    const userId = `user${JSON.parse(id)}`;

    try{
      const currentUser = await AsyncStorage.getItem(userId);
 
      if(currentUser !== null){
        const parseData = JSON.parse(currentUser);
        setUserData(parseData);
        setUserLogin(true);
      }
    }catch(error){
      console.log(error)
    }
  }

  useEffect(()=>{
    checkIfUserExist();
    },[])
 
  
 
    const fetchData = async () => {
      try {
        setIsLoading(true);
        if (userData == null) return;
        const { data } = await api.get('/orders/mine', {
          headers: { Authorization: `Bearer ${userData.token}` },
        });
         setIsLoading(false);
        
          setOrders(data || []);
  
      } catch (error) {
        console.error(error);
      }
    };  

  // Refresh data when the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchData(); // Fetch new data when tab is focused
    }, [])
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
    const year = date.getFullYear();
  
    return `${day}/${month}/${year}`;
  };
  

  return (
    <>
    <SafeAreaView>
    <Text style={styles.title}>Meus Pedidos</Text>
<ScrollView  
    style={{ backgroundColor: "white" }}
    contentContainerStyle={{
        paddingHorizontal: 10,
      }}>

 {isLoading ? (
        <ActivityIndicator size={'large'} color={'#7F00FF'} />
      ) :
       (

        orders && orders.map((item)=>{
          return(

    <TouchableOpacity style={styles.container} onPress={()=>{navigation.navigate('OrderDetailsScreen', {item})}}>
   
        <Ionicons name="cart-outline" size={25} style={styles.cartIcon} />
        <View>
        <Text style={styles.code}>{item.code}</Text>
        </View>
        <View>
        <Text style={styles.createAt}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.price}>{item.totalPrice} MT</Text>
        <Text style={styles.status}>{item.status}</Text>
        </View>
   
      
      </TouchableOpacity>
      

)
        })
      
        
      )}
        <View style={{marginBottom: 210}} />
    </ScrollView>
    </SafeAreaView>
    </>
  );
};

export default Orders;



const styles = StyleSheet.create({
  
  container:{
      flexDirection: 'row',
      justifyContent:'space-between',
      backgroundColor: '#7F00FF',
      borderRadius: 5,
      shadowColor: '#000',
      shadowOffset: { width: 3, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 5,
      marginBottom: 10,
      padding: 7
      // width:100
  },
  title:{
    fontSize: 30,
    fontWeight: '700',
    padding:15

  },
  cartIcon:{
    color: '#7F00FF',
    padding: 20, 
    borderRadius: 22, 
    backgroundColor: 'white'
  },
  code:{
    fontWeight: '500',
    fontSize: 17,
    color: 'white',
    marginLeft: 10,
    alignContent: 'center',
    alignItems:'center',
    textAlign:'center',
    top:20
  },
  status:{
    fontWeight: '700',
    fontSize: 15,
    color: 'white',
    marginLeft: 10
  },
  image: {
      width: 70,
      backgroundColor:"white",
      borderRadius: 12,
      justifyContent: "center",
      alignContent: "center",
      marginLeft: 5
  },
  productImg:{
      width: "100%",
      height: 60
  },
  textContainer: {
      justifyContent:'space-between',
      padding: 10,
      // backgroundColor: '#fff',
      borderRadius: 5,
      marginBottom: 10,
      color: 'white'
  },
  productTitle:{
      fontSize: 12,
      fontWeight: "700",
      color: "black",
      width:240,
  
  },
  seller:{
      fontSize: 12,
      color: "grey",
      marginTop: 3,
      width:80,
  
  },
  price: {
    color: 'white',
    fontSize: 15,
    marginLeft: 10
  },
  createAt: {
    color: 'white',
    fontSize: 15,
    marginLeft: 10
  }
  
  })