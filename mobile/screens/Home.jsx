import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import Categories from '../components/Categories';
import SellersView from '../components/SellersView';
import ProductHomeView from '../components/ProductHomeView';
import style from './home.style';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomSheet from '@gorhom/bottom-sheet';
import { useSelector } from 'react-redux';
import { selectBasketItems } from '../features/basketSlice';
import { Welcome } from './Index';

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const bottomSheetRef = useRef(null);
  const items = useSelector(selectBasketItems);

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
      <Welcome/>

      <ScrollView>
        <Categories categories={categories} onCategorySelect={handleCategorySelect} />
        <SellersView title='Fornecedores' description='Nossos fornecedores disponíveis para si' />
        {categories.map((category) => {
          const match = category.nome.match(/\((.*?)\)/);
          const description = match ? match[1] : '';
          const title = category.nome.replace(/\(.*?\)/, '').trim();
          const allProductsByCategories = category.products || [];
          
          return (
            <View
              key={category._id}
            >
              <ProductHomeView
                title={title}
                description={description}
                categoryid={category._id}
                products={allProductsByCategories}
              />
            </View>
          );
        })}
        <View style={{ marginBottom: 250 }} />
      </ScrollView>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1} 
        snapPoints={[0.1, '50%']} 
        enablePanDownToClose={true} 
        onClose={() => handleCloseBottomSheet()}
      >
        
        {selectedCategory && (
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>Produtos em {selectedCategory.nome}</Text>
            {selectedCategory.products.map(product => (
              <View key={product._id} style={styles.productContainer}>
                <Text>{product.name}</Text>
                
              </View>
            ))}
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomSheetContent: {
    flex: 1,
    padding: 16,
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
});

export default Home;
