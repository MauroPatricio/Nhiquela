import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
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
  const [userData, setUserData] = useState(null);
  const [loader, setLoader] = useState(false);
  const [isUserWantDelivery, setIsUserWantDelivery] = useState(true);

  const totalToPay = useSelector(selectTotalToPay);
  const address = useSelector(selectAddress);
  const items = useSelector(selectBasketItems);
  const itemsPrice = useSelector(selectBasketTotal);
  const totalSellerEarningsAfterDiscount = useSelector(selectSellerEarningsAfterDiscount);
  const iva = useSelector(selectIva);
  const deliveryPrice = useSelector(selectDeliverPrice);
  const dispatch = useDispatch();
  const navigation = useNavigation();

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

  const checkStockBeforeOrder = (items) => {
    for (let item of items) {
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
      await api.post('payments/mpesa/c2b', { customerNumber, amount }, { headers: { authorization: `Bearer ${userData.token}` } });

      const orderPayload = {
        orderItems: items,
        address,
        paymentMethod: 'Mpesa',
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
      };

      const { data } = await api.post('orders', orderPayload, { headers: { authorization: `Bearer ${userData.token}` } });

      await sendOrderNotificationToUser({
        userId: data.order.seller._id,
        orderId: data.order._id,
        orderCode: data.order.code,
        title: '📦 Novo pedido!',
        body: `Pedido nº ${data.order.code} solicitado pelo cliente.`,
        status: 'Pendente',
      });

      dispatch(clearBasket());
      navigation.replace('SuccessPayment', { orderCode: data.order.code });

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
      <>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
            keyboardShouldPersistTaps="handled"
          >
            <Modal visible={loader} animationType="fade" transparent>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <ActivityIndicator size="large" color="#7F00FF" />
                  <Text style={styles.loadingText}>Processando pagamento...</Text>
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
                    <Image source={require('../assets/Mpesa.png')} style={styles.cover} />

                    <Text style={styles.label}>
                      <MaterialCommunityIcons name="cellphone" size={18} color="#9CA3AF" /> NÚMERO DE TELEFONE
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

                    <Button loader={loader} title="Confirmar Pagamento" onPress={handleSubmit} isValid={isValid ? '#9333EA' : '#EF4444'} />
                  </View>
                )}
              </Formik>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </>
    </KeyboardAvoidingView>
  );
};

export default MpesaScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  icons: { position: 'absolute', top: 15, left: 25, zIndex: 10 },
  back: { color: '#9333EA' },
  cover: { width: '100%', height: 180, marginBottom: 25, alignSelf: 'center', borderRadius: 24 },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 30,
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
  label: { fontSize: 13, color: '#6B7280', marginBottom: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16, marginBottom: 8, backgroundColor: '#F3F4F6', color: '#1F2937', fontWeight: '700' },
  errorMessage: { color: '#EF4444', fontSize: 13, marginBottom: 16, fontWeight: '600', marginLeft: 4 },
  amount: { fontSize: 32, fontWeight: '900', color: '#10B981', marginTop: 4, marginBottom: 30 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: Dimensions.get('window').width * 0.85, backgroundColor: 'white', padding: 35, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  loadingText: { marginTop: 24, fontSize: 16, fontWeight: '800', color: '#9333EA' },
});
