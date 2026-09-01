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
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';

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

  const formatDriverRating = (item) => {
    if (!item) return '5.0';
    const val = item.deliveryman?.averageRating ?? item.deliveryman?.rating ?? item.averageRating ?? item.rating;
    const parsed = parseFloat(val);
    return (!isNaN(parsed) && parsed > 0) ? parsed.toFixed(1) : '5.0';
  };

  const getDriverAvatar = (d) => {
    if (!d) return 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
    const uri = d.profileImage || 
                d.deliveryman?.photo || 
                d.deliveryman?.profileImage || 
                d.deliveryman?.image || 
                d.deliveryman?.avatar || 
                d.photo || 
                d.image || 
                d.avatar;
    if (uri && typeof uri === 'string' && uri.trim() !== '' && uri.startsWith('http')) {
      return uri;
    }
    return 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
  };

  const service = route.params?.selectedService;

  const [subcatConfig, setSubcatConfig] = useState(null);

  useEffect(() => {
    if (service?._id) {
      api.get(`/provider-subcategories/${service._id}`)
        .then(res => {
          if (res.data) setSubcatConfig(res.data);
        })
        .catch(err => console.log('Erro ao carregar subcategoria:', err));
    }
  }, [service?._id]);

  const requiresPhotos = service?.requiresPhotos === true || subcatConfig?.requiresPhotos === true;

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

  // Fotos do Veículo e Negociação de Valor
  const [vehiclePhotos, setVehiclePhotos] = useState({ front: '', rear: '', leftSide: '', rightSide: '' });
  const [uploadingPhotos, setUploadingPhotos] = useState({ front: false, rear: false, leftSide: false, rightSide: false });
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [proposalAmount, setProposalAmount] = useState('');
  const [proposalNote, setProposalNote] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);

  const uploadVehiclePhotoAsset = async (position, asset) => {
    try {
      setUploadingPhotos(prev => ({ ...prev, [position]: true }));
      const formData = new FormData();
      const filename = asset.fileName || `vehicle_${position}.jpg`;
      const fileType = asset.mimeType || asset.type || 'image/jpeg';

      formData.append('file', {
        uri: asset.uri,
        type: fileType,
        name: filename,
      });

      const baseURL = api.defaults.baseURL || 'http://10.167.165.176:5000/api';
      const uploadUrl = `${baseURL}/upload`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload falhou com código ${response.status}`);
      }

      const data = await response.json();
      const url = data.secure_url || data.url;

      if (!url) {
        throw new Error('Servidor não retornou a URL da imagem.');
      }

      setVehiclePhotos(prev => ({ ...prev, [position]: url }));
    } catch (err) {
      console.log('Erro ao carregar foto do veículo:', err);
      Alert.alert('Erro', 'Não foi possível carregar a imagem do veículo. Verifique a ligação à rede.');
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [position]: false }));
    }
  };

  const getMediaType = () => ImagePicker.MediaType?.Images || ImagePicker.MediaTypeOptions?.Images || 'images';

  const handleLaunchCamera = async (position) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos de acesso à câmara para fotografar o veículo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: getMediaType(),
        allowsEditing: false,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadVehiclePhotoAsset(position, result.assets[0]);
      }
    } catch (err) {
      console.log('Erro ao abrir câmara:', err);
      Alert.alert('Erro', 'Não foi possível abrir a câmara.');
    }
  };

  const handleLaunchLibrary = async (position) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos de acesso à galeria de fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getMediaType(),
        allowsEditing: false,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadVehiclePhotoAsset(position, result.assets[0]);
      }
    } catch (err) {
      console.log('Erro ao abrir galeria:', err);
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
  };

  const pickVehiclePhoto = (position) => {
    Alert.alert(
      'Fotografia do Veículo',
      'Escolha como deseja adicionar a foto:',
      [
        {
          text: '📷 Tirar Foto (Câmara)',
          onPress: () => handleLaunchCamera(position)
        },
        {
          text: '🖼️ Escolher da Galeria',
          onPress: () => handleLaunchLibrary(position)
        },
        {
          text: 'Cancelar',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  };

  const handleProposePrice = async () => {
    if (!proposalAmount || isNaN(Number(proposalAmount)) || Number(proposalAmount) <= 0) {
      Alert.alert('Valor Inválido', 'Introduza um valor válido para a proposta.');
      return;
    }
    const orderId = currentRequestServiceId || activeTripData?._id;
    if (!orderId) return;

    setSubmittingProposal(true);
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      const { data } = await api.post(`/request-service/${orderId}/negotiate/propose`, {
        amount: Number(proposalAmount),
        note: proposalNote
      }, {
        headers: { authorization: `Bearer ${token}` }
      });
      Alert.alert('Proposta Enviada', 'A sua proposta de preço foi enviada ao fornecedor.');
      setShowNegotiationModal(false);
      setProposalAmount('');
      setProposalNote('');
      if (data.order) setActiveTripData(data.order);
    } catch (err) {
      console.log('Erro ao enviar proposta:', err);
      Alert.alert('Erro', err.response?.data?.message || 'Falha ao enviar proposta.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleAcceptProposal = async () => {
    const orderId = currentRequestServiceId || activeTripData?._id;
    if (!orderId) return;
    setSubmittingProposal(true);
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      const { data } = await api.post(`/request-service/${orderId}/negotiate/accept`, {}, {
        headers: { authorization: `Bearer ${token}` }
      });
      Alert.alert('Proposta Aceite', 'O valor final do serviço foi acordado com sucesso!');
      if (data.order) setActiveTripData(data.order);
    } catch (err) {
      console.log('Erro ao aceitar proposta:', err);
      Alert.alert('Erro', err.response?.data?.message || 'Falha ao aceitar proposta.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleRejectProposal = async () => {
    const orderId = currentRequestServiceId || activeTripData?._id;
    if (!orderId) return;
    setSubmittingProposal(true);
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      const { data } = await api.post(`/request-service/${orderId}/negotiate/reject`, {}, {
        headers: { authorization: `Bearer ${token}` }
      });
      Alert.alert('Proposta Rejeitada', 'A proposta foi rejeitada.');
      if (data.order) setActiveTripData(data.order);
    } catch (err) {
      console.log('Erro ao rejeitar proposta:', err);
      Alert.alert('Erro', err.response?.data?.message || 'Falha ao rejeitar proposta.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Radar Search State
  const [radius, setRadius] = useState(5);
  const [isSearching, setIsSearching] = useState(false);
  const [waitingForDriver, setWaitingForDriver] = useState(false);
  const [selectedDriverForRequest, setSelectedDriverForRequest] = useState(null);
  const [availableDriversList, setAvailableDriversList] = useState([]);
  const [waitingCountdown, setWaitingCountdown] = useState(60);
  const [rejectedDriverIds, setRejectedDriverIds] = useState([]);
  const [showBusyModal, setShowBusyModal] = useState(false);
  const [showUnavailableAlert, setShowUnavailableAlert] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState({ visible: false, message: '' });
  const [showDriverArrivedModal, setShowDriverArrivedModal] = useState(false);
  const [duration, setDuration] = useState(null);
  const [activeTripData, setActiveTripData] = useState(null);
  const [currentRequestServiceId, setCurrentRequestServiceId] = useState(null);
  const [activeNegotiationOrder, setActiveNegotiationOrder] = useState(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [isSubmittingNegotiation, setIsSubmittingNegotiation] = useState(false);

  // Handlers para Negociação do Cliente
  const handleAcceptNegotiation = async (orderToAccept) => {
    try {
      setIsSubmittingNegotiation(true);
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      const orderId = orderToAccept?._id || currentRequestServiceId;

      const { data } = await api.post(`/request-service/${orderId}/negotiate/accept`, {}, {
        headers: { authorization: `Bearer ${token}` }
      });

      Alert.alert('Proposta Aceite!', 'A proposta de preço foi aceite com sucesso. O motorista está a caminho!');
      setWaitingForDriver(false);
      setIsSearching(false);
      setActiveTripData(data.order || orderToAccept);
      setActiveNegotiationOrder(null);
      setCurrentRequestServiceId(null);
    } catch (err) {
      console.error('Erro ao aceitar proposta:', err);
      Alert.alert('Erro', err.response?.data?.message || 'Não foi possível aceitar a proposta.');
    } finally {
      setIsSubmittingNegotiation(false);
    }
  };

  const handleCounterPropose = async (orderToCounter) => {
    const numericAmount = Number(counterPrice);
    if (!counterPrice || isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Valor Inválido', 'Por favor insira um valor válido para a sua contra-proposta.');
      return;
    }

    try {
      setIsSubmittingNegotiation(true);
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      const orderId = orderToCounter?._id || currentRequestServiceId;

      const { data } = await api.post(`/request-service/${orderId}/negotiate/propose`, {
        amount: numericAmount,
        proposedBy: 'CUSTOMER',
        note: counterNote || 'Contra-proposta enviada pelo cliente'
      }, {
        headers: { authorization: `Bearer ${token}` }
      });

      Alert.alert('Contra-proposta Enviada!', 'A sua proposta foi enviada com sucesso ao motorista.');
      setActiveNegotiationOrder(data.order);
      setShowCounterModal(false);
      setCounterPrice('');
      setCounterNote('');
    } catch (err) {
      console.error('Erro ao enviar contra-proposta:', err);
      Alert.alert('Erro', err.response?.data?.message || 'Não foi possível enviar a contra-proposta.');
    } finally {
      setIsSubmittingNegotiation(false);
    }
  };

  const handleRejectNegotiation = async (orderToReject) => {
    try {
      setIsSubmittingNegotiation(true);
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      const orderId = orderToReject?._id || currentRequestServiceId;

      const { data } = await api.post(`/request-service/${orderId}/negotiate/reject`, {}, {
        headers: { authorization: `Bearer ${token}` }
      });

      Alert.alert('Proposta Rejeitada', 'A proposta do motorista foi rejeitada.');
      setActiveNegotiationOrder(data.order);
    } catch (err) {
      console.error('Erro ao rejeitar proposta:', err);
      Alert.alert('Erro', err.response?.data?.message || 'Não foi possível rejeitar a proposta.');
    } finally {
      setIsSubmittingNegotiation(false);
    }
  };

  const handleCancelNegotiatedOrder = async (orderToCancel) => {
    try {
      setIsSubmittingNegotiation(true);
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      const orderId = orderToCancel?._id || currentRequestServiceId;

      await api.put(`/request-service/${orderId}/cancel`, {
        message: 'Cancelado pelo cliente durante a negociação'
      }, {
        headers: { authorization: `Bearer ${token}` }
      });

      Alert.alert('Pedido Cancelado', 'A sua solicitação foi cancelada.');
      setWaitingForDriver(false);
      setIsSearching(false);
      setSelectedDriverForRequest(null);
      setActiveNegotiationOrder(null);
      setCurrentRequestServiceId(null);
    } catch (err) {
      console.error('Erro ao cancelar pedido:', err);
      Alert.alert('Erro', err.response?.data?.message || 'Não foi possível cancelar o pedido.');
    } finally {
      setIsSubmittingNegotiation(false);
    }
  };
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
  const [selectedDriverInfo, setSelectedDriverInfo] = useState(null);

  // Autocomplete state
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [additionalStops, setAdditionalStops] = useState([]);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [loadingOrigin, setLoadingOrigin] = useState(false);
  const [loadingDest, setLoadingDest] = useState(false);
  const originInputRef = useRef(null);
  const destInputRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false); // toggle ver rota

  // Multi-stop handlers
  const handleAddStop = () => {
    if (additionalStops.length >= 5) {
      Alert.alert('Limite Atingido', 'Pode adicionar no máximo 5 paragens adicionais.');
      return;
    }
    setAdditionalStops(prev => [
      ...prev,
      { id: Date.now().toString(), text: '', coord: null, suggestions: [], loading: false }
    ]);
  };

  const handleRemoveStop = (stopId) => {
    setAdditionalStops(prev => prev.filter(s => s.id !== stopId));
  };

  const handleUpdateStopText = (stopId, text) => {
    setAdditionalStops(prev => prev.map(s => s.id === stopId ? { ...s, text, coord: null } : s));
    fetchStopSuggestions(stopId, text);
  };

  const fetchStopSuggestions = async (stopId, text) => {
    if (!text || text.length < 2) {
      setAdditionalStops(prev => prev.map(s => s.id === stopId ? { ...s, suggestions: [], loading: false } : s));
      return;
    }
    setAdditionalStops(prev => prev.map(s => s.id === stopId ? { ...s, loading: true } : s));
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${EXPO_PUBLIC_GOOGLE_PLACES_APIKEY}&language=pt&components=country:mz`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.predictions) {
        setAdditionalStops(prev => prev.map(s => s.id === stopId ? { ...s, suggestions: json.predictions, loading: false } : s));
      }
    } catch (e) {
      console.log('Stop autocomplete error:', e);
      setAdditionalStops(prev => prev.map(s => s.id === stopId ? { ...s, loading: false } : s));
    }
  };

  const selectStopPlace = async (stopId, placeId, description) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${EXPO_PUBLIC_GOOGLE_PLACES_APIKEY}&fields=geometry`;
      const res = await fetch(url);
      const json = await res.json();
      const loc = json.result?.geometry?.location;
      setAdditionalStops(prev => prev.map(s => s.id === stopId ? {
        ...s,
        text: description,
        coord: loc ? { lat: loc.lat, lng: loc.lng } : null,
        suggestions: []
      } : s));
      Keyboard.dismiss();
    } catch (e) {
      console.log('Stop place details error:', e);
    }
  };

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
    if (requiresPhotos) {
      snapTo(SNAP_TOP);
    }
  }, [requiresPhotos]);

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
              const methodsList = Array.isArray(pmRes.data) ? pmRes.data : (pmRes.data?.paymentMethods || []);
              if (pmRes.status === 200 && methodsList.length > 0) {
                const pref = methodsList.find(p => p._id === parsed.preferredPaymentMethod);
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

  /* ---------------- PRICE API + ROUTE DRAWING ---------------- */
  useEffect(() => {
    const fetchPrice = async () => {
      if (!originCoord || !destCoord) return;

      const validStops = (additionalStops || [])
        .filter(s => s.coord?.lat && s.coord?.lng)
        .map(s => ({
          latitude: Number(s.coord.lat),
          longitude: Number(s.coord.lng),
          address: s.text || ''
        }));

      // Construir todos os waypoints em ordem: origem → paragens → destino
      const allWaypoints = [
        { lat: Number(originCoord.lat), lng: Number(originCoord.lng) },
        ...validStops.map(s => ({ lat: s.latitude, lng: s.longitude })),
        { lat: Number(destCoord.lat), lng: Number(destCoord.lng) },
      ];

      // Buscar rota segmento a segmento com 3 níveis de fallback
      const fetchSegment = async (fromLat, fromLng, toLat, toLng) => {
        // Nível 1: OSRM privado via backend
        try {
          const { data: rd } = await api.get(
            `/routing/route?originLat=${fromLat}&originLng=${fromLng}&destLat=${toLat}&destLng=${toLng}`
          );
          if (rd?.coordinates?.length > 0) {
            return rd.coordinates.map(c => ({
              latitude: Number(Array.isArray(c) ? c[1] : (c.lat ?? c.latitude)),
              longitude: Number(Array.isArray(c) ? c[0] : (c.lng ?? c.longitude)),
            }));
          }
        } catch (e) {
          console.log('[Route] Backend OSRM falhou, tentando público...', e?.message);
        }
        // Nível 2: OSRM público
        try {
          const resp = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
          );
          const d = await resp.json();
          if (d.code === 'Ok' && d.routes?.[0]?.geometry?.coordinates?.length > 0) {
            return d.routes[0].geometry.coordinates.map(c => ({
              latitude: Number(c[1]),
              longitude: Number(c[0]),
            }));
          }
        } catch (e) {
          console.log('[Route] OSRM público também falhou:', e?.message);
        }
        // Nível 3: linha recta
        return [
          { latitude: fromLat, longitude: fromLng },
          { latitude: toLat, longitude: toLng },
        ];
      };

      const buildFullRoute = async () => {
        const allCoords = [];
        for (let i = 0; i < allWaypoints.length - 1; i++) {
          const from = allWaypoints[i];
          const to = allWaypoints[i + 1];
          const seg = await fetchSegment(from.lat, from.lng, to.lat, to.lng);
          allCoords.push(...seg);
        }
        return allCoords;
      };

      try {
        const { data } = await api.post('/pricing/calculate', {
          serviceId: service?._id,
          originLoc: originCoord,
          destLoc: destCoord,
          stops: validStops,
          weightKg: 5
        });

        if (data?.price > 0) setPrice(data.price);
        else setPrice(service?.baseFare || 120);

        if (data?.breakdown?.durationMin) setDuration(Math.round(data.breakdown.durationMin));

        // Usar coordenadas da pricing API se disponíveis
        if (data?.routeCoordinates?.length > 0) {
          setRouteCoords(data.routeCoordinates.map(c => ({
            latitude: Number(c.latitude),
            longitude: Number(c.longitude)
          })));
        } else {
          // Pricing não retornou rota — construir via OSRM
          const coords = await buildFullRoute();
          if (coords.length > 0) setRouteCoords(coords);
        }
      } catch (error) {
        console.log('[Route] Pricing falhou, usando rota direta:', error?.message);
        setPrice(service?.baseFare || 120);
        const coords = await buildFullRoute();
        if (coords.length > 0) setRouteCoords(coords);
      }
    };

    fetchPrice();
  }, [originCoord, destCoord, additionalStops]);


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

  // Zoom and Fit map when origin, destination, additional stops or route changes
  useEffect(() => {
    if (mapRef.current && originCoord) {
      if (destCoord) {
        const stopCoords = (additionalStops || [])
          .filter(s => s.coord?.lat && s.coord?.lng)
          .map(s => ({ latitude: s.coord.lat, longitude: s.coord.lng }));

        const coordsToFit = [
          { latitude: originCoord.lat, longitude: originCoord.lng },
          { latitude: destCoord.lat, longitude: destCoord.lng },
          ...stopCoords,
          ...(routeCoords || [])
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
  }, [originCoord, destCoord, additionalStops, routeCoords]);

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
      setWaitingCountdown(60);

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

      let baseFare = serviceBase;
      if (driver.deliveryman?.allowCustomPrice && driver.deliveryman?.customPrice) {
        baseFare = driver.deliveryman.customPrice;
      } else if (driver.deliveryman?.assigned_base_fee) {
        baseFare = driver.deliveryman.assigned_base_fee;
      }

      let finalPrice = baseFare + deslocacao;

      if (requiresPhotos) {
        if (!vehiclePhotos.front || !vehiclePhotos.rear || !vehiclePhotos.leftSide || !vehiclePhotos.rightSide) {
          Alert.alert(
            'Fotografias Obrigatórias',
            'Por favor, faça upload de todas as 4 fotografias do veículo (Frente, Traseira, Lado Esquerdo e Lado Direito) antes de solicitar o serviço.'
          );
          return;
        }
      }

      const payload = {
        name: service.name,
        phoneNumber: phoneNumber || '000000000',
        goodType: reason,
        transportType: driver.deliveryman?.transport_type || 'N/A',
        deliverCity: originText || 'N/A',
        origin: originText,
        destination: destText,
        vehiclePhotos: requiresPhotos ? vehiclePhotos : undefined,
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
        stops: [
          { sequence: 1, address: destText, lat: destCoord.lat, lng: destCoord.lng },
          ...additionalStops.filter(s => s.text && s.coord).map((s, idx) => ({
            sequence: idx + 2,
            address: s.text,
            lat: s.coord.lat,
            lng: s.coord.lng
          }))
        ],
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
            if (myOrder.negotiationState && myOrder.negotiationState !== 'NONE') {
              setActiveNegotiationOrder(myOrder);
            }
            if ((myOrder.status === 'Cancelado' || myOrder.status === 'Motorista indisponível') && (!myOrder.negotiationState || myOrder.negotiationState === 'NONE')) {
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
        } catch (e) { }
      };

      checkStatus(); // Initial fetch check

      socket.on('connect', () => {
        console.log('Socket connected for waiting driver');
        if (currentRequestServiceId) {
          socket.emit('joinRoom', { orderId: currentRequestServiceId });
        }
      });

      socket.on('negotiation_updated', (updatedOrder) => {
        if (isMounted && updatedOrder._id === currentRequestServiceId) {
          setActiveNegotiationOrder(updatedOrder);
        }
      });

      socket.on('order_updated', (updatedOrder) => {
        if (isMounted && updatedOrder._id === currentRequestServiceId) {
          if (updatedOrder.negotiationState && updatedOrder.negotiationState !== 'NONE') {
            setActiveNegotiationOrder(updatedOrder);
          }
          if (updatedOrder.status === 'Motorista indisponível' && (!updatedOrder.negotiationState || updatedOrder.negotiationState === 'NONE')) {
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
            Notifications.scheduleNotificationAsync({
              content: {
                title: "Pedido Aceite!",
                body: `O motorista ${updatedOrder.deliveryman?.name || ''} aceitou o seu pedido e está a caminho!`,
                sound: true,
              },
              trigger: null,
            });
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
            setShowDriverArrivedModal(true);
            Notifications.scheduleNotificationAsync({
              content: {
                title: "Motorista Chegou!",
                body: `O motorista ${updatedOrder.deliveryman?.name || ''} chegou ao local. Vá ao encontro dele.`,
                sound: true,
              },
              trigger: null,
            });
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

  const isInNegotiation = !!(activeNegotiationOrder && (
    (activeNegotiationOrder.negotiationState && activeNegotiationOrder.negotiationState !== 'NONE') ||
    (activeNegotiationOrder.negotiationHistory && activeNegotiationOrder.negotiationHistory.length > 0)
  ));

  useEffect(() => {
    let interval = null;
    if (waitingForDriver && waitingCountdown > 0 && !isInNegotiation) {
      interval = setInterval(() => {
        setWaitingCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [waitingForDriver, waitingCountdown, isInNegotiation]);

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

        {/* MARKERS DAS PARAGENS ADICIONAIS COM CORES DISTINTAS */}
        {additionalStops.map((stopItem, index) => {
          if (!stopItem.coord?.lat || !stopItem.coord?.lng) return null;
          
          const colors = ['#F97316', '#9333EA', '#0284C7', '#D97706', '#EC4899', '#10B981'];
          const stopColor = colors[index % colors.length];
          const stopNumber = index + 2;

          return (
            <Marker
              key={stopItem.id}
              coordinate={{ latitude: Number(stopItem.coord.lat), longitude: Number(stopItem.coord.lng) }}
              title={`Paragem #${stopNumber}`}
              description={stopItem.text || `Paragem #${stopNumber}`}
              pinColor={stopColor}
              draggable
              onDragEnd={async (e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setAdditionalStops(prev => prev.map(s => s.id === stopItem.id ? { ...s, coord: { lat: latitude, lng: longitude } } : s));
                try {
                  const addressArray = await Location.reverseGeocodeAsync({ latitude, longitude });
                  if (addressArray && addressArray.length > 0) {
                    const addr = addressArray[0];
                    const street = addr.street || addr.name || '';
                    const city = addr.city || addr.subregion || addr.region || '';
                    const newName = street && city ? `${street}, ${city}` : street || city || `Paragem #${stopNumber}`;
                    
                    // Em vez de chamar handleUpdateStopText que limpa o coord (coord: null),
                    // apenas atualizamos o texto de morada mantendo a nova coordenada
                    setAdditionalStops(prev => prev.map(s => 
                      s.id === stopItem.id ? { ...s, text: newName } : s
                    ));
                  }
                } catch (err) {
                  console.log('Reverse geocode stop:', err);
                }
              }}
            />
          );
        })}


        {routeCoords.length > 0 && (
          <>
            {/* Sombra da rota - efeito de profundidade */}
            <Polyline
              coordinates={routeCoords}
              strokeWidth={8}
              strokeColor="rgba(107,33,168,0.20)"
              zIndex={1}
            />
            {/* Linha lilas principal */}
            <Polyline
              coordinates={routeCoords}
              strokeWidth={5}
              strokeColor="#A855F7"
              zIndex={2}
            />
          </>
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

      {destCoord && step === 1 && (
        <View style={{
          position: 'absolute',
          top: 80,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          padding: 12,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          zIndex: 5
        }}>
          <Ionicons name="information-circle" size={24} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={{ color: '#FFF', fontSize: 13, flex: 1, fontWeight: '500' }}>
            Para ajustar o destino, pressione e segure o pino vermelho no mapa e arraste-o para onde desejar.
          </Text>
        </View>
      )}

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
            nestedScrollEnabled={true}
            contentContainerStyle={{
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 250 : (requiresPhotos ? 350 : 160),
              paddingHorizontal: 20,
            }}
            showsVerticalScrollIndicator={true}
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

            {/* Seção de Fotos Obrigatórias do Veículo — Design Ultra-Premium */}
            {requiresPhotos && (
              <View style={{
                marginTop: 10,
                marginBottom: 20,
                backgroundColor: '#FAF5FF',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1.5,
                borderColor: '#E9D5FF',
                shadowColor: '#7E22CE',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 10,
                elevation: 3,
              }}>
                {/* Cabeçalho Premium com Badges */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <LinearGradient
                      colors={['#9333EA', '#7E22CE']}
                      style={{ width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 }}
                    >
                      <Ionicons name="camera" size={16} color="#FFF" />
                    </LinearGradient>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E1B4B' }}>
                      Fotografias do Veículo
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#FCA5A5' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#DC2626' }}>
                      * 4 Fotos Obrigatórias
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 14, lineHeight: 16 }}>
                  Anexe as 4 fotografias (Câmara ou Galeria) para que o prestador identifique o veículo antes da prestação do serviço.
                </Text>

                {/* Grelha de Cards de Fotos */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  {[
                    { key: 'front', label: 'Frente' },
                    { key: 'rear', label: 'Traseira' },
                    { key: 'leftSide', label: 'Lado Esquerdo' },
                    { key: 'rightSide', label: 'Lado Direito' }
                  ].map((item) => {
                    const isUploaded = !!vehiclePhotos[item.key];
                    const isLoading = !!uploadingPhotos[item.key];

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={{
                          width: '48%',
                          height: 105,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 16,
                          borderWidth: isUploaded ? 2 : 1.5,
                          borderColor: isUploaded ? '#10B981' : '#D8B4FE',
                          borderStyle: isUploaded ? 'solid' : 'dashed',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 12,
                          overflow: 'hidden',
                          shadowColor: isUploaded ? '#10B981' : '#7E22CE',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isUploaded ? 0.15 : 0.05,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                        onPress={() => pickVehiclePhoto(item.key)}
                        disabled={isLoading}
                        activeOpacity={0.75}
                      >
                        {isLoading ? (
                          <View style={{ alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#9333EA" />
                            <Text style={{ fontSize: 10, color: '#7E22CE', marginTop: 4, fontWeight: '600' }}>Enviando...</Text>
                          </View>
                        ) : isUploaded ? (
                          <View style={{ width: '100%', height: '100%' }}>
                            <Image source={{ uri: vehiclePhotos[item.key] }} style={{ width: '100%', height: '100%' }} />
                            {/* Overlay Inferior com Nome */}
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.75)']}
                              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, justifyContent: 'flex-end', paddingHorizontal: 8, paddingBottom: 4 }}
                            >
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>{item.label}</Text>
                            </LinearGradient>

                            {/* Badge Aceito no topo direito */}
                            <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#10B981', borderRadius: 12, padding: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 }}>
                              <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                            </View>

                            {/* Badge da câmara para alterar foto no topo esquerdo */}
                            <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 4 }}>
                              <Ionicons name="camera" size={12} color="#FFF" />
                            </View>
                          </View>
                        ) : (
                          <View style={{ alignItems: 'center', padding: 6 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                              <Ionicons name="camera-outline" size={20} color="#9333EA" />
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>{item.label}</Text>
                            <Text style={{ fontSize: 9, color: '#9333EA', fontWeight: '600', marginTop: 1 }}>+ Foto / Galeria</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
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
                      scrollViewRef.current?.scrollTo({ y: requiresPhotos ? 480 : 160, animated: true });
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
                      scrollViewRef.current?.scrollTo({ y: requiresPhotos ? 680 : 350, animated: true });
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

            {/* MULTI-STOP ADDITIONAL DESTINATIONS */}
            {additionalStops.map((stopItem, index) => (
              <View key={stopItem.id} style={[styles.inputBlock, { marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.label}>Paragem #{index + 2}</Text>
                  <TouchableOpacity onPress={() => handleRemoveStop(stopItem.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.fixedInput}
                    placeholder={`Ex: Endereço da paragem #${index + 2}`}
                    placeholderTextColor="#9CA3AF"
                    value={stopItem.text}
                    onFocus={() => snapTo(SNAP_TOP)}
                    onChangeText={(text) => handleUpdateStopText(stopItem.id, text)}
                  />
                </View>
                {stopItem.suggestions && stopItem.suggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {stopItem.loading && <ActivityIndicator size="small" color="#A855F7" style={{ margin: 8 }} />}
                    {stopItem.suggestions.map((item) => (
                      <TouchableOpacity
                        key={item.place_id}
                        style={styles.suggestionRow}
                        onPress={() => selectStopPlace(stopItem.id, item.place_id, item.description)}
                      >
                        <Ionicons name="location-outline" size={16} color="#A855F7" style={{ marginRight: 8 }} />
                        <Text style={styles.suggestionText} numberOfLines={1}>{item.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* BOTÃO ADICIONAR MAIS PARAGENS */}
            <TouchableOpacity
              onPress={handleAddStop}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F3E8FF',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginTop: 12,
                borderWidth: 1.5,
                borderColor: '#C084FC',
                borderStyle: 'dashed'
              }}
            >
              <Ionicons name="add-circle" size={20} color="#7E22CE" style={{ marginRight: 6 }} />
              <Text style={{ color: '#7E22CE', fontWeight: '700', fontSize: 14 }}>
                + Adicionar Paragem {additionalStops.length > 0 ? `(${additionalStops.length + 1} Pontos)` : ''}
              </Text>
            </TouchableOpacity>

            {/* Estimativa de tempo */}
            {duration !== null && !isSearching && (
              <View style={styles.durationBadge}>
                <MaterialCommunityIcons name="clock-fast" size={15} color="#A855F7" />
                <Text style={styles.durationText}> {duration} min de viagem estimados</Text>
              </View>
            )}

            {/* ========================================================= */}
            {/* BLOCO DE AGENDAMENTO + CONFIRMAR — aparece com origem+destino */}
            {/* ========================================================= */}
            {originCoord && destCoord && !isSearching && (
              <View style={{ marginTop: 16 }}>

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

                let baseFare = serviceBase;
                if (driver.deliveryman?.allowCustomPrice && driver.deliveryman?.customPrice) {
                  baseFare = driver.deliveryman.customPrice;
                } else if (driver.deliveryman?.assigned_base_fee) {
                  baseFare = driver.deliveryman.assigned_base_fee;
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
                        source={{ uri: getDriverAvatar(driver) }}
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
                                  {formatDriverRating(driver)}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>•</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {(() => {
                                  const tType = service?.name || driver.transport_type || driver.deliveryman?.transport_type || 'Desconhecido';
                                  let tName = /^[a-fA-F0-9]{24}$/.test(String(tType)) ? 'Motorista' : tType;
                                  if (typeof tName === 'object' && tName.name) tName = tName.name;
                                  tName = String(tName);
                                  const isCar = tName.toLowerCase().includes('carro') || tName.toLowerCase().includes('reboque') || tName.toLowerCase().includes('motorista');

                                  return (
                                    <View style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      backgroundColor: isCar ? '#DBEAFE' : '#F3F4F6',
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 6
                                    }}>
                                      <MaterialCommunityIcons
                                        name={isCar ? "car" : "car-side"}
                                        size={14}
                                        color={isCar ? "#1D4ED8" : "#6B7280"}
                                      />
                                      <Text style={{ fontSize: 13, color: isCar ? '#1D4ED8' : '#6B7280', marginLeft: 4, fontWeight: '500' }} numberOfLines={1}>
                                        {tName}
                                      </Text>
                                    </View>
                                  );
                                })()}
                              </View>
                            </View>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <TouchableOpacity
                                style={{ padding: 4, marginRight: 4 }}
                                onPress={() => setSelectedDriverInfo(driver)}
                              >
                                <MaterialCommunityIcons name="information-outline" size={20} color="#22C55E" />
                              </TouchableOpacity>
                              <Text style={{ fontSize: 17, fontWeight: '800', color: '#9800FF' }}>
                                {finalPrice.toFixed(0)} MT
                              </Text>
                            </View>
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.75)', padding: 16 }}>
          {activeNegotiationOrder && ((activeNegotiationOrder.negotiationHistory && activeNegotiationOrder.negotiationHistory.length > 0) || (activeNegotiationOrder.negotiationState && activeNegotiationOrder.negotiationState !== 'NONE')) ? (
            <View style={{ width: '100%', maxHeight: '88%', backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 }}>
              
              {/* Header com Dados do Motorista e Cliente */}
              {(() => {
                const driverObj = selectedDriverForRequest || (typeof activeNegotiationOrder?.deliveryman === 'object' ? activeNegotiationOrder?.deliveryman : null) || (typeof activeNegotiationOrder?.targetDriver === 'object' ? activeNegotiationOrder?.targetDriver : null);
                const rawDriverName = selectedDriverForRequest?.name || selectedDriverForRequest?.deliveryman?.name || activeNegotiationOrder?.deliveryman?.name || activeNegotiationOrder?.targetDriver?.name || activeNegotiationOrder?.deliverymanName || '';
                const driverName = (rawDriverName && rawDriverName.trim() !== '' && rawDriverName !== 'Motorista') ? rawDriverName : '';
                const customerName = activeNegotiationOrder?.user?.name || 'Cliente';
                const maxRounds = activeNegotiationOrder?.maxNegotiationRounds || 3;
                const currentRounds = activeNegotiationOrder?.negotiationRoundCount || (activeNegotiationOrder?.negotiationHistory?.length || 0);
                const propostasRestantes = Math.max(0, maxRounds - currentRounds);

                return (
                  <LinearGradient colors={['#7C3AED', '#6D28D9']} style={{ padding: 18 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Image
                          source={{ uri: getDriverAvatar(driverObj) }}
                          style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#E9D5FF' }}
                        />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
                            {driverName ? driverName : 'Motorista'}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap', gap: 4 }}>
                            <Ionicons name="star" size={13} color="#FBBF24" />
                            <Text style={{ color: '#F3E8FF', fontSize: 12, fontWeight: '700' }}>
                              {formatDriverRating(driverObj)}
                            </Text>
                            <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginLeft: 4 }}>
                              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
                                {propostasRestantes} propostas restantes
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {driverObj?.phoneNumber && (
                        <TouchableOpacity
                          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' }}
                          onPress={() => {
                            const phoneStr = String(driverObj.phoneNumber).replace(/\D/g, '');
                            if (phoneStr) Linking.openURL(`tel:${phoneStr}`).catch(() => {});
                          }}
                        >
                          <Ionicons name="call" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Linha com Nome do Cliente */}
                    <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#E9D5FF', fontSize: 12, fontWeight: '600' }}>
                        Cliente: <Text style={{ color: '#FFF', fontWeight: '800' }}>{customerName}</Text>
                      </Text>
                      <Text style={{ color: '#E9D5FF', fontSize: 11, fontWeight: '600' }}>
                        Em Negociação
                      </Text>
                    </View>
                  </LinearGradient>
                );
              })()}

              {/* Conversa Interna (Chat Stream de Negociação com Nomes Reais) */}
              <ScrollView style={{ padding: 16, maxHeight: 320, backgroundColor: '#FAF5FF' }} contentContainerStyle={{ paddingBottom: 16 }}>
                {(() => {
                  const driverName = selectedDriverForRequest?.name || activeNegotiationOrder?.deliveryman?.name || 'Motorista';
                  const customerName = activeNegotiationOrder?.user?.name || 'Cliente';

                  return (
                    <>
                      {/* Preço Inicial Solicitado */}
                      <View style={{ alignSelf: 'flex-end', backgroundColor: '#E9D5FF', padding: 12, borderRadius: 18, borderBottomRightRadius: 4, maxWidth: '85%', marginBottom: 12 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6B21A8', marginBottom: 2 }}>{customerName} (Cliente)</Text>
                        <Text style={{ fontSize: 13, color: '#1E1B4B', fontWeight: '600' }}>
                          Pedido Solicitado: <Text style={{ fontWeight: '800', color: '#7C3AED' }}>{(activeNegotiationOrder?.basePrice || price || 0).toFixed(0)} MT</Text>
                        </Text>
                        <Text style={{ fontSize: 10, color: '#7E22CE', marginTop: 4, alignSelf: 'flex-end' }}>Preço Inicial</Text>
                      </View>

                      {/* Lista de Propostas do Histórico */}
                      {(activeNegotiationOrder?.negotiationHistory || []).map((proposal, hIdx) => {
                        const isFromDriver = proposal.proposedBy === 'PROVIDER' || proposal.proposedBy === 'DRIVER';
                        const senderName = isFromDriver ? driverName : customerName;
                        const roleLabel = isFromDriver ? 'Motorista' : 'Cliente';

                        return (
                          <View
                            key={hIdx}
                            style={{
                              alignSelf: isFromDriver ? 'flex-start' : 'flex-end',
                              backgroundColor: isFromDriver ? '#FFFFFF' : '#E9D5FF',
                              padding: 14,
                              borderRadius: 18,
                              borderTopLeftRadius: isFromDriver ? 4 : 18,
                              borderTopRightRadius: isFromDriver ? 18 : 4,
                              maxWidth: '85%',
                              marginBottom: 12,
                              borderWidth: 1,
                              borderColor: isFromDriver ? '#DDD6FE' : '#C084FC',
                              shadowColor: '#7C3AED',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.06,
                              shadowRadius: 6,
                              elevation: 2
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: isFromDriver ? '#7C3AED' : '#6B21A8' }}>
                                {senderName} ({roleLabel})
                              </Text>
                              <View style={{ backgroundColor: proposal.status === 'ACCEPTED' ? '#DCFCE7' : proposal.status === 'REJECTED' ? '#FEE2E2' : '#F3E8FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                                <Text style={{ fontSize: 9, fontWeight: '800', color: proposal.status === 'ACCEPTED' ? '#166534' : proposal.status === 'REJECTED' ? '#991B1B' : '#6B21A8' }}>
                                  {proposal.status === 'ACCEPTED' ? 'ACEITE' : proposal.status === 'REJECTED' ? 'REJEITADO' : 'PENDENTE'}
                                </Text>
                              </View>
                            </View>

                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E1B4B' }}>
                              Proposta: <Text style={{ color: '#7C3AED' }}>{proposal.amount} MT</Text>
                            </Text>
                            {proposal.note ? (
                              <View style={{ marginTop: 6, backgroundColor: isFromDriver ? '#F3E8FF' : '#DDD6FE', padding: 8, borderRadius: 10 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: isFromDriver ? '#6B21A8' : '#4C1D95' }}>
                                  Motivo do Reajuste:
                                </Text>
                                <Text style={{ fontSize: 12, color: '#1E1B4B', marginTop: 2, fontStyle: 'italic' }}>
                                  "{proposal.note}"
                                </Text>
                              </View>
                            ) : null}
                            <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 6, alignSelf: 'flex-end' }}>
                              {new Date(proposal.timestamp || Date.now()).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        );
                      })}
                    </>
                  );
                })()}
              </ScrollView>

              {/* Painel de Ações do Cliente */}
              <View style={{ padding: 18, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#F3E8FF' }}>
                {(() => {
                  const history = activeNegotiationOrder?.negotiationHistory || [];
                  const lastProp = history[history.length - 1];
                  const isPendingFromDriver = lastProp && (lastProp.proposedBy === 'PROVIDER' || lastProp.proposedBy === 'DRIVER') && lastProp.status === 'PROPOSED';

                  if (isPendingFromDriver) {
                    return (
                      <View style={{ gap: 10 }}>
                        <TouchableOpacity
                          style={{ borderRadius: 16, overflow: 'hidden' }}
                          onPress={() => handleAcceptNegotiation(activeNegotiationOrder)}
                          disabled={isSubmittingNegotiation}
                        >
                          <LinearGradient colors={['#10B981', '#059669']} style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                            {isSubmittingNegotiation ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
                                  Aceitar Proposta ({lastProp.amount} MT)
                                </Text>
                              </>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#7C3AED', backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                            onPress={() => {
                              setCounterPrice(String(lastProp.amount));
                              setShowCounterModal(true);
                            }}
                            disabled={isSubmittingNegotiation}
                          >
                            <Ionicons name="swap-horizontal" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#7C3AED', fontSize: 13, fontWeight: '700' }}>Contra-Propor</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#EF4444', backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                            onPress={() => handleRejectNegotiation(activeNegotiationOrder)}
                            disabled={isSubmittingNegotiation}
                          >
                            <Ionicons name="close-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>Rejeitar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                      <ActivityIndicator size="small" color="#7C3AED" />
                      <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 6, fontWeight: '600' }}>
                        A aguardar resposta do motorista...
                      </Text>
                    </View>
                  );
                })()}

                <TouchableOpacity
                  style={{ marginTop: 14, paddingVertical: 10, alignItems: 'center' }}
                  onPress={() => handleCancelNegotiatedOrder(activeNegotiationOrder)}
                  disabled={isSubmittingNegotiation}
                >
                  <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '700' }}>
                    Cancelar Pedido
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          ) : (
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
                      setWaitingCountdown(60);
                      try {
                        const storedUserData = await AsyncStorage.getItem('userData');
                        const token = storedUserData ? JSON.parse(storedUserData).token : '';
                        await api.post(`/request-service/${currentRequestServiceId}/resend`,
                          { targetDriverId: selectedDriverForRequest?._id },
                          { headers: { authorization: `Bearer ${token}` } }
                        );
                      } catch (e) { console.log('Erro ao reenviar', e); }
                    }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Continuar a esperar</Text>
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
          )}
        </View>
      </Modal>

      {/* Modal de Contra-Proposta do Cliente */}
      <Modal visible={showCounterModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, elevation: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E1B4B' }}>Enviar Contra-Proposta</Text>
              <TouchableOpacity onPress={() => setShowCounterModal(false)}>
                <Ionicons name="close-circle" size={26} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 8, fontWeight: '600' }}>Novo Valor Proposto (MT)</Text>
            <TextInput
              style={{ backgroundColor: '#F3E8FF', borderRadius: 14, padding: 14, fontSize: 18, fontWeight: '800', color: '#7C3AED', marginBottom: 14, borderWidth: 1, borderColor: '#C084FC' }}
              keyboardType="numeric"
              placeholder="0 MT"
              value={counterPrice}
              onChangeText={setCounterPrice}
            />

            <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 8, fontWeight: '600' }}>Nota / Motivo do Reajuste (Opcional)</Text>
            <TextInput
              style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, fontSize: 14, color: '#1E293B', marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', minHeight: 44 }}
              placeholder="Ex: Ofereço este valor pela deslocação..."
              value={counterNote}
              onChangeText={setCounterNote}
              multiline
            />

            <TouchableOpacity
              style={{ backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 16, alignItems: 'center', elevation: 4 }}
              onPress={() => handleCounterPropose(activeNegotiationOrder)}
              disabled={isSubmittingNegotiation}
            >
              {isSubmittingNegotiation ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>Enviar Contra-Proposta</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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

      <Modal visible={showDriverArrivedModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modernModal, { padding: 0, overflow: 'hidden' }]}>
            <LinearGradient colors={['#10B981', '#059669']} style={{ width: '100%', height: 140, justifyContent: 'center', alignItems: 'center' }}>
               <MaterialCommunityIcons name="car-side" size={60} color="#FFF" />
               <View style={{ position: 'absolute', bottom: -20, backgroundColor: '#FFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 }}>
                  <MaterialCommunityIcons name="check-decagram" size={40} color="#10B981" />
               </View>
            </LinearGradient>

            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#1F2937', marginTop: 12, marginBottom: 8 }}>O Motorista Chegou!</Text>
              <Text style={{ fontSize: 16, color: '#4B5563', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
                O seu parceiro <Text style={{ fontWeight: '700', color: '#10B981' }}>{activeTripData?.deliveryman?.name || 'motorista'}</Text> acaba de chegar ao local indicado.
              </Text>

              <TouchableOpacity
                style={{ width: '100%' }}
                onPress={() => setShowDriverArrivedModal(false)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#10B981', '#059669']} style={{ paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>Vou lá agora</Text>
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

      <Modal
        visible={!!selectedDriverInfo}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDriverInfo(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 40, height: 5, borderRadius: 2.5, backgroundColor: '#E5E7EB', marginBottom: 16 }} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937' }}>Detalhes do Motorista</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDriverInfo && (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <Image
                      source={{ uri: getDriverAvatar(selectedDriverInfo) }}
                      style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', borderWidth: 3, borderColor: '#F3F4F6' }}
                    />
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 12 }}>
                      {selectedDriverInfo.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <MaterialCommunityIcons name="star" size={20} color="#F59E0B" />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#4B5563', marginLeft: 4 }}>
                        {formatDriverRating(selectedDriverInfo)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 24 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 }}>Informações da Viatura</Text>
                    
                    { (() => {
                      const photos = [];
                      if (selectedDriverInfo.deliveryman?.vihicle_picture_front) photos.push(selectedDriverInfo.deliveryman.vihicle_picture_front);
                      if (selectedDriverInfo.deliveryman?.vihicle_picture_back) photos.push(selectedDriverInfo.deliveryman.vihicle_picture_back);
                      if (selectedDriverInfo.deliveryman?.vihicle_picture && !photos.includes(selectedDriverInfo.deliveryman.vihicle_picture)) photos.push(selectedDriverInfo.deliveryman.vihicle_picture);
                      
                      if (photos.length > 0) {
                        return (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {photos.map((uri, idx) => (
                              <Image
                                key={idx}
                                source={{ uri }}
                                style={{ width: 280, height: 160, borderRadius: 12, backgroundColor: '#E5E7EB', marginRight: 12 }}
                                resizeMode="cover"
                              />
                            ))}
                          </ScrollView>
                        );
                      }
                      return (
                        <View style={{ width: '100%', height: 100, borderRadius: 12, backgroundColor: '#E5E7EB', marginBottom: 16, justifyContent: 'center', alignItems: 'center' }}>
                           <MaterialCommunityIcons name="car-off" size={40} color="#9CA3AF" />
                           <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Sem imagem disponível</Text>
                        </View>
                      );
                    })()}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      {!!(selectedDriverInfo.transport_type || selectedDriverInfo.deliveryman?.transport_type) && (
                        <View style={{ backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', flex: 1, minWidth: '45%' }}>
                          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Tipo</Text>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>
                            {(() => {
                              const tType = service?.name || selectedDriverInfo.transport_type || selectedDriverInfo.deliveryman?.transport_type || 'Desconhecido';
                              let tName = /^[a-fA-F0-9]{24}$/.test(String(tType)) ? (service?.name || 'Viatura') : tType;
                              if (typeof tName === 'object' && tName.name) tName = tName.name;
                              return String(tName);
                            })()}
                          </Text>
                        </View>
                      )}
                      
                      {!!selectedDriverInfo.deliveryman?.transport_registration && (
                        <View style={{ backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', flex: 1, minWidth: '45%' }}>
                          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Matrícula</Text>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>
                            {selectedDriverInfo.deliveryman?.transport_registration.toUpperCase()}
                          </Text>
                        </View>
                      )}

                      {!!selectedDriverInfo.deliveryman?.transport_color && (
                        <View style={{ backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', flex: 1, minWidth: '45%' }}>
                          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Cor</Text>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937', textTransform: 'capitalize' }}>
                            {selectedDriverInfo.deliveryman?.transport_color}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={{ backgroundColor: '#7F00FF', padding: 16, borderRadius: 16, alignItems: 'center' }}
                    onPress={() => setSelectedDriverInfo(null)}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Fechar</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
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
// Metro cache invalidation refresh
