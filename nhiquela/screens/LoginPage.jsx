import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useNavigation } from '@react-navigation/native';
import registerDeviceToken from '../utils/registerDeviceToken';
import BackBtn from '../components/BackBtn'; // Corrigido import default
import { useToast } from 'react-native-toast-notifications';


export default function LoginPage() {
  const navigation = useNavigation();
      const toast = useToast(); // ← inicializa o toast
  

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hideText, setHideText] = useState(true);
  const [errors, setErrors] = useState({ phoneNumber: '', password: '' });

  const handleLogin = async () => {
    let valid = true;
    const newErrors = { phoneNumber: '', password: '' };

    // Valida telefone
    if (!phoneNumber) {
      newErrors.phoneNumber = 'Preencha o telefone';
      valid = false;
    } else if (!/^\d{9}$/.test(phoneNumber)) {
      newErrors.phoneNumber = 'O telefone deve ter exatamente 9 dígitos';
      valid = false;
    }

    // Valida senha
    if (!password) {
      newErrors.password = 'Preencha a senha';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'A senha deve ter no mínimo 6 caracteres';
      valid = false;
    }

    setErrors(newErrors);
    if (!valid) return;

    setLoading(true);
    try {
      const response = await api.post('/users/signin', { phoneNumber, password });
      if (response.data) {
        const userData = response.data;

        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('id', userData._id);
        registerDeviceToken(userData);

        // ✅ Toast chamado apenas em função, não em JSX
     
        navigation.reset({
          index: 0,
          routes: [{ name: 'BottomNavigation' }],
        });
      }
    } catch (err) {

      console.log(err.response?.data?.message)

         const errorMessage = err.response?.data?.message || 'Erro ao cadastrar';
    
    toast.show(errorMessage, {
      type: 'danger',
      placement: 'top',
      duration: 4000,
      animationType: 'slide-in',
    });

    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContainer}>
            <BackBtn onPress={() => navigation.navigate('BottomNavigation')} />

            <Image
              source={require('../assets/nhiquela2.png')}
              style={styles.cover}
            />
            <Text style={styles.title}>Bem-vindo à Nhiquela</Text>
            <Text style={styles.subtitle}>Faça login para continuar</Text>

            {/* Telefone */}
            <View style={styles.wrapper}>
              <Text style={styles.label}>Telefone</Text>
              <View style={styles.inputWrapper(errors.phoneNumber ? 'red' : '#7F00FF')}>
                <Ionicons name="phone-portrait" size={20} color="grey" style={styles.iconStyle} />
                <TextInput
                  placeholder="Insira o telefone"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={phoneNumber}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  onChangeText={text => { setPhoneNumber(text); setErrors({...errors, phoneNumber: ''}); }}
                />
              </View>
              {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
            </View>

            {/* Senha */}
            <View style={styles.wrapper}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputWrapper(errors.password ? 'red' : '#7F00FF')}>
                <Ionicons name="lock-closed-outline" size={20} color="grey" style={styles.iconStyle} />
                <TextInput
                  placeholder="Insira a senha"
                  placeholderTextColor="#999"
                  secureTextEntry={hideText}
                  style={styles.input}
                  value={password}
                  onChangeText={text => { setPassword(text); setErrors({...errors, password: ''}); }}
                />
                <TouchableOpacity onPress={() => setHideText(!hideText)}>
                  <Ionicons
                    name={hideText ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="grey"
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Botão Login */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginText}>Entrar</Text>
              )}
            </TouchableOpacity>

            {/* Registrar */}
            <TouchableOpacity
              onPress={() => navigation.navigate('SignUp')}
              style={{ marginTop: 15 }}
            >
              <Text style={styles.registerText}>
                Não tens conta? <Text style={styles.link}>Criar conta</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  innerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  cover: {
    height: 150,
    width: 320,
    resizeMode: 'contain',
    marginVertical: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A4A4A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    marginTop: 5,
    textAlign: 'center',
    marginBottom: 30,
  },
  wrapper: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
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
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },
  loginButton: {
    backgroundColor: '#7F00FF',
    borderRadius: 12,
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 6,
  },
  registerText: {
    fontSize: 14,
    color: '#555',
  },
  link: {
    color: '#7F00FF',
    fontWeight: '600',
  },
});



