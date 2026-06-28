import React, { useState, useReducer } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackBtn from '../components/BackBtn';
import Button from '../components/Button';
import { Formik } from 'formik';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Yup from 'yup';
import api from '../hooks/createConnectionApi';
import { useToast } from 'react-native-toast-notifications';

// --- Validação ---
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

// --- Reducer para loading e erro ---
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
  const toast = useToast();

  const submitRegistration = async (values) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await api.post('/users/signup', values);

      if (response.status === 200) {
        toast.show('Número registrado com sucesso!', {
          type: 'success',
          placement: 'top',
          duration: 4000,
          animationType: 'slide-in',
        });

        navigation.replace('Login');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao cadastrar';

      toast.show(errorMessage, {
        type: 'danger',
        placement: 'top',
        duration: 4000,
        animationType: 'slide-in',
      });

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'white' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView>
          <View>
            <BackBtn onPress={() => navigation.replace('Login')} />

            <Image source={require('../assets/nhiquela2.png')} style={styles.cover} />

            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>Junte-se a nós e comece a enviar hoje mesmo.</Text>

            <Formik
              initialValues={{ phoneNumber: '', password: '', name: '', email: '' }}
              validationSchema={validationSchema}
              onSubmit={(values) => submitRegistration(values)}
            >
              {({ handleChange, handleBlur, touched, handleSubmit, values, errors, isValid, setFieldTouched }) => (
                <View>

                  {/* Nome */}
                  <View style={styles.wrapper}>
                    <Text style={styles.label}>Nome e apelido</Text>
                    <View style={styles.inputWrapper(touched.name ? '#7F00FF' : '#ccc')}>
                      <MaterialCommunityIcons name="face-man" size={20} color={touched.name ? '#7F00FF' : '#9CA3AF'} style={styles.iconStyle} />
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

                  {/* Telefone */}
                  <View style={styles.wrapper}>
                    <Text style={styles.label}>Número de telefone</Text>
                    <View style={styles.inputWrapper(touched.phoneNumber ? '#7F00FF' : '#ccc')}>
                      <MaterialCommunityIcons name="phone" size={20} color={touched.phoneNumber ? '#7F00FF' : '#9CA3AF'} style={styles.iconStyle} />
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

                  {/* Email */}
                  <View style={styles.wrapper}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper(touched.email ? '#7F00FF' : '#ccc')}>
                      <MaterialCommunityIcons name="email" size={20} color={touched.email ? '#7F00FF' : '#9CA3AF'} style={styles.iconStyle} />
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

                  {/* Senha */}
                  <View style={styles.wrapper}>
                    <Text style={styles.label}>Senha</Text>
                    <View style={styles.inputWrapper(touched.password ? '#7F00FF' : '#ccc')}>
                      <MaterialCommunityIcons name="lock" size={20} color={touched.password ? '#7F00FF' : '#9CA3AF'} style={styles.iconStyle} />
                      <TextInput
                        placeholder="Sua senha"
                        secureTextEntry={hideText}
                        onFocus={() => setFieldTouched('password')}
                        style={styles.input}
                        value={values.password}
                        onChangeText={handleChange('password')}
                      />
                      <TouchableOpacity onPress={() => setHideText(!hideText)} style={styles.eyeButton}>
                        <MaterialCommunityIcons name={hideText ? 'eye-outline' : 'eye-off-outline'} size={22} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {touched.password && errors.password && <Text style={styles.errorMessage}>{errors.password}</Text>}
                  </View>

                  {/* Botão */}
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
    </KeyboardAvoidingView>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  cover: {
    height: 140,
    width: '100%',
    resizeMode: 'contain',
    marginBottom: 5,
    backgroundColor: 'white',
    marginTop: -20,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 28,
    marginBottom: 8,
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 25,
    lineHeight: 22,
  },
  wrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#4B5563',
    fontWeight: '600',
  },
  inputWrapper: (borderColor) => ({
    borderColor: borderColor === '#ccc' ? '#E5E7EB' : borderColor,
    backgroundColor: borderColor === '#ccc' ? '#F9FAFB' : '#F3E8FF',
    borderWidth: 1.5,
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
  }),
  input: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '500',
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
