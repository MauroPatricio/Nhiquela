import * as FileSystem from 'expo-file-system/legacy';
import apiClient from "../api/apiClient";
import { ENDPOINTS } from "../api/endpoints";
import { API_BASE_URL } from "../api/apiConfig";

export const registerDriver = async (driverData: any) => {
  const response = await apiClient.post(ENDPOINTS.REGISTER_DRIVER,driverData);
  return response.data;
};

export const getProviderSubcategories = async () => {
  const response = await apiClient.get(ENDPOINTS.PROVIDER_SUBCATEGORIES);
  return response.data;
};

export const getVehicleColors = async () => {
  const response = await apiClient.get(`${ENDPOINTS.VEHICLE_COLORS}?activeOnly=true`);
  return response.data;
};

export const updateDeliverymanRequest = async (driverUpdateData: any, user: any) => {
  try {
    console.log("🚀 [DEBUG] Enviando solicitação de atualização do entregador...");
    console.log("📦 [BODY]:", JSON.stringify(driverUpdateData, null, 2));
    console.log("👤 [USER]:", user);

    // ⚠️ Se `user` contém token JWT
    const config = {
      headers: {
        Authorization: `Bearer ${user?.token}`,
        "Content-Type": "application/json",
      },
    };

    const response = await apiClient.post(ENDPOINTS.UPDATE_DRIVER_REQUEST, driverUpdateData, config);

    console.log("✅ [SUCCESS] Resposta da API:", response.data);
    return response.data;

  } catch (error: any) {
    console.error("❌ [ERROR] Falha ao enviar solicitação de atualização:", error.message);
    if (error.response) {
      console.error("📩 [API RESPONSE ERROR]:", error.response.data);
    }
    throw error;
  }
};

export const uploadLocalFile = async (fileUri: string): Promise<string> => {
  try {
    const filename = fileUri.split('/').pop() || 'upload.jpg';
    const fileType = filename.split('.').pop() || 'jpeg';
    
    console.log("🚀 [DEBUG] Fazendo upload do ficheiro...", filename);

    // Usa FileSystem.uploadAsync para evitar o erro de Network Error ao fazer upload via FormData no React Native
    const response = await FileSystem.uploadAsync(
      `${API_BASE_URL}${ENDPOINTS.UPLOAD_LOCAL}`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: 1, // FileSystemUploadType.MULTIPART = 1
        fieldName: 'file',
        mimeType: `image/${fileType}`,
      }
    );

    if (response.status !== 200 && response.status !== 201) {
      console.error("❌ [API ERROR]:", response.body);
      throw new Error(`Erro do servidor: ${response.status}`);
    }

    const responseData = JSON.parse(response.body);
    console.log("✅ [SUCCESS] Upload feito:", responseData);
    return responseData.url; // Retorna o link final da imagem alojada
  } catch (error: any) {
    console.error("❌ [ERROR] Falha no upload:", error.message);
    throw new Error('Falha ao enviar imagem. Verifique a conexão.');
  }
};
