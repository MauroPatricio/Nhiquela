import apiClient from "../api/apiClient";
import { ENDPOINTS } from "../api/endpoints";

export const getOrdersByStatus = async (status: string) => {
  const response = await apiClient.get(ENDPOINTS.GET_ORDERS_STATUS(status));
  return response.data;
};

// orderService.ts - Atualizar para aceitar localização
export const acceptOrderByDeliveryman = async (orderId: string, initialLocation?: any, isRequestService: boolean = false) => {
  const endpoint = isRequestService
    ? `/request-service/${orderId}/acceptedByDeliveryman`
    : ENDPOINTS.ACCEPT_ORDER_BY_DELIVERYMAN(orderId);
  const response = await apiClient.put(
    endpoint,
    initialLocation ? { initialLocation } : {}
  );
  return response.data;
};

// Adicionar função para atualizar localização
export const updateDeliverymanLocation = async (orderId: string, locationData: any) => {
  const response = await apiClient.post(
    ENDPOINTS.UPDATE_DELIVERYMAN_LOCATION(),
    {
      orderId,
      latitude: locationData.latitude,
      longitude: locationData.longitude
    }
  );
  return response.data;
};

export const startOrderInTransit = async (orderId: string, isRequestService: boolean = false) => {
  const endpoint = isRequestService
    ? `/request-service/${orderId}/intransit`
    : ENDPOINTS.START_ORDER_IN_TRANSIT(orderId);
  const response = await apiClient.put(endpoint);
  return response.data;
};

export const getAcceptedOrderByDeliveryman = async () => {
  const response = await apiClient.get(ENDPOINTS.GET_ACCEPT_ORDER);
  return response.data;
};

export const cancelOrderByDeliveryman = async (orderId: string, isRequestService: boolean = false) => {
  const endpoint = isRequestService
    ? `/request-service/${orderId}/cancel`
    : ENDPOINTS.CANCEL_ORDER_BY_DELIVERYMAN(orderId);
  const response = await apiClient.put(endpoint, { message: 'Motorista recusou a viagem' });
  return response.data;
};

export const getAllOrdersForDeliveryman = async () => {
  const response = await apiClient.get(ENDPOINTS.GET_ALL_ORDERS_FOR_DELIVERYMAN);
  return response.data;
};

export const confirmOrderDelivered = async (orderId: string, isRequestService: boolean = false, latitude?: number, longitude?: number) => {
  const endpoint = isRequestService
    ? `/request-service/${orderId}/confirmDestination`
    : ENDPOINTS.CONFIRM_ORDER_DELIVERED(orderId);
  const response = await apiClient.put(endpoint, { latitude, longitude });
  return response.data;
};

export const finalizeOrder = async (orderId: string, isRequestService: boolean = false) => {
  const endpoint = isRequestService
    ? `/request-service/${orderId}/deliver`
    : `/orders/${orderId}/deliver`;
  const response = await apiClient.put(endpoint, {});
  return response.data;
};

export const cancelNoShowOrder = async (orderId: string, isRequestService: boolean = false) => {
  const endpoint = isRequestService
    ? `/request-service/${orderId}/driver-no-show`
    : `/orders/${orderId}/driver-no-show`; // you can add standard order no-show later if needed
  const response = await apiClient.put(endpoint);
  return response.data;
};