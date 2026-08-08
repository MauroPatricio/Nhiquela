// backend/services/routingService.js
import dotenv from 'dotenv';
dotenv.config();

// Cache em memória: Map<routeKey, routeData>
const routeCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora de cache

export const getRoute = async (originLat, originLng, destLat, destLng) => {
  try {
    const key = `${originLat},${originLng}|${destLat},${destLng}`;
    const cached = routeCache.get(key);
    
    // Validar se está no cache e não expirou
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      console.log('? Rota servida via CACHE');
      return cached.data;
    }

    const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://routing.nhiquelaservicos.com';
    
    // OSRM recebe coordenadas no formato: longitude,latitude
    const url = `${OSRM_BASE_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    
    console.log(`?? OSRM Call: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('OSRM não retornou rota válida. Código: ' + data.code);
    }
    
    const route = data.routes[0];
    
    const distanceKm = route.distance / 1000;
    const durationMinutes = route.duration / 60;
    
    const result = {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationMinutes: Math.ceil(durationMinutes),
      coordinates: route.geometry.coordinates, // array de [lng, lat]
      geometry: route.geometry, // Objecto GeoJSON completo
    };

    // Guardar no cache
    routeCache.set(key, {
      timestamp: Date.now(),
      data: result
    });

    return result;
  } catch (error) {
    console.error('? Erro no routingService:', error.message);
    throw new Error('Falha ao obter rota: ' + error.message);
  }
};
