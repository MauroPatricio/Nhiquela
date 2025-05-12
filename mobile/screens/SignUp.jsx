import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackBtn from '../components/BackBtn';
import Button from '../components/Button';
import { Formik } from 'formik';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import {registerNotification} from '../hooks/createConnectionApi';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';

const validationSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .min(9, 'O número de telefone não pode ser inferior a 9 dígitos')
    .max(9, 'O número de telefone não pode ser superior a 9 dígitos')
    .required('Obrigatório'),
  password: Yup.string()
    .min(6, 'A senha deve conter 6 dígitos')
    .required('Obrigatório'),
  email: Yup.string()
    .email('Email inválido')
    .required('Obrigatório'),
  name: Yup.string()
    .required('Obrigatório'),
});

const SignUp = ({ navigation }) => {
  const [loader, setLoader] = useState(false);
  const [hideText, setHideText] = useState(true);


  const submitRegistration = async (values) => {
    setLoader(true);
    try {
      const response = await api.post('/users/signup', values);
      if (response.status === 200) {

        // registerIndieID('put your unique user ID here as a string', 23641, 'P1NYLd6lOOHkdLzDZK0kV3');



      //   const response = await registerNotification({
      //     nickname: response.data.name,
      //     email: response.data.email,
      //     password: response.data.password,
      //     passwordConfirm: response.data.password,
      //   });
      
      // const fcm = await deviceStorage.loadItem('FCMToken');
      
      // await register({
      //     tokenID: fcm,
      //     user: response?.data?.data?.user._id,
      // });

        navigation.navigate('Login');
      }
    } catch (error) {
      Alert.alert(error.response.data.message);
    } finally {
      setLoader(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: 'white' }}>
      <SafeAreaView style={{ marginHorizontal: 10 }}>
        <View>
          <BackBtn onPress={() => navigation.goBack()} />
          <Image source={require('../assets/visacasa2.png')} style={styles.cover} />
          <Text style={styles.title}>NOVO REGISTO</Text>

          <Formik
            initialValues={{ phoneNumber: '', password: '', name: '', email: '' }}
            validationSchema={validationSchema}
            onSubmit={(values) => submitRegistration(values)}
          >
            {({ handleChange, handleBlur, touched, handleSubmit, values, errors, isValid, setFieldTouched }) => (
              <View>
                <View style={styles.wrapper}>
                  <Text style={styles.label}>Nome e apelido</Text>
                  <View style={styles.inputWrapper(touched.name ? '#E85A4F' : '#ccc')}>
                    <MaterialCommunityIcons name="face-man" size={20} color="grey" style={styles.iconStyle} />
                    <TextInput
                      placeholder="Nome e apelido"
                      onFocus={() => setFieldTouched('name')}
                      style={styles.input}
                      value={values.name}
                      onChangeText={handleChange('name')}
                    />
                  </View>
                  {touched.name && errors.name && <Text style={styles.errorMessage}>{errors.name}</Text>}
                </View>

                <View style={styles.wrapper}>
                  <Text style={styles.label}>Número de telefone</Text>
                  <View style={styles.inputWrapper(touched.phoneNumber ? '#E85A4F' : '#ccc')}>
                    <MaterialCommunityIcons name="phone" size={20} color="grey" style={styles.iconStyle} />
                    <TextInput
                      placeholder="Insira o número de telefone"
                      onFocus={() => setFieldTouched('phoneNumber')}
                      style={styles.input}
                      value={values.phoneNumber}
                      onChangeText={handleChange('phoneNumber')}
                      maxLength={9}
                    />
                  </View>
                  {touched.phoneNumber && errors.phoneNumber && <Text style={styles.errorMessage}>{errors.phoneNumber}</Text>}
                </View>

                <View style={styles.wrapper}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrapper(touched.email ? '#E85A4F' : '#ccc')}>
                    <MaterialCommunityIcons name="email" size={20} color="grey" style={styles.iconStyle} />
                    <TextInput
                      placeholder="Seu email"
                      onFocus={() => setFieldTouched('email')}
                      style={styles.input}
                      value={values.email}
                      onChangeText={handleChange('email')}
                    />
                  </View>
                  {touched.email && errors.email && <Text style={styles.errorMessage}>{errors.email}</Text>}
                </View>

                <View style={styles.wrapper}>
                  <Text style={styles.label}>Senha</Text>
                  <View style={styles.inputWrapper(touched.password ? '#E85A4F' : '#ccc')}>
                    <MaterialCommunityIcons name="lock" size={20} color="grey" style={styles.iconStyle} />
                    <TextInput
                      placeholder="Sua senha"
                      secureTextEntry={hideText}
                      onFocus={() => setFieldTouched('password')}
                      style={styles.input}
                      value={values.password}
                      onChangeText={handleChange('password')}
                    />
                    <TouchableOpacity onPress={() => setHideText(!hideText)}>
                      <MaterialCommunityIcons name={hideText ? 'eye-outline' : 'eye-off-outline'} size={20} />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && <Text style={styles.errorMessage}>{errors.password}</Text>}
                </View>

                <Button title="Registar" onPress={handleSubmit} isValid={isValid ? '#E85A4F' : 'red'} loader={loader} />
              </View>
            )}
          </Formik>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  cover: {
    height: 200,
    width: '100%',
    resizeMode: 'contain',
    marginBottom: 20,
    backgroundColor: 'white',
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 7,
    color: '#333',
  },
  wrapper: {
    // marginBottom: 5,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#E85A4F',
  },
  inputWrapper: (borderColor) => ({
    borderColor: borderColor,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  }),
  input: {
    flex: 1,
    color: '#333',
  },
  iconStyle: {
    marginRight: 10,
  },
  errorMessage: {
    color: 'red',
    marginTop: 5,
    marginLeft: 5,
    fontSize: 12,
  },
});
