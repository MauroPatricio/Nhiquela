// services/authService.ts
import apiClient from "../api/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENDPOINTS } from "../api/endpoints";
import { User } from "../context/AuthContext";

export const loginUser = async (phoneNumber: string, password: string): Promise<User> => {
  try {
    console.log("🌐 [API] Iniciando login...", { phoneNumber });

    const response = await apiClient.post(ENDPOINTS.LOGIN, { 
      phoneNumber, 
      password 
    });

    console.log("✅ Resposta da API:", response.status);
    
    const responseData = response.data;
    console.log("📦 Dados completos da API:", JSON.stringify(responseData, null, 2));

    // ✅ CORREÇÃO: Adaptar a estrutura para nossa interface User
    const userData: User = {
      _id: responseData._id,
      name: responseData.name,
      photo: responseData.photo,
      email: responseData.email,
      phoneNumber: responseData.phoneNumber,
      isDeliveryMan: responseData.isDeliveryMan,
      token: responseData.token,
      deliveryman: responseData.deliveryman
    };

    console.log("🛠️ [API] Dados adaptados para User:", {
      name: userData.name,
      isDeliveryMan: userData.isDeliveryMan,
      hasDeliveryman: !!userData.deliveryman,
      deliverymanFields: userData.deliveryman ? Object.keys(userData.deliveryman) : 'Nenhum',
      deliverymanData: userData.deliveryman
    });
    
    // ✅ SE FOR MOTORISTA MAS NÃO TIVER DELIVERYMAN, CRIAR ESTRUTURA
    if (userData.isDeliveryMan && !userData.deliveryman) {
      console.log("🆕 [API] Criando estrutura deliveryman vazia para motorista");
      userData.deliveryman = {
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        register_conformance: "PENDING_CONFORMANCE"
      };
      console.log("📝 [API] Estrutura deliveryman criada:", userData.deliveryman);
    }

    // ✅ SALVAR TOKEN NO ASYNC STORAGE
    const token = responseData.token;
    if (token) {
      await AsyncStorage.setItem("authToken", token);
      console.log("🔐 Token salvo com sucesso");
    } else {
      console.warn("⚠️ API não retornou token");
    }
    
    console.log("🎯 [API] Retornando userData final:", {
      hasUserData: !!userData,
      hasToken: !!userData.token,
      isDeliveryMan: userData.isDeliveryMan,
      hasDeliveryman: !!userData.deliveryman
    });
    
    return userData;

  } catch (error: any) {
    console.log("🔴 INÍCIO - ERRO DETALHADO NO LOGIN");
    console.log("==========================================");
    
    if (error.response) {
      console.log("📡 ERRO DO SERVIDOR:");
      console.log("🔴 Status:", error.response.status);
      console.log("🔴 Status Text:", error.response.statusText);
      console.log("🔴 URL:", error.response.config?.url);
      console.log("🔴 Data:", error.response.data);
      console.log("🔴 Mensagem:", error.response.data?.message);
      console.log("🔴 Headers:", error.response.headers);
      
    } else if (error.request) {
      console.log("📡 ERRO DE REDE:");
      console.log("🔴 Request:", error.request);
      console.log("🔴 Code:", error.code);
      console.log("🔴 Message:", error.message);
      
    } else {
      console.log("📡 OUTRO ERRO:");
      console.log("🔴 Message:", error.message);
      console.log("🔴 Stack:", error.stack);
    }
    
    console.log("🔴 Error Object completo:", JSON.stringify(error, null, 2));
    console.log("==========================================");
    console.log("🟡 FIM - DETALHES DO ERRO");

    let errorMessage = "Erro no login";
    
    if (error.response) {
      const status = error.response.status;
      const apiMessage = error.response.data?.message;
      
      switch (status) {
        case 401:
          errorMessage = apiMessage || "Número de telefone ou senha incorretos";
          break;
        case 404:
          errorMessage = "Serviço de login não encontrado";
          break;
        case 409:
          errorMessage = apiMessage || "Conflito de dados";
          break;
        case 500:
          errorMessage = "Erro interno do servidor. Tente novamente.";
          break;
        default:
          errorMessage = apiMessage || `Erro ${status}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = "Tempo de conexão esgotado";
    } else if (error.message.includes('Network Error')) {
      errorMessage = "Erro de rede. Verifique sua conexão com a internet";
    }

    const detailedError = new Error(errorMessage);
    (detailedError as any).status = error.response?.status;
    (detailedError as any).originalError = error;
    
    throw detailedError;
  }
};