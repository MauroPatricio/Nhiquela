import React, { useState, useReducer } from 'react';
import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackBtn from '../components/BackBtn';
import Button from '../components/Button';
import { Formik } from 'formik';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import Toast from 'react-native-toast-message';


const validationSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required('O nome não deve estar vazio'),

  phoneNumber: Yup.string()
    .trim()
    .required('O número de telefone é obrigatório')
    .matches(
      /^(82|83|84|85|86|87)\d{7}$/,
      'Número inválido. Deve conter 9 dígitos e começar por 8x'
    ),

  email: Yup.string()
    .trim()
    .email('Email inválido')
    .required('O email é obrigatório'),

  password: Yup.string()
    .trim()
    .min(6, 'A senha deve conter pelo menos 6 dígitos')
    .required('A senha é obrigatória'),
});
  

const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

const SignUp = ({ navigation }) => {
  const [hideText, setHideText] = useState(true);
  const [state, dispatch] = useReducer(formReducer, { loading: false, error: null });

  const submitRegistration = async (values) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await api.post('/users/signup', values);
      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: 'Número registrado com sucesso!',
          text1Style: { color: 'green', fontSize: 16 }
        });
        navigation.navigate('Login');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Erro ao cadastrar' });
      Toast.show({
        type: 'error',
        text1: 'Erro ao cadastrar',
        text2: error.response?.data?.message || 'Tente novamente mais tarde.',
        text2Style: { color: 'red', fontSize: 16 }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <ScrollView style={{ backgroundColor: 'white' }}>
      <SafeAreaView style={{ marginHorizontal: 10 }}>
        <View>
          <BackBtn onPress={() => navigation.goBack()} />
          <Image source={require('../assets/nhiquela2.png')} style={styles.cover} />
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
                  <View style={styles.inputWrapper(touched.name ? '#7F00FF' : '#ccc')}>
                    <MaterialCommunityIcons name="face-man" size={20} color="black" style={styles.iconStyle} />
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
                  <View style={styles.inputWrapper(touched.phoneNumber ? '#7F00FF' : '#ccc')}>
                    <MaterialCommunityIcons name="phone" size={20} color="black" style={styles.iconStyle} />
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
                  <View style={styles.inputWrapper(touched.email ? '#7F00FF' : '#ccc')}>
                    <MaterialCommunityIcons name="email" size={20} color="black" style={styles.iconStyle} />
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
                  <View style={styles.inputWrapper(touched.password ? '#7F00FF' : '#ccc')}>
                    <MaterialCommunityIcons name="lock" size={20} color="black" style={styles.iconStyle} />
                    <TextInput
                      placeholder="Sua senha"
                      secureTextEntry={hideText}
                      onFocus={() => setFieldTouched('password')}
                      style={styles.input}
                      value={values.password}
                      onChangeText={handleChange('password')}
                    />
                    <TouchableOpacity onPress={() => setHideText(!hideText)} style={styles.eyeButton}>
                      <MaterialCommunityIcons name={hideText ? 'eye-outline' : 'eye-off-outline'} size={22} color="black" />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && <Text style={styles.errorMessage}>{errors.password}</Text>}
                </View>

                <Button
                  title="Registar"
                  onPress={handleSubmit}
                  isValid={isValid ? '#7F00FF' : 'red'}
                  loader={state.loading}
                  disabled={state.loading || !isValid}
                />
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
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#7F00FF',
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
  eyeButton: {
    padding: 5,
  },
});