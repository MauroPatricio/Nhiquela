import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../hooks/createConnectionApi';
import { useNavigation } from '@react-navigation/native';
import { useToast } from 'react-native-toast-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const PRIMARY_COLOR = '#7F00FF';

const REASON_SUGGESTIONS = [
  'Fazer compras',
  'Buscar algo',
  'Entregar algo',
  'Transporte pessoal',
  'Mudança residencial',
  'Avaria mecânica',
  'Outro'
];

export default function RequestDeliv() {
  const navigation = useNavigation();
  const toast = useToast();
  const mapRef = useRef(null);

  // Flow State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  // Step 1: Service & Reason
  const [servicesList, setServicesList] = useState([]);
  const [serviceType, setServiceType] = useState(null);
  const [reason, setReason] = useState('');

  // Step 2: Locations
  const [origin, setOrigin] = useState({ address: '', lat: null, lng: null });
  const [destination, setDestination] = useState({ address: '', lat: null, lng: null });

  // Estimations
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [price, setPrice] = useState(0);

  // Initialize Location & Services
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Aviso', 'A sua localização ajuda-nos a preencher os campos automaticamente.');
      } else {
        let location = await Location.getCurrentPositionAsync({});
        const coords = { lat: location.coords.latitude, lng: location.coords.longitude };
        setCurrentLocation(coords);
      }
    })();

    const fetchServices = async () => {
      try {
        const { data } = await api.get('/services');
        const activeServices = data.filter(s => s.status === 'Ativo').map(s => ({
          id: s._id,
          name: s.name,
          icon: s.icon || 'star',
          color: s.color || '#7F00FF'
        }));
        setServicesList(activeServices);
      } catch (error) {
        console.warn('Erro ao carregar serviços no RequestDeliv', error);
      }
    };
    fetchServices();
  }, []);

  // Quick Buttons Logic
  const handleQuickLocation = (type, target) => {
    if (type === 'Minha Localização' && currentLocation) {
      if (target === 'origin') setOrigin({ address: 'A Minha Localização Atual', ...currentLocation });
      else setDestination({ address: 'A Minha Localização Atual', ...currentLocation });
    } else {
      // Mock for Home/Work (Would be pulled from user profile)
      if (target === 'origin') setOrigin({ address: type, lat: currentLocation?.lat || -25.9692, lng: currentLocation?.lng || 32.5732 });
      else setDestination({ address: type, lat: currentLocation?.lat || -25.9692, lng: currentLocation?.lng || 32.5732 });
    }
  };

  // Cálculo Real da Rota (OSRM)
  useEffect(() => {
    if (origin.address && destination.address && origin.lat && origin.lng && destination.lat && destination.lng) {
      
      const calculateRoute = async () => {
        try {
          const { data } = await api.get(`/osrm/route?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}`);
          
          const distKm = parseFloat(data.distanceKm) || 5;
          const durMin = parseFloat(data.durationMin) || 15;
          
          setDistance(distKm);
          setDuration(durMin);
          setPrice(50 + (distKm * 25)); // Preço base 50 MT + 25 MT por Km
        } catch (error) {
          console.warn("Erro ao calcular rota OSRM, usando fallback", error);
          const fakeDistance = 5;
          setDistance(fakeDistance);
          setDuration(15);
          setPrice(50 + (fakeDistance * 25));
        }
      };

      calculateRoute();
    } else {
      setDistance(0);
      setDuration(0);
      setPrice(0);
    }
  }, [origin, destination]);

  const handleNext = () => {
    if (step === 1) {
      if (!serviceType) return toast.show("Selecione um serviço primeiro! 👆", { type: "warning", placement: "top" });
      if (!reason.trim()) return toast.show("Diga-nos o motivo para o ajudarmos melhor!", { type: "warning", placement: "top" });
      setStep(2);
    } else if (step === 2) {
      if (!origin.address || !destination.address) return toast.show("Preencha de onde para onde vamos!", { type: "warning", placement: "top" });
      setStep(3);
    }
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    try {
      const payload = {
        name: "Serviço Nhiquela",
        phoneNumber: "000000000",
        goodType: serviceType.name,
        transportType: serviceType.name,
        deliverCity: "Maputo",
        origin: origin.address,
        destination: destination.address,
        originLocation: { address: origin.address, lat: origin.lat || 0, lng: origin.lng || 0 },
        destinationLocation: { address: destination.address, lat: destination.lat || 0, lng: destination.lng || 0 },
        paymentOption: "M-Pesa",
        description: reason,
        paymentMethod: "M-Pesa",
        deliveryPrice: price,
        isPaid: true, // Mudado para true temporariamente (ou manter false se o backend lida bem)
        stepStatus: 1,
        serviceType: serviceType.id, // Aqui vai o ObjectId
        priority: "Normal",
        distanceKm: distance,
        estimatedTimeMin: duration,
        shoppingList: []
      };

      await api.post('/request-deliver', payload);
      toast.show("Serviço solicitado com sucesso! 🚀", { type: "success" });
      navigation.goBack();
    } catch (error) {
      console.error(error);
      toast.show("Erro ao solicitar serviço.", { type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERS ---

  const renderStep1 = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFC' }}>
      <ScrollView contentContainerStyle={styles.scrollStep}>
        
        <View style={styles.headerContainer}>
           <View style={styles.headerTopRow}>
             <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
               <Ionicons name="close" size={24} color="#1A1A1A" />
             </TouchableOpacity>
           </View>
           <Text style={styles.headerTitle}>O que pretende fazer?</Text>
           <Text style={styles.headerSubtitle}>Escolha o serviço para começar.</Text>
        </View>
        
        <View style={styles.grid}>
          {servicesList.length === 0 ? (
            <Text style={{ textAlign: 'center', marginVertical: 30, color: '#666' }}>Nenhum serviço disponível.</Text>
          ) : (
            servicesList.map((srv) => {
              const isActive = serviceType?.id === srv.id;
              return (
                <TouchableOpacity
                  key={srv.id}
                  style={[styles.serviceCard, isActive && styles.serviceCardActive]}
                  activeOpacity={0.8}
                  onPress={() => setServiceType(srv)}
                >
                  {isActive ? (
                    <LinearGradient colors={['#A855F7', '#C084FC']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.serviceGradient}>
                      <MaterialCommunityIcons name={srv.icon} size={34} color="#FFF" />
                      <Text style={[styles.serviceText, { color: '#FFF' }]}>{srv.name}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.serviceContent}>
                      <View style={[styles.iconCircle, { backgroundColor: `${srv.color}15` }]}>
                        <MaterialCommunityIcons name={srv.icon} size={28} color={srv.color} />
                      </View>
                      <Text style={styles.serviceText}>{srv.name}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {serviceType && (
          <View style={styles.reasonContainer}>
            <Text style={styles.subtitleBold}>Qual é o motivo da solicitação?</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ex: Comprar produtos no supermercado..."
              placeholderTextColor="#A0A0A0"
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
            />
            <View style={styles.suggestionsContainer}>
              {REASON_SUGGESTIONS.map((sug, idx) => (
                <TouchableOpacity key={idx} style={styles.suggestionPill} onPress={() => setReason(sug)}>
                  <Text style={styles.suggestionText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {serviceType && (
          <TouchableOpacity activeOpacity={0.8} style={styles.primaryBtnWrapper} onPress={handleNext}>
            <LinearGradient colors={['#9333EA', '#A855F7']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderStep2 = () => (
    <KeyboardAvoidingView style={styles.stepContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.mapContainer}>
        {currentLocation ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: currentLocation.lat,
              longitude: currentLocation.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {origin.lat && <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} pinColor="#2196F3" />}
            {destination.lat && <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} pinColor="#FF3B30" />}
          </MapView>
        ) : (
          <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          </View>
        )}

        <SafeAreaView style={styles.mapHeaderAbs}>
           <TouchableOpacity style={styles.headerBackBtnAbs} onPress={() => setStep(1)}>
             <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
           </TouchableOpacity>
        </SafeAreaView>
      </View>

      <View style={styles.cardOverlay}>
        <View style={styles.dragHandle} />
        
        <View style={styles.rowBetween}>
          <Text style={styles.cardOverlayTitle}>Para onde vamos?</Text>
        </View>

        <View style={styles.timelineContainer}>
           <View style={styles.timelineGraphics}>
              <View style={[styles.dot, { backgroundColor: '#2196F3' }]} />
              <View style={styles.verticalLine} />
              <View style={[styles.dotSquare, { backgroundColor: '#FF3B30' }]} />
           </View>

           <View style={styles.timelineInputs}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputClean}
                  placeholder="Ponto de recolha"
                  placeholderTextColor="#A0A0A0"
                  value={origin.address}
                  onChangeText={(text) => setOrigin({ ...origin, address: text })}
                />
              </View>
              <View style={styles.inputDivider} />
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputClean}
                  placeholder="Ponto de entrega"
                  placeholderTextColor="#A0A0A0"
                  value={destination.address}
                  onChangeText={(text) => setDestination({ ...destination, address: text })}
                />
              </View>
           </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickButtonsScroll}>
          <TouchableOpacity style={styles.quickBtnFlat} onPress={() => handleQuickLocation('Minha Localização', 'origin')}>
            <Ionicons name="navigate" size={14} color="#1A1A1A" style={{marginRight: 4}} />
            <Text style={styles.quickBtnFlatText}>A minha Loc.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtnFlat} onPress={() => handleQuickLocation('Casa', 'destination')}>
            <Ionicons name="home" size={14} color="#1A1A1A" style={{marginRight: 4}} />
            <Text style={styles.quickBtnFlatText}>Casa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtnFlat} onPress={() => handleQuickLocation('Trabalho', 'destination')}>
            <Ionicons name="briefcase" size={14} color="#1A1A1A" style={{marginRight: 4}} />
            <Text style={styles.quickBtnFlatText}>Trabalho</Text>
          </TouchableOpacity>
        </ScrollView>

        {distance > 0 && (
          <View style={styles.estimationPremiumBar}>
            <Ionicons name="flash" size={18} color="#FF9500" />
            <Text style={styles.estimationPremiumText}>
               <Text style={{fontWeight: '900', color: '#1A1A1A'}}>{distance} km</Text>  •  ~{duration} min  •  <Text style={{fontWeight: '900', color: '#34C759'}}>{price} MT</Text>
            </Text>
          </View>
        )}

        <TouchableOpacity activeOpacity={0.8} style={styles.primaryBtnWrapper} onPress={handleNext}>
          <LinearGradient colors={['#9333EA', '#A855F7']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Rever Pedido</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderStep3 = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F5F7' }}>
      <ScrollView contentContainerStyle={styles.scrollStep3}>
        
        <View style={styles.headerContainer}>
           <TouchableOpacity style={styles.headerBackBtn} onPress={() => setStep(2)}>
             <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
           </TouchableOpacity>
           <Text style={styles.headerTitleCenter}>Resumo do Pedido</Text>
           <View style={{width: 40}} />
        </View>

        <View style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
             <MaterialCommunityIcons name={serviceType?.icon} size={28} color={PRIMARY_COLOR} />
             <Text style={styles.ticketServiceText}>{serviceType?.name}</Text>
          </View>
          
          <View style={styles.ticketBody}>
            <Text style={styles.ticketLabel}>Motivo da Solicitação</Text>
            <Text style={styles.ticketValue}>{reason}</Text>

            <View style={{ height: 15 }} />

            <View style={styles.ticketRouteRow}>
               <View style={styles.timelineGraphicsMini}>
                  <View style={[styles.dotMini, { backgroundColor: '#2196F3' }]} />
                  <View style={styles.verticalLineMini} />
                  <View style={[styles.dotSquareMini, { backgroundColor: '#FF3B30' }]} />
               </View>
               <View style={styles.ticketRouteTexts}>
                  <View style={styles.ticketRouteBlock}>
                     <Text style={styles.ticketRouteLabel}>De (Recolha)</Text>
                     <Text style={styles.ticketRouteAddress} numberOfLines={2}>{origin.address}</Text>
                  </View>
                  <View style={styles.ticketRouteBlock}>
                     <Text style={styles.ticketRouteLabel}>Para (Entrega)</Text>
                     <Text style={styles.ticketRouteAddress} numberOfLines={2}>{destination.address}</Text>
                  </View>
               </View>
            </View>
          </View>

          <View style={styles.ticketDashedLine}>
             {[...Array(25)].map((_, i) => <View key={i} style={styles.dash} />)}
          </View>
          
          <View style={styles.ticketFooter}>
             <View style={styles.ticketStat}>
                <Text style={styles.ticketStatLabel}>Distância</Text>
                <Text style={styles.ticketStatValue}>{distance} km</Text>
             </View>
             <View style={styles.ticketStat}>
                <Text style={styles.ticketStatLabel}>Tempo</Text>
                <Text style={styles.ticketStatValue}>~{duration} min</Text>
             </View>
             <View style={styles.ticketStatRight}>
                <Text style={styles.ticketStatLabel}>Valor Total</Text>
                <Text style={styles.ticketPriceValue}>{price} MT</Text>
             </View>
          </View>
        </View>

        <TouchableOpacity 
          activeOpacity={0.9}
          style={[styles.primaryBtnWrapper, { marginTop: 40 }]} 
          onPress={handleConfirmOrder}
          disabled={loading}
        >
          <LinearGradient colors={['#11998e', '#38ef7d']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.confirmBtnGradient}>
            {loading ? (
               <ActivityIndicator color="#FFF" size="small" />
            ) : (
               <>
                 <Text style={[styles.primaryBtnText, { fontSize: 20, marginRight: 8 }]}>Solicitar Agora</Text>
                 <MaterialCommunityIcons name="rocket-launch" size={24} color="#FFF" />
               </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  stepContainer: { flex: 1 },
  scrollStep: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 150 },
  scrollStep3: { padding: 20, paddingBottom: 150 },
  
  // Header Defaults
  headerContainer: { marginBottom: 25 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F0F2F5' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.5 },
  headerTitleCenter: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 16, color: '#666', marginTop: 8, fontWeight: '500' },
  
  // Step 1 Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  serviceCard: { 
    width: '48%', backgroundColor: '#FFF', borderRadius: 24, marginBottom: 15, 
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 4, 
    borderWidth: 1.5, borderColor: '#F8F9FA', overflow: 'hidden'
  },
  serviceCardActive: { borderWidth: 0, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8, transform: [{ scale: 1.02 }] },
  serviceGradient: { padding: 15, alignItems: 'center', justifyContent: 'center', height: 110 },
  serviceContent: { padding: 15, alignItems: 'center', justifyContent: 'center', height: 110 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  serviceText: { fontSize: 13, fontWeight: '700', textAlign: 'center', color: '#1A1A1A' },
  
  // Step 1 Reason
  reasonContainer: { marginTop: 20, marginBottom: 30 },
  subtitleBold: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 15 },
  textArea: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, fontSize: 15, color: '#1A1A1A', textAlignVertical: 'top', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 15, gap: 10 },
  suggestionPill: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E9ECEF', shadowColor: '#000', shadowOpacity: 0.02, elevation: 1 },
  suggestionText: { color: '#495057', fontSize: 13, fontWeight: '600' },
  
  // Step 2 Map
  mapContainer: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapHeaderAbs: { position: 'absolute', top: 0, left: 20, zIndex: 10 },
  headerBackBtnAbs: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, marginTop: 10 },
  
  cardOverlay: {
    position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFF',
    borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: Platform.OS === 'ios' ? 90 : 80, 
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 25
  },
  dragHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  cardOverlayTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginBottom: 20 },
  
  // Timeline Inputs
  timelineContainer: { flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F1F3F5' },
  timelineGraphics: { width: 20, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  verticalLine: { width: 2, height: 35, backgroundColor: '#E9ECEF', my: 2 },
  dotSquare: { width: 10, height: 10, borderRadius: 2 },
  timelineInputs: { flex: 1 },
  inputWrapper: { height: 40, justifyContent: 'center' },
  inputClean: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  inputDivider: { height: 1, backgroundColor: '#E9ECEF', marginVertical: 5 },
  
  // Quick buttons flat
  quickButtonsScroll: { flexDirection: 'row', alignItems: 'center', paddingBottom: 15 },
  quickBtnFlat: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E9ECEF', marginRight: 10 },
  quickBtnFlatText: { color: '#1A1A1A', fontSize: 13, fontWeight: '600' },
  
  estimationPremiumBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9E6', padding: 15, borderRadius: 16, marginBottom: 15 },
  estimationPremiumText: { color: '#666', fontSize: 14, marginLeft: 10 },

  // Summary Ticket
  ticketCard: { backgroundColor: '#FFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 4, overflow: 'hidden' },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FAF5FF', borderBottomWidth: 1, borderBottomColor: '#F3E8FF' },
  ticketServiceText: { fontSize: 18, fontWeight: '800', color: PRIMARY_COLOR, marginLeft: 10 },
  ticketBody: { padding: 20 },
  ticketLabel: { fontSize: 13, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  ticketValue: { fontSize: 16, color: '#1A1A1A', fontWeight: '600', marginTop: 5 },
  
  ticketRouteRow: { flexDirection: 'row' },
  timelineGraphicsMini: { width: 15, alignItems: 'center', marginRight: 15, paddingTop: 5 },
  dotMini: { width: 8, height: 8, borderRadius: 4 },
  verticalLineMini: { width: 2, flex: 1, backgroundColor: '#E9ECEF', marginVertical: 4 },
  dotSquareMini: { width: 8, height: 8, borderRadius: 2 },
  ticketRouteTexts: { flex: 1 },
  ticketRouteBlock: { marginBottom: 15 },
  ticketRouteLabel: { fontSize: 12, color: '#A0A0A0', fontWeight: '500' },
  ticketRouteAddress: { fontSize: 15, color: '#1A1A1A', fontWeight: '600', marginTop: 2 },
  
  ticketDashedLine: { flexDirection: 'row', overflow: 'hidden', width: '100%', height: 1, justifyContent: 'space-between', paddingHorizontal: 20 },
  dash: { width: 8, height: 1, backgroundColor: '#E0E0E0' },
  
  ticketFooter: { flexDirection: 'row', padding: 20, backgroundColor: '#FAFAFC', alignItems: 'center' },
  ticketStat: { flex: 1 },
  ticketStatRight: { flex: 1, alignItems: 'flex-end' },
  ticketStatLabel: { fontSize: 12, color: '#888', fontWeight: '500' },
  ticketStatValue: { fontSize: 16, color: '#1A1A1A', fontWeight: '700', marginTop: 2 },
  ticketPriceValue: { fontSize: 24, color: '#34C759', fontWeight: '900', marginTop: 2 },

  // Global Buttons
  primaryBtnWrapper: { shadowColor: PRIMARY_COLOR, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  primaryBtn: { borderRadius: 16, height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  confirmBtnGradient: { borderRadius: 16, height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#38ef7d', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});
