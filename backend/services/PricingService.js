import axios from 'axios';
import VehicleType from '../models/VehicleTypeModel.js';
import Settings from '../models/SettingsModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';

class PricingService {
  /**
   * Obtém as definições globais armazenadas na base de dados
   */
  async getGlobalSettings() {
    const settings = await Settings.find({});
    const config = {};
    settings.forEach((s) => {
      config[s.key] = s.value;
    });

    // Valores padrão (fallbacks)
    return {
      currency: config.currency || 'MZN',
      rounding: config.rounding || 10,
      minimumSystemFare: config.minimumSystemFare || 50,
      routingProvider: config.routingProvider || 'OSRM',
      nightStart: config.nightStart || '22:00',
      nightEnd: config.nightEnd || '05:00',
      nightMultiplier: config.nightMultiplier || 1.3,
      weekendMultiplier: config.weekendMultiplier || 1.2,
      rainMultiplier: config.rainMultiplier || 1.5,
      surgeDemand: config.surgeDemand || 1.0, // multiplier
      helperPrice: config.helperPrice || 200,
    };
  }

  /**
   * Consulta a API do OSRM para obter distância (em km) e tempo (em min)
   * Agora utiliza o serviço centralizado routingService.js (com cache!)
   */
  async getRouteInfo(originLoc, destLoc) {
    if (!originLoc || !destLoc) return { distanceKm: 0, durationMin: 0, routeCoordinates: [] };
    try {
      // Importa dinamicamente para evitar dependências circulares (se houver) ou usa o import no topo
      const { getRoute } = await import('./routingService.js');
      
      // O getRoute centralizado já converte coordenadas e aplica caching
      const routeData = await getRoute(
        originLoc.lat, 
        originLoc.lng, 
        destLoc.lat, 
        destLoc.lng
      );
      
      return { 
        distanceKm: routeData.distanceKm, 
        durationMin: routeData.durationMinutes, 
        routeCoordinates: routeData.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }))
      };
    } catch (error) {
      console.error('Erro ao consultar OSRM no PricingService:', error.message);
    }
    
    // Fallback básico
    return { distanceKm: 5, durationMin: 15, routeCoordinates: [] };
  }

  /**
   * Seleção automática do veículo baseada no peso ou noutros critérios
   */
  async autoSelectVehicle(weightKg, requestedVehicleTypeId = null) {
    if (requestedVehicleTypeId) {
      return await VehicleType.findById(requestedVehicleTypeId);
    }

    // Lógica inteligente simples
    let query = {};
    if (weightKg <= 10) query = { name: { $regex: /mota/i } };
    else if (weightKg <= 300) query = { category: 'ligeiro' };
    else if (weightKg <= 1000) query = { name: { $regex: /van|carrinha/i } };
    else query = { category: 'pesado' };

    const vehicle = await VehicleType.findOne(query);
    if (!vehicle) {
      // Fallback
      return await VehicleType.findOne({});
    }
    return vehicle;
  }

  /**
   * Calcula se é horário noturno ou fim-de-semana
   */
  getTimeMultipliers(settings) {
    let multiplier = 1.0;
    
    const now = new Date();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    if (isWeekend) multiplier *= settings.weekendMultiplier;

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    const [startH, startM] = settings.nightStart.split(':').map(Number);
    const [endH, endM] = settings.nightEnd.split(':').map(Number);
    
    const currentMins = currentHour * 60 + currentMin;
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    let isNight = false;
    if (startMins < endMins) {
      isNight = currentMins >= startMins && currentMins <= endMins;
    } else {
      // Cruza a meia-noite
      isNight = currentMins >= startMins || currentMins <= endMins;
    }

    if (isNight) multiplier *= settings.nightMultiplier;

    return multiplier;
  }

  /**
   * Cálculo Final
   */
  async calculatePrice({ serviceId, originLoc, destLoc, weightKg = 0, vehicleTypeId = null, hasHelper = false, isRaining = false }) {
    const settings = await this.getGlobalSettings();
    const service = await ProviderSubcategory.findById(serviceId);
    
    if (!service) throw new Error("Serviço não encontrado");

    // 1. Rota (OSRM)
    const { distanceKm, durationMin, routeCoordinates } = await this.getRouteInfo(originLoc, destLoc);

    // 2. Veículo
    let vehicle = null;
    if (service.requiresVehicleType || distanceKm > 0) {
      vehicle = await this.autoSelectVehicle(weightKg, vehicleTypeId);
    }

    // 3. Somatório Base
    let baseFare = (service.baseFare || 0) + (vehicle ? (vehicle.baseFare || 0) : 0);
    let distanceCost = vehicle ? (distanceKm * (vehicle.pricePerKm || 0)) : (distanceKm * (service.pricePerKm || 0));
    let timeCost = vehicle ? (durationMin * (vehicle.pricePerMinute || 0)) : 0;
    
    let extras = 0;
    if (hasHelper && service.supportsHelpers) extras += settings.helperPrice;
    if (vehicle && vehicle.includesLoading) extras += vehicle.loadingFee;

    let totalPreMultipliers = baseFare + distanceCost + timeCost + extras;

    // 4. Multiplicadores
    let timeMult = this.getTimeMultipliers(settings);
    let weatherMult = isRaining ? settings.rainMultiplier : 1.0;
    let demandMult = settings.surgeDemand;

    let totalPostMultipliers = totalPreMultipliers * timeMult * weatherMult * demandMult;

    // Minimums
    if (vehicle && totalPostMultipliers < vehicle.minFare) totalPostMultipliers = vehicle.minFare;
    if (totalPostMultipliers < settings.minimumSystemFare) totalPostMultipliers = settings.minimumSystemFare;

    // Arredondamento (ex: múltiplos de 10)
    if (settings.rounding > 0) {
      totalPostMultipliers = Math.ceil(totalPostMultipliers / settings.rounding) * settings.rounding;
    }

    return {
      price: totalPostMultipliers,
      currency: settings.currency,
      routeCoordinates, // Retornamos as coordenadas ao frontend!
      breakdown: {
        baseFare,
        distanceCost,
        timeCost,
        extras,
        distanceKm,
        durationMin,
        multipliers: {
          time: timeMult,
          weather: weatherMult,
          demand: demandMult
        },
        vehicle: vehicle ? vehicle.name : null
      }
    };
  }
}

export default new PricingService();
