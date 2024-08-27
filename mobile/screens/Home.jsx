import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import styles from './home.style';
import { Ionicons } from "@expo/vector-icons"
import { Welcome } from './Index';
import ProductRow from '../components/products/ProductRow';
import CarouselAnimation from '../components/CarouselAnimation';
import ProductView from '../components/products/ProductView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Categories from '../components/Categories';
import SellersView from '../components/SellersView';
import { useSelector } from 'react-redux'
import { selectBasketItems, selectBasketTotal } from '../features/basketSlice'
import { useNavigation } from '@react-navigation/native'


const Home = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const items = useSelector(selectBasketItems);


  useEffect(() => {
    checkIfUserExist();
  }, [])

  const checkIfUserExist = async () => {
    const id = await AsyncStorage.getItem('id');
    const userId = `user${JSON.parse(id)}`;

    try {
      const currentUser = await AsyncStorage.getItem(userId);

      if (currentUser !== null) {
        const parseData = JSON.parse(currentUser);
        setUserData(parseData);
        setUserLogin(true);
      }
    } catch (error) {
      console.log(error)
    }
  }


  return (
    <SafeAreaView style={{ backgroundColor: "white" }}>
      <View style={styles.appBarWrapper}>
        <View style={styles.appBar}>
          <Image
            source={require('../assets/default1.jpg')}
            style={styles.cover}
          />
          <Text style={styles.location}>{userData !== null ? `Olá, ${userData.name.length < 50 ? userData.name : userData.name.substring(0, 40) + '...'}` : 'Faça login'}</Text>

          <View style={{ alignItems: "flex-end" }} >
            <View style={styles.cartCount}>
              <Text style={styles.cartNumber}>{items.length}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
              <Ionicons name="cart-outline" size={26} />
            </TouchableOpacity>
          </View>
        </View>
        {/* <View style={styles.locationView}>

          <Ionicons name="location-outline" size={24}/>
          <Text >Maputo</Text>
        </View> */}
      </View>
      <Welcome />
      <ScrollView >
        <Categories />
        {/* <CarouselAnimation/> */}
        <SellersView title='Fornecedores' description='Nossos fornecedores disponíveis para si' />
        <SellersView title='Fornecedores' description='Nossos fornecedores disponíveis para si' />
        <SellersView title='Fornecedores' description='Nossos fornecedores disponíveis para si' />
        <SellersView title='Fornecedores' description='Nossos fornecedores disponíveis para si' />
        {/* <ProductView /> */}
        { /*Aqui devo rever o erro de Flatlist nesse ProductRow*/}
        {/* <ProductRow /> */}
      </ScrollView>
    </SafeAreaView>
  )
}

export default Home

