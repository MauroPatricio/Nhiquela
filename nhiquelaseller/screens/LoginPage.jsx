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
  Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useNavigation } from '@react-navigation/native';
import registerDeviceToken from '../utils/registerDeviceToken';
import BackBtn from '../components/BackBtn';
import { useToast } from 'react-native-toast-notifications';

export default function LoginPage() {
  const navigation = useNavigation();
  const toast = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hideText, setHideText] = useState(true);

  const handleForgotPassword = () => {
    if (phoneNumber.length < 9) {
      toast.show("Insira o número de telefone primeiro", {
        type: "warning",
        placement: "top"
      });
      return;
    }
    Alert.alert(
      "Funcionalidade Indisponível",
      "Por favor contacte o suporte para recuperar a sua conta de Vendedor."
    );
  };

  const handleLogin = async () => {
    let valid = true;

    // --- VALIDAÇÕES ---
    if (!phoneNumber || !/^\d{9}$/.test(phoneNumber)) {
      toast.show("O telefone deve ter exatamente 9 dígitos", { type: 'danger', placement: 'top' });
      valid = false;
    } else if (!password || password.length < 6) {
      toast.show("A senha deve ter no mínimo 6 caracteres", { type: 'danger', placement: 'top' });
      valid = false;
    }

    if (!valid) return;

    setLoading(true);

    try {
      const response = await api.post('/users/signinseller', { phoneNumber, password });

      if (!response.data) {
        throw new Error('Resposta inválida do servidor');
      }

      const userData = response.data;

      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      await AsyncStorage.setItem('id', userData._id);

      // Registra token (push notifications)
      registerDeviceToken(userData);

      navigation.reset({
        index: 0,
        routes: [{ name: 'BottomNavigation' }],
      });

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
      <View style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header com Botão Voltar */}
            <View style={styles.topHeader}>
              <BackBtn onPress={() => navigation.goBack()} />
            </View>

            {/* Cabeçalho */}
            <View style={styles.header}>
              <Image
                source={require('../assets/nhiquela2.png')}
                style={styles.logo}
              />
              <Text style={styles.welcomeTitle}>Bem-vindo à Nhiquela Partner</Text>
              <Text style={styles.welcomeSubtitle}>
                Entre para gerir o seu estabelecimento, produtos e vendas.
              </Text>

              <View style={styles.illustration}>
                <MaterialCommunityIcons name="storefront-outline" size={40} color="#7F00FF" />
                <MaterialCommunityIcons name="basket-outline" size={40} color="#7F00FF" />
                <MaterialCommunityIcons name="cash-register" size={40} color="#7F00FF" />
                <MaterialCommunityIcons name="truck-delivery-outline" size={40} color="#7F00FF" />
              </View>
            </View>

            {/* Formulário */}
            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.prefix}>+258 |</Text>
                <TextInput
                  placeholder="84 123 4567"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={phoneNumber}
                  keyboardType="numeric"
                  maxLength={9}
                  onChangeText={setPhoneNumber}
                />
              </View>

              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons 
                  name="lock-outline" 
                  size={24} 
                  color="#374151" 
                  style={{ marginRight: 12 }} 
                />
                <TextInput
                  placeholder="Palavra-passe"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={hideText}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setHideText(!hideText)} style={{ padding: 5 }}>
                  <MaterialCommunityIcons
                    name={hideText ? 'eye-outline' : 'eye-off-outline'}
                    size={24}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Esqueci a palavra-passe */}
              <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Esqueci a palavra-passe</Text>
              </TouchableOpacity>

              {/* Botão de Ação */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Entrar</Text>
                )}
              </TouchableOpacity>

              {/* Criar Conta */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Ainda não é parceiro?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                  <Text style={styles.registerLink}>Criar conta</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Rodapé */}
            <View style={styles.footer}>
              <Text style={styles.footerLinks}>Termos • Privacidade • Suporte</Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  topHeader: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: Platform.OS === 'ios' ? 10 : 30,
    marginBottom: 10,
    marginLeft: -10,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  illustration: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
    opacity: 0.8,
  },
  formContainer: {
    width: '100%',
    marginBottom: 40,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 16,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#7F00FF',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 32,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    alignItems: 'center',
    gap: 8,
  },
  registerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  registerLink: {
    color: '#7F00FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  footerLinks: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});
