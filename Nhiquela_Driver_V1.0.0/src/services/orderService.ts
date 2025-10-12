import apiClient from "../api/apiClient";
import { ENDPOINTS } from "../api/endpoints";

export const getOrdersByStatus = async (status: string) => {
  const response = await apiClient.get(ENDPOINTS.GET_ORDERS_STATUS(status));
  return response.data;
};

export const acceptOrderByDeliveryman = async (orderId: string) => {
  const response = await apiClient.put(ENDPOINTS.ACCEPT_ORDER_BY_DELIVERYMAN(orderId));
  return response.data;
};

export const startOrderInTransit = async (orderId: string) => {
  const response = await apiClient.put(ENDPOINTS.START_ORDER_IN_TRANSIT(orderId));
  return response.data;
};

export const getAcceptedOrderByDeliveryman = async () => {
  const response = await apiClient.get(ENDPOINTS.GET_ACCEPT_ORDER);
  return response.data;
};

export const cancelOrderByDeliveryman = async (orderId: string) => {
  const response = await apiClient.put(ENDPOINTS.CANCEL_ORDER_BY_DELIVERYMAN(orderId));
  return response.data;
};

export const getAllOrdersForDeliveryman = async () => {
  const response = await apiClient.get(ENDPOINTS.GET_ALL_ORDERS_FOR_DELIVERYMAN);
  return response.data;
};

export const confirmOrderDelivered = async (orderId: string) => {
  const response = await apiClient.put(ENDPOINTS.CONFIRM_ORDER_DELIVERED(orderId));
  return response.data;
};