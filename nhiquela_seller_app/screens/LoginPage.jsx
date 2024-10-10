import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackBtn from '../components/BackBtn';
import Button from '../components/Button';
import { Formik } from 'formik';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const validationSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .min(9, 'O número de telefone não pode ser inferior a 9 dígitos')
    .max(9, 'O número de telefone não pode ser superior a 9 dígitos')
    .required('Obrigatório'),
  password: Yup.string()
    .min(6, 'A senha deve conter 6 dígitos')
    .required('Obrigatório'),
});

const LoginPage = ({ navigation }) => {
  const [loader, setLoader] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [hideText, setHideText] = useState(false);

  const login = async (values) => {
    setLoader(true);
    try {
      const data = values;
      const response = await api.post('/users/signin', data);

      if (response.status === 200) {
        setLoader(false);
        setResponseData(response.data);
        await AsyncStorage.setItem(`user${response.data._id}`, JSON.stringify(response.data));
        await AsyncStorage.setItem('id', JSON.stringify(response.data._id));
        navigation.replace('Bottom Navigation');
      }
    } catch (error) {
      Alert.alert('Informe o número de telefone ou a senha correcta');
    } finally {
      setLoader(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: 'white' }}>
      <SafeAreaView style={{ marginHorizontal: 20 }}>
        <View>
          <BackBtn onPress={() => navigation.goBack()} />
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
                <View style={styles.wrapper}>
                  <Text style={styles.label}>Número de telefone</Text>
                  <View style={styles.inputWrapper(errors.phoneNumber && touched.phoneNumber ? 'red' : '#7F00FF')}>
                    <MaterialCommunityIcons
                      name="phone"
                      size={20}
                      color="grey"
                      style={styles.iconStyle}
                    />
                    <TextInput
                      placeholder="Insira o número de telefone"
                      autoCapitalize="none"
                      autoCorrect={false}
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

                <View style={styles.wrapper}>
                  <Text style={styles.label}>Senha</Text>
                  <View style={styles.inputWrapper(errors.password && touched.password ? 'red' : '#7F00FF')}>
                    <MaterialCommunityIcons
                      name="lock"
                      size={20}
                      color="grey"
                      style={styles.iconStyle}
                    />
                    <TextInput
                      placeholder="Insira a senha"
                      secureTextEntry={hideText}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1 }}
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                    />
                    <TouchableOpacity onPress={() => { setHideText(!hideText); }}>
                      <MaterialCommunityIcons
                        name={hideText ? 'eye-outline' : 'eye-off-outline'}
                        size={18}
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && (
                    <Text style={styles.errorMessage}>{errors.password}</Text>
                  )}
                </View>

                <View>
                  <Button loader={loader} title="Entrar" onPress={isValid ? handleSubmit : null} isValid={isValid ? '#7F00FF' : 'red'} />
                  <Text style={styles.registration} onPress={() => navigation.navigate('SignUp')}>Registrar</Text>
                </View>
              </View>
            )}
          </Formik>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default LoginPage

const styles = StyleSheet.create({
    cover: {
      height: 200,
      width: 320,
      resizeMode: "contain",
      marginBottom: 0,
      backgroundColor: 'white',
      alignSelf: 'center',
      marginVertical: 30,
    },
    title: {
      fontWeight: "600",
      textAlign: "center",
      fontSize: 22,
      marginBottom: 25,
      color: '#4A4A4A',
      letterSpacing: 1,
    },
    wrapper: {
    //   marginBottom: 20,
    },
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
      textAlign: "center",
      fontWeight: "500",
      borderColor: '#7F00FF',
      borderWidth: 1.5,
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      color: '#7F00FF',
      paddingVertical: 10,
      fontSize: 16,
    },
    iconStyle: {
      marginRight: 10,
    },
    loginButton: {
      backgroundColor: '#7F00FF',
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
    },
    loginButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    forgotPasswordText: {
      textAlign: 'center',
      color: '#4A4A4A',
      marginTop: 10,
      fontSize: 14,
    },
  });
  