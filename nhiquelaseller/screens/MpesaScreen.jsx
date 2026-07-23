import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { selectBasketItems, selectBasketTotal, selectTotalToPay } from '../features/basketSlice';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import { showMessage } from "react-native-flash-message";
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const validationSchema = Yup.object().shape({
  customerNumber: Yup.string()
    .min(9, 'O número deve ter 9 dígitos')
    .max(9, 'O número deve ter 9 dígitos')
    .required('O número é obrigatório'),
});

const MpesaScreen = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const totalToPay = useSelector(selectTotalToPay);
  const itemsPrice = useSelector(selectBasketTotal);
  const items = useSelector(selectBasketItems);
  const amount = parseInt(totalToPay || 0);

  const navigation = useNavigation();

  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');

      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
        } else {
          navigation.navigate('Login');
        }
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      navigation.navigate('Login');
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    checkIfUserExist();
  }, []);

  const makeThePayment = async (values) => {
    try {
      setLoading(true);

      const { data } = await api.post(`/payments/mpesa`, { 
        customerNumber: values.customerNumber, 
        amount 
      }, {
        headers: { authorization: `Bearer ${userData.token}` },
      });

      if (data.paid) {
        await api.post('/orders', {
          orderItems: items,
          address: '',
          paymentMethod: 'Mpesa',
          itemsPrice: itemsPrice,
          ivaTax: 0,
          siteTax: 0,
          taxPrice: 0,
          totalPrice: amount,
          addressPrice: 150,
          isPaid: true,
          paidAt: Date.now(),
          stepStatus: 1
        }, {
          headers: { authorization: `Bearer ${userData.token}` },
        });

        setLoading(false);
        navigation.replace('SuccessPayment');
      } else {
        await api.post('/orders', {
          orderItems: items,
          address: '',
          paymentMethod: 'Mpesa',
          itemsPrice: itemsPrice,
          ivaTax: itemsPrice * 0.16,
          siteTax: 45,
          taxPrice: 40,
          totalPrice: amount,
          addressPrice: 150,
          isPaid: false,
          paidAt: Date.now(),
          stepStatus: 1
        }, {
          headers: { authorization: `Bearer ${userData.token}` },
        });

        setLoading(false);
        showMessage({
          message: 'Falha no pagamento',
          description: 'O pagamento não foi processado com sucesso.',
          type: 'danger'
        });
      }
    } catch (error) {
      setLoading(false);
      const errorMessage = error.response?.data?.message || 'Erro ao processar o pagamento.';
      showMessage({
        message: 'Erro',
        description: errorMessage,
        type: 'danger'
      });
    }
  };

  if (authChecking) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento M-Pesa</Text>
        <View style={{ width: 38 }} />
      </View>

      <Formik
        initialValues={{ customerNumber: '' }}
        validationSchema={validationSchema}
        onSubmit={(values) => makeThePayment(values)}
      >
        {({ handleChange, handleBlur, touched, handleSubmit, values, errors, isValid }) => (
          <View style={styles.content}>
            <View style={styles.card}>
              <Image source={require('../assets/Mpesa.png')} style={styles.cover} resizeMode="contain" />
              
              <Text style={styles.amountLabel}>Total a Pagar</Text>
              <Text style={styles.amountValue}>{amount} MT</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  <MaterialCommunityIcons name="cellphone" size={16} color={COLORS.textMuted} /> Número de telefone:
                </Text>
                <View style={[styles.inputWrapper, (touched.customerNumber && errors.customerNumber) && styles.inputError]}>
                  <Text style={styles.prefix}>+258</Text>
                  <TextInput
                    style={styles.input}
                    value={values.customerNumber}
                    onChangeText={handleChange('customerNumber')}
                    onBlur={handleBlur('customerNumber')}
                    placeholder="Ex: 841234567"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    maxLength={9}
                  />
                </View>
                {touched.customerNumber && errors.customerNumber && (
                  <Text style={styles.errorText}>{errors.customerNumber}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.payBtn, (!isValid || loading) && styles.payBtnDisabled]}
              onPress={handleSubmit}
              disabled={!isValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="cellphone-nfc" size={24} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.payBtnText}>Confirmar Pagamento</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Formik>
    </SafeAreaView>
  );
};

export default MpesaScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  cover: {
    width: 200,
    height: 120,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    color: COLORS.primaryLight,
    marginVertical: 10,
  },
  inputContainer: {
    width: '100%',
    marginTop: 20,
  },
  inputLabel: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    height: 56,
    paddingHorizontal: 16,
  },
  prefix: {
    fontSize: SIZES.base,
    color: COLORS.text,
    fontWeight: '700',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: SIZES.base,
    color: COLORS.text,
    fontWeight: '600',
    height: '100%',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.xs,
    marginTop: 6,
    marginLeft: 4,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: RADIUS.md,
    marginBottom: 20,
    ...SHADOWS.md,
  },
  payBtnDisabled: {
    backgroundColor: COLORS.primaryGlow,
    opacity: 0.8,
  },
  payBtnText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
  }
});