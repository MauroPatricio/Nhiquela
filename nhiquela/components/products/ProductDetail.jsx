import { Image } from 'expo-image';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Ionicons, SimpleLineIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { addToBasket, removeFromBasket, selectBasketItemsWithId, addSellers, removeSeller, getItemsBySellerId } from '../../features/basketSlice';
import { selectUserLocation } from '../../features/locationSlice';
import { getDistance } from 'geolib';
import BasketIcon from '../BasketIcon';
import { useToast } from 'react-native-toast-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const PRIMARY_COLOR = '#7F00FF';

const ProductDetail = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const toast = useToast();

  const item = route.params?.item || {};
  const itemData = item?.item !== undefined ? item?.item : item;

  const {
    _id,
    nome = itemData?.nome,
    name = itemData?.name,
    image = itemData?.image,
    description,
    rating = itemData.rating || 0,
    numReviews = itemData?.numReviews || 0,
    countInStock = itemData?.countInStock || 0,
    priceFromSeller = itemData?.priceFromSeller,
    price = itemData?.price,
    onSale = itemData?.onSale,
    discount = itemData?.discount,
    comissionPercentage,
    sellerEarningsAfterDiscount,
    isOrdered = itemData?.isOrdered,
    orderPeriod = itemData?.orderPeriod,
    province = itemData?.province,
  } = itemData;

  const seller = itemData?.sellerDetails || itemData?.seller;
  const sellerName = seller?.seller?.name || seller?.name || 'Fornecedor N/A';

  const [count, setCount] = useState(0);
  const [activeTab, setActiveTab] = useState('detalhes'); // 'detalhes' ou 'fornecedor'

  const items = useSelector(selectBasketItemsWithId(_id));
  const userLocation = useSelector(selectUserLocation);
  const dispatch = useDispatch();

  const [freightCalculated, setFreightCalculated] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Estado em tempo real: aberta/fechada
  // isSellerOpen vem do backend no produto; seller?.openstore é o fallback legacy
  const initialOpen = itemData?.isSellerOpen !== undefined
    ? itemData.isSellerOpen
    : (seller?.openstore !== false); // se undefined => assume aberta
  const [isSellerOpen, setIsSellerOpen] = useState(initialOpen);

  const [isFavorite, setIsFavorite] = useState(false);

  const checkIsFavorite = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('@fav_products');
      if (stored) {
        const parsed = JSON.parse(stored);
        const exists = parsed.some(fav => fav._id === _id);
        setIsFavorite(exists);
      }
    } catch (error) {
      console.error("Erro ao verificar favorito:", error);
    }
  }, [_id]);

  useEffect(() => {
    checkIsFavorite();
  }, [checkIsFavorite]);

  const toggleFavorite = async () => {
    try {
      const stored = await AsyncStorage.getItem('@fav_products');
      let parsed = stored ? JSON.parse(stored) : [];

      if (isFavorite) {
        parsed = parsed.filter(fav => fav._id !== _id);
        setIsFavorite(false);
        toast.show('Removido dos favoritos', { type: 'warning', placement: 'top' });
      } else {
        parsed.push(itemData);
        setIsFavorite(true);
        toast.show('Adicionado aos favoritos', { type: 'success', placement: 'top' });
      }

      await AsyncStorage.setItem('@fav_products', JSON.stringify(parsed));
    } catch (error) {
      console.error("Erro ao atualizar favorito:", error);
      toast.show('Erro ao atualizar favorito', { type: 'danger', placement: 'top' });
    }
  };

  // Escuta evento socket para actualizar o estado da loja instantaneamente
  useEffect(() => {
    const isDev = process.env.NODE_ENV !== 'production';
    const import_api = require('../../hooks/createConnectionApi').default;
    const baseURL = import_api?.defaults?.baseURL?.replace('/api', '') || (isDev ? 'http://192.168.0.5:5002' : 'https://api.nhiquelaservicos.com');
    const productSocket = io(`${baseURL}`, { transports: ['websocket'] });

    const sellerId = String(seller?._id || seller?.seller?._id || '');

    const handleStoreStatus = ({ sellerId: changedId, isOpen }) => {
      if (sellerId && String(changedId) === sellerId) {
        setIsSellerOpen(isOpen);
      }
    };

    productSocket.on('storeStatusChanged', handleStoreStatus);

    return () => {
      productSocket.off('storeStatusChanged', handleStoreStatus);
      productSocket.disconnect();
    };
  }, []);

  const calculateFreight = () => {
    setIsCalculating(true);
    if (!userLocation) {
      toast.show('Sua localização não está disponível.', { type: 'danger', placement: 'top' });
      setIsCalculating(false);
      return;
    }
    
    // A API retorna seller.location.lat / seller.location.lng (objeto embebido)
    // com fallback para seller.latitude / seller.longitude (campos directos)
    const sellerLat = parseFloat(
      seller?.location?.lat ?? seller?.latitude ?? seller?.seller?.location?.lat ?? seller?.seller?.latitude
    );
    const sellerLng = parseFloat(
      seller?.location?.lng ?? seller?.longitude ?? seller?.seller?.location?.lng ?? seller?.seller?.longitude
    );

    if (!isNaN(sellerLat) && !isNaN(sellerLng)) {
      const dist = getDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: sellerLat, longitude: sellerLng }
      );
      
      const distanceInKm = dist / 1000;
      // Preço base: 100 MT; acrescenta 10 MT por km acima de 10 km
      let price = 100;
      if (distanceInKm >= 10) {
        price = 100 + (distanceInKm * 10);
      }
      
      setFreightCalculated({ distance: distanceInKm.toFixed(1), price: price.toFixed(2) });
    } else {
      toast.show('A localização deste fornecedor não está disponível.', { type: 'warning', placement: 'top' });
    }
    setIsCalculating(false);
  };

  const addItemToBasket = () => {
    const currentQuantity = items.length;
    if (currentQuantity + count >= countInStock && !isOrdered) return;
    setCount(count + 1);
    
    dispatch(addToBasket({
      _id, nome, name, image, description, rating, numReviews, countInStock,
      priceFromSeller, price, onSale, seller, sellerName, discount,
      comissionPercentage, sellerEarningsAfterDiscount,
      quantity: currentQuantity + count + 1,
    }));
    
    dispatch(addSellers({ seller }));
    
    toast.show(`${nome} adicionado ao carrinho!`, {
      type: 'success', placement: 'top', duration: 3000, animationType: 'slide-in',
    });
  };

  const removeItem = () => {
    if (count === 0) return;
    setCount(count - 1);
    
    if (count === 1) {
      dispatch(removeFromBasket({ _id }));
      const remainingItemsFromSeller = getItemsBySellerId(seller._id);
      if (remainingItemsFromSeller.length === 0) {
        dispatch(removeSeller({ sellerId: seller._id }));
      }
    }
    toast.show(`${nome} removido do carrinho!`, {
      type: 'warning', placement: 'top', duration: 3000, animationType: 'slide-in',
    });
  };

  const navigateToSeller = () => {
    if (!seller) return;
    const targetSeller = seller.seller || seller;
    // Extract correct user account ID (from seller.userId) so we can query /users/:id successfully
    const correctId = seller.userId?._id || seller.userId || seller._id || seller.id || targetSeller._id || targetSeller.id;
    navigation.navigate('SellerScreen', {
      id: correctId,
      name: targetSeller.name || seller.name,
      logo: targetSeller.logo || seller.logo,
      description: targetSeller.description || seller.description,
      rating: targetSeller.rating || seller.rating,
      numReviews: targetSeller.numReviews || seller.numReviews,
      province: targetSeller.province || seller.province,
      address: targetSeller.address || seller.address,
      latitude: targetSeller.latitude || seller.latitude,
      longitude: targetSeller.longitude || seller.longitude,
      openstore: targetSeller.openstore !== undefined ? targetSeller.openstore : (seller.openstore !== undefined ? seller.openstore : true),
      tipoEstabelecimento: targetSeller.tipoEstabelecimento || seller.tipoEstabelecimento
    });
  };

  // UI Helpers
  const renderStars = (ratingValue) => {
    return (
      <View style={styles.starsRow}>
        {[...Array(5)].map((_, idx) => (
          <Ionicons 
            key={idx} 
            name={idx < Math.round(ratingValue) ? "star" : "star-outline"} 
            size={16} 
            color="#FFD700" 
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BasketIcon />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header Imagem */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          
          {/* Header Actions */}
          <SafeAreaView style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={toggleFavorite}>
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={24} 
                color={isFavorite ? "#EF4444" : "#333"} 
              />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Badges Flutuantes */}
          <View style={styles.floatingBadges}>
            {onSale && (
              <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}>
                <Text style={styles.badgeText}>Promoção</Text>
              </View>
            )}
            {isOrdered ? (
              <View style={[styles.badge, { backgroundColor: '#FF9500' }]}>
                <Text style={styles.badgeText}>Encomenda</Text>
              </View>
            ) : countInStock > 0 ? (
              <View style={[styles.badge, { backgroundColor: '#34C759' }]}>
                <Text style={styles.badgeText}>Em Stock ({countInStock})</Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: '#8E8E93' }]}>
                <Text style={styles.badgeText}>Esgotado</Text>
              </View>
            )}
          </View>
        </View>

        {/* Informações Principais */}
        <View style={styles.contentSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{nome || name}</Text>
          </View>

          <View style={styles.ratingRow}>
            {renderStars(rating)}
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.reviewsText}>({numReviews} avaliações)</Text>
          </View>

          <View style={styles.priceRow}>
            {onSale ? (
              <>
                <Text style={styles.promoPrice}>{discount} MT</Text>
                <Text style={styles.originalPrice}>{price} MT</Text>
                <View style={styles.savingBadge}>
                  <Text style={styles.savingText}>Poupança de {(price - discount).toFixed(2)} MT</Text>
                </View>
              </>
            ) : (
              <Text style={styles.normalPrice}>{price} MT</Text>
            )}
          </View>
        </View>

        {/* Separador */}
        <View style={styles.divider} />

        {/* Informação do Fornecedor Rápida */}
        <TouchableOpacity style={styles.supplierCard} activeOpacity={0.8} onPress={navigateToSeller}>
          <View style={styles.supplierIcon}>
            <Ionicons name="storefront" size={24} color={PRIMARY_COLOR} />
          </View>
          <View style={styles.supplierInfo}>
            <Text style={styles.supplierName}>{sellerName}</Text>
            {province?.name ? (
              <Text style={styles.supplierLocation}>
                <Ionicons name="location" size={12} color="#666" /> {province.name}
              </Text>
            ) : (
              <Text style={styles.supplierLocation}>
                <Ionicons name="location" size={12} color="#666" /> Localização Indisponível
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        {/* Tabs de Detalhes */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'detalhes' && styles.activeTab]}
            onPress={() => setActiveTab('detalhes')}
          >
            <Text style={[styles.tabText, activeTab === 'detalhes' && styles.activeTabText]}>Descrição</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'especificacoes' && styles.activeTab]}
            onPress={() => setActiveTab('especificacoes')}
          >
            <Text style={[styles.tabText, activeTab === 'especificacoes' && styles.activeTabText]}>Especificações</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentSection}>
          {activeTab === 'detalhes' ? (
            <Text style={styles.descriptionText}>{description || 'Sem descrição disponível para este produto. Verifique as especificações ou contacte o fornecedor.'}</Text>
          ) : (
            <View style={styles.specsContainer}>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Categoria</Text>
                <Text style={styles.specValue}>{itemData.category?.name || 'N/A'}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Stock Mínimo</Text>
                <Text style={styles.specValue}>{isOrdered ? 'Sob encomenda' : '1 unidade'}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Estado</Text>
                <Text style={styles.specValue}>Novo</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.divider} />
        
        {/* Garantias */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Porquê comprar no Nhiquela?</Text>
          <View style={styles.trustFeatures}>
            <View style={styles.trustItem}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#34C759" />
              <Text style={styles.trustText}>Pagamento 100% Seguro</Text>
            </View>
            <View style={styles.trustItem}>
              <MaterialCommunityIcons name="truck-check" size={24} color={PRIMARY_COLOR} />
              <Text style={styles.trustText}>Entrega Garantida</Text>
            </View>
            <View style={styles.trustItem}>
              <MaterialCommunityIcons name="check-decagram" size={24} color="#007AFF" />
              <Text style={styles.trustText}>Fornecedores Verificados</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer for Purchase Action */}
      <View style={styles.stickyFooter}>
        {/* Controle de Quantidade */}
        <View style={styles.quantityControl}>
          <TouchableOpacity 
            style={[styles.qtyBtn, count === 0 && styles.qtyBtnDisabled]} 
            onPress={removeItem}
            disabled={count === 0}
          >
            <Ionicons name="remove" size={20} color={count === 0 ? "#999" : "#333"} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{count}</Text>
          <TouchableOpacity 
            style={[styles.qtyBtn, (count >= countInStock && !isOrdered) && styles.qtyBtnDisabled]} 
            onPress={addItemToBasket}
            disabled={count >= countInStock && !isOrdered}
          >
            <Ionicons name="add" size={20} color={(count >= countInStock && !isOrdered) ? "#999" : "#333"} />
          </TouchableOpacity>
        </View>

        {/* Botão Adicionar ao Carrinho */}
        {!isSellerOpen && (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="lock-closed-outline" size={16} color="#DC2626" />
            <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>Loja temporariamente fechada</Text>
          </View>
        )}
        <TouchableOpacity 
          style={[styles.buyBtn, ((countInStock === 0 && !isOrdered) || !isSellerOpen) && styles.buyBtnDisabled]} 
          onPress={addItemToBasket}
          disabled={(countInStock === 0 && !isOrdered) || !isSellerOpen}
        >
          <Text style={styles.buyBtnText}>Adicionar ao Carrinho</Text>
          {count > 0 && (
            <Text style={styles.buyBtnSubText}>
              Total: {((onSale ? discount : price) * count).toFixed(2)} MT
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProductDetail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    height: height * 0.45,
    backgroundColor: '#F0F0F0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    contentFit: 'cover',
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingBadges: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    gap: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentSection: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 32,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 6,
  },
  reviewsText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  normalPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: PRIMARY_COLOR,
  },
  promoPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF3B30',
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 18,
    color: '#8E8E93',
    textDecorationLine: 'line-through',
    marginRight: 12,
  },
  savingBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
  },
  supplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  supplierIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  supplierLocation: {
    fontSize: 13,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 15,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  infoBoxText: {
    flex: 1,
    marginLeft: 10,
    color: '#B7791F',
    fontSize: 14,
    lineHeight: 20,
  },
  deliveryCalculator: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 15,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  calcText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    flex: 1,
  },
  calcBtn: {
    backgroundColor: '#E9ECEF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  calcBtnText: {
    color: '#495057',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 15,
    marginRight: 20,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: PRIMARY_COLOR,
  },
  descriptionText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
  },
  specsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  specLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  specValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  trustFeatures: {
    gap: 15,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 15,
    fontWeight: '500',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFF',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 5,
    marginRight: 15,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#FFF',
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qtyBtnDisabled: {
    backgroundColor: '#E9ECEF',
    shadowOpacity: 0,
    elevation: 0,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 20,
    textAlign: 'center',
  },
  buyBtn: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buyBtnDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  buyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buyBtnSubText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 2,
  }
});

