import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Share,
  Linking
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../hooks/createConnectionApi';
import { sendOrderNotificationToUser } from '../utils/notificationUtils';
import { useToast } from "react-native-toast-notifications";
import io from 'socket.io-client';
import TrackingMap from '../components/TrackingMap';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const OrderDetailsScreen = () => {
  const route = useRoute();
  const params = route.params || {};
  const item = params.item;
  const deliveryman = params.deliveryman;
  
  const [currentOrder, setCurrentOrder] = useState(item);
  const [currentDeliveryMan, setDeliveryMan] = useState(deliveryman);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [showFinishConfirmationModal, setShowFinishConfirmationModal] = useState(false);
  const [showFinishSuccessModal, setShowFinishSuccessModal] = useState(false);
  const [isRequestService, setIsRequestService] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(!item);
  
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const navigation = useNavigation();
  const toast = useToast();

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['15%', '50%', '90%'], []);

  const [driverSpeed, setDriverSpeed] = useState(null);
  const [etaDistance, setEtaDistance] = useState(null);
  const [etaDuration, setEtaDuration] = useState(null);
  const [indisponivelCountdown, setIndisponivelCountdown] = useState(45);
  const [driverWaitTime, setDriverWaitTime] = useState(0);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [viewProofModal, setViewProofModal] = useState(false);

  // Refs para evitar re-criação de intervalos e tremerção do ecrã
  const indisponivelStartRef = useRef(null); // quando começou o estado 'Motorista indisponível'
  const navigationRef = useRef(navigation);
  const isRequestServiceRef = useRef(isRequestService);
  const currentOrderRef = useRef(currentOrder);

  // Manter refs sincronizadas sem causar re-renders
  useEffect(() => { navigationRef.current = navigation; }, [navigation]);
  useEffect(() => { isRequestServiceRef.current = isRequestService; }, [isRequestService]);
  useEffect(() => { currentOrderRef.current = currentOrder; }, [currentOrder]);

  const handleUploadProof = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingProof(true);
        const asset = result.assets[0];
        
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || 'proof.jpg',
          type: asset.type || asset.mimeType || 'image/jpeg',
        });

        // Upload image using native fetch to avoid Axios multipart network issues in React Native
        const response = await fetch(`${api.defaults.baseURL}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        const uploadData = await response.json();
        const proofUrl = uploadData.secure_url || uploadData.url;

        if (proofUrl) {
          // Send to order
          const orderRes = await api.put(`/orders/${currentOrder._id}/payment-proof`, {
            paymentProof: proofUrl
          });
          
          if (orderRes.status === 200) {
            setCurrentOrder(orderRes.data.order);
            toast.show("Comprovativo enviado com sucesso!", { type: 'success' });
          }
        }
      }
    } catch (error) {
      console.log('Error uploading proof:', error);
      toast.show("Erro ao enviar comprovativo.", { type: 'danger' });
    } finally {
      setUploadingProof(false);
    }
  };

  // Timer: tempo de espera do motorista no destino
  useEffect(() => {
    if (currentOrder?.status !== 'No destino indicado' || !currentOrder?.updatedAt) return;
    const updatedAtMs = new Date(currentOrder.updatedAt).getTime();
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - updatedAtMs) / 1000);
      setDriverWaitTime(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder?.status, currentOrder?.updatedAt]);

  const handleUpdateTracking = useCallback(({ speed, distance, duration }) => {
    if (speed !== undefined) setDriverSpeed(speed);
    if (distance !== undefined) setEtaDistance(distance);
    if (duration !== undefined) setEtaDuration(duration);
  }, []);

  const handleShareTrip = async () => {
    if (currentOrder && currentOrder._id) {
      try {
        const shareUrl = `https://app.nhiquela.com/track/${currentOrder._id}`;
        await Share.share({
          message: `Acompanhe a minha viagem na Nhiquela em tempo real: ${shareUrl}`,
          title: 'Partilhar Viagem'
        });
      } catch (error) {
        console.log('Erro ao partilhar viagem:', error);
      }
    }
  };

  // Timer: countdown 'Motorista indisponível' — usa ref para não recriar o intervalo a cada segundo
  useEffect(() => {
    const status = currentOrder?.status;
    if (status !== 'Motorista indisponível') {
      // Resetar se o estado mudou
      if (indisponivelStartRef.current !== null) {
        indisponivelStartRef.current = null;
        setIndisponivelCountdown(45);
      }
      return;
    }

    // Registar o momento de início apenas uma vez
    if (indisponivelStartRef.current === null) {
      indisponivelStartRef.current = Date.now();
      setIndisponivelCountdown(45);
    }

    const TOTAL = 45; // segundos
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - indisponivelStartRef.current) / 1000);
      const remaining = Math.max(0, TOTAL - elapsed);
      setIndisponivelCountdown(remaining);

      if (remaining === 0) {
        clearInterval(timer);
        const order = currentOrderRef.current;
        const nav = navigationRef.current;
        const isReqSvc = isRequestServiceRef.current;
        if (isReqSvc && order?.serviceId) {
          nav.reset({
            index: 1,
            routes: [
              { name: 'BottomNavigation' },
              {
                name: 'RequestService',
                params: {
                  selectedService: {
                    _id: order.serviceId,
                    name: order.name || order.goodType || 'Serviço'
                  }
                }
              }
            ]
          });
        } else {
          nav.reset({ index: 0, routes: [{ name: 'BottomNavigation' }] });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  // Só re-executar quando o STATUS muda, não quando o countdown muda
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder?.status]);

  useEffect(() => {
    checkIfUserExist();
  }, []);

  const orderIdParam = params?.orderId || params?.item?._id;

  useEffect(() => {
    if (!currentOrder && orderIdParam) {
      fetchOrderDetails();
    } else {
      setLoadingOrder(false);
    }
  }, [orderIdParam]);

  useEffect(() => {
    if (!orderIdParam) return;

    const isDev = process.env.NODE_ENV !== 'production';
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || (isDev ? 'http://192.168.0.3:5000' : 'https://api.nhiquelaservicos.com');
    const socketUrl = apiUrl.replace('/api', '');
    const socket = io(socketUrl, { transports: ['websocket'] });

    socket.emit('joinRoom', { orderId: orderIdParam });

    socket.on('order_updated', (updatedOrder) => {
        if (updatedOrder && updatedOrder._id === orderIdParam) {
          setCurrentOrder(updatedOrder);
          toast.show(`Estado atualizado: ${updatedOrder.status}`, { type: 'info', placement: 'top', duration: 4000 });
          
          if (updatedOrder.stepStatus === 4 && currentOrder?.stepStatus !== 4) {
             Notifications.scheduleNotificationAsync({
               content: {
                 title: "Pedido Aceite!",
                 body: `O motorista ${updatedOrder.deliveryman?.name || ''} aceitou o pedido e está a caminho.`,
                 sound: true,
               },
               trigger: null,
             });
          } else if (updatedOrder.stepStatus === 6 && currentOrder?.stepStatus !== 6) {
             Notifications.scheduleNotificationAsync({
               content: {
                 title: "Motorista Chegou!",
                 body: `O motorista chegou ao destino indicado. Vá ao encontro dele.`,
                 sound: true,
               },
               trigger: null,
             });
          }
        }
      });

    return () => {
      socket.emit('leaveRoom', { orderId: orderIdParam });
      socket.disconnect();
    };
  }, [orderIdParam]);

  const formatDate = (dateString) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const [subcategories, setSubcategories] = useState([]);
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const { data } = await api.get('/provider-subcategories');
        setSubcategories(data);
      } catch (error) {
        console.error('Erro ao buscar subcategorias', error);
      }
    };
    fetchSubcategories();
  }, []);

  useEffect(() => {
    if (currentOrder) {
      const isReq = !currentOrder.deliveryAddress;
      setIsRequestService(isReq);
    }
  }, [currentOrder]);

  const resolvedSellerAccounts = useMemo(() => {
    const provider = currentOrder?.seller;
    const userDoc = provider?.userId || {};
    const sellerInfo = userDoc?.seller || provider?.seller || {};

    return {
      mpesa: sellerInfo.phoneNumberAccount || provider?.phoneNumberAccount || userDoc?.phoneNumber || provider?.phoneNumber || null,
      emola: sellerInfo.alternativePhoneNumberAccount || provider?.alternativePhoneNumberAccount || null,
      bankAccount: sellerInfo.bankAccount || sellerInfo.accountNumber || provider?.bankAccount || provider?.accountNumber || null,
      bankName: sellerInfo.accountType || provider?.accountType || 'Banco'
    };
  }, [currentOrder]);

  // Timer: countdown de expiração do pedido (15 min) — cálculo baseado em timestamp fixo
  useEffect(() => {
    if (!currentOrder || currentOrder.status !== 'Pendente') return;
    const endTime = new Date(currentOrder.createdAt).getTime() + 15 * 60 * 1000;
    const tick = () => {
      const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  // Só re-arrancar quando o pedido mudar de ID ou de status
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder?._id, currentOrder?.status, currentOrder?.createdAt]);

  const fetchOrderDetails = async () => {
    setLoadingOrder(true);
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const token = storedUserData ? JSON.parse(storedUserData).token : '';
      if (!token) return;

      const { data } = await api.get(`/request-service/${orderIdParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentOrder(data);
    } catch (e) {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const token = storedUserData ? JSON.parse(storedUserData).token : '';
        const { data } = await api.get(`/orders/${orderIdParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentOrder(data);
      } catch (e2) {
        console.error("Erro ao buscar pedido", e2);
      }
    } finally {
      setLoadingOrder(false);
    }
  };

  const checkIfUserExist = async () => {
    try {
      // ✅ Usar última posição conhecida (instantâneo) em vez de getCurrentPositionAsync (pode demorar 10-30s)
      try {
        const lastLocation = await Location.getLastKnownPositionAsync();
        if (lastLocation) {
          setCurrentLocation({
            latitude: lastLocation.coords.latitude,
            longitude: lastLocation.coords.longitude,
          });
        } else {
          // Tentar obter em background sem bloquear
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest })
            .then(loc => setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }))
            .catch(() => {});
        }
      } catch {
        // Sem localização não bloquear o ecrã
      }

      const storedUserData = await AsyncStorage.getItem('userData');

      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        setUserLogin(true);
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    }
  };

  const cancelOrderPop = async (orderId) => {
    try {
      if (!userData) throw new Error('User is not logged in');
      const endpoint = isRequestService 
        ? `/request-service/${orderId}/cancel` 
        : `/orders/${orderId}/cancel`;

      const { data } = await api.put(
        endpoint,
        { message },
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      setCurrentOrder(data.order);
      toast.show('Pedido cancelado com sucesso.', { type: 'success', placement: 'top', duration: 4000, animationType: 'slide-in' });
    } catch (error) {
      console.error('Erro ao cancelar pedido', error);
      toast.show(error?.response?.data?.message || 'Não foi possível cancelar o pedido.', { type: 'danger', placement: 'top', duration: 4000, animationType: 'slide-in' });
    } finally {
      setModalVisible(false);
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      if (!userData) throw new Error('User is not logged in');
      await api.delete(`/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${userData.token}` },
      });
      toast.show('Pedido apagado com sucesso!', { type: 'success', placement: 'top', duration: 4000, animationType: 'slide-in' });
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao apagar o pedido', error);
      toast.show('Não foi possível apagar o pedido.', { type: 'danger', placement: 'top', duration: 4000, animationType: 'slide-in' });
    }
  };

  const confirmDelivery = async (orderId) => {
    if (isConfirming) return; // Evitar duplo clique
    try {
      setIsConfirming(true);
      if (!userData) throw new Error('User is not logged in');

      const endpoint = isRequestService 
        ? `/request-service/${orderId}/deliver` 
        : `/orders/${orderId}/deliver`;

      // ✅ Atualizar UI imediatamente (otimismo) sem esperar a resposta do servidor
      const optimisticOrder = {
        ...currentOrder,
        status: 'Concluído',
        stepStatus: 7,
        isDelivered: true,
        deliveredAt: Date.now()
      };
      setCurrentOrder(optimisticOrder);
      setShowFinishSuccessModal(true);

      // Chamar API e notificações em background
      api.put(endpoint, {}, {
        headers: { Authorization: `Bearer ${userData.token}` },
      }).then(({ data }) => {
        const finalOrder = data.order || optimisticOrder;
        setCurrentOrder(finalOrder);
        
        // Notificação ao vendedor em background
        if (finalOrder.seller?._id) {
          sendOrderNotificationToUser({
            userId: finalOrder.seller._id,
            orderId: finalOrder._id,
            orderCode: finalOrder.code,
            title: 'Pedido entregue com sucesso!',
            body: `O cliente confirmou a recepção do pedido nº ${finalOrder.code}.`,
            status: 'Confirmado',
          }).catch(() => {});
        }

        // Notificação de Agradecimento ao Cliente
        sendOrderNotificationToUser({
          userId: userData._id,
          orderId: finalOrder._id,
          orderCode: finalOrder.code,
          title: '🎉 Obrigado pela preferência!',
          body: `Confirmámos a receção do seu pedido nº ${finalOrder.code}. Esperamos vê-lo de novo em breve!`,
          status: 'Confirmado',
        }).catch(() => {});
      }).catch((error) => {
        console.error('Erro ao confirmar entrega', error);
        // Reverter estado otimista em caso de erro
        setCurrentOrder(currentOrder);
        setShowFinishSuccessModal(false);
        toast.show('Não foi possível confirmar a entrega.', { type: 'danger', placement: 'top', duration: 4000, animationType: 'slide-in' });
      });
    } catch (error) {
      console.error('Erro ao confirmar entrega', error);
      toast.show('Não foi possível confirmar a entrega.', { type: 'danger', placement: 'top', duration: 4000, animationType: 'slide-in' });
    } finally {
      setIsConfirming(false);
    }
  };

  const submitRating = async () => {
    try {
      await api.post(`/request-service/${currentOrder._id}/rate`, { rating, review }, {
        headers: { Authorization: `Bearer ${userData.token}` }
      });
      toast.show('Avaliação enviada com sucesso!', { type: 'success', placement: 'top' });
      setRatingModalVisible(false);
      navigation.goBack();
    } catch (err) {
      toast.show('Erro ao enviar avaliação.', { type: 'danger', placement: 'top' });
      setRatingModalVisible(false);
      navigation.goBack();
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const confirmDeleteOrder = (orderId) => {
    setShowDeleteModal(true);
  };

  const confirmDeliveryOrder = (orderId) => {
    setShowFinishConfirmationModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente': return '#F59E0B';
      case 'SCHEDULED': return '#8B5CF6';
      case 'SEARCHING': return '#F59E0B';
      case 'Aceite': 
      case 'Pedido aceite':
      case 'Motorista indisponível':
        return '#8B5CF6';
      case 'CONFIRMED': return '#10B981';
      case 'Em trânsito': return '#3B82F6';
      case 'No destino indicado': return '#8B5CF6';
      case 'Entregue': 
      case 'Finalizado': 
      case 'Concluído': 
      case 'Concluido': 
        return '#059669';
      case 'Cancelado': return '#EF4444';
      default: return '#6B7280';
    }
  };

  // Compute destination based on order type (store or service)
  let destination = null;
  if (currentOrder) {
    if (currentOrder.stepStatus === 4) {
      // Motorista a caminho do local de recolha
      const lat = currentOrder.originDetails?.lat || currentOrder.seller?.latitude || currentOrder.originLocation?.latitude;
      const lng = currentOrder.originDetails?.lng || currentOrder.seller?.longitude || currentOrder.originLocation?.longitude;
      if (lat && lng) {
        destination = { latitude: Number(lat), longitude: Number(lng) };
      }
    } else {
      // Em transito (stepStatus 5)
      const lat = currentOrder.destinationDetails?.lat || currentOrder.deliveryAddress?.latitude || currentOrder.destinationLocation?.latitude || currentOrder.latitude;
      const lng = currentOrder.destinationDetails?.lng || currentOrder.deliveryAddress?.longitude || currentOrder.destinationLocation?.longitude || currentOrder.longitude;
      if (lat && lng) {
        destination = { latitude: Number(lat), longitude: Number(lng) };
      }
    }
  }

  if (loadingOrder || !currentOrder) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <ActivityIndicator size="large" color="#9333EA" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Carregando viagem...</Text>
      </View>
    );
  }

  const renderContent = () => {
    // Mostrar o botão de Chat apenas quando o motorista já aceitou a viagem
    const ACTIVE_CHAT_STATUSES = ['Aceite', 'A Caminho', 'Em trânsito', 'No destino indicado', 'CONFIRMED'];
    const isChatActive = ACTIVE_CHAT_STATUSES.includes(currentOrder?.status);
    const isTripEnded = ['Entregue', 'Finalizado', 'Cancelado', 'Cancelado pelo motorista'].includes(currentOrder?.status);
    const showChatBtn = isChatActive || isTripEnded; // histórico visível mesmo após

    const getFriendlyStatus = (status) => {
      switch (status) {
        case 'Pendente':
          return {
            title: 'Aguardando Estabelecimento',
            desc: 'O fornecedor está a analisar o seu pedido e responderá em breve.',
            icon: 'hourglass-outline',
            color: '#D97706',
            bg: '#FEF3C7'
          };
        case 'Aceite':
        case 'Aceito':
          return {
            title: 'Pedido Aceite!',
            desc: 'O fornecedor aceitou o seu pedido e já começou a prepará-lo.',
            icon: 'checkmark-circle-outline',
            color: '#10B981',
            bg: '#D1FAE5'
          };
        case 'Em Preparação':
        case 'Em preparacao':
          return {
            title: 'Em Preparação',
            desc: 'Os seus produtos estão a ser preparados e embalados com cuidado.',
            icon: 'restaurant-outline',
            color: '#7C3AED',
            bg: '#F3E8FF'
          };
        case 'A Caminho':
        case 'a caminho':
          return {
            title: 'A Caminho da Entrega',
            desc: 'O motorista já recolheu a encomenda e está a dirigir-se a si.',
            icon: 'bicycle-outline',
            color: '#3B82F6',
            bg: '#DBEAFE'
          };
        case 'No destino indicado':
          return {
            title: 'O Motorista Chegou!',
            desc: 'O motorista está no local. Encontre-se com ele para recolher a encomenda.',
            icon: 'location-outline',
            color: '#059669',
            bg: '#DCFCE7'
          };
        case 'Entregue':
        case 'Finalizado':
          return {
            title: 'Pedido Entregue',
            desc: 'A entrega foi concluída com sucesso. Obrigado pela sua preferência!',
            icon: 'gift-outline',
            color: '#10B981',
            bg: '#D1FAE5'
          };
        case 'Cancelado':
        case 'Cancelado pelo motorista':
        case 'Recusado':
          return {
            title: 'Pedido Cancelado',
            desc: 'Este pedido foi cancelado ou recusado.',
            icon: 'close-circle-outline',
            color: '#EF4444',
            bg: '#FEE2E2'
          };
        default:
          return {
            title: status || 'Processando',
            desc: 'Estamos a atualizar o estado do seu pedido.',
            icon: 'information-circle-outline',
            color: '#6B7280',
            bg: '#F3F4F6'
          };
      }
    };

    const friendlyStatus = getFriendlyStatus(currentOrder.status);

    return (
      <View style={styles.sheetContent}>
        {/* Status Message Highlight */}
        <View style={{ backgroundColor: friendlyStatus.bg, padding: 16, borderRadius: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name={friendlyStatus.icon} size={28} color={friendlyStatus.color} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: friendlyStatus.color }}>{friendlyStatus.title}</Text>
            <Text style={{ fontSize: 13, color: friendlyStatus.color, marginTop: 2, lineHeight: 18 }}>{friendlyStatus.desc}</Text>
            {currentOrder.status === 'No destino indicado' && driverWaitTime > 0 && (
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#EF4444', marginTop: 6 }}>
                Tempo de espera: {Math.floor(driverWaitTime / 60).toString().padStart(2, '0')}:{(driverWaitTime % 60).toString().padStart(2, '0')}
              </Text>
            )}
            {currentOrder.status === 'Pendente' && timeLeft > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#D97706' }}>
                  Tempo restante para resposta: 
                </Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#D97706', fontVariant: ['tabular-nums'], width: 42, textAlign: 'right' }}>
                  {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {currentOrder.status === 'No destino indicado' && (
          <View style={{ marginBottom: 16 }}>
            <TouchableOpacity 
              onPress={() => setShowFinishConfirmationModal(true)}
              disabled={isConfirming}
              style={{
                backgroundColor: isConfirming ? '#6B7280' : '#10B981',
                paddingVertical: 14,
                borderRadius: 12,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done-circle" size={24} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Confirmar Viagem</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentOrder.status === 'SCHEDULED' && (
          <View style={{ backgroundColor: '#F3E8FF', padding: 16, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar" size={28} color="#7E22CE" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#7E22CE' }}>Agendamento Confirmado</Text>
              <Text style={{ fontSize: 13, color: '#7E22CE', marginTop: 2 }}>O seu pedido está agendado para {new Date(currentOrder.scheduledAt).toLocaleString('pt-PT')}. Procuraremos um motorista quando a data se aproximar.</Text>
            </View>
          </View>
        )}

        {currentOrder.status === 'SEARCHING' && (
          <View style={{ backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#D97706' }}>A procurar motorista</Text>
              <Text style={{ fontSize: 13, color: '#D97706', marginTop: 2 }}>Estamos a localizar o parceiro ideal para a sua viagem agendada.</Text>
            </View>
          </View>
        )}

        {/* Quick Summary Card */}
        <View style={styles.quickSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.storeName}>
              {currentOrder.seller?.name || currentOrder.seller?.seller?.name || currentOrder.name || currentOrder.goodType || 'Serviço'}
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '700' }}>#{currentOrder.code || '---'}</Text>
          </View>
          <Text style={styles.orderDate}>{formatDate(currentOrder.createdAt)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Destination Details / Delivery Info */}
        {!isRequestService ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados de Entrega</Text>
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="person-circle-outline" size={20} color="#64748B" style={{ marginRight: 8 }} />
                <View>
                  <Text style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '600' }}>Destinatário</Text>
                  <Text style={{ fontSize: 14, color: '#334155', fontWeight: '700', marginTop: 1 }}>
                    {currentOrder.deliveryAddress?.fullName || currentOrder.user?.name || userData?.name || 'Cliente'}
                  </Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: '#E2E8F0' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="call-outline" size={20} color="#64748B" style={{ marginRight: 8 }} />
                <View>
                  <Text style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '600' }}>Telemóvel</Text>
                  <Text style={{ fontSize: 14, color: '#334155', fontWeight: '600', marginTop: 1 }}>
                    {currentOrder.deliveryAddress?.phone || currentOrder.user?.phoneNumber || userData?.phoneNumber || 'Não informado'}
                  </Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: '#E2E8F0' }} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name="location-outline" size={20} color="#EF4444" style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '600' }}>Endereço de Entrega</Text>
                  <Text style={{ fontSize: 14, color: '#334155', fontWeight: '500', marginTop: 2, lineHeight: 18 }}>
                    {currentOrder.deliveryAddress?.addressLine || currentOrder.deliveryAddress?.address || currentOrder.deliveryAddress || 'Não especificado'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* Trajeto do Serviço */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trajeto do Serviço</Text>
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name="location" size={20} color="#3B82F6" style={{ marginTop: 2, marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' }}>Recolha (Origem)</Text>
                  <Text style={{ fontSize: 14, color: '#334155', fontWeight: '500', marginTop: 2 }}>
                    {currentOrder.originDetails?.address || currentOrder.origin || currentOrder.seller?.address || 'Não especificada'}
                  </Text>
                </View>
              </View>
              
              <View style={{ height: 1, backgroundColor: '#E2E8F0', marginLeft: 28 }} />
              
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name="flag" size={20} color="#10B981" style={{ marginTop: 2, marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' }}>Destino Final</Text>
                  <Text style={{ fontSize: 14, color: '#334155', fontWeight: '500', marginTop: 2 }}>
                    {currentOrder.destinationDetails?.address || currentOrder.destination || currentOrder.deliveryAddress?.address || currentOrder.deliveryAddress || 'Não especificado'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Driver and Vehicle */}
        {currentOrder.deliveryman && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transporte</Text>
            
            <View style={styles.driverCard}>
              <View style={styles.driverRow}>
                <Image 
                  source={{ uri: currentOrder.deliveryman.photo || 'https://via.placeholder.com/60' }} 
                  style={styles.driverImage} 
                />
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{currentOrder.deliveryman.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                    {currentOrder.deliveryman.transport_type && (() => {
                      const tType = currentOrder.deliveryman.transport_type;
                      const subcat = subcategories.find(s => s._id === tType || s.id === tType);
                      let name = subcat ? subcat.name : tType;
                      if (typeof name === 'object' && name.name) name = name.name;
                      name = String(name);
                      const isCar = name.toLowerCase().includes('carro') || name.toLowerCase().includes('reboque');
                      
                      if (isCar) {
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                             <MaterialCommunityIcons name="car" size={14} color="#1D4ED8" style={{ marginRight: 4 }} />
                             <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '600' }}>{name}</Text>
                          </View>
                        );
                      }
                      
                      return (
                        <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>
                          🛵 {name}
                        </Text>
                      );
                    })()}
                    {currentOrder.deliveryman.transport_color && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginLeft: 4 }}>
                        <View style={{
                          width: 10, height: 10, borderRadius: 5,
                          backgroundColor: (() => {
                            const c = currentOrder.deliveryman.transport_color.toLowerCase();
                            const map = { 'vermelho': 'red', 'azul': 'blue', 'verde': 'green', 'preto': 'black', 'branco': 'white', 'cinzento': 'gray', 'cinza': 'gray', 'amarelo': 'yellow', 'laranja': 'orange', 'castanho': 'brown', 'prata': 'silver', 'roxo': 'purple', 'rosa': 'pink', 'ouro': 'gold' };
                            return map[c] || c;
                          })(),
                          marginRight: 5, borderWidth: 1, borderColor: '#E5E7EB'
                        }} />
                        <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>Cor: {currentOrder.deliveryman.transport_color}</Text>
                      </View>
                    )}
                    {currentOrder.deliveryman.transport_registration && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginLeft: 4 }}>
                        <MaterialCommunityIcons name="card-text-outline" size={11} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, color: '#FFF', fontWeight: '800', letterSpacing: 0.8 }}>{currentOrder.deliveryman.transport_registration}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {currentOrder.deliveryman?.transferPreferences ? (
                <View style={{ marginTop: 12, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600', marginBottom: 6 }}>Contactos para Pagamento (Motorista):</Text>
                  {currentOrder.deliveryman.transferPreferences.mPesaNumber ? (
                    <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '500', marginBottom: 2 }}>M-Pesa: <Text style={{fontWeight: 'bold', color: '#DC2626'}}>{currentOrder.deliveryman.transferPreferences.mPesaNumber}</Text></Text>
                  ) : null}
                  {currentOrder.deliveryman.transferPreferences.eMolaNumber ? (
                    <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '500' }}>e-Mola: <Text style={{fontWeight: 'bold', color: '#EA580C'}}>{currentOrder.deliveryman.transferPreferences.eMolaNumber}</Text></Text>
                  ) : null}
                </View>
              ) : null}

              {(resolvedSellerAccounts.mpesa || resolvedSellerAccounts.emola) ? (
                <View style={{ marginTop: 12, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
                  <Text style={{ fontSize: 13, color: '#166534', fontWeight: '600', marginBottom: 6 }}>Contactos para Pagamento (Fornecedor):</Text>
                  {resolvedSellerAccounts.mpesa ? (
                    <Text style={{ fontSize: 14, color: '#14532D', fontWeight: '500', marginBottom: 2 }}>M-Pesa: <Text style={{fontWeight: 'bold', color: '#DC2626'}}>{resolvedSellerAccounts.mpesa}</Text></Text>
                  ) : null}
                  {resolvedSellerAccounts.emola ? (
                    <Text style={{ fontSize: 14, color: '#14532D', fontWeight: '500' }}>e-Mola: <Text style={{fontWeight: 'bold', color: '#EA580C'}}>{resolvedSellerAccounts.emola}</Text></Text>
                  ) : null}
                </View>
              ) : null}

              {/* Comprovativo de Pagamento */}
              {['Pendente', 'Aceite pelo entregador', 'Em Preparação', 'A Caminho', 'No destino indicado'].includes(currentOrder.status) && (
                <View style={{ marginTop: 12, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600', marginBottom: 6 }}>Comprovativo de Pagamento:</Text>
                  
                  {currentOrder.paymentProof ? (
                    <View style={{ alignItems: 'center' }}>
                      <TouchableOpacity 
                        style={{ width: '100%', height: 150, borderRadius: 8, overflow: 'hidden', position: 'relative', marginBottom: 8 }}
                        onPress={() => setViewProofModal(true)}
                        activeOpacity={0.9}
                      >
                        <Image 
                          source={{ uri: currentOrder.paymentProof }} 
                          style={{ width: '100%', height: '100%' }} 
                          contentFit="cover"
                        />
                        <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="eye-outline" size={20} color="#fff" />
                        </View>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: 'bold' }}>
                        <Ionicons name="checkmark-circle" size={14} color="#16A34A" /> Comprovativo enviado
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>
                        Após efetuar a transferência, envie o comprovativo para agilizar o processo.
                      </Text>
                      <TouchableOpacity 
                        onPress={handleUploadProof}
                        disabled={uploadingProof}
                        style={{
                          backgroundColor: '#8B5CF6',
                          padding: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center'
                        }}
                      >
                        {uploadingProof ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Anexar Comprovativo</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Foto da Viatura */}
              {(currentOrder.deliveryman.vihicle_picture_front || currentOrder.deliveryman.vihicle_picture) && (
                <View style={styles.vehicleImageContainer}>
                  <Text style={styles.vehicleLabel}>Foto da viatura:</Text>
                  <Image 
                    source={{ uri: currentOrder.deliveryman.vihicle_picture_front || currentOrder.deliveryman.vihicle_picture }} 
                    style={styles.vehicleImage} 
                    contentFit="cover"
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Live Stats Container (Velocidade, Distância, Tempo) */}
        {(etaDistance !== null || driverSpeed !== null) && (
          <View style={styles.liveStatsContainer}>
            {etaDistance !== null && (
              <View style={styles.liveStatBox}>
                <Ionicons name="navigate-outline" size={22} color="#9333EA" />
                <Text style={styles.liveStatValue}>
                  {etaDistance >= 1000 ? `${(etaDistance / 1000).toFixed(1)} km` : `${Math.round(etaDistance)} m`}
                </Text>
                <Text style={styles.liveStatLabel}>Distância</Text>
              </View>
            )}

            {etaDuration !== null && (
              <View style={styles.liveStatBox}>
                <Ionicons name="time-outline" size={22} color="#9333EA" />
                <Text style={styles.liveStatValue}>
                  {etaDuration >= 60 ? `${Math.round(etaDuration / 60)} min` : `${Math.round(etaDuration)} s`}
                </Text>
                <Text style={styles.liveStatLabel}>Tempo de Chegada</Text>
              </View>
            )}

            {driverSpeed !== null && (
              <View style={styles.liveStatBox}>
                <Ionicons name="speedometer-outline" size={22} color="#9333EA" />
                <Text style={styles.liveStatValue}>
                  {Math.round(driverSpeed)} km/h
                </Text>
                <Text style={styles.liveStatLabel}>Velocidade</Text>
              </View>
            )}
          </View>
        )}

        {/* Detalhes Extra do Serviço (Motivo / Descrição) */}
        {(currentOrder.reason || currentOrder.description) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas Adicionais</Text>
            {currentOrder.reason && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.infoLabel, { marginBottom: 6, fontWeight: '600' }]}>Motivo da solicitação:</Text>
                <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{currentOrder.reason}</Text>
                </View>
              </View>
            )}
            {currentOrder.description && (
              <View style={{ marginBottom: 8 }}>
                <Text style={[styles.infoLabel, { marginBottom: 4 }]}>Descrição / Observações:</Text>
                <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20 }}>{currentOrder.description}</Text>
              </View>
            )}
          </View>
        )}

        {/* Produtos List */}
        {currentOrder.orderItems && currentOrder.orderItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Produtos ({currentOrder.orderItems.length})</Text>
            <View style={{ gap: 12 }}>
              {currentOrder.orderItems.map((prod, idx) => (
                <View key={idx} style={styles.productItem}>
                  <Image source={{ uri: prod.image }} style={styles.productImage} />
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{prod.name || prod.nome || 'Produto'}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <Text style={styles.productQty}>Qtd: {prod.quantity}</Text>
                      <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: '700' }}>
                        {((prod.price || 0) * (prod.quantity || 1)).toFixed(2)} MT
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Finanças e Detalhes do Pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, color: '#64748B' }}>Método de Pagamento</Text>
              <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: '700' }}>{currentOrder.paymentMethod || 'Dinheiro'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, color: '#64748B' }}>Estado do Pagamento</Text>
              <Text style={{ fontSize: 14, color: currentOrder.isPaid ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                {currentOrder.isPaid ? 'Pago' : 'Pendente de validação'}
              </Text>
            </View>

            {/* Breakdown for products */}
            {currentOrder.orderItems && currentOrder.orderItems.length > 0 && (
              <>
                <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 14, color: '#64748B' }}>Subtotal dos Itens</Text>
                  <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}>
                    {(currentOrder.itemsPrice || (currentOrder.totalPrice - (currentOrder.deliveryPrice || currentOrder.addressPrice || 0) - (currentOrder.ivaTax || 0))).toFixed(2)} MT
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 14, color: '#64748B' }}>Estimativa de preço de entrega</Text>
                  <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}>
                    {(currentOrder.deliveryPrice || currentOrder.addressPrice || 0).toFixed(2)} MT
                  </Text>
                </View>
                <View style={{ backgroundColor: '#FFFBEB', padding: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#F59E0B', marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, color: '#B45309', lineHeight: 15 }}>
                    💡 <Text style={{ fontWeight: 'bold' }}>Nota importante:</Text> Este valor é apenas uma estimativa e será pago diretamente ao entregador (deliver) no momento da chegada ao destino. Envie apenas o valor correspondente aos produtos.
                  </Text>
                </View>
                {currentOrder.ivaTax ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 14, color: '#64748B' }}>IVA</Text>
                    <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}>
                      {currentOrder.ivaTax.toFixed(2)} MT
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: '#1E293B', fontWeight: '700' }}>Total Geral</Text>
              <Text style={{ fontSize: 18, color: '#9333EA', fontWeight: '800' }}>
                {(currentOrder.totalPrice || 0).toFixed(2)} MT
              </Text>
            </View>
          </View>

          {/* Pending Transfer Payment Details for Seller */}
          {!currentOrder.isPaid && (
            (currentOrder.paymentMethod || '').toLowerCase().includes('m-pesa') || 
            (currentOrder.paymentMethod || '').toLowerCase().includes('mpesa') || 
            (currentOrder.paymentMethod || '').toLowerCase().includes('emola') || 
            (currentOrder.paymentMethod || '').toLowerCase().includes('e-mola') || 
            (currentOrder.paymentMethod || '').toLowerCase().includes('transfer') || 
            (currentOrder.paymentMethod || '').toLowerCase().includes('banc')
          ) ? (
            <View style={{ marginTop: 14, padding: 14, backgroundColor: '#F0FDF4', borderRadius: 16, borderWidth: 1, borderColor: '#BBF7D0' }}>
              {resolvedSellerAccounts.mpesa ? (
                <Text style={{ fontSize: 14, color: '#14532D', fontWeight: '600', marginBottom: 4 }}>
                  M-Pesa: <Text style={{fontWeight: '800', color: '#DC2626'}}>{resolvedSellerAccounts.mpesa}</Text>
                </Text>
              ) : null}
              {resolvedSellerAccounts.emola ? (
                <Text style={{ fontSize: 14, color: '#14532D', fontWeight: '600', marginBottom: 4 }}>
                  e-Mola: <Text style={{fontWeight: '800', color: '#EA580C'}}>{resolvedSellerAccounts.emola}</Text>
                </Text>
              ) : null}
              {resolvedSellerAccounts.bankAccount ? (
                <Text style={{ fontSize: 14, color: '#14532D', fontWeight: '600' }}>
                  {resolvedSellerAccounts.bankName || 'Banco'}: <Text style={{fontWeight: '800', color: '#1E293B'}}>{resolvedSellerAccounts.bankAccount}</Text>
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

      {/* Ações */}
      <View style={styles.actionsContainer}>
        {currentOrder.status === 'Motorista indisponível' && (
          <View style={{
            backgroundColor: '#FFF',
            padding: 16,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#F3F4F6',
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ backgroundColor: '#FEF2F2', padding: 8, borderRadius: 20, marginRight: 10 }}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </View>
              <Text style={{ color: '#111827', fontSize: 16, fontWeight: '700' }}>
                Motorista Indisponível
              </Text>
            </View>
            <Text style={{ color: '#6B7280', fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
              O motorista não pôde realizar esta viagem. Será redirecionado em <Text style={{color: '#EF4444', fontWeight: 'bold'}}>{indisponivelCountdown}s</Text> para pesquisar novos motoristas.
            </Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={{ width: '100%', overflow: 'hidden', borderRadius: 12 }}
              onPress={() => {
                if (isRequestService && currentOrder?.serviceId) {
                  navigation.reset({ 
                    index: 1, 
                    routes: [
                      { name: 'BottomNavigation' },
                      { 
                        name: 'RequestService', 
                        params: { 
                          selectedService: { 
                            _id: currentOrder.serviceId, 
                            name: currentOrder.name || currentOrder.goodType || 'Serviço' 
                          },
                          retrySearch: true,
                          originText: currentOrder.pickup?.address || currentOrder.pickupAddress || '',
                          destText: currentOrder.delivery?.address || currentOrder.deliveryAddress || '',
                          originCoord: currentOrder.pickup?.coordinates ? { lat: currentOrder.pickup.coordinates[1], lng: currentOrder.pickup.coordinates[0] } : null,
                          destCoord: currentOrder.delivery?.coordinates ? { lat: currentOrder.delivery.coordinates[1], lng: currentOrder.delivery.coordinates[0] } : null,
                          reason: currentOrder.goodType || currentOrder.reason || currentOrder.motive || ''
                        } 
                      }
                    ] 
                  });
                } else {
                  navigation.reset({ index: 0, routes: [{ name: 'BottomNavigation' }] });
                }
              }}
            >
              <LinearGradient 
                colors={['#A855F7', '#7E22CE']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="search" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Procurar Novamente</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}


        {currentOrder.status === 'Entregue' && (
          <TouchableOpacity onPress={() => confirmDeleteOrder(currentOrder._id)} style={styles.actionBtn}>
            <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.gradientBtn}>
              <Ionicons name="trash" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Apagar do Histórico</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
  };

  return (
    <View style={styles.container}>
      {/* Full Map Background */}
      <View style={styles.mapWrapper}>
        <TrackingMap 
          orderId={currentOrder._id}
          destination={destination}
          stepStatus={currentOrder.stepStatus}
          vehicleType={currentOrder.deliveryman?.transport_type}
          vehicleColor={currentOrder.deliveryman?.transport_color}
          onUpdateTracking={handleUpdateTracking}
          darkMode={false}
        />
      </View>

      {/* Back Button Overlay */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.chatBtn} 
          onPress={() => navigation.navigate('OrderChat', { orderId: currentOrder._id })}
        >
          <Ionicons name="chatbubbles" size={24} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {renderContent()}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Visualizar Comprovativo Modal */}
      <Modal visible={viewProofModal} transparent={true} animationType="fade" onRequestClose={() => setViewProofModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 25, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24 }} 
            onPress={() => setViewProofModal(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {currentOrder.paymentProof ? (
            <Image 
              source={{ uri: currentOrder.paymentProof }} 
              style={{ width: '92%', height: '82%' }} 
              contentFit="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* Modal de Cancelamento (Premium) */}
      <Modal animationType="fade" transparent visible={modalVisible}>
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={[styles.premiumIconContainer, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="close-circle" size={44} color="#EF4444" />
            </View>
            <Text style={styles.premiumModalTitle}>Cancelar Pedido</Text>
            <Text style={styles.premiumModalMessage}>Por favor, indique o motivo do cancelamento:</Text>
            
            <View style={{ width: '100%', marginVertical: 10 }}>
              {['Demora muito tempo', 'Motorista pediu para cancelar', 'Mudança de planos', 'Outro'].map((reason) => (
                <TouchableOpacity 
                  key={reason}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: message === reason || (reason === 'Outro' && !['Demora muito tempo', 'Motorista pediu para cancelar', 'Mudança de planos', ''].includes(message)) ? '#EF4444' : '#E5E7EB',
                    backgroundColor: message === reason || (reason === 'Outro' && !['Demora muito tempo', 'Motorista pediu para cancelar', 'Mudança de planos', ''].includes(message)) ? '#FEF2F2' : '#FFF',
                    marginBottom: 8
                  }}
                  onPress={() => setMessage(reason === 'Outro' ? 'Outro motivo' : reason)}
                >
                  <Text style={{ 
                    color: message === reason || (reason === 'Outro' && !['Demora muito tempo', 'Motorista pediu para cancelar', 'Mudança de planos', ''].includes(message)) ? '#B91C1C' : '#4B5563',
                    fontWeight: message === reason || (reason === 'Outro' && !['Demora muito tempo', 'Motorista pediu para cancelar', 'Mudança de planos', ''].includes(message)) ? 'bold' : '500'
                  }}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(!['Demora muito tempo', 'Motorista pediu para cancelar', 'Mudança de planos', ''].includes(message)) && (
              <TextInput
                style={[styles.modalInput, { width: '100%', marginTop: 5 }]}
                placeholder="Descreva o motivo detalhado..."
                value={message === 'Outro motivo' ? '' : message}
                onChangeText={setMessage}
                multiline
              />
            )}
            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#4B5563' }}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#EF4444', alignItems: 'center' }}
                onPress={() => cancelOrderPop(currentOrder._id)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Apagar Histórico (Premium) */}
      <Modal animationType="fade" transparent visible={showDeleteModal}>
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={[styles.premiumIconContainer, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="trash-outline" size={44} color="#EF4444" />
            </View>
            <Text style={styles.premiumModalTitle}>Remover Pedido</Text>
            <Text style={styles.premiumModalMessage}>Tem a certeza que deseja remover este pedido do seu histórico? Esta ação não pode ser desfeita.</Text>
            <View style={{ flexDirection: 'row', width: '100%', gap: 12, marginTop: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#4B5563' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#EF4444', alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
                onPress={() => {
                  setShowDeleteModal(false);
                  deleteOrder(currentOrder._id);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Apagar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🏁 MODAL PREMIUM — CONFIRMAR ENTREGA (CLIENTE) */}
      <Modal
        visible={showFinishConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFinishConfirmationModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={[styles.premiumIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-done-circle-outline" size={44} color="#059669" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Confirmar Pedido?</Text>
            
            <Text style={styles.premiumModalMessage}>
              Confirma que recebeu o seu pedido em conformidade? Esta acção finalizará a viagem.
            </Text>

            <View style={styles.premiumModalButtons}>
              <TouchableOpacity 
                style={styles.premiumCancelButton}
                activeOpacity={0.8}
                onPress={() => setShowFinishConfirmationModal(false)}
              >
                <Text style={styles.premiumCancelButtonText}>Voltar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.premiumConfirmButton}
                activeOpacity={0.85}
                onPress={() => {
                  setShowFinishConfirmationModal(false);
                  confirmDelivery(currentOrder._id);
                }}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.premiumConfirmGradient}
                >
                  <Text style={styles.premiumConfirmButtonText}>Confirmar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🎉 MODAL PREMIUM — ENTREGA CONCLUÍDA COM SUCESSO (CLIENTE) */}
      <Modal
        visible={showFinishSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="trophy" size={44} color="#059669" />
            </View>
            
            <Text style={styles.premiumModalTitle}>Pedido Concluído! 🎉</Text>
            
            <Text style={styles.premiumModalMessage}>
              Obrigado por utilizar a Nhiquela
            </Text>

            <TouchableOpacity 
              style={{
                width: '100%',
                borderRadius: 16,
                overflow: 'hidden',
              }}
              activeOpacity={0.85}
              onPress={() => {
                setShowFinishSuccessModal(false);
                if (isRequestService && !currentOrder.rating) {
                  setRatingModalVisible(true);
                } else {
                  navigation.goBack();
                }
              }}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumConfirmGradient}
              >
                <Text style={styles.premiumConfirmButtonText}>Continuar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🌟 MODAL PREMIUM — AVALIAÇÃO DO MOTORISTA */}
      <Modal
        visible={ratingModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            <View style={[styles.premiumIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={44} color="#F59E0B" />
            </View>
            <Text style={styles.premiumModalTitle}>Avalie o Motorista</Text>
            <Text style={styles.premiumModalMessage}>Como foi a sua experiência com {currentDeliveryMan?.name || 'o motorista'}?</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 15 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons name={star <= rating ? "star" : "star-outline"} size={40} color="#F59E0B" style={{ marginHorizontal: 5 }} />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.modalInput, { width: '100%', minHeight: 80 }]}
              placeholder="Deixe um comentário (opcional)..."
              value={review}
              onChangeText={setReview}
              multiline
            />
            
            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity 
                style={styles.premiumCancelButton}
                activeOpacity={0.8}
                onPress={() => {
                  setRatingModalVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.premiumCancelButtonText}>Pular</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.premiumConfirmButton}
                activeOpacity={0.85}
                onPress={submitRating}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.premiumConfirmGradient}
                >
                  <Text style={styles.premiumConfirmButtonText}>Avaliar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Premium light background
  },
  mapWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 15,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 15,
  },
  handleIndicator: {
    backgroundColor: '#E5E7EB',
    width: 48,
    height: 6,
    borderRadius: 4,
    marginVertical: 12,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 5,
    paddingBottom: 30,
  },
  quickSummary: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#7C3AED',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 20,
    width: '100%',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  driverSub: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  vehicleImageContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  vehicleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  vehicleImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  productItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginRight: 16,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  productQty: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  productPriceItem: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7C3AED',
    marginTop: 4,
  },
  actionsContainer: {
    marginTop: 16,
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBtn: {
    flexDirection: 'row',
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
    color: '#111827',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  liveStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  liveStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  liveStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginTop: 8,
  },
  liveStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  premiumModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 14,
  },
  premiumIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 12,
    textAlign: 'center',
  },
  premiumModalMessage: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    fontWeight: '500',
  },
  premiumConfirmButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumConfirmGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumConfirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  premiumModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  premiumCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCancelButtonText: {
    color: '#4B5563',
    fontWeight: '800',
    fontSize: 16,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7F00FF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chatBtnDisabled: {
    backgroundColor: '#6B7280',
    shadowColor: '#6B7280',
    shadowOpacity: 0.15,
  },
  chatBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  }
});

export default OrderDetailsScreen;