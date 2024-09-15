import { StyleSheet, Text, TextInput, View , Image, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import api from '../hooks/createConnectionApi';
import { selectBasketItems, selectBasketTotal, selectTotalToPay, selectIva, selectDeliverPrice} from '../features/basketSlice';
import Toast from 'react-native-toast-message';


const validationSchema = Yup.object().shape({
  customerNumber: Yup.string()
    .min(9, 'O número de telefone não pode ser inferior a 9 dígitos')
    .max(9, 'O número de telefone não pode ser superior a 9 dígitos')
    .required('Obrigatório'),
});

const MpesaScreen = () => {
  const [userData, setUserData] = useState(null);
  const [loader, setLoader] = useState(false);
  const totalToPay = useSelector(selectTotalToPay);
  const amount = parseFloat(totalToPay);
  const navigation = useNavigation();
  const items = useSelector(selectBasketItems);
  const itemsPrice = useSelector(selectBasketTotal);
  const iva = useSelector(selectIva);
  const deliveryPrice  = useSelector(selectDeliverPrice);

  const [paymentInfo, setPaymentInfo] = useState('');


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
        text1: 'Por favor, faça o login',
        position: 'top',
        visibilityTime: 4000, // Time for how long the toast will show
        autoHide: true,
        topOffset: 30,
        bottomOffset: 40,
        style: {
            
        backgroundColor: '#4CAF50', // Green background for success
        borderLeftWidth: 10,
        borderLeftColor: '#00C851', // Left border accent for success
        },
        text1Style: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black', // Text color
        
        },
      });
      

      return;
    }
    try {
      setLoader(true);

      
      const customerNumber = '258'+values.customerNumber;
      
      // const { data } = await api.post(`payments/mpesa`, {customerNumber, amount},  {
      //   headers: {
      //     authorization: `Bearer ${userData.token}`,
      //   },
      // });

      
      
      // setPaymentInfo(data)
      // if (true){
        // console.log('Passei daqui+')

        // colocar os dados da ordem para gravar
        // const order = await api.post(
        //   'orders',
        //   {
        //     orderItems: items,
        //     address: 'Proximo a entrada versalhes',
        //     paymentMethod: 'Mpesa',
        //     itemsPrice: itemsPrice,
        //     ivaTax: iva,
        //     siteTax: 0,
        //     taxPrice: 0,
        //     totalPrice: itemsPrice + deliveryPrice,
        //     addressPrice: deliveryPrice,
        //     itemsPriceForSeller: itemsPrice,
        //     isPaid: true,
        //     paidAt: Date.now(),
        //     stepStatus: 1
        //   },
        //   {
        //     headers: {
        //       authorization: `Bearer ${userData.token}`,
        //     },
        //   }
        // );

      // const orderData =  {
      //     "address": "Proximo a entrada Versalhes",
      //     "addressPrice": 50,
      //     "deliveryPrice": 50,
      //     "isPaid": true,
      //     "itemsPrice": 200,
      //     "itemsPriceForSeller": 200,
      //     "ivaTax": 20,
      //     "orderItems": [{
      //       "_id": "65af72640b324e9d45df28ca",
      //       "address": "",
      //       "countInStock": 5,
      //       "description": "N/A",
      //       "image": "https://res.cloudinary.com/dajwznqco/image/upload/v1705995980/fqvnnvlbiezubu0m8z8k.jpg",
      //       "name": "Salgados",
      //       "price": 275,
      //       "seller": "65aa4c8b1548a8f7f11b54f0",
      //       "sellerName": "Confeitaria"
      //     }],
      //     "paidAt": "2024-09-15T00:24:15.080Z",
      //     "paymentMethod": "Mpesa",
      //     "siteTax": 5,
      //     "stepStatus": 1,
      //     "taxPrice": 10,
      //     "totalPrice": 260
      //   }

        const orderData = {
          orderItems: items,  // Lista de itens do pedido
          address: 'Proximo a entrada Versalhes',  // Endereço de entrega
          paymentMethod: 'Mpesa',  // Método de pagamento
          itemsPrice: 200,  // Preço total dos itens (soma dos preços dos produtos)
          deliveryPrice: 50,  // Preço de entrega
          taxPrice: 10,  // Taxas adicionais (impostos)
          totalPrice: 260,  // Preço total do pedido (itens + entrega + taxas)
          ivaTax: 20,  // Imposto IVA (se aplicável)
          siteTax: 5,  // Taxa do site (se houver)
          addressPrice: 50,  // Preço do endereço/entrega (pode ser o mesmo que deliveryPrice)
          itemsPriceForSeller: 200,  // Preço dos itens para o vendedor (sem taxas)
          isPaid: true,  // Pedido pago ou não
          paidAt: new Date(),  // Data e hora do pagamento
          stepStatus: 1,  // Status inicial do pedido
        };
      

        console.log(orderData)


        try {
          const response = await api.post('orders', orderData, {
            headers: {
              authorization: `Bearer ${userData.token}`,  // Token de autenticação
            },
          });
      
          console.log('Pedido criado com sucesso:', response.data);
        } catch (error) {
          console.error('Erro ao criar pedido:', error);
        }


      // payment logic here
      setLoader(false);
      navigation.replace('SuccessPayment');
    } catch (error) {
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

              <Button loader={loader} title="Pagar" onPress={handleSubmit} isValid={isValid ? '#7F00FF' : 'red'} />
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
    paddingTop:100
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
