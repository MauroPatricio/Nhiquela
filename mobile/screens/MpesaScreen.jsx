import { StyleSheet, Text, TextInput, View, Image, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import api from '../hooks/createConnectionApi';
import { selectBasketItems, selectBasketTotal, selectTotalToPay, selectIva, selectDeliverPrice, clearBasket } from '../features/basketSlice';
import Toast from 'react-native-toast-message';

import * as Notifications from 'expo-notifications';


const validationSchema = Yup.object().shape({
  customerNumber: Yup.string()
    .min(9, 'O número de telefone não pode ser inferior a 9 dígitos')
    .max(9, 'O número de telefone não pode ser superior a 9 dígitos')
    .required('Obrigatório'),
});

const MpesaScreen = () => {

  const configurarNotificacoes = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  };

  const mostrarNotificacao = (response) => {
    Notifications.scheduleNotificationAsync({
      content: {
        title: "Pedido criado com sucesso",
        body: `O seu pedido com o código ${response.data.order.code} foi criado com sucesso. Por favor! Aguarde pela confirmação do fornecedor.`, // A mensagem recebida do backend
        sound: true,
      },
      trigger: null,
    });
  };


  const checkForNewMessages = (response) => {
    try {
      mostrarNotificacao(response);
    } catch (error) {
      console.error('Erro ao buscar novas mensagens:', error);
    }
  };

  useEffect(() => {
    configurarNotificacoes(); 
  }, []);



  const [userData, setUserData] = useState(null);
  const [loader, setLoader] = useState(false);
  const totalToPay = useSelector(selectTotalToPay);
  const amount = parseFloat(totalToPay);
  const navigation = useNavigation();
  const items = useSelector(selectBasketItems);
  const itemsPrice = useSelector(selectBasketTotal);
  const iva = useSelector(selectIva);
  const deliveryPrice = useSelector(selectDeliverPrice);
  const [paymentInfo, setPaymentInfo] = useState('');
  const dispatch = useDispatch();


  const checkIfUserExist = async () => {
    const id = await AsyncStorage.getItem('id');
    const userId = `user${JSON.parse(id)}`;
    const currentUser = await AsyncStorage.getItem(userId);
    if (currentUser !== null) {
      const parseData = JSON.parse(currentUser);
      setUserData(parseData);
    }
  };

  useEffect(() => {
    checkIfUserExist();
  }, []);

  const makeThePayment = async (values) => {
    if (userData == null) {

      Toast.show({
        type: 'error',
        text1: 'Atenção!',
        text2: 'Por favor, faça o login para continuar.',
        position: 'top',
        visibilityTime: 6000, // Increase visibility time for emphasis
        autoHide: true,
        topOffset: 50,
        bottomOffset: 40,
        onPress: () => {
          navigation.navigate('Login'); // Navigate to the login screen
        },
        style: {
          backgroundColor: '#FF5733', // Bold, attention-grabbing red color
          borderLeftWidth: 10,
          borderLeftColor: '#C70039', // Deeper red accent for emphasis
          borderRadius: 10, // Rounded corners for modern look
          padding: 10, // Extra padding for visibility
        },
        text1Style: {
          fontSize: 15, // Larger font for title
          fontWeight: 'bold',
          color: 'black', // High contrast text
        },
        text2Style: {
          fontSize: 16,
          color: 'black', // Secondary message with same color
        },
        renderLeftIcon: () => (
          <MaterialCommunityIcons name="alert-circle" size={40} color="yellow" />
        ), // Adding a warning icon
      });


      return;
    }
    try {
      setLoader(true);
      const customerNumber = '258' + values.customerNumber;

      // const { data } = await api.post(`payments/mpesa`, {customerNumber, amount},  {
      //   headers: {
      //     authorization: `Bearer ${userData.token}`,
      //   },
      // });
      const data = true



      setPaymentInfo(data)

      if (data) {

        const order = {
          orderItems: items,
          address: '',
          paymentMethod: 'Mpesa',
          itemsPrice: itemsPrice,
          ivaTax: iva,
          siteTax: 0,
          taxPrice: 0,
          totalPrice: totalToPay,
          addressPrice: deliveryPrice,
          itemsPriceForSeller: itemsPrice,
          isPaid: true,
          paidAt: Date.now(),
          stepStatus: 1,
          user: userData,
          customerId: userData,
        }


        try {
          const response = await api.post('/orders', order, {
            headers: {
              authorization: `Bearer ${userData.token}`,  // Token de autenticação
            },
          });

          // console.log('Pedido criado com sucesso:', response.data);

          dispatch(clearBasket()); // Clear the basket

          checkForNewMessages(response);

          // axios.post(`https://app.nativenotify.com/api/indie/notification`, {
          //   subID: response.data.order.seller,
          //   appId: 23641,
          //   appToken: 'P1NYLd6lOOHkdLzDZK0kV3',
          //   title: 'Pedido criado com sucesso',
          //   message: `O seu pedido com o código ${response.data.order.code} foi criado com sucesso. Por favor! Aguarde pela confirmação do fornecedor.`
          // });

          // const mensagem = `O seu pedido com o código ${response.data.order.code} foi criado com sucesso. Por favor! Aguarde pela confirmação do fornecedor.`;
          
          // const resposta = await api.post('/notificationsNhabanga', {
          //   message: mensagem,
          //   receiver_id: response.data.order.seller,
          //   sender_id: response.data.order.user,
          //   orderID: response.data.order._id
          // });

        } catch (error) {
          console.error('Erro ao enviar pedido:', error);
        }
      } else {
        navigation.replace('FailedPayment', paymentInfo);
      }


      // payment logic here
      setLoader(false);
      navigation.replace('SuccessPayment');
    } catch (error) {
      console.log(error.data)
      setLoader(false);
      navigation.replace('FailedPayment', paymentInfo);

    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <>
            <View style={styles.container}>
              <Image source={require('../assets/Mpesa.png')} style={styles.cover} />

              <Text style={styles.label}>
                <MaterialCommunityIcons name="cellphone" size={20} color="grey" style={styles.iconStyle} /> Número de telefone:
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
              <Text style={styles.amount}>{amount} MT</Text>

              <Button loader={loader} title="Pagar" onPress={handleSubmit} isValid={isValid ? '#E85A4F' : 'red'} />
            </View>
          </>
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
    paddingTop: 100
  },
  icons: {
    position: 'absolute',
    top: 50,
    left: 25,
    zIndex: 10,
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
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
  },
});
