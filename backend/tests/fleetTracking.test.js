import mongoose from 'mongoose';
import { calculateDistanceKm, isPointInGeofence } from '../services/fleetTrackingService.js';

describe('Gestão de Frota - Testes da Lógica de Rastreamento', () => {
  test('Cálculo de Distância Haversine entre 2 pontos GPS em Maputo', () => {
    // Praça dos Trabalhadores (-25.9715, 32.5684) até Museu (-25.9692, 32.5891)
    const lat1 = -25.9715;
    const lon1 = 32.5684;
    const lat2 = -25.9692;
    const lon2 = 32.5891;

    const distance = calculateDistanceKm(lat1, lon1, lat2, lon2);
    expect(distance).toBeGreaterThan(1.8);
    expect(distance).toBeLessThan(2.5);
  });

  test('Cálculo de Distância zero para o mesmo ponto', () => {
    const lat = -25.9692;
    const lon = 32.5732;
    const distance = calculateDistanceKm(lat, lon, lat, lon);
    expect(distance).toBe(0);
  });

  test('Validação de Ponto dentro da Geofence', () => {
    const fence = {
      centerLatitude: -25.9692,
      centerLongitude: 32.5732,
      radiusMeters: 500,
    };

    // Ponto muito próximo (dentro da geofence)
    const insideP = isPointInGeofence(-25.9695, 32.5735, fence);
    expect(insideP).toBe(true);

    // Ponto a 2km (fora da geofence)
    const outsideP = isPointInGeofence(-25.985, 32.59, fence);
    expect(outsideP).toBe(false);
  });
});
