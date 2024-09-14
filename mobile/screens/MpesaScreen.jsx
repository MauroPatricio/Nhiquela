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
import { selectBasketItems, selectBasketTotal, selectTotalToPay } from '../features/basketSlice';

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
  const amount = parseInt(totalToPay);
  const navigation = useNavigation();
  const items = useSelector(selectBasketItems);
  const itemsPrice = useSelector(selectBasketTotal);

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
    try {
      setLoader(true);
      // payment logic here
      setLoader(false);
      navigation.replace('SuccessPayment');
    } catch (error) {
      setLoader(false);
      console.log(error);
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
