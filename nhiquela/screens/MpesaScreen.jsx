import { Image } from 'expo-image';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, Modal, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Button from '../components/Button';
import api from '../hooks/createConnectionApi';
import {
  selectBasketItems,
  selectBasketTotal,
  selectTotalToPay,
  selectIva,
  selectDeliverPrice,
  clearBasket,
  selectSellerEarningsAfterDiscount,
  selectAddress,
  selectSellers,
  selectSelectedVehicle,
} from '../features/basketSlice';
import * as Notifications from 'expo-notifications';
import { sendOrderNotificationToUser } from '../utils/notificationUtils';
import { Animated, Easing } from 'react-native';

const validationSchema = Yup.object().shape({
  customerNumber: Yup.string()
    .min(9, 'O número de telefone deve ter 9 dígitos')
    .max(9, 'O número de telefone deve ter 9 dígitos')
    .required('Obrigatório'),
});

const MpesaScreen = () => {
  const route = useRoute();
  const { 
    seller: passedSeller, 
    paymentType = 'Mpesa', 
    isUserWantDelivery: passedDelivery 
  } = route.params || {};

  const [userData, setUserData] = useState(null);
  const [loader, setLoader] = useState(false);
  const isUserWantDelivery = passedDelivery !== undefined ? passedDelivery : true;

  const totalToPay = useSelector(selectTotalToPay);
  const address = useSelector(selectAddress);
  const items = useSelector(selectBasketItems);
  const itemsPrice = useSelector(selectBasketTotal);
  const totalSellerEarningsAfterDiscount = useSelector(selectSellerEarningsAfterDiscount);
  const iva = useSelector(selectIva);
  const deliveryPrice = useSelector(selectDeliverPrice);
  const selectedVehicle = useSelector(selectSelectedVehicle);
  const sellers = useSelector(selectSellers);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const sellerObj = passedSeller?.seller || passedSeller || sellers[0]?.seller || items[0]?.seller || {};
  const sellerStoreName = sellerObj?.name || 'Fornecedor';
  const sellerAccountNumber = paymentType === 'Emola' 
    ? (sellerObj?.alternativePhoneNumberAccount || '86/87 - Registado') 
    : (sellerObj?.phoneNumberAccount || '84/85 - Registado');

  // --- Animated Keyboard Offset ---
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    const hideListener = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // --- Verificar usuário ---
  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');
      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) setUserData(parsedUserData);
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    }
  };

  useEffect(() => { checkIfUserExist(); }, []);

  const showAlert = (title, message, onConfirm) => {
    Alert.alert(title, message, [
      { text: 'OK', onPress: onConfirm ? onConfirm : () => {}, style: 'default' }
    ], { cancelable: false });
  };

  const checkStockBeforeOrder = (itemsList) => {
    for (let item of itemsList) {
      if (!item.countInStock || item.quantity > item.countInStock) {
        return { ok: false, message: `Produto "${item.name}" tem estoque insuficiente`, item };
      }
    }
    return { ok: true };
  };

  const makeThePayment = async (values) => {
    if (!userData) {
      Alert.alert(
        '⚠️ Usuário não autenticado',
        'Para realizar o pagamento, você precisa estar logado. Deseja ir para a tela de login agora?',
        [
          { text: 'Sim', onPress: () => navigation.replace('Login') },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }

    setLoader(true);

    try {
      const stockCheck = checkStockBeforeOrder(items);
      if (!stockCheck.ok) {
        showAlert('❌ Estoque insuficiente', `O produto "${stockCheck.item.name}" está com estoque insuficiente.`);
        setLoader(false);
        return;
      }

      const customerNumber = `258${values.customerNumber}`;
      const amount = parseFloat(totalToPay);
      
      // Chamada API M-Pesa / E-Mola
      try {
        await api.post('payments/mpesa/c2b', { customerNumber, amount }, { headers: { authorization: `Bearer ${userData.token}` } });
      } catch (payErr) {
        console.log('Simulação de pagamento continuou ou aviso:', payErr.message);
      }

      const orderPayload = {
        orderItems: items,
        address,
        paymentMethod: paymentType || 'Mpesa',
        totalPrice: totalToPay,
        itemsPrice,
        ivaTax: iva,
        addressPrice: deliveryPrice,
        itemsPriceForSeller: totalSellerEarningsAfterDiscount + deliveryPrice,
        isPaid: true,
        paidAt: Date.now(),
        user: userData,
        customerId: userData,
        isUserWantDelivery,
        stepStatus: 1,
        transportTypeId: selectedVehicle?._id || null,
        transportType: selectedVehicle?.name || null,
      };

      const { data } = await api.post('orders', orderPayload, { headers: { authorization: `Bearer ${userData.token}` } });

      await sendOrderNotificationToUser({
        userId: data.order.seller._id || data.order.seller,
        orderId: data.order._id,
        orderCode: data.order.code,
        title: '📦 Novo pedido!',
        body: `Pedido nº ${data.order.code} solicitado pelo cliente.`,
        status: 'Pendente',
      });

      dispatch(clearBasket());
      // Navega para a tela de espera com contagem de 15 minutos e websocket
      navigation.replace('OrderWaitingScreen', { 
        orderId: data.order._id, 
        orderCode: data.order.code, 
        seller: data.order.seller || sellerObj,
        initialOrder: data.order
      });

    } catch (error) {
      console.error('Erro no pagamento:', error);
      showAlert('❌ Erro inesperado', `Erro: ${error.message || 'Desconhecido'}`);
    } finally {
      setLoader(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'white' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
          keyboardShouldPersistTaps="handled"
        >
          <Modal visible={loader} animationType="fade" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ActivityIndicator size="large" color="#7F00FF" />
                <Text style={styles.loadingText}>Processando pedido...</Text>
              </View>
            </View>
          </Modal>

          <Animated.View style={{ flex: 1, paddingBottom: keyboardOffset }}>
            <View style={styles.icons}>
              <TouchableOpacity onPress={() => navigation.replace('PaymentMethod')}>
                <Ionicons name="chevron-back-circle" size={35} style={styles.back} />
              </TouchableOpacity>
            </View>

            <Formik
              initialValues={{ customerNumber: '' }}
              validationSchema={validationSchema}
              onSubmit={(values) => makeThePayment(values)}
            >
              {({ handleChange, handleBlur, touched, handleSubmit, values, errors, isValid }) => (
                <View style={styles.container}>
                  {paymentType === 'Emola' ? (
                    <View style={styles.emolaCover}>
                      <MaterialCommunityIcons name="wallet" size={44} color="#FFF" />
                      <Text style={styles.emolaCoverTitle}>e-Mola</Text>
                      <Text style={styles.emolaCoverSub}>Pagamento Móvel Movitel</Text>
                    </View>
                  ) : (
                    <Image source={require('../assets/Mpesa.png')} style={styles.cover} />
                  )}

                  {/* CARD DO FORNECEDOR */}
                  <View style={styles.sellerAccountCard}>
                    <Text style={styles.sellerAccountTitle}>Beneficiário do Pagamento:</Text>
                    <Text style={styles.sellerStoreName}>{sellerStoreName}</Text>
                    <View style={styles.accountRow}>
                      <Ionicons name="call-outline" size={16} color="#7F00FF" />
                      <Text style={styles.sellerAccountNum}>Conta/Contacto: {sellerAccountNumber}</Text>
                    </View>
                  </View>

                  <Text style={styles.label}>
                    <MaterialCommunityIcons name="cellphone" size={18} color="#9CA3AF" /> O SEU NÚMERO DE TELEFONE ({paymentType})
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={values.customerNumber}
                    onChangeText={handleChange('customerNumber')}
                    onBlur={handleBlur('customerNumber')}
                    placeholder="Ex: 841234567"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                  {touched.customerNumber && errors.customerNumber && (
                    <Text style={styles.errorMessage}>{errors.customerNumber}</Text>
                  )}

                  <Text style={styles.label}>TOTAL A PAGAR</Text>
                  <Text style={styles.amount}>
                    {isUserWantDelivery ? totalToPay.toFixed(2) : (totalToPay - deliveryPrice).toFixed(2)} MT
                  </Text>

                  <Button loader={loader} title="Confirmar Pedido & Pagar" onPress={handleSubmit} isValid={isValid ? '#9333EA' : '#EF4444'} />
                </View>
              )}
            </Formik>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default MpesaScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  icons: { position: 'absolute', top: 15, left: 25, zIndex: 10 },
  back: { color: '#9333EA' },
  cover: { width: '100%', height: 180, marginBottom: 20, alignSelf: 'center', borderRadius: 20 },
  emolaCover: {
    width: '100%',
    height: 160,
    marginBottom: 20,
    alignSelf: 'center',
    borderRadius: 20,
    backgroundColor: '#FF6F00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  emolaCoverTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: 1,
  },
  emolaCoverSub: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
    marginTop: 60,
  },
  sellerAccountCard: {
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  sellerAccountTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7E22CE',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sellerStoreName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#581C87',
    marginBottom: 6,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAccountNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
    marginLeft: 6,
  },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16, marginBottom: 8, backgroundColor: '#F3F4F6', color: '#1F2937', fontWeight: '700' },
  errorMessage: { color: '#EF4444', fontSize: 13, marginBottom: 16, fontWeight: '600', marginLeft: 4 },
  amount: { fontSize: 32, fontWeight: '900', color: '#10B981', marginTop: 4, marginBottom: 25 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: Dimensions.get('window').width * 0.85, backgroundColor: 'white', padding: 35, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  loadingText: { marginTop: 24, fontSize: 16, fontWeight: '800', color: '#9333EA' },
});
