import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';

import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addAddress, selectBasketTotal, addTotalToPay, addDeliverPrice, addIva } from '../features/basketSlice';
import haversine from 'haversine';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash.debounce';

const DeliveryDetailsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const basketTotal = useSelector(selectBasketTotal);

  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [address, setAddress] = useState('');
  const [isUserWantDelivery, setIsUserWantDelivery] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(true);

  const sellerLocation = useMemo(() => ({ latitude: -25.968, longitude: 32.583 }), []);
  const pricePerKm = 10;
  const minDelivPrice = 100;
  const iva = 0;
  const financialFees = 0;
  const subtotal = basketTotal + financialFees + iva;

  const [distanceToPay, setDistanceToPay] = useState(0);
  const [totalToPay, setTotalToPay] = useState(subtotal);


  // Substitua o Header antigo por este componente:
const HeaderWithBack = ({ title, navigation }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Ionicons name='chevron-back-circle' size={35} color="#7F00FF" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
  </View>
);

  // --- Rastrear localização apenas quando necessário ---
  useEffect(() => {
    let locationSubscription;
    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoadingLocation(false);
        return;
      }

      // Pega a localização inicial
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setLoadingLocation(false);

      // Atualizações periódicas leves
      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 50 },
        loc => {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      );
    };

    startLocationTracking();
    return () => locationSubscription?.remove();
  }, []);

  // --- Calcular distância somente quando userLocation mudar ---
  useEffect(() => {
    if (userLocation) {
      const dist = haversine(userLocation, sellerLocation, { unit: 'km' });
      setDistance(dist);
    }
  }, [userLocation, sellerLocation]);

  // --- Calcular total de forma otimizada ---
  useEffect(() => {
    let newDistanceToPay = 0;
    if (isUserWantDelivery) {
      if (distance) newDistanceToPay = distance < 10 ? minDelivPrice : minDelivPrice + distance * pricePerKm;
      else newDistanceToPay = minDelivPrice;
    } else setAddress('');

    setDistanceToPay(newDistanceToPay);
    setTotalToPay(subtotal + newDistanceToPay);
  }, [isUserWantDelivery, distance, subtotal]);

  // --- Atualizar Redux com debounce ---
  const updateRedux = useCallback(
    debounce((addr, total, deliv, userLoc) => {
      const deliveryAddress = {
        address: addr,
        latitude: userLocation?.latitude || null,
        longitude: userLocation?.longitude || null,
      };

      console.log(userLocation)

      dispatch(addAddress(deliveryAddress));
      dispatch(addTotalToPay(total));
      dispatch(addIva(iva));
      dispatch(addDeliverPrice(deliv));
    }, 200),
    [dispatch]
  );


  useEffect(() => {
    updateRedux(address, totalToPay, distanceToPay);
  }, [address, totalToPay, distanceToPay, updateRedux]);

  // --- Botão Finalizar ---
  const handleFinalize = useCallback(() => {
    navigation.replace('PaymentMethod');
  }, [navigation]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 200 }}
        >
            <HeaderWithBack title="Detalhes do Endereço de Entrega" navigation={navigation} />
          <StatusLocation userLocation={userLocation} distance={distance} />
          <DeliveryToggle
            isUserWantDelivery={isUserWantDelivery}
            setIsUserWantDelivery={setIsUserWantDelivery}
            disabled={loadingLocation}
          />
          {isUserWantDelivery && (
            <AddressInput address={address} setAddress={setAddress} editable={!loadingLocation} />
          )}
          <DeliveryStatus isUserWantDelivery={isUserWantDelivery} />
          <Summary
            basketTotal={basketTotal}
            distanceToPay={distanceToPay}
            totalToPay={totalToPay}
            isUserWantDelivery={isUserWantDelivery}
          />
        </ScrollView>

        <View style={styles.fixedButtonContainer}>
          <FinalizeButton onPress={handleFinalize} disabled={loadingLocation} />
        </View>

        {loadingLocation && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Carregando localização...</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

// --- Componentes Memoizados ---
const Header = React.memo(({ title }) => <Text style={styles.title}>{title}</Text>);
const StatusLocation = React.memo(({ userLocation, distance }) => {
  const distanceText = useMemo(() => (distance ? distance.toFixed(2) : null), [distance]);
  return (
    <View>
      <Text style={styles.locationText}>
        {userLocation ? 'Localização obtida' : 'Obtendo localização...'}
      </Text>
      <Text style={styles.distanceText}>
        {distanceText ? `Distância até o fornecedor: ${distanceText} km` : 'Calculando distância...'}
      </Text>
    </View>
  );
});
const DeliveryToggle = React.memo(({ isUserWantDelivery, setIsUserWantDelivery, disabled }) => (
  <View style={styles.toggleContainerRow}>
    <Text style={styles.switchText}>Deseja entrega?</Text>
    <View style={styles.toggleButtons}>
      <TouchableOpacity
        style={[styles.toggleButtonSmall, { backgroundColor: isUserWantDelivery ? '#4CD137' : '#ccc' }]}
        onPress={() => setIsUserWantDelivery(true)}
        disabled={disabled}
      >
        <Text style={styles.toggleButtonTextSmall}>Sim</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButtonSmall, { backgroundColor: !isUserWantDelivery ? '#FF4D4D' : '#ccc' }]}
        onPress={() => setIsUserWantDelivery(false)}
        disabled={disabled}
      >
        <Text style={styles.toggleButtonTextSmall}>Não</Text>
      </TouchableOpacity>
    </View>
  </View>
));
const AddressInput = React.memo(({ address, setAddress, editable }) => (
  <TextInput
    style={[styles.input, { height: 120 }]}
    placeholder="Digite o endereço completo"
    multiline
    value={address}
    onChangeText={setAddress}
    editable={editable}
  />
));
const DeliveryStatus = React.memo(({ isUserWantDelivery }) => (
  <Text style={styles.statusText}>
    {isUserWantDelivery
      ? 'Entrega activada'
      : 'Entrega desativada - deverá buscar pessoalmente no estabelecimento do fornecedor.'}
  </Text>
));
const Summary = React.memo(({ basketTotal, distanceToPay, totalToPay, isUserWantDelivery }) => (
  <View style={styles.summary}>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryText}>Subtotal:</Text>
      <Text style={styles.summaryText}>{basketTotal.toFixed(2)} MT</Text>
    </View>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryText}>Custo de entrega:</Text>
      <Text style={styles.summaryText}>{isUserWantDelivery ? distanceToPay.toFixed(2) : 0} MT</Text>
    </View>
    <View style={styles.summaryRow}>
      <Text style={styles.priceText}>Total a pagar:</Text>
      <Text style={styles.priceText}>{totalToPay.toFixed(2)} MT</Text>
    </View>
  </View>
));
const FinalizeButton = React.memo(({ onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.button, disabled && { backgroundColor: '#ccc' }]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.buttonText}>Finalizar compra</Text>
  </TouchableOpacity>
))

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  locationText: { textAlign: 'center', marginBottom: 10, fontSize: 16, color: '#666', backgroundColor: '#F8F8F8', padding: 12, borderRadius: 12 },
  distanceText: { textAlign: 'center', fontWeight: '600', marginBottom: 20, fontSize: 16, color: '#000' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginVertical: 10, textAlignVertical: 'top', fontSize: 16 },
  statusText: { fontSize: 16, color: 'black', textAlign: 'center', marginVertical: 12, fontWeight: '600' },
  summary: { marginVertical: 20, padding: 16, backgroundColor: '#F5F5F5', borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 4 },
  summaryText: { fontSize: 16, marginBottom: 6, fontWeight: '600', color: '#333' },
  priceText: { fontSize: 16, marginBottom: 6, fontWeight: '900', color: '#7F00FF' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  button: { backgroundColor: '#7F00FF', paddingVertical: 16, paddingHorizontal: 30, borderRadius: 30, alignItems: 'center', shadowColor: '#7F00FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 18, textAlign: 'center' },
  toggleContainerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, justifyContent: 'space-between' },
  switchText: { fontWeight: '600', fontSize: 18, color: '#7F00FF' },
  toggleButtons: { flexDirection: 'row', gap: 8 },
  toggleButtonSmall: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  toggleButtonTextSmall: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  loadingText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  fixedButtonContainer: { position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 10 },
  header: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingVertical: 10,
},
headerTitle: {
  fontSize: 20,
  fontWeight: "bold",
  marginLeft: 10,
  color: "#333",
},
});

export default DeliveryDetailsScreen;
