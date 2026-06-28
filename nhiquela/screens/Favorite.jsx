import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const TABS = [
  { id: 'products', title: 'Produtos', icon: 'cube-outline' },
  { id: 'sellers', title: 'Lojas', icon: 'storefront-outline' },
  { id: 'services', title: 'Serviços', icon: 'briefcase-outline' },
  { id: 'drivers', title: 'Motoristas', icon: 'car-outline' },
];

const Favorite = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState(route.params?.tab || 'products');
  const [favorites, setFavorites] = useState({
    products: [],
    sellers: [],
    services: [],
    drivers: [],
  });
  const [loading, setLoading] = useState(true);

  // Função para carregar favoritos do AsyncStorage
  const loadFavorites = async () => {
    setLoading(true);
    try {
      const keys = ['@fav_products', '@fav_sellers', '@fav_services', '@fav_drivers'];
      const results = await AsyncStorage.multiGet(keys);
      
      const loadedFavs = {
        products: results[0][1] ? JSON.parse(results[0][1]) : [],
        sellers: results[1][1] ? JSON.parse(results[1][1]) : [],
        services: results[2][1] ? JSON.parse(results[2][1]) : [],
        drivers: results[3][1] ? JSON.parse(results[3][1]) : [],
      };
      
      setFavorites(loadedFavs);
    } catch (error) {
      console.error("Erro ao carregar favoritos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Escutar por focos na tela para recarregar caso algo seja adicionado
    const unsubscribe = navigation.addListener('focus', () => {
      loadFavorites();
      if (route.params?.tab) {
        setActiveTab(route.params.tab);
      }
    });
    return unsubscribe;
  }, [navigation, route.params?.tab]);

  // Função para remover um favorito
  const removeFavorite = async (tab, id) => {
    try {
      const storageKey = `@fav_${tab}`;
      const currentList = favorites[tab];
      const updatedList = currentList.filter(item => item._id !== id && item.id !== id);
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));
      
      setFavorites(prev => ({
        ...prev,
        [tab]: updatedList
      }));
    } catch (error) {
      console.error("Erro ao remover favorito:", error);
    }
  };

  const renderEmptyState = () => {
    let message = "Ainda não guardou nenhum ";
    let title = "Lista Vazia";
    
    switch (activeTab) {
      case 'products': message += "produto."; title = "Sem Produtos"; break;
      case 'sellers': message += "loja/fornecedor."; title = "Sem Lojas"; break;
      case 'services': message += "serviço."; title = "Sem Serviços"; break;
      case 'drivers': message += "motorista."; title = "Sem Motoristas"; break;
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCircle}>
          <Ionicons name="heart-dislike-outline" size={48} color="#9333EA" />
        </View>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyMessage}>
          {message} Navegue pela aplicação e clique no ícone de coração para guardar aqui os seus favoritos.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Início')}
          activeOpacity={0.8}
          style={styles.actionBtnContainer}
        >
          <LinearGradient
            colors={['#9333EA', '#7E22CE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionBtn}
          >
            <Text style={styles.actionBtnText}>Explorar App</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    // Como ainda não sabemos a estrutura exata do objeto guardado, criamos um render genérico bonito
    const name = item.name || item.nome || item.title || "Item Favorito";
    const image = item.image || item.logo || item.photo || "https://via.placeholder.com/100";
    const desc = item.description || item.tipoEstabelecimento?.nome || "Detalhes do item";
    
    return (
      <View style={styles.card}>
        <Image source={{ uri: image }} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{name}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{desc}</Text>
        </View>
        <TouchableOpacity 
          style={styles.removeBtn}
          onPress={() => removeFavorite(activeTab, item._id || item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Favoritos</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <FlatList 
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => {
            const isActive = activeTab === item.id;
            return (
              <TouchableOpacity
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(item.id)}
              >
                <Ionicons 
                  name={item.icon} 
                  size={18} 
                  color={isActive ? "#FFF" : "#6B7280"} 
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#9333EA" />
          </View>
        ) : favorites[activeTab].length > 0 ? (
          <FlatList
            data={favorites[activeTab]}
            keyExtractor={(item, index) => `${item._id || item.id}-${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          renderEmptyState()
        )}
      </View>
    </SafeAreaView>
  );
};

export default Favorite;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#9333EA',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  removeBtn: {
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 40,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionBtnContainer: {
    width: '100%',
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});