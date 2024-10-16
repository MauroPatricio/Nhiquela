import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh
  const bottomSheetRef = useRef(null);
  const items = useSelector(selectBasketItems);
  const navigation = useNavigation();

  useEffect(() => {
    checkIfUserExist();
    fetchData();
    fetchProductData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Re-fetch data when the screen is focused
      fetchData();
      fetchProductData();
    }, [])
  );

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
        
        const categoriesMap = new Map();
        products.forEach(product => {
          const category = product.categoryDetails;
          if (!categoriesMap.has(category._id)) {
            categoriesMap.set(category._id, {
              ...category,
              products: [],
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

  // Handle refresh when the user pulls down
  const onRefresh = async () => {
    setRefreshing(true);  // Start the refreshing indicator
    await fetchData();    // Fetch new category data
    await fetchProductData();  // Fetch new product data
    setRefreshing(false); // Stop the refreshing indicator
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
              <Ionicons name="cart-outline" size={30} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Welcome />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}  // Bind the refreshing state
            onRefresh={onRefresh}    // Pull-to-refresh action
            colors={['#7F00FF']}     // Optional: Set the refresh control color
          />
        }
      >
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
              return titleA.localeCompare(titleB);
            })
            .map((category) => {
              const title = category.nome.replace(/\(.*?\)/, '').trim();
              return (
                <TouchableOpacity
                  key={category._id}
                  style={styles.wrapper}
                  onPress={() => handleCategorySelect(category)}
                >
                  <Text style={styles.title}>{title}</Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        <SellersView title='Fornecedores' description='Nossos fornecedores disponíveis para si' />

        {categories.map((category) => {
          const match = category.nome.match(/\((.*?)\)/);
          const description = match ? match[1] : '';
          const allProductsByCategories = category.products || [];

          if (allProductsByCategories.length === 0) return null;

          return (
            <View key={category._id}>
              <ProductHomeView
                key={`producthomeview-${category._id}`}
                title={category.nome.replace(/\(.*?\)/, '').trim()}
                description={description}
                categoryid={category._id}
                products={allProductsByCategories}
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
                  <TouchableOpacity
                    key={product._id}
                    style={styles.productContainer}
                    onPress={() => navigation.navigate("ProductDetail", { item })}
                  >
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
                            {product.isOrdered ? 
                              <Badge style={{ color: 'white', backgroundColor: 'green' }}> Por encomenda </Badge> : 
                              product.countInStock !== 0 ? 
                                product.countInStock + ` unidade(s)` : 
                                <Badge bg='danger'>Sem stock</Badge>}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.productPrice}>{product.price} MT</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ marginBottom: 210 }} />
            </ScrollView>
          </View>
        )}
      </BottomSheetComponent>
    </SafeAreaView>
  );
};



const styles = StyleSheet.create({
  bottomSheetContent: {
    // flex: 1,
    // padding: 30,
    backgroundColor: '#F9F9F9', // Light background for the bottom sheet
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20,
    // elevation: 5,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333', // Darker text for better readability
  },
  productContainer: {
    // padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF', // White background for product items
  },
  wrapper: {
    letterSpacing: 1,
    marginRight: 10,
    backgroundColor: '#7F00FF', // Bold category color
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderColor: '#4B0082',
    borderWidth: 0,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.2,
    // shadowRadius: 5,
    elevation: 5,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 10, // Rounded corners for images
  },
  productDetails: {
    flex: 1,
  },
  productBrand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  productDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F00FF', // Highlight price color
  },
  cartCount: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: 'red', // Red for cart count badge
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cartNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  appBarWrapper: {
    backgroundColor: '#FFFFFF',
    elevation: 5,
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  cover: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  location: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7F00FF', // Highlighted user greeting
    marginTop: 5,
    marginLeft: 10,
  },
});


export default Home;
