import apiClient from "../api/apiClient";
import { ENDPOINTS } from "../api/endpoints";

export const registerDriver = async (driverData: any) => {
  const response = await apiClient.post(ENDPOINTS.REGISTER_DRIVER,driverData);
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
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'upload.jpg';
    
    // Configura o objeto FormData para upload em React Native
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    console.log("🚀 [DEBUG] Fazendo upload do ficheiro...", filename);

    const response = await apiClient.post(ENDPOINTS.UPLOAD_LOCAL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data, headers) => {
        return formData;
      },
    });

    console.log("✅ [SUCCESS] Upload feito:", response.data);
    return response.data.url; // Retorna o link final da imagem alojada
  } catch (error: any) {
    console.error("❌ [ERROR] Falha no upload:", error.message);
    if (error.response) {
      console.error("📩 [API RESPONSE ERROR]:", error.response.data);
    }
    throw new Error('Falha ao enviar imagem. Verifique a conexão.');
  }
};
