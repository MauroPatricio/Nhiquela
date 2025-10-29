import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackBtn from '../components/BackBtn';
import Button from '../components/Button';
import { Formik } from 'formik';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import registerDeviceToken from '../utils/registerDeviceToken';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAvoidingView } from 'react-native';

const validationSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .min(9, 'O número de telefone não pode ser inferior a 9 dígitos')
    .max(9, 'O número de telefone não pode ser superior a 9 dígitos')
    .required('Obrigatório'),
  password: Yup.string()
    .min(6, 'A senha deve conter 6 dígitos')
    .required('Obrigatório'),
});

const LoginPage = () => {
      const navigation = useNavigation();

  const [loader, setLoader] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [hideText, setHideText] = useState(true); // Esconde senha por padrão

  const login = async (values) => {
    try {
      setLoader(true);
      const response = await api.post('/users/signin', values);

      if (response.status === 200) {
        const userData = response.data;

        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('id', userData._id);

        
        setResponseData(userData);
        
        
        navigation.reset({
            index: 0,
            routes: [{ name: 'BottomNavigation' }],
          });

       registerDeviceToken(userData);
      }
    } catch (error) {
      console.log('Erro no login:', error);
      Alert.alert(
        'Erro no login',
        error?.response?.data?.message || 'Erro inesperado. Verifique sua conexão ou tente novamente.'
      );
    } finally {
      setLoader(false);
    }
  };

  return (

<ScrollView 
  style={{ backgroundColor: 'white' }}
  contentContainerStyle={{ flexGrow: 1 }}
  keyboardShouldPersistTaps="handled"
>      
<SafeAreaView style={{ marginHorizontal: 20 }}>
        <View>
          <BackBtn
            onPress={() =>
              navigation.navigate('BottomNavigation')            }
          />          
          <Image
            source={require('../assets/nhiquela2.png')}
            style={styles.cover}
          />
          <Text style={styles.title}>Login</Text>

          <Formik
            initialValues={{ phoneNumber: '', password: '' }}
            validationSchema={validationSchema}
            onSubmit={(values) => login(values)}
          >
            {({ handleChange, handleBlur, touched, handleSubmit, values, errors, isValid }) => (
              <View>
                {/* Campo telefone */}
                <View style={styles.wrapper}>
                  <Text style={styles.label}>Número de telefone</Text>
                  <View style={styles.inputWrapper(touched.phoneNumber && errors.phoneNumber ? 'red' : '#7F00FF')}>
                    <MaterialCommunityIcons name="phone" size={20} color="grey" style={styles.iconStyle} />
                    <TextInput
                      placeholder="Insira o número de telefone"
                      keyboardType="phone-pad"
                      style={{ flex: 1 }}
                      value={values.phoneNumber}
                      onChangeText={handleChange('phoneNumber')}
                      onBlur={handleBlur('phoneNumber')}
                    />
                  </View>
                  {touched.phoneNumber && errors.phoneNumber && (
                    <Text style={styles.errorMessage}>{errors.phoneNumber}</Text>
                  )}
                </View>

                {/* Campo senha */}
                <View style={styles.wrapper}>
                  <Text style={styles.label}>Senha</Text>
                  <View style={styles.inputWrapper(touched.password && errors.password ? 'red' : '#7F00FF')}>
                    <MaterialCommunityIcons name="lock" size={20} color="grey" style={styles.iconStyle} />
                    <TextInput
                      placeholder="Insira a senha"
                      secureTextEntry={hideText}
                      style={{ flex: 1 }}
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                    />
                    <TouchableOpacity onPress={() => setHideText(!hideText)}>
                      <MaterialCommunityIcons name={hideText ? 'eye-outline' : 'eye-off-outline'} size={20} />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && (
                    <Text style={styles.errorMessage}>{errors.password}</Text>
                  )}
                </View>

                {/* Botão login e registrar */}
                <View>
                  <Button
                    loader={loader}
                    title="Entrar"
                    onPress={isValid ? handleSubmit : null}
                    isValid={isValid ? '#7F00FF' : 'red'}
                  />
                  <Text style={styles.registration} onPress={() => navigation.replace('SignUp')}>
                    Registrar
                  </Text>
                </View>
              </View>
            )}
          </Formik>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default LoginPage;

const styles = StyleSheet.create({
  cover: {
    height: 200,
    width: 320,
    resizeMode: 'contain',
    backgroundColor: 'white',
    alignSelf: 'center',
    marginVertical: 30,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 22,
    marginBottom: 25,
    color: '#4A4A4A',
    letterSpacing: 1,
  },
  wrapper: {},
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    marginEnd: 2,
    color: '#7F00FF',
  },
  inputWrapper: (borderColor) => ({
    borderColor: borderColor,
    backgroundColor: '#F8F8F8',
    borderWidth: 0.5,
    height: 55,
    borderRadius: 12,
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'center',
    shadowColor: '#7F00FF',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  }),
  errorMessage: {
    color: 'red',
    marginTop: 5,
    marginLeft: 6,
    fontSize: 12,
  },
  registration: {
    marginTop: 25,
    textAlign: 'center',
    fontWeight: '500',
    borderColor: '#7F00FF',
    borderWidth: 1.5,
    height: 50,
    borderRadius: 12,
    color: '#7F00FF',
    paddingVertical: 10,
    fontSize: 16,
  },
  iconStyle: {
    marginRight: 10,
  },
});
