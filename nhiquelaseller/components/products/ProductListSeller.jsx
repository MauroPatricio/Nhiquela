import { showMessage } from "react-native-flash-message";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, Image, Alert, Animated, RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import api from '../../hooks/createConnectionApi';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../../constants/theme';

const SkeletonCard = () => {
  const animatedValue = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  return (
    <Animated.View style={[styles.card, { opacity: animatedValue }]}>
      <View style={[styles.productImage, { backgroundColor: '#E0E0E0', marginRight: 16 }]} />
      <View style={styles.content}>
        <View style={{ height: 16, backgroundColor: '#E0E0E0', borderRadius: 4, width: '80%', marginBottom: 8 }} />
        <View style={{ height: 12, backgroundColor: '#E0E0E0', borderRadius: 4, width: '50%', marginBottom: 6 }} />
        <View style={{ height: 12, backgroundColor: '#E0E0E0', borderRadius: 4, width: '40%', marginBottom: 12 }} />
        <View style={styles.buttonRow}>
          <View style={{ height: 32, width: 44, backgroundColor: '#E0E0E0', borderRadius: 8 }} />
          <View style={{ height: 32, width: 44, backgroundColor: '#E0E0E0', borderRadius: 8 }} />
          <View style={{ height: 32, width: 90, backgroundColor: '#E0E0E0', borderRadius: 8 }} />
        </View>
      </View>
    </Animated.View>
  );
};

const ProductListSeller = () => {
  const [userData, setUserData] = useState(null);
  const [productsOfSeller, setProductsOfSeller] = useState([]);
  const [userLogin, setUserLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    checkIfUserExist();
  }, []);

  useEffect(() => {
    if (route.params?.newProduct) {
      setProductsOfSeller(prev => [route.params.newProduct, ...prev]);
      navigation.setParams({ newProduct: undefined });
    }
    if (route.params?.updatedProduct) {
      setProductsOfSeller(prev => prev.map(p => p._id === route.params.updatedProduct._id ? route.params.updatedProduct : p));
      navigation.setParams({ updatedProduct: undefined });
    }
  }, [route.params?.newProduct, route.params?.updatedProduct]);

  useFocusEffect(
    useCallback(() => {
      if (userData) {
        fetchData(1, true);
      }
    }, [userData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(1, true).then(() => setRefreshing(false));
  }, [userData]);

  const fetchData = async (pageNumber = 1, replace = false) => {
    if (pageNumber > 1 && !hasMore) return;
    
    if (pageNumber > 1) setIsFetchingMore(true);
    else if (!replace || productsOfSeller.length === 0) setIsLoading(true); // Don't show skeleton on silent refreshes

    try {
      const response = await api.get(`products?seller=${userData._id}&page=${pageNumber}&pageSize=20&order=oldest&t=${Date.now()}`, {
        headers: { authorization: `Bearer ${userData?.token}` },
      });

      if (response?.status === 200) {
        const newProducts = response?.data?.products || [];
        setProductsOfSeller(prev => replace ? newProducts : [...prev, ...newProducts]);
        setPage(pageNumber);
        setHasMore(newProducts.length === 20); // If less than pageSize, no more items
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
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryGlow }]}>
             <Ionicons name="cube-outline" size={32} color={COLORS.primary} />
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: product.isActive ? '#E8F5E9' : '#FFEBEE' }]}>
           <Text style={[styles.statusBadgeText, { color: product.isActive ? '#2E7D32' : '#C62828' }]}>
              {product.isActive ? 'Visível' : 'Oculto'}
           </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.productTitle} numberOfLines={2}>{product?.nome}</Text>
        <Text style={styles.productPrice}>{product?.price} MT</Text>
        <Text style={styles.productStock}>{product?.countInStock} unidade(s) em stock</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('NewProduct', { productToEdit: product })}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.errorBg }]}
            onPress={() => handleDelete(product._id)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, product.isActive ? styles.btnInactive : styles.btnActive]}
            onPress={() => handleToggleStatus(product)}
          >
            <Ionicons name={product.isActive ? "eye-off" : "eye"} size={16} color={product.isActive ? COLORS.textSecondary : "#fff"} />
            <Text style={[styles.toggleBtnText, { color: product.isActive ? COLORS.textSecondary : '#fff' }]}>
              {product.isActive ? "Ocultar" : "Ativar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Produtos</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.scroll}>
          {[1, 2, 3, 4].map(key => <SkeletonCard key={key} />)}
        </View>
      ) : (
        <FlatList
          data={productsOfSeller}
          keyExtractor={(item) => item._id}
          renderItem={renderProduct}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListHeaderComponent={
            <View style={styles.kpiContainer}>
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="cube" size={24} color="#1976D2" />
                  </View>
                  <Text style={styles.kpiValue}>{productsOfSeller.length}</Text>
                  <Text style={styles.kpiLabel}>Total Produtos</Text>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="cash" size={24} color="#388E3C" />
                  </View>
                  <Text style={styles.kpiValue}>
                    {productsOfSeller.reduce((sum, p) => sum + ((p.priceFromSeller || 0) * (p.countInStock || 0)), 0).toLocaleString()} MT
                  </Text>
                  <Text style={styles.kpiLabel}>Valor em Stock</Text>
                </View>
              </View>
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FFF3E0' }]}>
                    <MaterialCommunityIcons name="tag-multiple" size={24} color="#F57C00" />
                  </View>
                  <Text style={styles.kpiValue}>{productsOfSeller.filter(p => p.isActive).length}</Text>
                  <Text style={styles.kpiLabel}>Ativos</Text>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="alert-circle" size={24} color="#D32F2F" />
                  </View>
                  <Text style={styles.kpiValue}>{productsOfSeller.filter(p => p.countInStock === 0).length}</Text>
                  <Text style={styles.kpiLabel}>Sem Stock</Text>
                </View>
              </View>
              <Text style={styles.listHeaderTitle}>Lista de Produtos</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <Ionicons name="cube-outline" size={64} color={COLORS.textMuted} />
               <Text style={styles.emptyTitle}>Sem Produtos</Text>
               <Text style={styles.emptyText}>Você ainda não adicionou nenhum produto. Toque no botão + para começar.</Text>
            </View>
          }
          ListFooterComponent={
            isFetchingMore ? <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }}/> : <View style={{ paddingBottom: 100 }}/>
          }
          onEndReached={() => {
            if (hasMore && !isFetchingMore && !isLoading) {
              fetchData(page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('NewProduct')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

export default ProductListSeller;

const styles = StyleSheet.create({  
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
  },
  scroll: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  imageContainer: {
    marginRight: 16,
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.lg,
  },
  statusBadge: {
    marginTop: -10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#fff',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: SIZES.sm,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  productStock: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnActive: {
    backgroundColor: COLORS.success,
  },
  btnInactive: {
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  toggleBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    lineHeight: 22,
  },
  floatingButton: {
    position: 'absolute',
    right: 24,
    bottom: 110,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  kpiContainer: {
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiCard: {
    backgroundColor: '#FFF',
    width: '48%',
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.light,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  listHeaderTitle: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  }
});
