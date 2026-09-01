import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  addAddress,
  selectBasketTotal,
  selectBasketItems,
  addTotalToPay,
  addDeliverPrice,
  addIva,
  selectSellers,
  setSelectedVehicle as setSelectedVehicleAction
} from '../features/basketSlice';
import haversine from 'haversine';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash.debounce';
import api from '../hooks/createConnectionApi';
import { LinearGradient } from 'expo-linear-gradient';

const DeliveryDetailsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const basketTotal = useSelector(selectBasketTotal);
  const basketItems = useSelector(selectBasketItems);
  const sellers = useSelector(selectSellers);

  const hasDigitalItems = useMemo(() => {
    return basketItems && basketItems.some(i => i.productType === 'DIGITAL' || i.isDigital);
  }, [basketItems]);

  const rawSeller = sellers[0];
  const [dbSeller, setDbSeller] = useState(null);

  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [address, setAddress] = useState('');
  const [isUserWantDelivery, setIsUserWantDelivery] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [manualLocation, setManualLocation] = useState({ latitude: '', longitude: '' });
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Vehicle Types
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Sincronizar produtos digitais: força sem entrega
  useEffect(() => {
    if (hasDigitalItems) {
      setIsUserWantDelivery(false);
      setLoadingLocation(false);
      setLoadingVehicles(false);
    }
  }, [hasDigitalItems]);

  // Fetch full seller details from db if only ID is present, or for secure fallback coordinates
  useEffect(() => {
    const fetchSellerData = async () => {
      const sellerId = rawSeller?.userId?._id || rawSeller?.userId || rawSeller?._id || rawSeller?.id || (typeof rawSeller === 'string' ? rawSeller : null);
      if (!sellerId) return;

      try {
        const response = await api.get(`/users/${sellerId}`);
        if (response.data) {
          setDbSeller(response.data);
        }
      } catch (error) {
        console.log('Error fetching seller details in DeliveryDetailsScreen:', error.message);
      }
    };
    fetchSellerData();
  }, [rawSeller]);

  // Extract seller information robustly
  const sellerObj = useMemo(() => {
    const active = dbSeller || rawSeller;
    if (!active) return null;

    const nested = active.seller;
    
    const lat = parseFloat(
      nested?.latitude ?? nested?.location?.lat ??
      active?.latitude ?? active?.location?.lat ??
      active?.locationGeo?.coordinates?.[1] ?? 0
    );
    
    const lng = parseFloat(
      nested?.longitude ?? nested?.location?.lng ??
      active?.longitude ?? active?.location?.lng ??
      active?.locationGeo?.coordinates?.[0] ?? 0
    );

    const name = nested?.name ?? active?.name ?? active?.storeName ?? 'Fornecedor';
    
    return {
      _id: nested?._id ?? active?._id ?? active?.id,
      name,
      latitude: lat,
      longitude: lng,
      tipoEstabelecimento: nested?.tipoEstabelecimento ?? active?.tipoEstabelecimento
    };
  }, [rawSeller, dbSeller]);

  const sellerLocation = useMemo(() => ({
    latitude: sellerObj?.latitude || 0,
    longitude: sellerObj?.longitude || 0
  }), [sellerObj]);

  const sellerName = useMemo(() => sellerObj?.name || 'Fornecedor', [sellerObj]);

  const iva = 0;
  const financialFees = 0;
  const subtotal = basketTotal + financialFees + iva;

  const [distanceToPay, setDistanceToPay] = useState(0);
  const [totalToPay, setTotalToPay] = useState(subtotal);
  const [systemBaseFee, setSystemBaseFee] = useState(45); // default, será sobrescrito pela setting do sistema

  // Fetch da taxa base do sistema (delivery_base_fee)
  useEffect(() => {
    const fetchBaseFee = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data && Array.isArray(res.data)) {
          const setting = res.data.find(s => s.key === 'delivery_base_fee');
          if (setting && !isNaN(Number(setting.value))) {
            setSystemBaseFee(Number(setting.value));
          }
        }
      } catch (e) {
        console.log('Falha ao buscar delivery_base_fee, usando padrão:', e.message);
      }
    };
    fetchBaseFee();
  }, []);

  // Fetch Service/Vehicle Types — extrai os tipos de viatura reais das subcategorias de tipo SERVICE
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await api.get('/provider-subcategories');
        if (response.data && response.data.length > 0) {
          // Filtrar apenas subcategorias de serviço activas
          const activeServices = response.data.filter(s =>
            s.isActive &&
            s.providerTypeId?.classificationId?.name === 'SERVICE'
          );

          // Buscar o ID da subcategoria do vendedor (tipoEstabelecimento ou subcategoryId)
          const sellerSubcatId = sellerObj?.tipoEstabelecimento?._id || 
                                sellerObj?.tipoEstabelecimento || 
                                sellerObj?.subcategoryId || 
                                sellerObj?.seller?.tipoEstabelecimento?._id || 
                                sellerObj?.seller?.tipoEstabelecimento || 
                                sellerObj?.seller?.subcategoryId || 
                                (rawSeller?.seller?.tipoEstabelecimento?._id || rawSeller?.seller?.tipoEstabelecimento || rawSeller?.seller?.subcategoryId) ||
                                (dbSeller?.seller?.tipoEstabelecimento?._id || dbSeller?.seller?.tipoEstabelecimento || dbSeller?.seller?.subcategoryId);

          const sellerSubcat = response.data.find(s => 
            s._id.toString() === sellerSubcatId?.toString() ||
            s.name?.toLowerCase() === sellerSubcatId?.toString()?.toLowerCase()
          );
          
          let filteredVehicles = [];
          let hasNoVehiclesExplicitly = false;

          if (sellerSubcat) {
            if (sellerSubcat.vehicleTypes && sellerSubcat.vehicleTypes.length > 0) {
              // Se a subcategoria do vendedor tiver veículos associados, usar apenas esses!
              sellerSubcat.vehicleTypes.forEach(vt => {
                if (vt && vt._id) {
                  filteredVehicles.push({
                    _id: vt._id,
                    name: vt.name,
                    category: vt.category,
                    basePrice: vt.basePrice || 0,
                    pricePerKm: vt.pricePerKm || 0,
                    isActive: vt.isActive !== false,
                  });
                }
              });
            } else {
              // Subcategoria existe mas não tem veículos associados -> não precisa de transporte!
              hasNoVehiclesExplicitly = true;
            }
          }

          if (hasNoVehiclesExplicitly) {
            setVehicleTypes([]);
            setSelectedVehicle(null);
            setIsUserWantDelivery(false);
          } else {
            // Se não encontrou veículos específicos para o vendedor, cai para o comportamento geral deduplicado
            if (filteredVehicles.length === 0) {
              const vehicleMap = new Map();
              activeServices.forEach(sub => {
                if (sub.vehicleTypes && sub.vehicleTypes.length > 0) {
                  sub.vehicleTypes.forEach(vt => {
                    if (vt && vt._id && !vehicleMap.has(vt._id.toString())) {
                      vehicleMap.set(vt._id.toString(), {
                        _id: vt._id,
                        name: vt.name,
                        category: vt.category,
                        basePrice: vt.basePrice || 0,
                        pricePerKm: vt.pricePerKm || 0,
                        isActive: vt.isActive !== false,
                      });
                    }
                  });
                }
              });
              filteredVehicles = [...vehicleMap.values()].filter(v => v.isActive);
            }

            if (filteredVehicles.length > 0) {
              setVehicleTypes(filteredVehicles);
              setSelectedVehicle(filteredVehicles[0]);
            } else {
              // Fallback: mostrar subcategorias directamente (sem preços por km)
              setVehicleTypes(activeServices);
              if (activeServices.length > 0) setSelectedVehicle(activeServices[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching service types:', error);
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchServiceTypes();
  }, [sellerObj, dbSeller, rawSeller]);

  // --- Location ---
  useEffect(() => {
    let locationSubscription;

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoadingLocation(false);
        Alert.alert(
          'Permissão necessária',
          'Para continuar, precisamos da sua localização ou que a insira manualmente.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setLoadingLocation(false);

      // Automatically reverse geocode to fetch current street address
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode && geocode.length > 0) {
          const item = geocode[0];
          const street = item.street || item.name || item.district || '';
          const subregion = item.subregion || item.city || '';
          const formatted = [street, subregion].filter(Boolean).join(', ');
          if (formatted) {
            setAddress(formatted);
          }
        }
      } catch (e) {
        console.log('Error reverse geocoding on init:', e.message);
      }

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 50 },
        (loc) => {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      );
    };

    startLocationTracking();
    return () => locationSubscription?.remove();
  }, []);

  // --- Manual Location ---
  useEffect(() => {
    if (permissionDenied && manualLocation.latitude && manualLocation.longitude) {
      setUserLocation({
        latitude: parseFloat(manualLocation.latitude),
        longitude: parseFloat(manualLocation.longitude),
      });
    }
  }, [manualLocation, permissionDenied]);

  // --- Distance ---
  useEffect(() => {
    const hasValidCoords = userLocation?.latitude && userLocation?.longitude && 
                           sellerLocation?.latitude && sellerLocation?.longitude &&
                           sellerLocation.latitude !== 0 && sellerLocation.longitude !== 0;
                           
    if (hasValidCoords) {
      const fetchRealDistance = async () => {
        try {
          const origin = `${userLocation.longitude},${userLocation.latitude}`;
          const destination = `${sellerLocation.longitude},${sellerLocation.latitude}`;
          const response = await api.get(`/osrm/route?origin=${origin}&destination=${destination}`);
          
          if (response.data && response.data.distanceKm) {
            setDistance(parseFloat(response.data.distanceKm));
          } else {
            const dist = haversine(userLocation, sellerLocation, { unit: 'km' });
            setDistance(dist);
          }
        } catch (error) {
          const dist = haversine(userLocation, sellerLocation, { unit: 'km' });
          setDistance(dist);
        }
      };
      fetchRealDistance();
    } else {
      setDistance(0);
    }
  }, [userLocation, sellerLocation]);

  // --- Total (usa taxa base do sistema + pricePerKm do tipo de viatura) ---
  useEffect(() => {
    let newDistanceToPay = 0;
    if (isUserWantDelivery && selectedVehicle) {
      const baseFee = systemBaseFee;               // taxa base vem das settings do sistema
      const priceKm = selectedVehicle.pricePerKm || 0;  // preco por km vem do tipo de viatura

      if (distance) {
        newDistanceToPay = baseFee + (distance * priceKm);
      } else {
        newDistanceToPay = baseFee + (1 * priceKm);
      }
    } else if (!isUserWantDelivery) {
      setAddress('');
    }

    setDistanceToPay(newDistanceToPay);
    // Total a pagar AGORA = apenas os produtos (a entrega é paga ao deliver na chegada)
    setTotalToPay(subtotal);
  }, [isUserWantDelivery, distance, subtotal, selectedVehicle, systemBaseFee]);

  // --- Redux Update with Debounce ---
  const updateRedux = useCallback(
    debounce((addr, total, deliv, vehicle) => {
      dispatch(addAddress(addr || ''));
      dispatch(addTotalToPay(total));
      dispatch(addIva(iva));
      dispatch(addDeliverPrice(deliv));
      dispatch(setSelectedVehicleAction(vehicle));
    }, 200),
    [dispatch, userLocation]
  );

  useEffect(() => {
    updateRedux(address, totalToPay, distanceToPay, selectedVehicle);
  }, [address, totalToPay, distanceToPay, selectedVehicle, updateRedux]);

  const handleFinalize = useCallback(() => {
    if (!hasDigitalItems && isUserWantDelivery && (!userLocation?.latitude || !userLocation?.longitude)) {
      Alert.alert('Erro', 'Por favor, forneça sua localização antes de prosseguir com a entrega.');
      return;
    }
    const tipoEstId = sellerObj?.tipoEstabelecimento?._id || sellerObj?.tipoEstabelecimento;
    navigation.replace('PaymentMethod', { 
      tipoEstabelecimentoId: tipoEstId,
      seller: sellerObj,
      isUserWantDelivery: hasDigitalItems ? false : isUserWantDelivery,
      selectedVehicle: hasDigitalItems ? null : selectedVehicle,
      deliveryPrice: hasDigitalItems ? 0 : (isUserWantDelivery ? distanceToPay : 0),
      distanceKm: hasDigitalItems ? 0 : (isUserWantDelivery ? distance : 0),
      totalToPay,
    });
  }, [isUserWantDelivery, userLocation, sellerObj, navigation, selectedVehicle, distanceToPay, distance, totalToPay, hasDigitalItems]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes da Entrega</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Fornecedor Card */}
          <View style={styles.sellerCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="storefront" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.sellerLabel}>Fornecedor selecionado</Text>
                <Text style={styles.sellerNameText}>{sellerName}</Text>
              </View>
              <View style={styles.sellerActiveBadge}>
                <Text style={styles.sellerActiveText}>Origem</Text>
              </View>
            </View>
          </View>

          {/* Se for produto digital, não exibe GPS, rota, transporte ou endereço físico */}
          {hasDigitalItems ? (
            <View style={styles.pickupCard}>
              <View style={styles.pickupHeader}>
                <Ionicons name="mail-open" size={24} color="#7F00FF" />
                <Text style={styles.pickupTitle}>⚡ Envio por E-mail (Produto Digital)</Text>
              </View>
              <Text style={styles.pickupText}>
                Os produtos digitais são enviados por e-mail e disponibilizados na sua conta após a confirmação do pagamento. Não há custos nem necessidade de transporte/entrega.
              </Text>
            </View>
          ) : (
            <>
              {/* Location Card Status */}
              <View style={styles.locationCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="location" size={20} color="#7F00FF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.locationTitle}>{address ? address : 'Seu Endereço / GPS'}</Text>
                    <Text style={styles.locationSub}>
                      {userLocation ? 'Localização de entrega detectada' : 'Buscando sua localização...'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: userLocation ? '#DCFCE7' : '#FEF9C3' }]}>
                    <Text style={[styles.statusBadgeText, { color: userLocation ? '#16A34A' : '#CA8A04' }]}>
                      {userLocation ? 'Destino Ativo' : 'Carregando'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Visual Route Representation */}
              {vehicleTypes.length > 0 && userLocation && (
                <View style={styles.routeVisual}>
                  <View style={styles.routeNode}>
                    <Ionicons name="storefront" size={16} color="#10B981" />
                    <Text style={styles.routeNodeText} numberOfLines={1}>
                      {sellerName}
                    </Text>
                  </View>
                  <View style={styles.routeLineContainer}>
                    <View style={styles.routeLine} />
                    <View style={styles.routeBadge}>
                      <Text style={styles.routeBadgeText}>
                        {distance !== null ? `${distance.toFixed(2)} km` : '...'}
                      </Text>
                    </View>
                    <View style={styles.routeLine} />
                  </View>
                  <View style={styles.routeNode}>
                    <Ionicons name="home" size={16} color="#7F00FF" />
                    <Text style={styles.routeNodeText} numberOfLines={1}>
                      {address ? address : 'Seu Destino'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Delivery Toggle segmented pill control */}
              {vehicleTypes.length > 0 && (
                <View style={styles.segmentContainer}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, isUserWantDelivery && styles.segmentBtnActive]}
                    onPress={() => setIsUserWantDelivery(true)}
                    disabled={loadingLocation}
                  >
                    <Ionicons name="bicycle" size={18} color={isUserWantDelivery ? '#FFF' : '#64748B'} />
                    <Text style={[styles.segmentText, isUserWantDelivery && styles.segmentTextActive]}>
                      Receber em Casa
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.segmentBtn, !isUserWantDelivery && styles.segmentBtnActive]}
                    onPress={() => setIsUserWantDelivery(false)}
                    disabled={loadingLocation}
                  >
                    <Ionicons name="storefront" size={18} color={!isUserWantDelivery ? '#FFF' : '#64748B'} />
                    <Text style={[styles.segmentText, !isUserWantDelivery && styles.segmentTextActive]}>
                      Levantar na Loja
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {vehicleTypes.length > 0 ? (
                isUserWantDelivery ? (
                  <>
                    {/* Vehicle Types Selector */}
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Escolha o Transporte</Text>
                      <Text style={styles.sectionSub}>Opções de veículos para entrega</Text>
                    </View>

                    {loadingVehicles ? (
                      <View style={styles.loaderBox}>
                        <ActivityIndicator size="small" color="#7F00FF" />
                        <Text style={styles.loaderText}>Buscando transportes disponíveis...</Text>
                      </View>
                    ) : vehicleTypes.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleList}>
                        {vehicleTypes.map((v) => {
                          const isSelected = selectedVehicle?._id === v._id;
                          let vehicleIcon = 'car';
                          if (v.name.toLowerCase().includes('mota') || v.name.toLowerCase().includes('moto')) {
                            vehicleIcon = 'bicycle';
                          } else if (v.name.toLowerCase().includes('camin')) {
                            vehicleIcon = 'bus';
                          }

                          return (
                            <TouchableOpacity
                              key={v._id}
                              style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                              onPress={() => setSelectedVehicle(v)}
                            >
                              <View style={[styles.vehicleIconCircle, isSelected && styles.vehicleIconCircleActive]}>
                                <Ionicons name={vehicleIcon} size={24} color={isSelected ? '#7F00FF' : '#64748B'} />
                              </View>
                              <Text style={[styles.vehicleName, isSelected && styles.vehicleNameSelected]} numberOfLines={1}>
                                {v.name}
                              </Text>
                              <Text style={[styles.vehicleRate, isSelected && styles.vehicleRateSelected]}>
                                {v.pricePerKm > 0
                                  ? `~${(systemBaseFee + (distance > 0 ? distance : 1) * v.pricePerKm).toFixed(0)} MT`
                                  : `~${systemBaseFee} MT`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <Text style={styles.statusText}>Nenhum transporte disponível no momento.</Text>
                    )}

                    {/* Input Address Card */}
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Endereço Completo</Text>
                    </View>
                    <View style={styles.addressInputCard}>
                      <MaterialCommunityIcons name="map-marker-radius" size={20} color="#7F00FF" style={styles.addressIcon} />
                      <TextInput
                        style={styles.addressInput}
                        placeholder="Indique a rua, nº do edifício, ponto de referência..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        value={address}
                        onChangeText={setAddress}
                        editable={!loadingLocation}
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.pickupCard}>
                    <View style={styles.pickupHeader}>
                      <Ionicons name="information-circle" size={24} color="#7F00FF" />
                      <Text style={styles.pickupTitle}>Levantamento na Loja</Text>
                    </View>
                    <Text style={styles.pickupText}>
                      Deverá deslocar-se pessoalmente ao estabelecimento do fornecedor para levantar a sua encomenda. Nenhum custo de transporte será aplicado.
                    </Text>
                  </View>
                )
              ) : null}
            </>
          )}

          {/* Receipt Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeader}>Resumo de Valores</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal de Itens</Text>
              <Text style={styles.summaryValue}>{basketTotal.toFixed(2)} MT</Text>
            </View>

            {isUserWantDelivery && (
              <View style={[styles.summaryRow, styles.estimateRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.estimateLabel}>
                    🛵 Estimativa de Entrega ({selectedVehicle?.name || 'Padrão'})
                  </Text>
                  <Text style={styles.estimateNote}>Não incluso · pagamento ao deliver na chegada</Text>
                </View>
                 <Text style={styles.estimateValue}>~{distanceToPay.toFixed(0)} MT</Text>
              </View>
            )}

            <View style={styles.dividerDashed} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total a Pagar</Text>
              <Text style={styles.totalValue}>{totalToPay.toFixed(2)} MT</Text>
            </View>

            {isUserWantDelivery && distanceToPay > 0 && (
              <View style={styles.deliveryInfoBox}>
                <Ionicons name="information-circle-outline" size={14} color="#7F00FF" />
                 <Text style={styles.deliveryInfoText}>
                   O valor de entrega (~{distanceToPay.toFixed(0)} MT) é pago <Text style={{ fontWeight: '700' }}>diretamente ao estafeta</Text> quando a encomenda chegar ao seu destino.
                 </Text>
              </View>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.finalizeBtnWrapper}
            onPress={handleFinalize}
            disabled={loadingLocation}
          >
            <LinearGradient
              colors={loadingLocation ? ['#94A3B8', '#64748B'] : ['#7F00FF', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.finalizeBtn}
            >
              <Text style={styles.finalizeBtnText}>Prosseguir para Pagamento</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 35,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sellerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 14,
  },
  sellerLabel: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sellerNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  sellerCoordsText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  sellerActiveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sellerActiveText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(127, 0, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  locationSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  locationCoordsText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  routeNode: {
    flex: 1,
    alignItems: 'center',
  },
  routeNodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
  },
  routeLineContainer: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  routeBadge: {
    backgroundColor: '#7F00FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  routeBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 4,
    borderRadius: 16,
    marginBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#7F00FF',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  loaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    marginBottom: 20,
  },
  loaderText: {
    marginLeft: 8,
    color: '#64748B',
    fontSize: 13,
  },
  vehicleList: {
    gap: 12,
    paddingBottom: 18,
  },
  vehicleCard: {
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    marginRight: 4,
  },
  vehicleCardSelected: {
    backgroundColor: '#FAF5FF',
    borderColor: '#A855F7',
    borderWidth: 1.5,
  },
  vehicleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleIconCircleActive: {
    backgroundColor: 'rgba(127, 0, 255, 0.1)',
  },
  vehicleName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    textAlign: 'center',
  },
  vehicleNameSelected: {
    color: '#7F00FF',
    fontWeight: '800',
  },
  vehicleRate: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  vehicleRateSelected: {
    color: '#A855F7',
    fontWeight: '700',
  },
  engineCard: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  engineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  engineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#581C87',
  },
  formulaBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  formulaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  formulaLabel: {
    fontSize: 12,
    color: '#6B21A8',
    fontWeight: '500',
  },
  formulaValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '700',
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#F3E8FF',
    marginVertical: 8,
  },
  formulaCalculationRow: {
    marginVertical: 4,
  },
  calculationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  calculationText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 14,
  },
  simulationHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F3E8FF',
  },
  simulationText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#581C87',
  },
  simulationPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#7F00FF',
  },
  addressInputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  addressIcon: {
    marginTop: 6,
    marginRight: 10,
  },
  addressInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    minHeight: 80,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  pickupCard: {
    backgroundColor: 'rgba(127, 0, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(127, 0, 255, 0.15)',
    marginBottom: 24,
  },
  pickupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pickupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7F00FF',
  },
  pickupText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  summaryHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
  },
  dividerDashed: {
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#7F00FF',
  },
  // Estimate row styles
  estimateRow: {
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  estimateLabel: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '600',
  },
  estimateNote: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
    fontStyle: 'italic',
  },
  estimateValue: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '800',
    marginLeft: 8,
    alignSelf: 'center',
  },
  deliveryInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  deliveryInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#5B21B6',
    lineHeight: 17,
  },
  finalizeBtnWrapper: {
    marginBottom: 40,
  },
  finalizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  finalizeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 10,
  },
});

export default DeliveryDetailsScreen;
