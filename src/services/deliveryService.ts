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
