import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../hooks/createConnectionApi';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useToast } from 'react-native-toast-notifications';

const { width } = Dimensions.get('window');


const carouselData = [
  /* Oculto para a próxima versão
  {
    id: '1',
    title: 'Tem uma lista de compras ou receita?',
    subtitle: 'Faça upload e nós tratamos de tudo!',
    icon: 'file-document-outline',
    bgColor: '#9333EA',
  },
  */
  {
    id: '2',
    title: 'Serviço de Reboque',
    subtitle: 'Assistência rápida na estrada',
    image: require('../assets/images/reboque.png'),
  },
  {
    id: '3',
    title: 'Mudanças',
    subtitle: 'Transporte seguro e profissional',
    image: require('../assets/images/mudancas.png'),
  },
  {
    id: '4',
    title: 'Entrega de Gás',
    subtitle: 'O seu gás em casa em minutos',
    image: require('../assets/images/gas.png'),
  },
  {
    id: '5',
    title: 'Entregas Rápidas',
    subtitle: 'A sua encomenda, sempre a horas',
    image: require('../assets/images/entregas.png'),
  }
];

export default function ServicesTab() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const toast = useToast();

  useEffect(() => {
    fetchCatalog();
  }, []);


  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = (currentIndex + 1) % carouselData.length;
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: nextIndex * (width - 40), animated: true });
      }
      setCurrentIndex(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const scrollNext = () => {
    let nextIndex = (currentIndex + 1) % carouselData.length;
    if (scrollViewRef.current) scrollViewRef.current.scrollTo({ x: nextIndex * (width - 40), animated: true });
    setCurrentIndex(nextIndex);
  };

  const scrollPrev = () => {
    let prevIndex = currentIndex === 0 ? carouselData.length - 1 : currentIndex - 1;
    if (scrollViewRef.current) scrollViewRef.current.scrollTo({ x: prevIndex * (width - 40), animated: true });
    setCurrentIndex(prevIndex);
  };

  const renderCarouselItem = ({ item }) => {
    return (
      <View style={[styles.carouselCard, { backgroundColor: item.bgColor || '#FFF' }]}>
        {item.image && (
          <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={styles.carouselImage} />
        )}
        {/* Overlay escuro para imagens */}
        {item.image && <View style={styles.carouselOverlay} />}
        
        <View style={styles.carouselContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.carouselTitle}>{item.title}</Text>
            <Text style={styles.carouselSubtitle}>{item.subtitle}</Text>
          </View>
          {item.icon && <MaterialCommunityIcons name={item.icon} size={40} color="#FFF" style={styles.carouselIcon} />}
        </View>
      </View>
    );
  };

  const renderCarousel = () => (
    <View style={styles.carouselContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
          setCurrentIndex(index);
        }}
      >
        {carouselData.map((item, index) => (
          <React.Fragment key={item.id}>
            {renderCarouselItem({ item })}
          </React.Fragment>
        ))}
      </ScrollView>
      {/* Setas de navegação */}
      <View style={styles.carouselArrowsContainer} pointerEvents="box-none">
        <TouchableOpacity style={styles.carouselArrowButton} onPress={scrollPrev}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.carouselArrowButton} onPress={scrollNext}>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      {/* Indicadores do Slide */}
      <View style={styles.carouselDotsContainer} pointerEvents="none">
        {carouselData.map((_, idx) => (
          <View key={idx} style={[styles.carouselDot, currentIndex === idx && styles.carouselDotActive]} />
        ))}
      </View>
    </View>
  );

  const fetchCatalog = async () => {
    try {
      // Buscar todas as subcategorias de provedores em vez do antigo catálogo
      const { data } = await api.get('/provider-subcategories');
      
      // Agrupar subcategorias pelo seu ProviderType (ex: "Serviços Domésticos", "Motoristas", etc)
      const grouped = {};
      
      data.forEach((sub) => {
        // Filtrar opcionalmente apenas as que pertencem a "Service"
        const classif = sub.providerTypeId?.classificationId?.name?.toLowerCase();
        if (classif === 'service' || classif === 'serviços' || classif === 'serviço') {
          const typeName = sub.providerTypeId?.name || "Outros Serviços";
          const typeId = sub.providerTypeId?._id || typeName;
          
          if (!grouped[typeId]) {
            grouped[typeId] = { _id: typeId, name: typeName, services: [] };
          }
          
          // Mapear para o formato esperado pelo layout antigo
          grouped[typeId].services.push({
            ...sub,
            description: (sub.description && sub.description.trim()) || (sub.providerTypeId && sub.providerTypeId.description && sub.providerTypeId.description.trim()) || ' ',
            icon: sub.iconUrl || sub.icon || 'toolbox-outline'
          });
        }
      });
      
      setCatalog(Object.values(grouped));
    } catch (error) {
      console.error('Erro ao buscar o catálogo de serviços:', error);
      toast.show('Erro ao carregar serviços.', { type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service) => {
    navigation.navigate('RequestDeliv', { selectedService: service });
  };

  const renderServiceCard = ({ item: service }) => {
    // Definir cores de fundo baseadas no ícone ou aleatório/fixo
    const iconColors = {
      'motorbike': { color: '#A855F7', bg: '#F3E8FF' },
      'car': { color: '#3B82F6', bg: '#E0F2FE' },
      'cart-outline': { color: '#22C55E', bg: '#DCFCE7' },
      'package-variant-closed': { color: '#A855F7', bg: '#F3E8FF' },
      'truck-outline': { color: '#D97706', bg: '#FEF3C7' },
      'tow-truck': { color: '#EF4444', bg: '#FEE2E2' },
      'dots-horizontal': { color: '#6B7280', bg: '#F3F4F6' },
      'toolbox-outline': { color: '#7F00FF', bg: '#F3E8FF' }
    };
    
    // Obter cor mapeada pelo ícone, senão usar um default subtil
    let iconName = service.icon || 'toolbox-outline';
    
    if (service.name && service.name.toLowerCase().includes('reboque')) {
      iconName = 'tow-truck';
    } else if (service.name && service.name.toLowerCase().includes('mudan')) {
      iconName = 'truck-outline';
    } else if (service.name && service.name.toLowerCase().includes('box')) {
      iconName = 'package-variant-closed';
    } else {
      if (iconName === 'motorcycle') iconName = 'motorbike';
      if (iconName === 'truck-pickup') iconName = 'truck-outline';
    }

    const mapped = iconColors[iconName] || { color: '#7F00FF', bg: '#F3E8FF' };

    return (
      <TouchableOpacity
        style={styles.gridCard}
        activeOpacity={0.8}
        onPress={() => handleServiceSelect(service)}
      >
        <View style={[styles.cardIconCircle, { backgroundColor: iconName.startsWith('http') ? 'transparent' : mapped.bg, overflow: 'hidden' }]}>
          {iconName.startsWith('http') ? (
            <Image source={{ uri: iconName }} style={{ width: '100%', height: '100%', resizeMode: 'cover', borderRadius: 25 }} />
          ) : (
            <MaterialCommunityIcons name={iconName} size={32} color={mapped.color} />
          )}
        </View>
        <Text style={styles.gridCardTitle} numberOfLines={1}>{service.name}</Text>
        {service.description && service.description.trim() !== '' && (
          <Text style={styles.gridCardSubtitle} numberOfLines={2}>{service.description}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderCategoryBlock = ({ item: category }) => {
    if (!category.services || category.services.length === 0) return null;
    
    return (
      <View style={styles.categoryBlock}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{category.name}</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeText}>{category.services.length}</Text>
          </View>
        </View>
        <FlatList
          data={category.services}
          keyExtractor={(s) => s._id.toString()}
          renderItem={renderServiceCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          scrollEnabled={false}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Serviços</Text>
        <Text style={styles.headerSubtitle}>Encontre o profissional que precisa.</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#7F00FF" />
          <Text style={styles.loaderText}>A carregar catálogo...</Text>
        </View>
      ) : (
        <FlatList
          data={catalog}
          keyExtractor={(c) => c._id.toString()}
          renderItem={renderCategoryBlock}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderCarousel()}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="toolbox-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>Sem serviços disponíveis de momento.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  

  listContainer: { padding: 20, paddingBottom: 100 },
  
  carouselContainer: {
    height: 120,
    marginBottom: 25,
    borderRadius: 16,
    overflow: 'hidden',
  },
  carouselCard: {
    width: width - 40,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    padding: 20,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    resizeMode: 'cover',
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  carouselTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  carouselSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  carouselIcon: {
    marginLeft: 15,
  },

  carouselArrowsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    zIndex: 3,
  },
  carouselArrowButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselDotsContainer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 3,
  },
  carouselDotActive: {
    backgroundColor: '#FFF',
    width: 12,
  },

  
  categoryBlock: {
    marginBottom: 25,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginRight: 10,
  },
  badgeCount: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#7F00FF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  gridCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    height: 'auto',
    minHeight: 130,
  },
  cardIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1A1A1A'
  },
  gridCardSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  
  separator: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 4 },
  
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 10, color: '#666', fontSize: 15 },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, color: '#999', fontSize: 16 },
});
