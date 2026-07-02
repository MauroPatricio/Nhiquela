import { showMessage } from "react-native-flash-message";
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal
} from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from "react-native-safe-area-context";
//@ts-ignore
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { loginUser, forgotPassword } from "../services/authService";
import { Alert } from "react-native";
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const authContext = useAuth();

  
  const handleForgotPassword = async () => {
    if (phoneNumber.length < 9) {
      setErrorMessage("Insira primeiro o seu número de telefone e depois prima Esqueci a palavra-passe.");
      setErrorModalVisible(true);
      return;
    }
    setLoading(true);
    try {
      const response = await forgotPassword(phoneNumber);
      Alert.alert(
        "Email Enviado", 
        `${response.message}\n\nUm email foi enviado para ${response.emailMasked}`
      );
    } catch (error: any) {
      setErrorMessage(error.message);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (phoneNumber.length < 9) {
      setErrorMessage("Por favor, introduza um número de telefone válido com 9 dígitos.");
      setErrorModalVisible(true);
      return;
    }
    if (password.length < 6) {
      setErrorMessage("A palavra-passe deve conter pelo menos 6 caracteres.");
      setErrorModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      const userData = await loginUser(phoneNumber, password);
      
      if (authContext && authContext.login) {
        authContext.login(userData);
      }
      
      // authContext.login() atualiza isAuthenticated → o AppNavigator redireciona automaticamente
      const conformance = userData.deliveryman?.register_conformance;
      const driverStatus = userData.status;

      const isApproved = conformance === "CONFORMANCE" || driverStatus === "Disponível" || driverStatus === "Em Entrega";
      const isRejected = conformance === "INCONFORMANCE" || driverStatus === "Inativo";

      if (isApproved) {
        // isAuthenticated já é true após login() — a navegação acontece automaticamente
        return;
      } else if (isRejected) {
        setErrorMessage("A sua conta foi suspensa. Contacte o suporte para mais informações.");
        setErrorModalVisible(true);
      } else {
        // PENDING_CONFORMANCE ou Pendente
        setShowAnalysisModal(true);
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={styles.container}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
      >
          
          {/* Cabeçalho */}
          <View style={styles.header}>
            <Image 
              source={require("../../assets/nhiquela2.png")} 
              style={styles.logo} 
              resizeMode="contain"
            />
            <Text style={styles.welcomeTitle}>Bem-vindo, Motorista</Text>
            <Text style={styles.welcomeSubtitle}>Entre para receber entregas e serviços próximos de si.</Text>
            
            <View style={styles.illustration}>
              <MaterialCommunityIcons name="tow-truck" size={40} color="#7F00FF" />
              <MaterialCommunityIcons name="truck-fast" size={40} color="#7F00FF" />
              <MaterialCommunityIcons name="car-pickup" size={40} color="#7F00FF" />
              <MaterialCommunityIcons name="motorbike" size={40} color="#7F00FF" />
            </View>
          </View>

          {/* Formulário */}
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.prefix}>+258 |</Text>
              <TextInput
                style={styles.input}
                placeholder="84 123 4567"
                keyboardType="numeric"
                maxLength={9}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="lock-outline" size={24} color="#374151" style={{marginRight: 12}} />
              <TextInput
                style={styles.input}
                placeholder="Palavra-passe"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{padding: 5}}>
                <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Esqueci a palavra-passe</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.disabledButton]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Entrar</Text>}
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Ainda não é motorista?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("RegisterUser")}>
                <Text style={styles.registerLink}>Cadastrar como Motorista</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rodapé */}
          <View style={styles.footer}>
            <Text style={styles.footerLinks}>Termos • Privacidade • Suporte</Text>
          </View>

        </KeyboardAwareScrollView>

        {/* 🔥 MODAL PREMIUM "CONTA EM ANÁLISE" */}
        <Modal visible={showAnalysisModal} transparent animationType="fade">
          <View style={styles.premiumModalOverlay}>
            <View style={styles.premiumModalContainer}>
              <View style={styles.premiumModalHeader}>
                <Ionicons name="time-outline" size={40} color="#F39C12" />
                <Text style={styles.premiumModalTitle}>Conta em Análise</Text>
              </View>
              <Text style={styles.premiumModalText}>
                O seu perfil encontra-se sob avaliação pela equipa.
              </Text>
              <Text style={styles.premiumModalSubText}>
                Receberá uma notificação assim que a sua documentação for verificada e aprovada.
              </Text>
              <TouchableOpacity 
                style={styles.premiumModalCloseBtn}
                onPress={() => setShowAnalysisModal(false)}
              >
                <Text style={styles.premiumModalCloseBtnText}>Compreendi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 🔥 MODAL PREMIUM DE ERRO */}
        <Modal visible={errorModalVisible} transparent animationType="fade">
          <View style={styles.premiumModalOverlay}>
            <View style={styles.premiumErrorModalContainer}>
              <View style={styles.premiumModalHeader}>
                <Ionicons name="alert-circle-outline" size={54} color="#FF3B30" />
                <Text style={styles.premiumErrorModalTitle}>Ops! Algo correu mal</Text>
              </View>
              <Text style={styles.premiumModalText}>
                {errorMessage}
              </Text>
              <TouchableOpacity 
                style={styles.premiumErrorModalCloseBtn}
                onPress={() => setErrorModalVisible(false)}
              >
                <Text style={styles.premiumModalCloseBtnText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  container: { flexGrow: 1, padding: 24, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 20 },
  logo: { width: 120, height: 120, marginBottom: 16 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  welcomeSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  illustration: { flexDirection: 'row', gap: 24, marginBottom: 32, opacity: 0.8 },
  formContainer: { width: '100%', marginBottom: 40 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16, height: 60, marginBottom: 16 },
  prefix: { fontSize: 16, fontWeight: '600', color: '#374151', marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  forgotPasswordContainer: { alignItems: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  primaryButton: { backgroundColor: '#7F00FF', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', shadowColor: '#7F00FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, marginBottom: 32 },
  disabledButton: { opacity: 0.7 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  registerContainer: { alignItems: 'center', gap: 8 },
  registerText: { color: '#6B7280', fontSize: 14 },
  registerLink: { color: '#7F00FF', fontSize: 16, fontWeight: 'bold' },
  footer: { alignItems: 'center', marginBottom: 16 },
  footerLinks: { color: '#9CA3AF', fontSize: 12 },

  // 🔥 ESTILOS PARA O MODAL PREMIUM
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  premiumModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  premiumModalText: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 12,
  },
  premiumModalSubText: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  premiumModalCloseBtn: {
    backgroundColor: '#F39C12',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  premiumModalCloseBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  premiumErrorModalContainer: {
    backgroundColor: '#FFF',
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.15)',
  },
  premiumErrorModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF3B30',
    marginTop: 10,
    textAlign: 'center',
  },
  premiumErrorModalCloseBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
});
