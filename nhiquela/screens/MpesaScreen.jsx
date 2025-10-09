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
  Alert,
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
  selectSellerEarningsAfterDiscount,
  selectAddress,
} from '../features/basketSlice';
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
  const address = useSelector(selectAddress);
  const items = useSelector(selectBasketItems);
  const itemsPrice = useSelector(selectBasketTotal);
  const totalSellerEarningsAfterDiscount = useSelector(selectSellerEarningsAfterDiscount);
  const iva = useSelector(selectIva);
  const deliveryPrice = useSelector(selectDeliverPrice);
  const dispatch = useDispatch();

  const navigation = useNavigation();

  // Função para mostrar alertas
  const showAlert = (title, message, onConfirm) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'OK',
          onPress: onConfirm ? onConfirm : () => {},
          style: 'default',
        },
      ],
      { cancelable: false }
    );
  };

  // Configura notificações
  useEffect(() => {
    const configurarNotificacoes = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    };
    configurarNotificacoes();
  }, []);

  // Verifica dados do usuário no AsyncStorage
  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');

      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);

        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
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

  // Função para validar estoque
  const checkStockBeforeOrder = (items) => {
    for (let item of items) {
      if (!item.countInStock || item.quantity > item.countInStock) {
        return {
          ok: false,
          message: `Produto "${item.name}" tem estoque insuficiente. Disponível: ${item.countInStock}`,
          item,
        };
      }
    }
    return { ok: true };
  };

  // Função principal de pagamento e pedido
  const makeThePayment = async (values) => {
    if (!userData) {
     Alert.alert(
      '⚠️ Usuário não autenticado',
      'Para realizar o pagamento, você precisa estar logado. Deseja ir para a tela de login agora?',
      [
        {
          text: 'Sim',
          onPress: () => navigation.replace('Login'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        }
      ]
    );

      return;
    }

    setLoader(true);

    try {
      // 1️⃣ Validar estoque
      const stockCheck = checkStockBeforeOrder(items);
      if (!stockCheck.ok) {
        showAlert(
          '❌ Estoque insuficiente',
          `O produto "${stockCheck.item.name}" tem estoque insuficiente. Disponível: ${stockCheck.item.countInStock}. Ajuste a quantidade ou remova o produto do carrinho.`
        );
        setLoader(false);
        return;
      }

      // 2️⃣ Pagamento M-PESA
      const customerNumber = `258${values.customerNumber}`;
      const amount = parseFloat(totalToPay);

      const { data: paymentData } = await api.post(
        'payments/mpesa/c2b',
        { customerNumber, amount },
        { headers: { authorization: `Bearer ${userData.token}` } }
      );

  

      // 3️⃣ Criar pedido no backend
      const orderPayload = {
        orderItems: items,
        address,
        paymentMethod: 'Mpesa',
        totalPrice: totalToPay,
        itemsPrice: itemsPrice,
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

      const { data } = await api.post('orders', orderPayload, {
        headers: { authorization: `Bearer ${userData.token}` },
      });

      // 4️⃣ Notificar fornecedor
      await sendOrderNotificationToUser({
        userId: data.order.seller._id,
        orderId: data.order._id,
        orderCode: data.order.code,
        title: '📦 Novo pedido!',
        body: `Pedido nº ${data.order.code} solicitado pelo cliente. Aguarde confirmação do fornecedor.`,
        status: 'Pendente',
      });

                navigation.replace('SuccessPayment', { orderCode: data.order.code });


      // 5️⃣ Alerta de sucesso e limpeza do carrinho
      // showAlert(
      //   '✅ Pedido realizado com sucesso',
      //   `Seu pedido (${data.order.code}) foi criado e o fornecedor já foi notificado. Você receberá atualizações sobre o status do pedido.`,
      //   () => {
      //     dispatch(clearBasket());
      //     navigation.replace('SuccessPayment', { orderCode: data.order.code });
      //   }
      // );

    } catch (error) {
      console.error('Erro no pagamento ou pedido:', error.response?.data || error.message || error);
      showAlert(
        '❌ Erro inesperado',
        `Ocorreu um erro durante o processamento do pedido. Detalhes: ${error.response?.data?.message || error.message || 'Erro desconhecido'}. Tente novamente mais tarde.`
      );
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
  safeArea: { flex: 1, backgroundColor: 'white', paddingTop: 100 },
  icons: { position: 'absolute', top: 50, left: 25, zIndex: 10 },
  back: { color: '#7F00FF' },
  cover: { width: 300, height: 200, marginBottom: 20, alignSelf: 'center', borderRadius: 20 },
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
  label: { fontSize: 16, color: '#333', marginBottom: 10, fontWeight: '600' },
  input: { borderColor: '#ddd', borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 10, backgroundColor: '#fff', elevation: 1 },
  errorMessage: { color: 'red', fontSize: 14, marginBottom: 10 },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50', marginTop: 5, marginBottom: 20 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  modalContent: { width: Dimensions.get('window').width * 0.8, backgroundColor: 'white', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 10 },
  loadingText: { marginTop: 20, fontSize: 16, fontWeight: '600', color: '#7F00FF' },
});
