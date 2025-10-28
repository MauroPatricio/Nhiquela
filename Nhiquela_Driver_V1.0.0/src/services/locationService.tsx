import * as Location from "expo-location";
import axios from "axios";
import { ENDPOINTS } from "../api/endpoints";
import apiClient from "../api/apiClient";

// Função para obter a localização atual do dispositivo
export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permissão negada para acessar localização");
  }

  const location = await Location.getCurrentPositionAsync({});
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    heading: location.coords.heading,
    timestamp: location.timestamp,
  };
}

// 🔥 Função para enviar a localização do entregador para o backend usando apiClient
export const updateDeliverymanLocation = async (orderId: string) => {
  try {
    // Obter localização atual
    const location = await getCurrentLocation();

    const payload = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.heading,
      timestamp: location.timestamp,
    };

    // Enviar para o backend usando apiClient
    const response = await apiClient.put(
      ENDPOINTS.UPDATE_DELIVERYMAN_LOCATION(orderId),
      payload
    );

    console.log("📍 Localização enviada com sucesso:", payload);
    return response.data;
  } catch (error: any) {
    console.error("Erro ao atualizar localização:", error.message);
    throw error;
  }
};
