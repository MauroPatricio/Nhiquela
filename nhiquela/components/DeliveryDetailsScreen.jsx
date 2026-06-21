import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
  Animated,
  Easing,
  TouchableWithoutFeedback,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  addAddress,
  selectBasketTotal,
  addTotalToPay,
  addDeliverPrice,
  addIva,
  selectSellers
} from '../features/basketSlice';
import haversine from 'haversine';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash.debounce';

const DeliveryDetailsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const basketTotal = useSelector(selectBasketTotal);
  const sellers = useSelector(selectSellers);

  const seller = sellers[0]?.seller;

  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [address, setAddress] = useState('');
  const [isUserWantDelivery, setIsUserWantDelivery] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [manualLocation, setManualLocation] = useState({ latitude: '', longitude: '' });
  const [permissionDenied, setPermissionDenied] = useState(false);

  const sellerLocation = useMemo(() => ({ latitude: seller?.latitude, longitude: seller?.longitude }), [seller]);
  const pricePerKm = 10;
  const minDelivPrice = 100;
  const iva = 0;
  const financialFees = 0;
  const subtotal = basketTotal + financialFees + iva;

  const [distanceToPay, setDistanceToPay] = useState(0);
  const [totalToPay, setTotalToPay] = useState(subtotal);

  // --- Keyboard Animated ---
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    const keyboardHide = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardShow.remove();
      keyboardHide.remove();
    };
  }, [keyboardOffset]);

  // --- Header ---
  const HeaderWithBack = ({ title }) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back-circle" size={35} color="#7F00FF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );

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
    if (userLocation) {
      const dist = haversine(userLocation, sellerLocation, { unit: 'km' });
      setDistance(dist);
    }
  }, [userLocation, sellerLocation]);

  // --- Total ---
  useEffect(() => {
    let newDistanceToPay = 0;
    if (isUserWantDelivery) {
      if (distance) newDistanceToPay = distance < 10 ? minDelivPrice : minDelivPrice + distance * pricePerKm;
      else newDistanceToPay = minDelivPrice;
    } else setAddress('');

    setDistanceToPay(newDistanceToPay);
    setTotalToPay(subtotal + newDistanceToPay);
  }, [isUserWantDelivery, distance, subtotal]);

  // --- Redux Update with Debounce ---
  const updateRedux = useCallback(
    debounce((addr, total, deliv) => {
      const deliveryAddress = {
        address: addr,
        latitude: userLocation?.latitude || -25.9653,
        longitude: userLocation?.longitude || 32.5892,
      };

      dispatch(addAddress(deliveryAddress));
      dispatch(addTotalToPay(total));
      dispatch(addIva(iva));
      dispatch(addDeliverPrice(deliv));
    }, 200),
    [dispatch, userLocation]
  );

  useEffect(() => {
    updateRedux(address, totalToPay, distanceToPay);
  }, [address, totalToPay, distanceToPay, updateRedux]);

  const handleFinalize = useCallback(() => {
    if (!userLocation?.latitude || !userLocation?.longitude) {
      Alert.alert('Erro', 'Por favor, forneça sua localização antes de prosseguir.');
      return;
    }
    const tipoEstId = seller?.tipoEstabelecimento?._id || seller?.tipoEstabelecimento;
    navigation.replace('PaymentMethod', { tipoEstabelecimentoId: tipoEstId });
  }, [navigation, userLocation, seller]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ paddingBottom: keyboardOffset }}>
            <HeaderWithBack title="Detalhes do Endereço de Entrega" />

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

            <FinalizeButton onPress={handleFinalize} disabled={loadingLocation} />

            {loadingLocation && (
              <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>Carregando localização...</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

// --- Componentes ---
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
));

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    textAlignVertical: 'top',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 12,
    color: '#1F2937',
  },
  locationText: {
    textAlign: 'center',
    marginBottom: 6,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  distanceText: {
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 24,
    fontSize: 18,
    color: '#9333EA',
  },
  toggleContainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  switchText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#374151',
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButtonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  toggleButtonTextSmall: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
    color: '#6B7280',
    fontWeight: '500',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  summary: {
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#9333EA',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#9333EA',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
  },
  loadingText: {
    color: '#9333EA',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DeliveryDetailsScreen;
