// screens/LoginScreen.tsx - CÓDIGO COMPLETO CORRIGIDO
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Formik, FormikHelpers } from "formik";
import * as Yup from "yup";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BackBtn from "../components/BackBtn";
import Button from "../components/Button";
import { loginUser } from "../services/authService";
import { useLoadingContext } from '../context/LoadingContext';
import { useAuth } from '../context/AuthContext'; // ✅ CORRIGIDO: contexts (plural)

// ======================
// TYPES
// ======================
interface LoginProps {
  navigation: any;
}

interface LoginValues {
  phoneNumber: string;
  password: string;
}

// ======================
// VALIDAÇÃO
// ======================
const validationSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .min(9, "O número de telefone deve ter 9 dígitos")
    .max(9, "O número de telefone deve ter 9 dígitos")
    .required("Campo obrigatório"),
  password: Yup.string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .required("Campo obrigatório"),
});

// ======================
// FUNÇÃO DE ESTILO DINÂMICO
// ======================
const getInputWrapperStyle = (borderColor: string): ViewStyle => ({
  borderColor,
  backgroundColor: "#F8F8F8",
  borderWidth: 0.5,
  height: 55,
  borderRadius: 12,
  flexDirection: "row",
  paddingHorizontal: 15,
  alignItems: "center",
});

// ======================
// COMPONENTE
// ======================
const Login: React.FC<LoginProps> = ({ navigation }) => {
  const [loader, setLoader] = useState(false);
  const [hideText, setHideText] = useState(true);
  const { showLoading, hideLoading, showUpload, showProcessing, isLoading } = useLoadingContext();
  
  // ✅ CORREÇÃO: USAR useAuth CORRETAMENTE E VERIFICAR
  const authContext = useAuth();


  const handleLogin = async (
    values: LoginValues,
    actions: FormikHelpers<LoginValues>
  ) => {
    setLoader(true);
    try {
      showProcessing('Iniciando login...');

      // ✅ AGORA RECEBE TODOS OS DADOS DO USUÁRIO
      const userData = await loginUser(values.phoneNumber, values.password);
            
      // ✅ VERIFICAÇÃO DE SEGURANÇA DOS DADOS
      if (!userData || !userData._id) {
        throw new Error("Dados do utilizador inválidos da API");
      }

      // ✅ CORREÇÃO CRÍTICA: VERIFICAR SE authContext E login EXISTEM
      if (!authContext) {
        console.error("❌ [Login] ERRO: AuthContext não disponível");
        throw new Error("Sistema de autenticação não disponível");
      }

      if (typeof authContext.login !== 'function') {
        console.error("❌ [Login] ERRO: authContext.login não é uma função:", typeof authContext.login);
        throw new Error("Função de login não disponível");
      }

      // ✅ AGORA GUARDAR NO CONTEXTO
      authContext.login(userData);

      // ✅ PEQUENO DELAY PARA GARANTIR QUE O CONTEXTO ATUALIZOU ANTES DE NAVEGAR
      setTimeout(() => {
        console.log("🔍 [Login] Estado final do contexto:", {
          user: authContext.user,
          isAuthenticated: authContext.isAuthenticated,
          userName: authContext.user?.name
        });
        navigation.navigate("MainTabs");
      }, 500);

    } catch (error: any) {
      console.error("❌ [Login] Erro completo no login:", {
        error: error,
        message: error.message,
        stack: error.stack
      });
      hideLoading();
      Alert.alert("❌ Erro no Login", error.message || "Erro desconhecido ao fazer login");
    } finally {
      setLoader(false);
      actions.setSubmitting(false);
      hideLoading();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
        <BackBtn onPress={() => {}} />
          <Image
            source={require("../assets/nhiquela2.png")}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>App do Condutor</Text>
          <Text style={styles.headerSubtitle}>
            Faça login para continuar
          </Text>
        </View>

        <View style={styles.form}>
          <Formik
            initialValues={{ phoneNumber: "", password: "" }}
            validationSchema={validationSchema}
            onSubmit={handleLogin}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              touched,
              errors,
              values,
              isValid,
            }) => (
              <View>
                {/* Telefone */}
                <View style={styles.wrapper}>
                  <Text style={styles.label}>Número de telefone</Text>
                  <View
                    style={getInputWrapperStyle(
                      errors.phoneNumber && touched.phoneNumber ? "red" : "#7F00FF"
                    )}
                  >
                    <MaterialCommunityIcons
                      name="phone"
                      size={20}
                      color="grey"
                      style={styles.iconStyle}
                    />
                    <TextInput
                      placeholder="Ex: 841234567"
                      keyboardType="numeric"
                      style={{ flex: 1 }}
                      value={values.phoneNumber}
                      maxLength={9} // ✅ Limite de 9 caracteres
                      onChangeText={(text) => {
                        // Garantindo que só números sejam digitados
                        const cleaned = text.replace(/[^0-9]/g, "");
                        handleChange("phoneNumber")(cleaned);
                      }}
                      onBlur={handleBlur("phoneNumber")}
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
                    style={getInputWrapperStyle(
                      errors.password && touched.password
                        ? "red"
                        : "#7F00FF"
                    )}
                  >
                    <MaterialCommunityIcons
                      name="lock"
                      size={20}
                      color="grey"
                      style={styles.iconStyle}
                    />
                    <TextInput
                      placeholder="Insira sua senha"
                      secureTextEntry={hideText}
                      style={{ flex: 1 }}
                      value={values.password}
                      onChangeText={handleChange("password")}
                      onBlur={handleBlur("password")}
                    />
                    <TouchableOpacity onPress={() => setHideText(!hideText)}>
                      <MaterialCommunityIcons
                        name={hideText ? "eye-outline" : "eye-off-outline"}
                        size={18}
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && (
                    <Text style={styles.errorMessage}>
                      {errors.password}
                    </Text>
                  )}
                </View>

                {/* Botões */}
                <View style={styles.buttons}>
                  <Button
                    loader={loader}
                    title="Entrar"
                    onPress={isValid ? handleSubmit : undefined}
                    isValid={isValid ? "#7F00FF" : "red"}
                  />
                  <TouchableOpacity
                    onPress={() => navigation.navigate("RegisterUser")}
                  >
                    <Text style={styles.registration}>Registrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Formik>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default Login;

// ======================
// ESTILOS
// ======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  safeArea: {
    marginHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerLogo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#7F00FF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  form: {
    marginTop: 20,
  },
  wrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
    color: "#7F00FF",
  },
  errorMessage: {
    color: "red",
    marginTop: 5,
    marginLeft: 6,
    fontSize: 12,
  },
  registration: {
    marginTop: 20,
    textAlign: "center",
    fontWeight: "500",
    borderColor: "#7F00FF",
    borderWidth: 1.5,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    color: "#7F00FF",
    paddingVertical: 10,
    fontSize: 16,
  },
  iconStyle: {
    marginRight: 10,
  },
  buttons: {
    marginTop: 20,
  },
});