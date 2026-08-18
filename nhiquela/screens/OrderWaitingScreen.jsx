import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import api from '../hooks/createConnectionApi';

const TIMEOUT_SECONDS = 15 * 60; // 15 minutos = 900s

// Componente isolado para o timer — evita re-renders em cascata no ecrã inteiro
const CountdownBadge = memo(({ timeLeft }) => {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return (
    <View style={countdownBadgeStyles.timerBadge}>
      <Ionicons name="timer-outline" size={24} color="#7F00FF" />
      <Text style={countdownBadgeStyles.timerText}>{formatted}</Text>
    </View>
  );
});

const countdownBadgeStyles = StyleSheet.create({
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  timerText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#7F00FF',
    marginLeft: 8,
    fontVariant: ['tabular-nums'],
  },
});

export default function OrderWaitingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId, orderCode, seller, initialOrder } = route.params || {};

  const [order, setOrder] = useState(initialOrder || null);
  const [status, setStatus] = useState('WAITING'); // 'WAITING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  const [rejectReason, setRejectReason] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
  const [userData, setUserData] = useState(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const socketRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Pulse animation for waiting state
  useEffect(() => {
    if (status === 'WAITING') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [status, pulseAnim]);

  // Load User Data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('userData');
        if (stored) {
          setUserData(JSON.parse(stored));
        }
      } catch (err) {
        console.log('Error loading user in OrderWaitingScreen:', err);
      }
    };
    loadUser();
  }, []);

  // Fetch Order Status (Polling fallback)
  const checkOrderStatus = useCallback(async () => {
    if (!orderId && !orderCode) return;
    try {
      const targetId = orderId || (order && order._id);
      if (!targetId) return;

      const { data } = await api.get(`/orders/${targetId}`);
      const fetchedOrder = data?.order || data;

      if (fetchedOrder) {
        setOrder(fetchedOrder);
        if (fetchedOrder.isAccepted || fetchedOrder.status === 'Aceite' || fetchedOrder.stepStatus >= 2) {
          handleAccepted(fetchedOrder);
        } else if (fetchedOrder.isCanceled || fetchedOrder.status === 'Rejeitado' || fetchedOrder.status === 'Cancelado') {
          handleRejected(fetchedOrder.canceledReason || 'Rejeitado pelo vendedor', fetchedOrder);
        }
      }
    } catch (error) {
      console.log('Polling order error:', error?.message);
    }
  }, [orderId, orderCode, order]);

  const handleAccepted = (acceptedOrder) => {
    setStatus('ACCEPTED');
    setOrder(acceptedOrder);
    clearInterval(pollIntervalRef.current);
  };

  const handleRejected = (reason, rejectedOrder) => {
    setStatus('REJECTED');
    setRejectReason(reason);
    if (rejectedOrder) setOrder(rejectedOrder);
    clearInterval(pollIntervalRef.current);
  };

  // Socket.IO Setup
  useEffect(() => {
    let socket;
    const initSocket = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        const myUserId = userObj?._id || userObj?.id;

        const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api\/?$/, '') : 'https://api.nhiquelaservicos.com';
        socket = io(baseUrl, {
          transports: ['websocket'],
          reconnection: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('🔗 OrderWaitingScreen Socket Connected. ID:', socket.id);
          if (myUserId) {
            socket.emit('onLogin', { _id: myUserId });
          }
          if (orderId) {
            socket.emit('joinRoom', { orderId });
          }
        });

        socket.on('orderAccepted', (data) => {
          console.log('🎉 WebSocket orderAccepted event received:', data);
          if (!orderId || data?.orderId === orderId || data?.order?._id === orderId) {
            handleAccepted(data.order);
          }
        });

        socket.on('orderRejected', (data) => {
          console.log('❌ WebSocket orderRejected event received:', data);
          if (!orderId || data?.orderId === orderId || data?.order?._id === orderId) {
            handleRejected(data.reason || 'Rejeitado pelo vendedor', data.order);
          }
        });

        socket.on('orderStatusUpdated', (updatedOrder) => {
          console.log('🔄 WebSocket orderStatusUpdated event received:', updatedOrder);
          if (!orderId || updatedOrder?._id === orderId) {
            if (updatedOrder.isAccepted || updatedOrder.status === 'Aceite' || updatedOrder.stepStatus >= 2) {
              handleAccepted(updatedOrder);
            } else if (updatedOrder.isCanceled || updatedOrder.status === 'Rejeitado' || updatedOrder.status === 'Cancelado') {
              handleRejected(updatedOrder.canceledReason || 'Rejeitado pelo vendedor', updatedOrder);
            }
          }
        });
      } catch (err) {
        console.error('Socket init error:', err);
      }
    };

    initSocket();

    // Start Polling Interval (every 4 seconds)
    pollIntervalRef.current = setInterval(() => {
      checkOrderStatus();
    }, 4000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [orderId, checkOrderStatus]);

  // 15-Minute Countdown Timer
  useEffect(() => {
    if (status !== 'WAITING') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Prevent back navigation without confirmation
  useEffect(() => {
    const onBackPress = () => {
      if (status === 'WAITING') {
        Alert.alert(
          'Aguardando Vendedor',
          'O seu pedido está a aguardar a aceitação do vendedor. Se sair agora, poderá acompanhar o status na tela "As Minhas Encomendas". Deseja sair?',
          [
            { text: 'Ficar aqui', style: 'cancel' },
            { text: 'Sair para Início', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'BottomNavigation' }] }) },
          ]
        );
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      } else if (BackHandler.removeEventListener) {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      }
    };
  }, [status, navigation]);

  const sellerName = seller?.name || seller?.seller?.name || order?.seller?.name || 'Fornecedor';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* TOP HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Estado do Pedido</Text>
          {orderCode && <Text style={styles.orderCodeBadge}>#{orderCode}</Text>}
        </View>

        {/* WAITING STATE */}
        {status === 'WAITING' && (
          <View style={styles.card}>
            <View style={styles.radarContainer}>
              <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.radarCenterIcon}>
                <MaterialCommunityIcons name="clock-fast" size={48} color="#7F00FF" />
              </View>
            </View>

            <Text style={styles.waitingTitle}>Aguardando Resposta do Vendedor</Text>
            <Text style={styles.waitingSubtitle}>
              O pedido foi enviado para <Text style={styles.boldText}>{sellerName}</Text>. O vendedor tem até 15 minutos para confirmar o estoque e aceitar a encomenda.
            </Text>

            {/* COUNTDOWN TIMER BADGE — componente memo para evitar tremor */}
            <CountdownBadge timeLeft={timeLeft} />

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
              <Text style={styles.infoBoxText}>
                Assim que o fornecedor aceitar, o seu pedido entrará em preparação imediatamente.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'BottomNavigation', params: { screen: 'Pedidos' } }] })}
            >
              <Ionicons name="receipt-outline" size={20} color="#7F00FF" />
              <Text style={styles.outlineButtonText}>Acompanhar em Minhas Encomendas</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACCEPTED STATE */}
        {status === 'ACCEPTED' && (
          <View style={[styles.card, styles.cardSuccess]}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>

            <Text style={styles.successTitle}>Pedido Aceite!</Text>
            <Text style={styles.successSubtitle}>
              Ótima notícia! O fornecedor <Text style={styles.boldText}>{sellerName}</Text> aceitou o seu pedido e já está a preparar a encomenda.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                if (order?._id || orderId) {
                  navigation.replace('OrderDetailsScreen', { orderId: order?._id || orderId, order: order });
                } else {
                  navigation.reset({ index: 0, routes: [{ name: 'BottomNavigation', params: { screen: 'Pedidos' } }] });
                }
              }}
            >
              <Text style={styles.primaryButtonText}>Ver Detalhes do Pedido</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* REJECTED STATE */}
        {status === 'REJECTED' && (
          <View style={[styles.card, styles.cardRejected]}>
            <View style={styles.rejectIconCircle}>
              <Ionicons name="close-circle" size={80} color="#EF4444" />
            </View>

            <Text style={styles.rejectTitle}>Pedido Não Aceite</Text>
            <Text style={styles.rejectSubtitle}>
              Infelizmente, o fornecedor não pôde aceitar este pedido no momento.
            </Text>

            {rejectReason ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Motivo indicado pelo fornecedor:</Text>
                <Text style={styles.reasonText}>{rejectReason}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#7F00FF' }]}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'BottomNavigation' }] })}
            >
              <Ionicons name="storefront-outline" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Explorar Outros Produtos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* EXPIRED STATE */}
        {status === 'EXPIRED' && (
          <View style={[styles.card, styles.cardExpired]}>
            <View style={styles.rejectIconCircle}>
              <Ionicons name="time" size={80} color="#F59E0B" />
            </View>

            <Text style={styles.expiredTitle}>Tempo Limite Excedido</Text>
            <Text style={styles.expiredSubtitle}>
              O fornecedor não respondeu dentro do prazo de 15 minutos. Pode tentar novamente ou pesquisar produtos noutro vendedor.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'BottomNavigation' }] })}
            >
              <Text style={styles.primaryButtonText}>Voltar ao Início</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  orderCodeBadge: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#7F00FF',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardSuccess: {
    borderColor: '#D1FAE5',
    borderWidth: 2,
  },
  cardRejected: {
    borderColor: '#FEE2E2',
    borderWidth: 2,
  },
  cardExpired: {
    borderColor: '#FEF3C7',
    borderWidth: 2,
  },
  radarContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(127, 0, 255, 0.15)',
  },
  radarCenterIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  waitingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  // timerBadge e timerText movidos para countdownBadgeStyles (fora do componente principal para evitar tremor)
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoBoxText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#7F00FF',
    width: '100%',
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7F00FF',
    marginLeft: 8,
  },
  successIconCircle: {
    marginVertical: 15,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  rejectIconCircle: {
    marginVertical: 15,
  },
  rejectTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EF4444',
    marginBottom: 8,
  },
  rejectSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  reasonBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#B91C1C',
    fontWeight: '600',
  },
  expiredTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F59E0B',
    marginBottom: 8,
  },
  expiredSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 6,
  },
});
