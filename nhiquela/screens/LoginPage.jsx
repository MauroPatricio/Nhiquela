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
import BackBtn from '../components/BackBtn';
import { useToast } from 'react-native-toast-notifications';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginPage() {
  const navigation = useNavigation();
  const toast = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hideText, setHideText] = useState(true);
  const [errors, setErrors] = useState({ phoneNumber: '', password: '' });
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    let valid = true;
    const newErrors = { phoneNumber: '', password: '' };

    if (!phoneNumber) {
      newErrors.phoneNumber = 'Preencha o telefone';
      valid = false;
    } else if (!/^\d{9}$/.test(phoneNumber)) {
      newErrors.phoneNumber = 'O telefone deve ter exatamente 9 dígitos';
      valid = false;
    }

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

        navigation.reset({
          index: 0,
          routes: [{ name: 'BottomNavigation' }],
        });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erro ao fazer login';

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
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.innerContainer}>
            {/* Back Button Container */}
            <View style={styles.backBtnWrapper}>
              <BackBtn onPress={() => navigation.navigate('BottomNavigation')} />
            </View>

            {/* Brand Logo */}
            <Image
              source={require('../assets/nhiquela2.png')}
              style={styles.cover}
            />

            {/* Headings */}
            <Text style={styles.title}>Bem-vindo</Text>
            <Text style={styles.subtitle}>Faça login para continuar</Text>

            {/* Phone Input wrapper */}
            <View style={styles.wrapper}>
              <Text style={styles.label}>Telefone</Text>
              <View style={styles.inputWrapper(phoneFocused, !!errors.phoneNumber)}>
                <Ionicons
                  name="phone-portrait"
                  size={20}
                  color="#9333EA"
                  style={styles.iconStyle}
                />

                <TextInput
                  placeholder="Insira o telefone"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={phoneNumber}
                  keyboardType="phone-pad"
                  onChangeText={text => {
                    setPhoneNumber(text);
                    setErrors({ ...errors, phoneNumber: '' });
                  }}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                />
              </View>

              {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
            </View>

            {/* Password Input wrapper */}
            <View style={styles.wrapper}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputWrapper(passwordFocused, !!errors.password)}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#9333EA"
                  style={styles.iconStyle}
                />

                <TextInput
                  placeholder="Insira a senha"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={hideText}
                  style={styles.input}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    setErrors({ ...errors, password: '' });
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />

                <TouchableOpacity onPress={() => setHideText(!hideText)} style={styles.eyeBtn}>
                  <Ionicons
                    name={hideText ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9333EA"
                  />
                </TouchableOpacity>
              </View>

              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Forgot Password Button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Esqueci-me da senha?</Text>
            </TouchableOpacity>

            {/* Login Button with Linear Gradient */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#9333EA', '#7E22CE']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginText}>Entrar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Redirect Register Account */}
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={{ marginTop: 20 }}>
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
  scrollContainer: {
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  innerContainer: {
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  backBtnWrapper: {
    position: 'absolute',
    left: 0,
    top: Platform.OS === 'ios' ? 0 : 10,
    zIndex: 999,
  },
  cover: {
    height: 120,
    width: '100%',
    resizeMode: 'contain',
    marginTop: 40,
    marginBottom: 30,
    transform: [{ scale: 1.5 }],
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  wrapper: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
  },
  inputWrapper: (isFocused, hasError) => ({
    borderColor: hasError ? '#EF4444' : (isFocused ? '#9333EA' : '#F3F4F6'),
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
  }),
  iconStyle: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeBtn: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 20,
  },
  forgotText: {
    color: '#9333EA',
    fontWeight: '700',
    fontSize: 14,
  },
  loginButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 6,
    fontWeight: '500',
  },
  registerText: {
    fontSize: 15,
    color: '#6B7280',
  },
  link: {
    color: '#9333EA',
    fontWeight: '700',
  },
});
