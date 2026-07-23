import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Dimensions,
  PanResponder,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  LogBox,
  Image,
  Share
} from 'react-native';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('VirtualizedLists should never be nested')) {
    return;
  }
  originalConsoleError(...args);
};
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../hooks/createConnectionApi';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { EXPO_GOOGLE_MAPS_APIKEY, EXPO_PUBLIC_GOOGLE_PLACES_APIKEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import DateTimePicker from '@react-native-community/datetimepicker';
export default function RequestServiceSimple() {
  const navigation = useNavigation();
  const route = useRoute();

  const service = route.params?.selectedService;

  const [step, setStep] = useState(1);
  const [location, setLocation] = useState(null);

  const [reason, setReason] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  
  const [originCoord, setOriginCoord] = useState(null);
  const [destCoord, setDestCoord] = useState(null);
  const [driverCoord, setDriverCoord] = useState(null);
  const [preferredPaymentMethodName, setPreferredPaymentMethodName] = useState('Dinheiro');
  const [driverHeading, setDriverHeading] = useState(0);
  const [radarDrivers, setRadarDrivers] = useState([]);
  
  // Radar Search State
  const [radius, setRadius] = useState(5);
  const [isSearching, setIsSearching] = useState(false);
  const [waitingForDriver, setWaitingForDriver] = useState(false);
  const [selectedDriverForRequest, setSelectedDriverForRequest] = useState(null);
  const [availableDriversList, setAvailableDriversList] = useState([]);
  const [waitingCountdown, setWaitingCountdown] = useState(45);
  const [rejectedDriverIds, setRejectedDriverIds] = useState([]);
  const [showBusyModal, setShowBusyModal] = useState(false);
  const [showUnavailableAlert, setShowUnavailableAlert] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState({ visible: false, message: '' });
  const [duration, setDuration] = useState(null);
  const [activeTripData, setActiveTripData] = useState(null);
  const [currentRequestServiceId, setCurrentRequestServiceId] = useState(null);
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const originRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const scrollViewRef = React.useRef(null);
  const focusedInputRef = React.useRef(null);
  const [showMotives, setShowMotives] = useState(true);
  const [searchSeconds, setSearchSeconds] = useState(0); // contador visivel na busca
  const searchTimerRef = React.useRef(null);
  const searchCounterRef = React.useRef(null);

  // Agendamento
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0); // default: 1 hora a partir de agora
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [scheduledConfirmed, setScheduledConfirmed] = useState(false);

  // Autocomplete state
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [loadingOrigin, setLoadingOrigin] = useState(false);
  const [loadingDest, setLoadingDest] = useState(false);
  const originInputRef = useRef(null);
  const destInputRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false); // toggle ver rota

  // Native Bottom Sheet State
  const { height: screenHeight } = Dimensions.get('window');
  // Since sheet is 90% of screen height, these translates push it down
  const SNAP_TOP = screenHeight * 0.15; // 85% visible
  const SNAP_MIDDLE = screenHeight * 0.30; // 70% visible
  const SNAP_BOTTOM = screenHeight * 0.70; // 30% visible

  const translateY = React.useRef(new Animated.Value(SNAP_MIDDLE)).current;
  const currentSnap = React.useRef(SNAP_MIDDLE);

  const snapTo = (toValue) => {
    currentSnap.current = toValue;
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  useEffect(() => {
    if (route.params?.retrySearch) {
      const p = route.params;
      if (p.originText) {
        setOrigin(p.originText);
        setOriginText(p.originText);
      }
      if (p.destText) {
        setDestination(p.destText);
        setDestText(p.destText);
      }
      if (p.originCoord) setOriginCoord(p.originCoord);
      if (p.destCoord) setDestCoord(p.destCoord);
      if (p.reason) setReason(p.reason);
      
      setStep(2);
      
      setTimeout(() => {
        setRejectedDriverIds([]);
        setAvailableDriversList([]);
        setIsSearching(true);
        startPulse();
      }, 500);
    }
  }, [route.params?.retrySearch]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (e, gestureState) => {
        let newY = currentSnap.current + gestureState.dy;
        if (newY < SNAP_TOP) newY = SNAP_TOP; // Prevents dragging above 90%
        translateY.setValue(newY);
      },
      onPanResponderRelease: (e, gestureState) => {
        const finalY = currentSnap.current + gestureState.dy;
        const velocityY = gestureState.vy;

        let closestSnap = SNAP_MIDDLE;
        if (velocityY > 1.5) {
          closestSnap = SNAP_BOTTOM;
        } else if (velocityY < -1.5) {
          closestSnap = SNAP_TOP;
        } else {
          const distTop = Math.abs(finalY - SNAP_TOP);
          const distMid = Math.abs(finalY - SNAP_MIDDLE);
          const distBot = Math.abs(finalY - SNAP_BOTTOM);
          const minDist = Math.min(distTop, distMid, distBot);

          if (minDist === distTop) closestSnap = SNAP_TOP;
          else if (minDist === distMid) closestSnap = SNAP_MIDDLE;
          else closestSnap = SNAP_BOTTOM;
        }
        snapTo(closestSnap);
      }
    })
  ).current;

  const isDistance = service?.pricingModel === 'distance';

  const [price, setPrice] = useState(0);
  const [routeCoords, setRouteCoords] = useState([]);

  const handleGetCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Acesso Negado', 'Precisamos da sua localização para encontrar serviços próximos de si.');
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!loc) {
        Alert.alert('Erro', 'Não foi possível obter a sua localização. Verifique se o GPS está ativo.');
        return;
      }

      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude
      });
      setOriginCoord({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      // Reverse Geocoding para obter o nome da rua
      try {
        const addressArray = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        
        let placeName = 'Minha localização atual';
        if (addressArray && addressArray.length > 0) {
          const addr = addressArray[0];
          const street = addr.street || addr.name || '';
          const city = addr.city || addr.subregion || addr.region || '';
          
          if (street && city) {
            placeName = `${street}, ${city}`;
          } else if (street) {
            placeName = street;
          } else if (city) {
            placeName = city;
          }
        }
        
        setOriginText(placeName);
        if (originRef.current) {
          originRef.current.setAddressText(placeName);
        }
      } catch (error) {
        console.log('Erro no reverse geocoding:', error);
        setOriginText('Minha localização atual');
        setOrigin('Minha localização atual');
      }

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015
        }, 1000);
      }
    } catch (e) {
      console.log('Error getting location: ', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const checkAuthAndActiveTrip = async () => {
        try {
          const storedUserData = await AsyncStorage.getItem('userData');
          if (!storedUserData) return;

          const parsed = JSON.parse(storedUserData);
          if (!parsed.token) return;

          if (parsed.preferredPaymentMethod) {
            try {
              const pmRes = await api.get('/payment-methods', {
                headers: { authorization: `Bearer ${parsed.token}` }
              });
              if (pmRes.status === 200 && pmRes.data?.paymentMethods) {
                const pref = pmRes.data.paymentMethods.find(p => p._id === parsed.preferredPaymentMethod);
                if (pref) {
                  setPreferredPaymentMethodName(pref.name);
                }
              }
            } catch (err) {
              console.log('Error fetching payment methods:', err);
            }
          }

          const { data } = await api.get('/request-service/active', {
            headers: { authorization: `Bearer ${parsed.token}` }
          });

          if (data) {
            if (data.status === 'Pendente') {
              if (data.targetDriverId) {
                setCurrentRequestServiceId(data._id);
                setSelectedDriverForRequest(data.targetDriver || { _id: data.targetDriverId, name: 'Motorista' });
                setWaitingForDriver(true);
              } else {
                setIsSearching(true);
              }
            } else {
              setActiveTripData(data);
            }
          }
        } catch (error) {
          // If 404, it means no active trip, which is fine
        }
      };

      checkAuthAndActiveTrip();
    }, [])
  );

  useEffect(() => {
    handleGetCurrentLocation();
  }, []);

  /* ---------------- PLACES AUTOCOMPLETE ---------------- */
  const fetchSuggestions = async (text, type) => {
    if (!text || text.length < 2) {
      if (type === 'origin') setOriginSuggestions([]);
      else setDestSuggestions([]);
      return;
    }
    if (type === 'origin') setLoadingOrigin(true);
    else setLoadingDest(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${EXPO_PUBLIC_GOOGLE_PLACES_APIKEY}&language=pt&components=country:mz`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.predictions) {
        if (type === 'origin') setOriginSuggestions(json.predictions);
        else setDestSuggestions(json.predictions);
      }
    } catch (e) {
      console.log('Autocomplete error:', e);
    } finally {
      if (type === 'origin') setLoadingOrigin(false);
      else setLoadingDest(false);
    }
  };

  const selectPlace = async (placeId, description, type) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${EXPO_PUBLIC_GOOGLE_PLACES_APIKEY}&fields=geometry`;
      const res = await fetch(url);
      const json = await res.json();
      const loc = json.result?.geometry?.location;
      if (type === 'origin') {
        setOriginText(description);
        setOriginSuggestions([]);
        setOrigin(description);
        if (loc) setOriginCoord({ lat: loc.lat, lng: loc.lng });
        Keyboard.dismiss();
      } else {
        setDestText(description);
        setDestSuggestions([]);
        setDestination(description);
        if (loc) setDestCoord({ lat: loc.lat, lng: loc.lng });
        Keyboard.dismiss();
      }
    } catch (e) {
      console.log('Place details error:', e);
    }
  };

  /* ---------------- LOCATION & KEYBOARD ---------------- */
  useEffect(() => {
    handleGetCurrentLocation();

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      const kbHeight = e.endCoordinates.height;
      setKeyboardHeight(kbHeight);
      snapTo(SNAP_TOP);
      // Aguarda o snap terminar antes de scrollar
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 350);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  /* ---------------- PRICE API ---------------- */
  useEffect(() => {
    const fetchPrice = async () => {
      if (originCoord && destCoord) {
        try {
          const { data } = await api.post('/pricing/calculate', {
            serviceId: service._id,
            originLoc: originCoord,
            destLoc: destCoord,
            weightKg: 5
          });
          
          if (data && data.price > 0) {
            setPrice(data.price);
          } else {
            setPrice(service?.baseFare || 0);
          }
          // NAO forcar snap aqui â€” deixar o utilizador controlar a posicao do sheet
          if (data.routeCoordinates && data.routeCoordinates.length > 0) {
            setRouteCoords(data.routeCoordinates);
          } else {
            setRouteCoords([]);
            Alert.alert('Erro de Rota', 'Não foi possível calcular esta rota. Escolha outro destino.');
          }
          
          if (data.breakdown && data.breakdown.durationMin) {
            setDuration(Math.round(data.breakdown.durationMin));
          }
        } catch (error) {
          console.log('Erro ao consultar motor de preços:', error);
          setPrice(120); // Fallback
          setRouteCoords([]);
          Alert.alert('Erro de Rota', 'Não foi possível calcular esta rota. Escolha outro destino.');
        }
      }
    };
    
    fetchPrice();
  }, [originCoord, destCoord]);

  // Radar continuo de motoristas
  useEffect(() => {
    let intervalId;
    const fetchRadarDrivers = async () => {
      try {
        if (!location?.lat) return;
        const storedUserData = await AsyncStorage.getItem('userData');
        const token = storedUserData ? JSON.parse(storedUserData).token : '';
        const response = await api.get('/drivers/nearby', {
          params: { lat: location.lat, lng: location.lng, radius: 10 },
          headers: { authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.drivers) {
          setRadarDrivers(response.data.drivers);
        }
      } catch (err) {
        console.log('Erro ao procurar radar:', err);
      }
    };
    if (step === 1 && !isSearching && !activeTripData) {
      fetchRadarDrivers();
      intervalId = setInterval(fetchRadarDrivers, 15000);
    }
    return () => clearInterval(intervalId);
  }, [location, step, isSearching, activeTripData]);

  // Zoom and Fit map when origin, destination, or route changes
  useEffect(() => {
    if (mapRef.current && originCoord) {
      if (destCoord && routeCoords.length > 0) {
        const coordsToFit = [
          { latitude: originCoord.lat, longitude: originCoord.lng },
          { latitude: destCoord.lat, longitude: destCoord.lng },
          ...routeCoords
        ];
        mapRef.current.fitToCoordinates(coordsToFit, {
          edgePadding: { top: 100, right: 50, bottom: Dimensions.get('window').height * 0.5, left: 50 },
          animated: true,
        });
      } else {
        mapRef.current.animateToRegion({
          latitude: originCoord.lat,
          longitude: originCoord.lng,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015
        }, 1000);
      }
    }
  }, [originCoord, destCoord, routeCoords]);

  // REAL Search Logic â€” calls API, waits 10s, then asks to expand radius
  useEffect(() => {
    if (!isSearching) {
      // Limpar timers ao parar a busca
      clearTimeout(searchTimerRef.current);
      clearInterval(searchCounterRef.current);
      setSearchSeconds(0);
      return;
    }

    setSearchSeconds(0);

    // Contador visual (0 -> 10s)
    searchCounterRef.current = setInterval(() => {
      setSearchSeconds(prev => prev + 1);
    }, 1000);

    // Chamar API para procurar motoristas
    const searchDrivers = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const token = storedUserData ? JSON.parse(storedUserData).token : '';
        const response = await api.get('/drivers/available', {
          params: {
            lat: originCoord?.lat,
            lng: originCoord?.lng,
            radius,
            serviceId: service?._id,
          },
          headers: { authorization: `Bearer ${token}` }
        });
        let drivers = response.data?.drivers || response.data || [];
        // Filtrar motoristas que j rejeitaram
        drivers = drivers.filter(d => !rejectedDriverIds.includes(d._id));
        if (drivers.length > 0) {
          clearTimeout(searchTimerRef.current);
          clearInterval(searchCounterRef.current);
          setIsSearching(false);
          setAvailableDriversList(drivers);
          return;
        }
      } catch (err) {
        console.log('Erro ao procurar motoristas:', err);
      }
    };

    // Chamar imediatamente e depois a cada 3s
    searchDrivers();
    const pollInterval = setInterval(searchDrivers, 3000);

    // Apos 60s sem motorista encontrado -> aumentar o raio automaticamente e continuar
    searchTimerRef.current = setTimeout(() => {
      setRadius(r => r + 2);
    }, 60000);

    return () => {
      clearTimeout(searchTimerRef.current);
      clearInterval(searchCounterRef.current);
      clearInterval(pollInterval);
    };
  }, [isSearching, radius]);

  
  const sendRequestToDriver = async (driver) => {
    try {
      setSelectedDriverForRequest(driver);
      setWaitingForDriver(true);
      setWaitingCountdown(45);
      
      const storedUserData = await AsyncStorage.getItem('userData');
      let token = '';
      let phoneNumber = '';
      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        token = parsed.token;
        phoneNumber = parsed.phoneNumber;
      }

      const serviceBase = service?.baseFare || 0;
      let deslocacao = price > serviceBase ? price - serviceBase : 0;
      
      let baseFare = price;
      if (driver.deliveryman?.allowCustomPrice && driver.deliveryman?.customPrice) {
        baseFare = driver.deliveryman.customPrice;
      } else if (driver.deliveryman?.assigned_base_fee) {
        baseFare = driver.deliveryman.assigned_base_fee;
      } else if (serviceBase > 0) {
        baseFare = serviceBase;
      }
      
      let finalPrice = baseFare + deslocacao;

      const payload = {
        name: service.name,
        phoneNumber: phoneNumber || '000000000',
        goodType: reason,
        transportType: driver.deliveryman?.transport_type || 'N/A',
        deliverCity: originText || 'N/A',
        origin: originText,
        destination: destText,
        originDetails: {
          address: originText,
          lat: originCoord.lat,
          lng: originCoord.lng
        },
        destinationDetails: {
          address: destText,
          lat: destCoord.lat,
          lng: destCoord.lng
        },
        paymentOption: preferredPaymentMethodName,
        reason: reason,
        description: reason,
        paymentMethod: preferredPaymentMethodName,
        deliveryPrice: finalPrice,  // Backend irá substituir pelo valor calculado server-side
        serviceId: service._id,     // Obrigatório para o motor de preços recalcular server-side
        isPaid: false,
        stepStatus: 3,
        latitude: originCoord.lat,
        longitude: originCoord.lng,
        targetDriverId: driver._id,
        // Agendamento
        isScheduled: isScheduled,
        scheduledAt: isScheduled ? scheduledDate.toISOString() : null,
      };

      const response = await api.post('/request-service', payload, {
        headers: { authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.requestService) {
        setCurrentRequestServiceId(response.data.requestService._id);
        
        if (isScheduled) {
           Alert.alert("Agendado com sucesso", `O seu pedido foi agendado para ${scheduledDate.toLocaleString('pt-PT')}.`);
           navigation.navigate('OrderDetailsScreen', { orderId: response.data.requestService._id, item: response.data.requestService });
           return;
        }
      }
      
      // We don't navigate yet, we wait for driver to accept/reject via socket
      // A proper implementation would listen to a socket event here for 'order_updated'
      
    } catch (postError) {
      console.log('Erro ao criar pedido:', postError);
      if (postError?.response?.status === 409) {
        try {
          const { data } = await api.get('/request-service/active', {
            headers: { authorization: `Bearer ${token}` }
          });
          if (data) {
            if (data.status === 'Pendente') {
              if (data.targetDriverId) {
                setCurrentRequestServiceId(data._id);
                setSelectedDriverForRequest(data.targetDriver || { _id: data.targetDriverId, name: 'Motorista' });
                setWaitingForDriver(true);
              } else {
                setWaitingForDriver(false);
                setIsSearching(true);
              }
            } else {
              setWaitingForDriver(false);
              setActiveTripData(data);
            }
          } else {
            setWaitingForDriver(false);
            setShowWarningModal({ visible: true, message: 'Você já tem uma viagem activa. Conclua ou cancele a viagem actual antes de solicitar uma nova.' });
          }
        } catch (e) {
          setWaitingForDriver(false);
          setShowWarningModal({ visible: true, message: 'Você já tem uma viagem activa. Conclua ou cancele a viagem actual antes de solicitar uma nova.' });
        }
      } else {
        setWaitingForDriver(false);
        setShowWarningModal({ visible: true, message: 'Falha ao criar o pedido. Verifique sua conexão e tente novamente.' });
      }
    }
  };

  const handleCancelPendingRequest = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      
      if (currentRequestServiceId) {
        await api.delete(`/request-service/${currentRequestServiceId}`, {
          headers: { authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.log('Erro ao cancelar pedido pendente:', error);
    } finally {
      setWaitingForDriver(false);
      setSelectedDriverForRequest(null);
      setCurrentRequestServiceId(null);
      snapTo(SNAP_TOP);
    }
  };
  const handleShareTrip = async () => {
    if (activeTripData && activeTripData._id) {
      try {
        const shareUrl = `https://app.nhiquela.com/track/${activeTripData._id}`;
        await Share.share({
          message: `Acompanhe a minha viagem na Nhiquela em tempo real: ${shareUrl}`,
          title: 'Partilhar Viagem'
        });
      } catch (error) {
        console.log('Erro ao partilhar viagem:', error);
      }
    }
  };
  
  
  useEffect(() => {
    if (currentRequestServiceId && (waitingForDriver || isSearching)) {
      let isMounted = true;
      const socketUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
      const socket = io(socketUrl, { transports: ['websocket'] });

      const checkStatus = async () => {
         try {
           const storedUserData = await AsyncStorage.getItem('userData');
           const token = storedUserData ? JSON.parse(storedUserData).token : '';
           const { data } = await api.get('/request-service/userview', {
             headers: { authorization: `Bearer ${token}` }
           });
           const myOrder = data.deliverRequests && data.deliverRequests[0];
           if (isMounted && myOrder && myOrder._id === currentRequestServiceId) {
             if (myOrder.status === 'Cancelado' || myOrder.status === 'Motorista indisponível') {
                Alert.alert("Cancelado", "O pedido foi cancelado ou nenhum motorista aceitou.");
                setWaitingForDriver(false);
                setIsSearching(false);
                setSelectedDriverForRequest(null);
                setCurrentRequestServiceId(null);
             } else if (myOrder.status === 'Pedido aceite') {
                setWaitingForDriver(false);
                setIsSearching(false);
                setActiveTripData(myOrder);
                setCurrentRequestServiceId(null);
             }
           }
         } catch(e){}
      };
      
      checkStatus(); // Initial fetch check

      socket.on('connect', () => {
        console.log('Socket connected for waiting driver');
        if (currentRequestServiceId) {
          socket.emit('joinRoom', { orderId: currentRequestServiceId });
        }
      });

      socket.on('order_updated', (updatedOrder) => {
         if (isMounted && updatedOrder._id === currentRequestServiceId) {
            if (updatedOrder.status === 'Motorista indisponível') {
                setRejectedDriverIds(prev => selectedDriverForRequest ? [...prev, selectedDriverForRequest._id] : prev);
                setWaitingForDriver(false);
                setIsSearching(false);
                setSelectedDriverForRequest(null);
                setCurrentRequestServiceId(null);
                setShowUnavailableAlert(true);
            } else if (updatedOrder.status === 'Cancelado') {
                setRejectedDriverIds(prev => selectedDriverForRequest ? [...prev, selectedDriverForRequest._id] : prev);
                setWaitingForDriver(false);
                setIsSearching(false);
                setSelectedDriverForRequest(null);
                setCurrentRequestServiceId(null);
                // Sem alert, pois foi o próprio cliente que cancelou ou admin
            } else if (updatedOrder.status === 'Pedido aceite') {
                setWaitingForDriver(false);
                setIsSearching(false);
                setActiveTripData(updatedOrder);
                setCurrentRequestServiceId(null);
            }
         }
      });

      return () => {
        isMounted = false;
        socket.disconnect();
      };
    }
  }, [waitingForDriver, selectedDriverForRequest, currentRequestServiceId, isSearching]);
  
  // Socket listener para a viagem activa (quando o motorista aceitou)
  useEffect(() => {
    if (activeTripData && activeTripData._id) {
      let isMounted = true;
      const socketUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
      const socket = io(socketUrl, { transports: ['websocket'] });
      
      socket.on('connect', () => {
        console.log('Socket conectado para a viagem activa');
        socket.emit('joinRoom', { orderId: activeTripData._id });
      });

      socket.on('order_updated', (updatedOrder) => {
         if (isMounted && updatedOrder._id === activeTripData._id) {
            setActiveTripData(updatedOrder);
            
            // Notificações Baseadas no Estado
            if (updatedOrder.status === 'No destino indicado') {
               Alert.alert(
                 "O motorista chegou!", 
                 `O motorista ${updatedOrder.deliveryman?.name || ''} acaba de chegar ao local indicado.`
               );
            } else if (updatedOrder.status === 'Cancelado') {
               Alert.alert(
                 "Viagem Cancelada", 
                 "O motorista cancelou a viagem."
               );
               setActiveTripData(null);
            }
         }
      });
      
      // Listener para a localização do motorista em tempo real
      socket.on('driver_location_update', (data) => {
         if (isMounted) {
            setDriverCoord({
              lat: parseFloat(data.latitude),
              lng: parseFloat(data.longitude)
            });
            setDriverHeading(parseFloat(data.heading || 0));
         }
      });

      return () => {
        isMounted = false;
        socket.disconnect();
      };
    }
  }, [activeTripData?._id]);

  const startPulse = () => {
    pulseAnim.setValue(0);
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  };

  useEffect(() => {
    let interval = null;
    if (waitingForDriver && waitingCountdown > 0) {
      interval = setInterval(() => {
        setWaitingCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [waitingForDriver, waitingCountdown]);

  if (!service) return null;

  /* ================= VARIABLES ================= */
  const motivesList = service.motives && service.motives.length > 0
    ? service.motives
    : [
        'Transporte de documentos',
        'Mudança de casa',
        'Mercadorias gerais',
        'Equipamento frágil'
      ];
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        initialRegion={{
          latitude: location?.lat || -25.9692,
          longitude: location?.lng || 32.5732,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        {originCoord && (
          <Marker
            coordinate={{ latitude: originCoord.lat, longitude: originCoord.lng }}
            pinColor="green"
            title="Origem"
          />
        )}
        {destCoord && (
          <Marker
            coordinate={{ latitude: destCoord.lat, longitude: destCoord.lng }}
            pinColor="red"
            title="Destino"
            description="Arraste para ajustar"
            draggable
            onDragEnd={async (e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setDestCoord({ lat: latitude, lng: longitude });
              // Reverse geocode para actualizar o texto do campo
              try {
                const addressArray = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (addressArray && addressArray.length > 0) {
                  const addr = addressArray[0];
                  const street = addr.street || addr.name || '';
                  const city = addr.city || addr.subregion || addr.region || '';
                  const newName = street && city ? `${street}, ${city}` : street || city || 'Destino ajustado';
                  setDestText(newName);
                  setDestination(newName);
                }
              } catch (err) {
                console.log('Reverse geocode destino:', err);
              }
            }}
          >
            <Callout tooltip>
              <View style={{
                backgroundColor: '#7F00FF',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                alignItems: 'center',
              }}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>ðŸ“ Arraste para ajustar</Text>
              </View>
            </Callout>
          </Marker>
        )}
        
        {routeCoords.length > 0 && (
          <Polyline 
            coordinates={routeCoords} 
            strokeWidth={4} 
            strokeColor="#A855F7" 
          />
        )}

        {driverCoord && activeTripData && (
          <Marker
            coordinate={{ latitude: driverCoord.lat, longitude: driverCoord.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverHeading}
            flat={true}
          >
            <View style={{
              width: 36,
              height: 36,
              backgroundColor: '#fff',
              borderRadius: 18,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 5
            }}>
              <MaterialCommunityIcons name="car-side" size={20} color="#7F00FF" />
            </View>
          </Marker>
        )}

        {/* Render Radar Drivers (when no active trip) */}
        {!activeTripData && radarDrivers.map(d => (
          <Marker
            key={d.id}
            coordinate={{ latitude: d.location.lat, longitude: d.location.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={d.heading || 0}
            flat={true}
          >
            <View style={{
              width: 28,
              height: 28,
              backgroundColor: '#fff',
              borderRadius: 14,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 3,
              borderWidth: 2,
              borderColor: '#10B981' // Green to show they are available
            }}>
              <MaterialCommunityIcons name="car" size={16} color="#10B981" />
            </View>
          </Marker>
        ))}
      </MapView>

      <TouchableOpacity 
        style={styles.floatingBackBtn} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={26} color="#1A1A1A" />
      </TouchableOpacity>

      <View style={[styles.overlay, { zIndex: 10 }]} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { height: screenHeight - SNAP_TOP, transform: [{ translateY }] }]}>
          
          {/* DRAGGABLE HEADER ZONE */}
          <View {...panResponder.panHandlers} style={{ backgroundColor: '#FFF', paddingBottom: 10 }}>
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>
            
            <View style={[styles.headerRow, { marginTop: 0 }]}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.mainTitle}>O que pretende fazer?</Text>
              {/* Botão de minimizar â€” toggle ver rota / voltar */}
              {originCoord && destCoord ? (
                <TouchableOpacity
                  style={[
                    styles.minimizeBtn,
                    isMinimized && { backgroundColor: '#EDE9FE' }
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    if (isMinimized) {
                      snapTo(SNAP_TOP);
                      setIsMinimized(false);
                    } else {
                      snapTo(SNAP_BOTTOM);
                      setIsMinimized(true);
                    }
                  }}
                >
                  <Ionicons
                    name={isMinimized ? "chevron-up" : "map"}
                    size={18}
                    color="#A855F7"
                  />
                  <Text style={styles.minimizeBtnText}>
                    {isMinimized ? 'Ver form' : 'Ver rota'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 80 }} />
              )}
            </View>
          </View>

            <ScrollView 
              ref={scrollViewRef}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingBottom: keyboardHeight > 0 ? keyboardHeight + 200 : 120,
                paddingHorizontal: 20,
              }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <View>
              <Text style={styles.label}>Serviço</Text>
              <Text style={styles.serviceName}>{service.name}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                if (!reason && showMotives) {
                  setShowWarningModal({ visible: true, message: 'Selecione primeiro o motivo da solicitação.' });
                  return;
                }
                setShowMotives(!showMotives);
              }}
              style={{ padding: 5 }}
            >
              <Ionicons name={showMotives ? "chevron-up" : "chevron-down"} size={26} color="#A855F7" />
            </TouchableOpacity>
          </View>

          {showMotives && (
            <>
              <Text style={[styles.label, { marginTop: 5 }]}>
                Motivo da solicitação <Text style={{ color: 'red' }}>*</Text>
              </Text>
              <View style={styles.grid}>
                {motivesList.map((motive, i) => {
                  const isActive = reason === motive;
                  return (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.card, isActive && styles.cardActive]} 
                      onPress={() => {
                        setReason(motive);
                        setShowMotives(false);
                      }}
                      activeOpacity={0.8}
                    >
                      {isActive ? (
                        <LinearGradient colors={['#9800FF', '#B400FF']} style={styles.cardGradient}>
                          <Text style={[styles.cardTitle, { color: '#FFF' }]}>{motive}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.cardContent}>
                          <Text style={styles.cardTitle}>{motive}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {reason && !showMotives && (
            <Text style={{ fontSize: 14, color: '#A855F7', fontWeight: '600', marginBottom: 10 }}>
              Motivo escolhido: {reason}
            </Text>
          )}

          {/* ORIGIN INPUT - FIXED HEIGHT */}
          <View style={styles.inputBlock}>
            <Text style={styles.label}>Origem</Text>
            <View style={styles.inputRow}>
              <TextInput
                ref={originInputRef}
                style={styles.fixedInput}
                placeholder="De onde partimos?"
                placeholderTextColor="#9CA3AF"
                value={originText}
                onFocus={() => {
                  snapTo(SNAP_TOP);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 160, animated: true });
                  }, 350);
                }}
                onChangeText={(text) => {
                  setOriginText(text);
                  setOrigin(text);
                  setOriginCoord(null);
                  fetchSuggestions(text, 'origin');
                }}
              />
              <TouchableOpacity style={styles.gpsBtn} onPress={handleGetCurrentLocation}>
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#A855F7" />
              </TouchableOpacity>
            </View>
            {/* Suggestions dropdown */}
            {originSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {loadingOrigin && <ActivityIndicator size="small" color="#A855F7" style={{ margin: 8 }} />}
                {originSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.suggestionRow}
                    onPress={() => selectPlace(item.place_id, item.description, 'origin')}
                  >
                    <Ionicons name="location-outline" size={16} color="#A855F7" style={{ marginRight: 8 }} />
                    <Text style={styles.suggestionText} numberOfLines={1}>{item.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* DESTINATION INPUT - FIXED HEIGHT */}
          <View style={[styles.inputBlock, { marginTop: 12 }]}>
            <Text style={styles.label}>Destino</Text>
            <View style={styles.inputRow}>
              <TextInput
                ref={destInputRef}
                style={styles.fixedInput}
                placeholder="Para onde vamos?"
                placeholderTextColor="#9CA3AF"
                value={destText}
                onFocus={() => {
                  snapTo(SNAP_TOP);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 350, animated: true });
                  }, 350);
                }}
                onChangeText={(text) => {
                  setDestText(text);
                  setDestination(text);
                  setDestCoord(null);
                  fetchSuggestions(text, 'dest');
                }}
              />
            </View>
            {/* Suggestions dropdown */}
            {destSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {loadingDest && <ActivityIndicator size="small" color="#A855F7" style={{ margin: 8 }} />}
                {destSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.suggestionRow}
                    onPress={() => selectPlace(item.place_id, item.description, 'dest')}
                  >
                    <Ionicons name="location-outline" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.suggestionText} numberOfLines={1}>{item.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          {/* Estimativa de tempo */}
          {duration !== null && !isSearching && (
            <View style={styles.durationBadge}>
              <MaterialCommunityIcons name="clock-fast" size={15} color="#A855F7" />
              <Text style={styles.durationText}> {duration} min de viagem estimados</Text>
            </View>
          )}

          {/* ========================================================= */}
          {/* BLOCO DE AGENDAMENTO + CONFIRMAR â€” aparece com origem+destino */}
          {/* ========================================================= */}
          {originCoord && destCoord && !isSearching && (
            <View style={{ marginTop: 16 }}>

              {/* Toggle Imediato / Agendar */}
              {false && (
                <>
                  <Text style={[styles.label, { marginBottom: 8 }]}>Quando pretende o servico?</Text>
                  <View style={{ flexDirection: 'row', borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: '#A855F7', marginBottom: 16 }}>
                    <TouchableOpacity
                      style={[{ flex: 1, paddingVertical: 12, alignItems: 'center' }, !isScheduled && { backgroundColor: '#7F00FF' }]}
                      onPress={() => { setIsScheduled(false); setScheduledConfirmed(false); }}
                    >
                      <Text style={{ color: !isScheduled ? '#FFF' : '#7F00FF', fontWeight: '700', fontSize: 14 }}>Imediato</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[{ flex: 1, paddingVertical: 12, alignItems: 'center' }, isScheduled && { backgroundColor: '#7F00FF' }]}
                      onPress={() => setIsScheduled(true)}
                    >
                      <Text style={{ color: isScheduled ? '#FFF' : '#7F00FF', fontWeight: '700', fontSize: 14 }}>Agendar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Seletor de Data e Hora (apenas quando Agendar selecionado) */}
              {isScheduled && (
                <View style={{ backgroundColor: '#F5F3FF', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#DDD6FE' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#5B21B6', marginBottom: 10 }}>Data e Hora do Servico</Text>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {/* Botao Data */}
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', borderRadius: 10, padding: 10 }}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#7F00FF" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#4C1D95', fontWeight: '600', fontSize: 13 }}>
                        {scheduledDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </Text>
                    </TouchableOpacity>

                    {/* Botao Hora */}
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(true)}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', borderRadius: 10, padding: 10 }}
                    >
                      <Ionicons name="time-outline" size={18} color="#7F00FF" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#4C1D95', fontWeight: '600', fontSize: 13 }}>
                        {scheduledDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Aviso se a data for no passado */}
                  {scheduledDate <= new Date() && (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 8, fontWeight: '600' }}>
                      âš  Escolha uma data/hora futura.
                    </Text>
                  )}
                </View>
              )}

              {/* DatePicker (nativo) */}
              {showDatePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      const updated = new Date(scheduledDate);
                      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                      setScheduledDate(updated);
                    }
                  }}
                />
              )}

              {/* TimePicker (nativo) */}
              {showTimePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  is24Hour={true}
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(false);
                    if (selectedTime) {
                      const updated = new Date(scheduledDate);
                      updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                      setScheduledDate(updated);
                    }
                  }}
                />
              )}

              {/* Botao Confirmar */}
              <TouchableOpacity
                style={styles.confirmBtnInSheet}
                activeOpacity={0.85}
                onPress={() => {
                  if (!reason) {
                    setShowWarningModal({ visible: true, message: 'Por favor selecione um motivo da solicitacao.' });
                    return;
                  }
                  if (isScheduled && scheduledDate <= new Date()) {
                    setShowWarningModal({ visible: true, message: 'Por favor escolha uma data e hora futuras para o agendamento.' });
                    return;
                  }
                  Keyboard.dismiss();
                  snapTo(screenHeight);
                  setRejectedDriverIds([]);
                  setIsSearching(true);
                  startPulse();
                }}
              >
                <LinearGradient
                  colors={isScheduled ? ['#F59E0B', '#D97706'] : ['#6D00E0', '#A855F7']}
                  style={styles.confirmGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons
                    name={isScheduled ? 'calendar-sharp' : 'checkmark-circle'}
                    size={22}
                    color="#FFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.confirmBtnText}>
                    {isScheduled ? 'Confirmar Agendamento' : 'Confirmar Pedido'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Espaco extra no fundo do scroll */}
          <View style={{ height: 60 }} />
        </ScrollView>
      </Animated.View>
    </View>


    <Modal visible={isSearching} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View style={{
          backgroundColor: '#FFF',
          borderRadius: 28,
          padding: 32,
          width: '88%',
          alignItems: 'center',
          elevation: 20,
          shadowColor: '#7F00FF',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
        }}>
          {/* Radar pulse */}
          <View style={{ width: 110, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
            <Animated.View style={[styles.radarCenter, {
              position: 'absolute',
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
            }]} />
            <Animated.View style={[styles.radarCenter, {
              position: 'absolute',
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
            }]} />
            <View style={[styles.radarCenter, { backgroundColor: '#F3E8FF', width: 64, height: 64, borderRadius: 32 }]}>
              <MaterialCommunityIcons name="car-search" size={30} color="#A855F7" />
            </View>
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>
            Procurando serviço de {service?.name}...
          </Text>
          <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 14 }}>
            Raio de busca: <Text style={{ color: '#A855F7', fontWeight: '700' }}>{radius} KM</Text>
          </Text>

          {/* Barra de progresso */}
          <View style={{ width: '100%', height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, marginTop: 20, overflow: 'hidden' }}>
            <Animated.View style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: '#A855F7',
              width: `${Math.min((searchSeconds / 60) * 100, 100)}%`,
            }} />
          </View>
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 6 }}>
            {searchSeconds < 60 ? `${searchSeconds}s / 60s` : 'A expandir raio...'}
          </Text>

          <TouchableOpacity
            style={{
              marginTop: 24,
              paddingVertical: 12,
              paddingHorizontal: 32,
              backgroundColor: '#FEF2F2',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#FECACA',
            }}
            onPress={() => {
              setIsSearching(false);
              clearTimeout(searchTimerRef.current);
              clearInterval(searchCounterRef.current);
              setRejectedDriverIds([]);
              snapTo(SNAP_TOP);
            }}
          >
            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>Cancelar Busca</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

      {/* Lista de Motoristas Disponiveis */}
      <Modal
        visible={availableDriversList.length > 0 && !waitingForDriver && !isSearching && !activeTripData}
        transparent
        animationType="slide"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' }}>
            
            <View style={{ width: 40, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginBottom: 15 }} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Motoristas Disponíveis</Text>
              <TouchableOpacity onPress={() => { setAvailableDriversList([]); setRejectedDriverIds([]); setIsSearching(true); startPulse(); }}>
                 <MaterialCommunityIcons name="refresh" size={24} color="#9800FF" />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 15 }}>Escolha o motorista que preferir.</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableDriversList.map((driver, index) => {
                const serviceBase = service?.baseFare || 0;
                let deslocacao = price > serviceBase ? price - serviceBase : 0;
                
                let baseFare = price;
                if (driver.deliveryman?.allowCustomPrice && driver.deliveryman?.customPrice) {
                  baseFare = driver.deliveryman.customPrice;
                } else if (driver.deliveryman?.assigned_base_fee) {
                  baseFare = driver.deliveryman.assigned_base_fee;
                } else if (serviceBase > 0) {
                  baseFare = serviceBase;
                }
                
                let finalPrice = baseFare + deslocacao;
                
                const colorMap = {
                  branco: '#E5E7EB', preto: '#1F2937', vermelho: '#EF4444',
                  azul: '#3B82F6', verde: '#10B981', amarelo: '#F59E0B',
                  cinza: '#9CA3AF', cinzento: '#9CA3AF', laranja: '#F97316',
                  rosa: '#EC4899', violeta: '#8B5CF6', castanho: '#92400E',
                };
                const tColor = driver.deliveryman?.transport_color || '';
                const colorHex = colorMap[tColor.toLowerCase()] || '#6B7280';

                return (
                  <TouchableOpacity
                    key={driver._id || index}
                    activeOpacity={0.7}
                    onPress={() => sendRequestToDriver(driver)}
                    style={{
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#F3F4F6',
                      borderRadius: 16,
                      marginBottom: 12,
                      backgroundColor: '#F9FAFB',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Image
                        source={driver.deliveryman?.vihicle_picture_front || driver.deliveryman?.vihicle_picture ? { uri: driver.deliveryman?.vihicle_picture_front || driver.deliveryman?.vihicle_picture } : driver.profileImage ? { uri: driver.profileImage } : { uri: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
                        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5E7EB' }}
                      />
                      
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }} numberOfLines={1}>{driver.name}</Text>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                                <Text style={{ fontSize: 13, color: '#4B5563', marginLeft: 2, fontWeight: '600' }}>
                                  {driver.deliveryman?.rating || 'Novo'}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>•</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="car-side" size={14} color="#6B7280" />
                                <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 2 }} numberOfLines={1}>
                                  {(() => {
                                    const tType = service?.name || driver.transport_type || driver.deliveryman?.transport_type || 'Desconhecido';
                                    return /^[a-fA-F0-9]{24}$/.test(tType) ? 'Motorista' : tType;
                                  })()}
                                </Text>
                              </View>
                            </View>
                          </View>
                          
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: '#9800FF' }}>
                               {finalPrice.toFixed(0)} MT
                            </Text>
                            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                               Base: {baseFare.toFixed(0)} + {deslocacao.toFixed(0)}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 6 }}>
                          {!!driver.deliveryman?.transport_color && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorHex, marginRight: 4, borderWidth: 1, borderColor: '#E5E7EB' }} />
                              <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>{tColor}</Text>
                            </View>
                          )}
                          {!!driver.deliveryman?.transport_registration && (
                            <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB' }}>
                              <Text style={{ fontSize: 10, color: '#374151', fontWeight: 'bold', letterSpacing: 0.5 }}>
                                {driver.deliveryman?.transport_registration.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flex: 1, gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="clock-fast" size={14} color="#D97706" />
                          <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '600', marginLeft: 4 }}>
                            A {driver.distance ? Math.ceil(driver.distance * 2) : '?'} min
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="map-marker-distance" size={14} color="#4F46E5" />
                          <Text style={{ fontSize: 12, color: '#4F46E5', fontWeight: '600', marginLeft: 4 }}>
                            {driver.distance ? driver.distance.toFixed(1) : '?'} km
                          </Text>
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <MaterialCommunityIcons name="flag-checkered" size={12} color="#6B7280" />
                        <Text style={{ fontSize: 11, color: '#4B5563', marginLeft: 4, fontWeight: '600' }}>
                           Destino: ~{duration ? String(duration).replace('mins', '').replace('min', '').trim() + ' min' : '15 min'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity 
              style={{ padding: 16, marginTop: 10, alignItems: 'center' }}
              onPress={() => {
                setAvailableDriversList([]);
                snapTo(SNAP_TOP);
              }}
            >
              <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    <Modal visible={waitingForDriver} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View style={{
          backgroundColor: '#FFF',
          borderRadius: 28,
          padding: 32,
          width: '88%',
          alignItems: 'center',
          elevation: 20,
          shadowColor: '#7F00FF',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
        }}>
          {/* Radar pulse */}
          <View style={{ width: 110, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
            <Animated.View style={[styles.radarCenter, {
              position: 'absolute',
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
            }]} />
            <Animated.View style={[styles.radarCenter, {
              position: 'absolute',
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
            }]} />
            <View style={[styles.radarCenter, { backgroundColor: '#F3E8FF', width: 64, height: 64, borderRadius: 32 }]}>
              {waitingCountdown > 0 ? (
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#A855F7' }}>{waitingCountdown}</Text>
              ) : (
                <MaterialCommunityIcons name="clock-outline" size={30} color="#A855F7" />
              )}
            </View>
          </View>

          {waitingCountdown > 0 ? (
            <>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>
                A aguardar {selectedDriverForRequest?.name?.split(' ')[0]}...
              </Text>
              <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 14, textAlign: 'center' }}>
                Enviámos o seu pedido. Por favor aguarde enquanto o motorista analisa.
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>
                O motorista está a demorar...
              </Text>
              <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 14, textAlign: 'center' }}>
                Pode continuar a esperar ou procurar novos motoristas disponíveis.
              </Text>
            </>
          )}

          {selectedDriverForRequest && (() => {
            const serviceBase = service?.baseFare || 0;
            let selectedDeslocacao = price > serviceBase ? price - serviceBase : 0;
            
            let selectedBaseFare = price;
            if (selectedDriverForRequest.deliveryman?.allowCustomPrice && selectedDriverForRequest.deliveryman?.customPrice) {
              selectedBaseFare = selectedDriverForRequest.deliveryman.customPrice;
            } else if (selectedDriverForRequest.deliveryman?.assigned_base_fee) {
              selectedBaseFare = selectedDriverForRequest.deliveryman.assigned_base_fee;
            } else if (serviceBase > 0) {
              selectedBaseFare = serviceBase;
            }
            
            let selectedFinalPrice = selectedBaseFare + selectedDeslocacao;

            return (
              <View style={{ marginTop: 15, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12, width: '100%', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Resumo do Pedido</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#9800FF', marginTop: 4 }}>
                  {selectedFinalPrice.toFixed(0)} MT
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  Taxa Base ({selectedBaseFare.toFixed(0)} MT) + Deslocação ({selectedDeslocacao.toFixed(0)} MT)
                </Text>
              </View>
            );
          })()}

          {waitingCountdown > 0 ? (
            <TouchableOpacity
              style={{
                marginTop: 24,
                paddingVertical: 12,
                paddingHorizontal: 32,
                backgroundColor: '#FEF2F2',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#FECACA',
                width: '100%',
                alignItems: 'center',
              }}
              activeOpacity={0.8}
              onPress={handleCancelPendingRequest}
            >
              <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>Cancelar Pedido</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  backgroundColor: '#7F00FF',
                  borderRadius: 14,
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
                onPress={async () => {
                  setWaitingCountdown(45);
                  try {
                    const storedUserData = await AsyncStorage.getItem('userData');
                    const token = storedUserData ? JSON.parse(storedUserData).token : '';
                    await api.post(`/request-service/${currentRequestServiceId}/resend`, 
                      { targetDriverId: selectedDriverForRequest?._id }, 
                      { headers: { authorization: `Bearer ${token}` } }
                    );
                  } catch(e) { console.log('Erro ao reenviar', e); }
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Continuar Ã  espera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  backgroundColor: '#FEF2F2',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#FECACA',
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
                onPress={async () => {
                  await handleCancelPendingRequest();
                  setRejectedDriverIds([]);
                  setIsSearching(true);
                  startPulse();
                }}
              >
                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>Procurar novos motoristas</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>

      <Modal visible={showBusyModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modernModal}>
            <View style={styles.modalIconBox}>
              <MaterialCommunityIcons name="clock-alert-outline" size={32} color="#D97706" />
            </View>
            <Text style={styles.modalTitle}>Motoristas Ocupados</Text>
            <Text style={styles.modalDesc}>
              Não encontrámos nenhum motorista disponível num raio de {radius} KM. Deseja aumentar o raio em +2 KM?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => {
                  setShowBusyModal(false);
                  setRadius(5); // Reset raio para o valor inicial
                  setRejectedDriverIds([]);
                  snapTo(SNAP_TOP); // Abrir o formulario para o utilizador mudar destino
                  setIsMinimized(false);
                }}
              >
                <Text style={styles.modalBtnCancelText}>Mudar Destino</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnConfirm]} 
                onPress={() => {
                  setShowBusyModal(false);
                  setRadius(r => r + 2);
                  setRejectedDriverIds([]);
                  setIsSearching(true);
                  startPulse();
                }}
              >
                <LinearGradient colors={['#A855F7', '#7F00FF']} style={styles.modalBtnGradient}>
                  <Text style={styles.modalBtnConfirmText}>Aumentar Raio</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showUnavailableAlert} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modernModal}>
            <View style={[styles.modalIconBox, { backgroundColor: '#FEF2F2' }]}>
              <MaterialCommunityIcons name="car-off" size={32} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Indisponível</Text>
            <Text style={styles.modalDesc}>
              O motorista selecionado não se encontra disponível neste momento. Por favor, pesquise por outros motoristas.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnConfirm, { width: '100%' }]} 
                onPress={() => {
                  setShowUnavailableAlert(false);
                  setRejectedDriverIds([]);
                  setAvailableDriversList([]);
                  setIsSearching(true);
                  startPulse();
                }}
              >
                <LinearGradient colors={['#A855F7', '#7F00FF']} style={styles.modalBtnGradient}>
                  <Text style={styles.modalBtnConfirmText}>Pesquisar Novamente</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showWarningModal.visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modernModal}>
            <View style={[styles.modalIconBox, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Atenção</Text>
            <Text style={styles.modalDesc}>
              {showWarningModal.message}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnConfirm, { width: '100%', marginLeft: 0 }]} 
                onPress={() => setShowWarningModal({ visible: false, message: '' })}
              >
                <LinearGradient colors={['#A855F7', '#7F00FF']} style={styles.modalBtnGradient}>
                  <Text style={styles.modalBtnConfirmText}>Entendido</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!activeTripData}
        transparent
        animationType="fade"
        onRequestClose={() => {
          navigation.goBack();
        }}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={[
              styles.premiumIconContainer,
              { backgroundColor: activeTripData?.status === 'Pendente' ? '#FEF3C7' : '#DCFCE7' }
            ]}>
              <MaterialCommunityIcons 
                name={activeTripData?.status === 'Pendente' ? 'clock-outline' : 'car-speed-limiter'} 
                size={40} 
                color={activeTripData?.status === 'Pendente' ? '#D97706' : '#16A34A'} 
              />
            </View>
            
            <Text style={styles.premiumModalTitle}>
              {activeTripData?.status === 'Pendente' ? 'Solicitação Pendente' : 'Viagem Aceite!'}
            </Text>
            
            <Text style={styles.premiumModalBody}>
              {activeTripData?.status === 'Pendente' 
                ? 'Você já tem uma solicitação pendente em curso. Por favor, acompanhe-a antes de iniciar outro serviço.'
                : `O motorista ${activeTripData?.deliveryman?.name || 'parceiro'} aceitou a sua viagem! Acompanhe a trajetória em tempo real.`}
            </Text>
            
            <TouchableOpacity
              style={styles.premiumModalBtn}
              activeOpacity={0.8}
              onPress={() => {
                const order = activeTripData;
                setActiveTripData(null);
                navigation.replace('OrderDetailsScreen', { orderId: order._id, item: order });
              }}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                style={styles.premiumModalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.premiumModalBtnText}>
                  Acompanhar Viagem
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.premiumModalBackBtn}
              onPress={() => {
                setActiveTripData(null);
                navigation.goBack();
              }}
            >
              <Text style={styles.premiumModalBackBtnText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },

  sheet: {
    backgroundColor: '#FFF',
    padding: 20,
    paddingTop: 5,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },

  dragHandleContainer: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  dragHandle: {
    width: 50,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB'
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10
  },

  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 10
  },

  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10
  },

  input: {
    backgroundColor: '#F5F5F5',
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 5,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500'
  },

  // New fixed input styles
  inputBlock: {
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginTop: 6,
    height: 52, // ALWAYS 52px, never grows
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  fixedInput: {
    flex: 1,
    height: 52, // FIXED HEIGHT
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  gpsBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    overflow: 'hidden',
    zIndex: 999,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    maxHeight: 180,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 13,
    color: '#1A1A1A',
    flex: 1,
  },

  btn: {
    marginTop: 20
  },

  minimizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  minimizeBtnText: {
    fontSize: 13,
    color: '#A855F7',
    fontWeight: '700',
  },


  gradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },

  // Confirm button inside the sheet
  confirmBtnInSheet: {
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  confirmGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 14,
    alignSelf: 'center',
  },
  durationText: {
    color: '#7F00FF',
    fontWeight: '700',
    fontSize: 13,
  },

  btnText: {
    color: '#FFF',
    fontWeight: '700'
  },

  priceBox: {
    marginTop: 15,
    backgroundColor: '#FFF7E6',
    padding: 12,
    borderRadius: 10
  },

  price: {
    fontWeight: '800'
  },

  back: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666'
  },

  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#A855F7'
  },

  floatingBackBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8
  },

  radarCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7F00FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  },
  
  // New Styles for Step 1 Layout
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  subtitleRight: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  card: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardContent: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  cardGradient: {
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  cardActive: {
    borderColor: '#A855F7',
    elevation: 5,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1A1A1A'
  },
  
  // Custom Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modernModal: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10
  },
  modalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8
  },
  modalDesc: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  modalBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden'
  },
  modalBtnCancel: {
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14
  },
  modalBtnCancelText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 15
  },
  modalBtnConfirm: {
    marginLeft: 10,
  },
  modalBtnGradient: {
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBtnConfirmText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  premiumModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 15,
  },
  premiumIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  premiumModalBody: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  premiumModalBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumModalGradient: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumModalBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  premiumModalBackBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  premiumModalBackBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15,
  }
});

const autocompleteStyles = StyleSheet.create({
  container: {
    flex: 0,
  },
  textInputContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  textInput: {
    height: 56,
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginTop: 5,
  },
  listView: {
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'absolute',
    top: 65,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: 180, // Fixed height instead of maxHeight so it's always predictable and uses scroll
  },
  row: {
    padding: 13,
    height: 44,
    flexDirection: 'row',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#c8c7cc',
  },
  description: {
    fontSize: 14,
  },
});