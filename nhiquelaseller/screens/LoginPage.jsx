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
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useNavigation } from '@react-navigation/native';
import registerDeviceToken from '../utils/registerDeviceToken';
import { useToast } from 'react-native-toast-notifications';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

export default function LoginPage() {
  const navigation = useNavigation();
  const toast = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hideText, setHideText] = useState(true);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleForgotPassword = () => {
    if (phoneNumber.length < 9) {
      toast.show("Insira o número de telefone primeiro", { type: "warning", placement: "top" });
      return;
    }
    Alert.alert("Funcionalidade Indisponível", "Por favor contacte o suporte para recuperar a sua conta de Vendedor.");
  };

  const handleLogin = async () => {
    if (!phoneNumber || !/^\d{9}$/.test(phoneNumber)) {
      toast.show("O telefone deve ter exatamente 9 dígitos", { type: 'danger', placement: 'top' });
      return;
    }
    if (!password || password.length < 6) {
      toast.show("A senha deve ter no mínimo 6 caracteres", { type: 'danger', placement: 'top' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/users/signinseller', { phoneNumber, password });
      if (!response.data) throw new Error('Resposta inválida do servidor');

      const userData = response.data;
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      await AsyncStorage.setItem('id', userData._id);
      registerDeviceToken(userData);

      navigation.reset({ index: 0, routes: [{ name: 'BottomNavigation' }] });
    } catch (err) {
      toast.show(err.response?.data?.message || 'Erro ao fazer login', {
        type: 'danger', placement: 'top', duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header decorativo */}
          <View style={styles.headerBg}>
            <View style={styles.glowCircle1} />
            <View style={styles.glowCircle2} />
            <View style={styles.headerContent}>
              <Image source={require('../assets/nhiquela2.png')} style={styles.logo} />
              <Text style={styles.appName}>Nhiquela Partner</Text>
              <Text style={styles.tagline}>Gerencie o seu negócio com facilidade</Text>
              <View style={styles.iconRow}>
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons name="storefront-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons name="basket-outline" size={22} color={COLORS.primaryLight} />
                </View>
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons name="cash-register" size={22} color={COLORS.accent} />
                </View>
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons name="truck-delivery-outline" size={22} color={COLORS.success} />
                </View>
              </View>
            </View>
          </View>

          {/* Formulário */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Entrar na sua conta</Text>

            {/* Telefone */}
            <Text style={styles.label}>Número de telefone</Text>
            <View style={[styles.inputRow, phoneFocused && styles.inputFocused]}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>+258</Text>
              </View>
              <TextInput
                placeholder="84 123 4567"
                placeholderTextColor={COLORS.textMuted}
                style={styles.inputText}
                value={phoneNumber}
                keyboardType="numeric"
                maxLength={9}
                onChangeText={setPhoneNumber}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
              />
            </View>

            {/* Senha */}
            <Text style={styles.label}>Palavra-passe</Text>
            <View style={[styles.inputRow, passFocused && styles.inputFocused]}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={hideText}
                style={[styles.inputText, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <TouchableOpacity onPress={() => setHideText(!hideText)}>
                <MaterialCommunityIcons
                  name={hideText ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Esqueci a palavra-passe</Text>
            </TouchableOpacity>

            {/* Botão Login */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.loginBtnText}>Entrar</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divisor */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Criar Conta */}
            <TouchableOpacity style={styles.signupBtn} onPress={() => navigation.navigate('SignUp')}>
              <Ionicons name="person-add-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.signupBtnText}>Criar conta de vendedor</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>Termos • Privacidade • Suporte</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
  },
  // Header
  headerBg: {
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  glowCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primaryGlow,
    top: -80,
    right: -60,
  },
  glowCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.accentGlow,
    bottom: -50,
    left: -40,
  },
  headerContent: {
    alignItems: 'center',
  },
  logo: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  appName: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Form
  form: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  formTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
  },
  label: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceCard,
  },
  prefixBox: {
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    marginRight: 12,
  },
  prefixText: {
    color: COLORS.primaryLight,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  inputText: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.base,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: COLORS.primaryLight,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    height: 54,
    marginBottom: 24,
    ...SHADOWS.md,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    paddingHorizontal: 12,
  },
  signupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    height: 54,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  signupBtnText: {
    color: COLORS.primary,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    paddingBottom: 24,
    paddingTop: 16,
  },
});
