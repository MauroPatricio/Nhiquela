import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useToast } from 'react-native-toast-notifications';
import api from '../hooks/createConnectionApi';

const ForgotPassword = () => {
  const navigation = useNavigation();
  const toast = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');

  const handleSendReset = async () => {
    if (!phoneNumber || !/^\d{9}$/.test(phoneNumber)) {
      toast.show('Insira um número de telefone válido com 9 dígitos.', {
        type: 'danger',
        placement: 'top',
        duration: 3500,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/users/forgotpassword', { phoneNumber });
      setMaskedEmail(response.data?.emailMasked || '');
      setSent(true);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erro ao enviar pedido de recuperação.';
      toast.show(errorMessage, {
        type: 'danger',
        placement: 'top',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed-outline" size={64} color="#7F00FF" />
          </View>

          <Text style={styles.title}>Recuperar Senha</Text>
          <Text style={styles.subtitle}>
            {sent
              ? `Um email com as instruções de recuperação foi enviado para ${maskedEmail}`
              : 'Insira o seu número de telefone. Enviaremos um email com as instruções para redefinir a sua senha.'}
          </Text>

          {!sent ? (
            <>
              <View style={styles.inputWrapper}>
                <Ionicons name="phone-portrait-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Número de telefone (9 dígitos)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={9}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Enviar Email de Recuperação</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <ActivityIndicator color="#9333EA" size="large" />
              <Text style={{ marginTop: 10, color: '#6B7280' }}>A carregar instruções...</Text>
            </View>
          )}

          <Modal visible={sent} transparent animationType="slide">
            <View style={styles.premiumModalOverlay}>
              <View style={styles.premiumModalContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mail-unread-outline" size={50} color="#9333EA" />
                </View>
                <Text style={styles.premiumModalTitle}>Email Enviado!</Text>
                <Text style={styles.premiumModalText}>
                  Um email com as instruções de recuperação foi enviado para <Text style={{fontWeight: 'bold'}}>{maskedEmail}</Text>. Verifique a sua caixa de entrada e siga os passos.
                </Text>

                <TouchableOpacity 
                  style={styles.premiumModalBtn}
                  onPress={() => {
                    setSent(false);
                    navigation.navigate('Login');
                  }}
                >
                  <Text style={styles.premiumModalCloseBtnText}>Voltar ao Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLinkText}>
              Já tem a sua senha? <Text style={styles.loginLinkBold}>Iniciar Sessão</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backBtn: {
    marginTop: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 14,
    marginBottom: 20,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  button: {
    backgroundColor: '#7F00FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#B88FFF',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#666',
    fontSize: 15,
  },
  loginLinkBold: {
    color: '#7F00FF',
    fontWeight: '700',
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumModalContainer: {
    backgroundColor: '#FFF',
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.15)',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  premiumModalText: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  premiumModalBtn: {
    backgroundColor: '#9333EA',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  premiumModalCloseBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
