import api from '../api/apiConfig';

/**
 * Obtém a rota entre dois pontos usando o serviço centralizado do Backend.
 * Desta forma evitamos expor a URL do OSRM no frontend e ganhamos cache.
 * 
 * @param originLat 
 * @param originLng 
 * @param destLat 
 * @param destLng 
 * @returns Promise<{distanceKm: number, durationMinutes: number, coordinates: [number, number][], geometry: any}>
 */
export const getRoute = async (originLat: number, originLng: number, destLat: number, destLng: number) => {
  try {
    const response = await api.get('/routing/route', {
      params: { originLat, originLng, destLat, destLng },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Erro no routingService (Driver App):', error);
    throw error;
  }
};
