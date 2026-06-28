import apiClient from "../api/apiClient";
import { ENDPOINTS } from "../api/endpoints";

export const getTripsHistory = async (id: string, page = 1) => {
  const response = await apiClient.get(`${ENDPOINTS.GET_TRIPS_HISTORY(id)}?page=${page}`);
  return response.data;
};

