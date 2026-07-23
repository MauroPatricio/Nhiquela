import api from '../api';

/**
 * Obtém a rota entre dois pontos usando o serviço centralizado do Backend.
 * Desta forma evitamos expor a URL do OSRM no frontend e ganhamos cache.
 * 
 * @param {number} originLat 
 * @param {number} originLng 
 * @param {number} destLat 
 * @param {number} destLng 
 * @returns {Promise<{distanceKm: number, durationMinutes: number, coordinates: [number, number][], geometry: any}>}
 */
export const getRoute = async (originLat, originLng, destLat, destLng) => {
  try {
    const response = await api.get('/api/routing/route', {
      params: { originLat, originLng, destLat, destLng },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Erro no routingService (Web Admin):', error);
    throw error;
  }
};
