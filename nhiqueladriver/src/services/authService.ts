// @ts-nocheck
// services/authService.ts
import apiClient from "../api/apiClient";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENDPOINTS } from "../api/endpoints";
import { User } from "../context/AuthContext";

export const loginUser = async (phoneNumber: string, password: string): Promise<User> => {
  try {
    const response = await apiClient.post(ENDPOINTS.LOGIN, { 
      phoneNumber, 
      password 
    });

    const responseData = response.data;

    // ✅ CORREÇÃO: Adaptar a estrutura para nossa interface User
    const userData: User = {
      _id: responseData._id,
      name: responseData.name,
      photo: responseData.photo,
      email: responseData.email,
      phoneNumber: responseData.phoneNumber,
      isDeliveryMan: responseData.isDeliveryMan,
      isBanned: false,
      isSeller: false,
      token: responseData.token,
      deliveryman: responseData.deliveryman
    };

    // ✅ SE FOR MOTORISTA MAS NÃO TIVER DELIVERYMAN, CRIAR ESTRUTURA
    if (userData.isDeliveryMan && !userData.deliveryman) {
      userData.deliveryman = {
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        register_conformance: "PENDING_CONFORMANCE"
      };
    }

    // ✅ SALVAR TOKEN NO ASYNC STORAGE
    const token = responseData.token;
    if (token) {
      await AsyncStorage.setItem("authToken", token);
    }
    
    return userData;

  } catch (error: any) {
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

export const sendOTP = async (phoneNumber: string): Promise<{ message: string; success: boolean }> => {
  try {
    const response = await apiClient.post(ENDPOINTS.SEND_OTP, { phoneNumber });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Erro ao enviar código SMS");
    }
    throw new Error("Falha na conexão de rede ao enviar OTP");
  }
};

export const verifyOTP = async (phoneNumber: string, otp: string): Promise<User> => {
  try {
    const response = await apiClient.post(ENDPOINTS.VERIFY_OTP, { phoneNumber, otp });
    const responseData = response.data;

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

    if (userData.isDeliveryMan && !userData.deliveryman) {
      userData.deliveryman = {
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        register_conformance: "PENDING_CONFORMANCE"
      };
    }

    if (responseData.token) {
      await AsyncStorage.setItem("authToken", responseData.token);
    }

    return userData;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Código inválido ou expirado");
    }
    throw new Error("Falha na conexão de rede ao verificar OTP");
  }
};

export const forgotPassword = async (phoneNumber: string): Promise<{ message: string, emailMasked?: string }> => {
  try {
    const response = await apiClient.post(ENDPOINTS.FORGOT_PASSWORD, { phoneNumber });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Erro ao recuperar senha");
    }
    throw new Error("Falha na conexão de rede ao recuperar senha");
  }
};
