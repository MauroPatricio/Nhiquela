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
} from 'react-native';
import React, { useState, useEffect } from 'react';
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
  selectTotalPriceFromSeller,
  selectPriceFromSeller,
  selectSellerEarningsAfterDiscount,
} from '../features/basketSlice';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import { sendOrderNotificationToUser } from '../utils/notificationUtils';

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
  const amount = parseFloat(totalToPay);
  const navigation = useNavigation();
  const items = useSelector(selectBasketItems);
  const itemsPrice = useSelector(selectBasketTotal);
  const totalPriceFromSeller = useSelector(selectPriceFromSeller);
  const totalSellerEarningsAfterDiscount = useSelector(selectSellerEarningsAfterDiscount)
  const iva = useSelector(selectIva);
  const deliveryPrice = useSelector(selectDeliverPrice);
  const dispatch = useDispatch();
  const [userLogin, setUserLogin] = useState(false)


  useEffect(() => {
    const configurarNotificacoes = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    };
    configurarNotificacoes();
  }, []);

  const mostrarNotificacao = (response) => {
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pedido criado com sucesso',
        body: `O seu pedido com o código ${response.order.code} foi criado com sucesso.`,
        sound: true,
      },
      trigger: null,
    });
  };

const checkIfUserExist = async () => {
  try {
    const storedUserData = await AsyncStorage.getItem('userData');
    const storedUserId = await AsyncStorage.getItem('id');

    if (storedUserData && storedUserId) {
      const parsedUserData = JSON.parse(storedUserData);

      if (parsedUserData._id === storedUserId) {
        setUserData(parsedUserData); 
        setUserLogin(true);
      } else {
        console.warn('⚠️ ID inconsistente entre userData e id');
      }
    } else {
      console.log('⚠️ Usuário não está logado');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar se o usuário existe:', error);
  }
};


  useEffect(() => {
    checkIfUserExist();
  }, []);

const makeThePayment = async (values) => {
  if (!userData) {
    Toast.show({
      type: 'error',
      text1: 'Atenção!',
      text2: 'Por favor, faça o login para continuar.',
      position: 'top',
      visibilityTime: 6000,
      autoHide: true,
      topOffset: 50,
      bottomOffset: 40,
      onPress: () => navigation.navigate('Login'),
      style: {
        backgroundColor: '#FF5733',
        borderLeftWidth: 10,
        borderLeftColor: '#C70039',
        borderRadius: 10,
        padding: 10,
      },
      text1Style: {
        fontSize: 15,
        fontWeight: 'bold',
        color: 'black',
      },
      text2Style: {
        fontSize: 16,
        color: 'black',
      },
      renderLeftIcon: () => (
        <MaterialCommunityIcons name="alert-circle" size={40} color="yellow" />
      ),
    });
    return;
  }

  try {
    setLoader(true);
    const headers = { authorization: `Bearer ${userData.token}` };
    const customerNumber = `258${values.customerNumber}`;

    // 1. PAGAMENTO
    const { data: paymentData } = await api.post(
      `payments/mpesa/c2b`,
      { customerNumber, amount },
      { headers }
    );

    if (!paymentData.paid) {
      navigation.replace('FailedPayment', paymentData);
      return;
    }

    // 2. CRIAÇÃO DO PEDIDO
    const payoutToSellerWithDelivery = totalSellerEarningsAfterDiscount + deliveryPrice;

    const orderPayload = {
      orderItems: items,
      address: '',
      paymentMethod: 'Mpesa',
      itemsPrice,
      ivaTax: iva,
      siteTax: 0,
      taxPrice: 0,
      totalPrice: totalToPay,
      addressPrice: deliveryPrice,
      itemsPriceForSeller: payoutToSellerWithDelivery,
      isPaid: true,
      paidAt: Date.now(),
      stepStatus: 1,
      user: userData,
      customerId: userData,
      isUserWantDelivery,
    };

    const { data } = await api.post('orders', orderPayload, { headers });


       // Notificar o FORNECEDOR
        await sendOrderNotificationToUser({
          userId: data.order.seller._id, // garantir que funcione com ou sem populate
          orderId: data.order._id,
          orderCode: data.order.code,
          title: 'Possui um novo pedido!',
          body: `O cliente solicitou o pedido nº ${data.order.code}.`,
          status: 'Pendente',
        });
    
        Toast.show({
          type: 'success',
          text1: 'Pedido criado',
          text2: 'O fornecedor será notificado.',
        });

    // 3. Finalização
    dispatch(clearBasket());
      navigation.replace('SuccessPayment', {
        orderCode: data.order?.code, // <-- Passe o código aqui
      });
  } catch (error) {
    console.error('Erro no pagamento:', error);
    const errorData = error.response?.data || {
      message: 'Erro desconhecido. Tente novamente.',
    };
    navigation.replace('FailedPayment', errorData);
  } finally {
    setLoader(false);
  }
};





  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal visible={loader} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#7F00FF" />
            <Text style={styles.loadingText}>Processando pagamento...</Text>
          </View>
        </View>
      </Modal>

      <View style={styles.icons}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
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
              <MaterialCommunityIcons name="cellphone" size={20} color="grey" /> Número de telefone:
            </Text>
            <TextInput
              style={styles.input}
              value={values.customerNumber}
              onChangeText={handleChange('customerNumber')}
              onBlur={handleBlur('customerNumber')}
              placeholder="Informe o número para o pagamento"
              keyboardType="numeric"
            />
            {touched.customerNumber && errors.customerNumber && (
              <Text style={styles.errorMessage}>{errors.customerNumber}</Text>
            )}

            <Text style={styles.label}>Total a pagar:</Text>
            <Text style={styles.amount}>
              {isUserWantDelivery ? totalToPay.toFixed(2) : (totalToPay - deliveryPrice).toFixed(2)} MT
            </Text>

            <Button
              loader={loader}
              title="Pagar"
              onPress={handleSubmit}
              isValid={isValid ? '#7F00FF' : 'red'}
            />
          </View>
        )}
      </Formik>
    </SafeAreaView>
  );
};

export default MpesaScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 100,
  },
  icons: {
    position: 'absolute',
    top: 50,
    left: 25,
    zIndex: 10,
  },
  back: {
    color: '#7F00FF',
  },
  cover: {
    width: 300,
    height: 200,
    marginBottom: 20,
    alignSelf: 'center',
    borderRadius: 20,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    elevation: 1,
  },
  errorMessage: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 5,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.8,
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 10,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#7F00FF',
  },
});
