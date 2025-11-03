import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
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

// ✅ Validação Yup
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
  const [hideText, setHideText] = useState(true);

  const login = async (values) => {
    try {
      setLoader(true);
      const response = await api.post('/users/signin', values);
      if (response.status === 200) {
        const userData = response.data;
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('id', userData._id);
        registerDeviceToken(userData);

        navigation.reset({
          index: 0,
          routes: [{ name: 'BottomNavigation' }],
        });
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={{ backgroundColor: 'white' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            <View style={styles.inner}>
              <BackBtn onPress={() => navigation.navigate('BottomNavigation')} />

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
                {({
                  handleChange,
                  handleBlur,
                  touched,
                  handleSubmit,
                  values,
                  errors,
                  isValid,
                }) => (
                  <View style={{ width: '100%' }}>
                    {/* Telefone */}
                    <View style={styles.wrapper}>
                      <Text style={styles.label}>Número de telefone</Text>
                      <View
                        style={styles.inputWrapper(
                          touched.phoneNumber && errors.phoneNumber ? 'red' : '#7F00FF'
                        )}
                      >
                        <MaterialCommunityIcons
                          name="phone"
                          size={20}
                          color="grey"
                          style={styles.iconStyle}
                        />
                        <TextInput
                          placeholder="Insira o número de telefone"
                          keyboardType="phone-pad"
                          style={{ flex: 1 }}
                          value={values.phoneNumber}
                          onChangeText={(t) => handleChange('phoneNumber')(t.trim())}
                          onBlur={handleBlur('phoneNumber')}
                          returnKeyType="next"
                        />
                      </View>
                      {touched.phoneNumber && errors.phoneNumber && (
                        <Text style={styles.errorMessage}>{errors.phoneNumber}</Text>
                      )}
                    </View>

                    {/* Senha */}
                    <View style={styles.wrapper}>
                      <Text style={styles.label}>Senha</Text>
                      <View
                        style={styles.inputWrapper(
                          touched.password && errors.password ? 'red' : '#7F00FF'
                        )}
                      >
                        <MaterialCommunityIcons
                          name="lock"
                          size={20}
                          color="grey"
                          style={styles.iconStyle}
                        />
                        <TextInput
                          placeholder="Insira a senha"
                          secureTextEntry={hideText}
                          style={{ flex: 1 }}
                          value={values.password}
                          onChangeText={(t) => handleChange('password')(t.trim())}
                          onBlur={handleBlur('password')}
                          returnKeyType="done"
                        />
                        <TouchableOpacity onPress={() => setHideText(!hideText)}>
                          <MaterialCommunityIcons
                            name={hideText ? 'eye-outline' : 'eye-off-outline'}
                            size={20}
                            color="grey"
                          />
                        </TouchableOpacity>
                      </View>
                      {touched.password && errors.password && (
                        <Text style={styles.errorMessage}>{errors.password}</Text>
                      )}
                    </View>

                    {/* Botões */}
                    <View>
                      <Button
                        loader={loader}
                        title="Entrar"
                        onPress={isValid ? handleSubmit : null}
                        isValid={isValid}
                      />
                      <Text
                        style={styles.registration}
                        onPress={() => navigation.replace('SignUp')}
                      >
                        Registrar
                      </Text>
                    </View>
                  </View>
                )}
              </Formik>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginPage;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  inner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  cover: {
    height: 200,
    width: 320,
    resizeMode: 'contain',
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
  wrapper: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#7F00FF',
  },
  inputWrapper: (borderColor) => ({
    borderColor,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    height: 55,
    borderRadius: 12,
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'center',
    elevation: 2,
  }),
  iconStyle: {
    marginRight: 10,
  },
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
});
