import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import Categories from '../components/Categories';
import SellersView from '../components/SellersView';
import ProductHomeView from '../components/ProductHomeView';
import style from './home.style';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { selectBasketItems } from '../features/basketSlice';
import { Welcome } from './Index';
import BottomSheetComponent from '../components/BottomSheetComponent';
import { Badge } from 'react-native-paper';

import { useNavigation } from "@react-navigation/native"

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const bottomSheetRef = useRef(null);
  const items = useSelector(selectBasketItems);

  const navigation = useNavigation();

  useEffect(() => {
    checkIfUserExist();
    fetchData();
    fetchProductData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/categories');
      if (response.status === 200) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProductData = async () => {
    try {
      const response = await api.get('/products/bycategory');
      if (response.status === 200) {
        const products = response.data || [];
        setProducts(products);

        const categoriesMap = new Map();
        products.forEach(product => {
          const category = product.categoryDetails;
          if (!categoriesMap.has(category._id)) {
            categoriesMap.set(category._id, {
              ...category,
              products: []
            });
          }
          categoriesMap.get(category._id).products.push(product);
        });

        const categoriesWithProducts = Array.from(categoriesMap.values())
          .filter(category => category.products.length > 0);

        setCategories(categoriesWithProducts);
      }
    } catch (error) {
      console.error(error);
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

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setBottomSheetOpen(true);
    bottomSheetRef.current?.expand();
  };

  const handleCloseBottomSheet = () => {
    setBottomSheetOpen(false);
    bottomSheetRef.current?.close();
  };

  return (
    <SafeAreaView style={{ backgroundColor: "white" }}>
      <View style={style.appBarWrapper}>
        <View style={style.appBar}>
          <Image
            source={require('../assets/default1.jpg')}
            style={style.cover}
          />
          <Text style={style.location}>{userData ? `Olá, ${userData.name}` : 'Faça login'}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <View style={style.cartCount}>
              <Text style={style.cartNumber}>{items.length}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
              <Ionicons name="cart-outline" size={26} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Welcome />

      <ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 15,
          }}
        >
          {categories
            .sort((a, b) => {
              const titleA = a.nome.replace(/\(.*?\)/, '').trim().toUpperCase();
              const titleB = b.nome.replace(/\(.*?\)/, '').trim().toUpperCase();
              if (titleA < titleB) return -1;
              if (titleA > titleB) return 1;
              return 0;
            })
            ?.map((category) => {
              const title = category.nome.replace(/\(.*?\)/, '').trim();
              return (
                <TouchableOpacity style={styles.wrapper} onPress={() => handleCategorySelect(category)}>
                  <Text style={styles.title}>{title}</Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        <SellersView title='Fornecedores' description='Nossos fornecedores disponíveis para si' />

        {categories?.map((category) => {
          const match = category.nome.match(/\((.*?)\)/);
          const description = match ? match[1] : '';
          const title = category.nome.replace(/\(.*?\)/, '').trim();
          const allProductsByCategories = category.products || [];

          return (
            <View key={category._id}>
              <ProductHomeView
                title={title}
                description={description}
                categoryid={category._id}
                products={allProductsByCategories}
                key={category._id}
              />
            </View>
          );
        })}
        <View style={{ marginBottom: 250 }} />
      </ScrollView>

      <BottomSheetComponent
        isOpen={isBottomSheetOpen}
        toggleSheet={handleCloseBottomSheet}
      >
        {selectedCategory && (
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>Produtos em {selectedCategory.nome}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              {selectedCategory.products?.map((product) => {
                const item = { item: product };
                return (
                  <TouchableOpacity key={product._id} style={styles.productContainer} onPress={() => navigation.navigate("ProductDetail", { item })}>
                    <View style={styles.productRow}>
                      <Image
                        source={{ uri: product.image }}
                        style={styles.logo}
                      />
                      <View style={styles.productDetails}>
                        <Text style={styles.productBrand}>{product.brand}</Text>
                        <Text style={styles.productDescription}>{product.description}</Text>
                        <View style={styles.ratingRow}>
                          <Text>
                            {product.isOrdered ? <Badge style={{ color: 'white', backgroundColor: 'green' }}> Por encomenda </Badge> : product.countInStock !== 0 ? product.countInStock + ` unidade(s)` : <Badge bg='danger'>Sem stock</Badge>}
                        </Text>
                        </View>
                      </View>
                      <Text style={styles.productPrice}>{product.price} MT</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{marginBottom: 210}} />
              
            </ScrollView>
          </View>
        )}
      </BottomSheetComponent>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomSheetContent: {
    flex: 1,
    padding: 16,
    height: 150
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  wrapper: {
    letterSpacing: 1,
    marginRight: 7,
    backgroundColor: '#7F00FF',
    padding: 6,
    borderRadius: 15,
    // borderWidth: 0.5,
    borderColor: '#4B0082',
    shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.8,
    // shadowRadius: 3,
    // elevation: 5,
    // justifyContent: 'center',
    // alignItems: 'center'

  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginLeft:8,
    marginRight: 8

  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
  },
  productBrand: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  productDescription: {

    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  numReviewsText: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
});

export default Home;
