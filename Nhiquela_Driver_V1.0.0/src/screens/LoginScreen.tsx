import { showMessage } from "react-native-flash-message";
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
//@ts-ignore
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { loginUser, forgotPassword } from "../services/authService";
import { Alert } from "react-native";
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const authContext = useAuth();

  
  const handleForgotPassword = async () => {
    if (phoneNumber.length < 9) {
      showMessage({ message: "Insira o número de telefone", description: "Insira primeiro o seu número de telefone e depois prima Esqueci a palavra-passe.", type: "warning" });
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
      showMessage({ message: "Erro", description: error.message, type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (phoneNumber.length < 9) {
      showMessage({ message: "Número inválido", type: "warning" });
      return;
    }
    if (password.length < 6) {
      showMessage({ message: "Senha muito curta", type: "warning" });
      return;
    }

    setLoading(true);
    try {
      const userData = await loginUser(phoneNumber, password);
      
      if (authContext && authContext.login) {
        authContext.login(userData);
      }
      
      // Post-Login Routing based on register_conformance
      const status = userData.deliveryman?.register_conformance;
      if (status === "CONFORMANCE") {
        navigation.replace("MainTabs");
      } else if (status === "PENDING_CONFORMANCE") {
        showMessage({ 
          message: "Conta em Análise", 
          description: "A sua conta está em análise. Receberá uma notificação assim que for aprovada.",
          type: "info",
          duration: 5000
        });
      } else {
        showMessage({ 
          message: "Documentação Incompleta", 
          description: "Complete os documentos para começar a receber pedidos.",
          type: "warning",
          duration: 5000
        });
      }
    } catch (error: any) {
      showMessage({ message: "Erro", description: error.message, type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.container}>
          
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

        </ScrollView>
      </KeyboardAvoidingView>
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
  footerLinks: { color: '#9CA3AF', fontSize: 12 }
});
