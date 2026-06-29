import axios from 'axios';
import VehicleType from '../models/VehicleTypeModel.js';
import PricingEngine from '../models/PricingEngineModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import User from '../models/UserModel.js';

class PricingService {
  /**
   * Obtém as definições globais armazenadas na base de dados (novo PricingEngineModel)
   */
  async getGlobalSettings() {
    let engineConfig = await PricingEngine.findOne();
    if (!engineConfig) {
      engineConfig = new PricingEngine();
      await engineConfig.save();
    }
    return engineConfig;
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
   * Calcula multiplicadores de tempo usando PricingEngineModel
   */
  getTimeMultipliers(engineConfig) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    let timeMult = engineConfig.timeMultipliers.day;
    if (hour >= 20 || hour < 2) timeMult = engineConfig.timeMultipliers.night;
    else if (hour >= 2 && hour < 6) timeMult = engineConfig.timeMultipliers.latenight;

    let dayMult = engineConfig.dayMultipliers.weekday;
    if (day === 6) dayMult = engineConfig.dayMultipliers.saturday;
    else if (day === 0) dayMult = engineConfig.dayMultipliers.sunday;
    // Feriados não implementados nativamente (precisaria de API externa)

    return timeMult * dayMult;
  }

  /**
   * Cálculo Final
   */
  async calculatePrice({ serviceId, originLoc, destLoc, weightKg = 0, vehicleTypeId = null, hasHelper = false, isRaining = false, trafficCondition = 'normal', demandLevel = 'normal', providerId = null }) {
    const engineConfig = await this.getGlobalSettings();
    const service = await ProviderSubcategory.findById(serviceId);
    
    if (!service) throw new Error("Serviço não encontrado");

    let providerRatingMult = engineConfig.ratingMultipliers.threeStar;
    let customBasePrice = null;

    if (providerId) {
      const provider = await User.findById(providerId);
      if (provider && provider.deliveryman) {
        customBasePrice = provider.deliveryman.assigned_base_fee;
        // Rating multiplier
        const rating = provider.rating || 5;
        if (rating >= 4.8) providerRatingMult = engineConfig.ratingMultipliers.fiveStar;
        else if (rating >= 4.0) providerRatingMult = engineConfig.ratingMultipliers.fourStar;
        else if (rating < 3.0 && rating >= 2.0) providerRatingMult = engineConfig.ratingMultipliers.twoStar;
        else if (rating < 2.0) providerRatingMult = engineConfig.ratingMultipliers.oneStar;
      }
    }

    // 1. Rota (OSRM)
    const { distanceKm, durationMin, routeCoordinates } = await this.getRouteInfo(originLoc, destLoc);

    // 2. Veículo
    let vehicle = null;
    if (service.requiresVehicleType || distanceKm > 0) {
      vehicle = await this.autoSelectVehicle(weightKg, vehicleTypeId);
    }

    // 3. Somatório Base
    let actualBaseFare = (service.baseFare || 0) + (vehicle ? (vehicle.baseFare || 0) : 0);
    if (service.pricingMode === 'PROVIDER_DEFINED' && customBasePrice !== null && customBasePrice !== undefined) {
      actualBaseFare = customBasePrice;
    }

    let distanceCost = vehicle ? (distanceKm * (vehicle.pricePerKm || 0)) : (distanceKm * (service.pricePerKm || 0));
    let timeCost = vehicle ? (durationMin * (vehicle.pricePerMinute || 0)) : 0;
    
    let extras = 0;
    if (hasHelper && service.supportsHelpers) extras += 200; // Helper price could be moved to config
    if (vehicle && vehicle.includesLoading) extras += vehicle.loadingFee;

    let subtotal = actualBaseFare + distanceCost + timeCost + extras;

    // 4. Multiplicadores
    let timeMult = this.getTimeMultipliers(engineConfig);
    let weatherMult = isRaining ? engineConfig.weatherMultipliers.rain : engineConfig.weatherMultipliers.clear;
    let demandMult = engineConfig.demandMultipliers[demandLevel] || 1.0;
    let trafficMult = engineConfig.trafficMultipliers[trafficCondition] || 1.0;

    let totalPostMultipliers = subtotal * timeMult * weatherMult * demandMult * trafficMult * providerRatingMult;

    // Minimums
    if (vehicle && totalPostMultipliers < vehicle.minFare) totalPostMultipliers = vehicle.minFare;
    const minSystemFare = service.pricingMode === 'PROVIDER_DEFINED' ? engineConfig.minFareService : engineConfig.minFareDelivery;
    if (totalPostMultipliers < minSystemFare) totalPostMultipliers = minSystemFare;

    // Arredondamento (multiplos de 10)
    totalPostMultipliers = Math.ceil(totalPostMultipliers / 10) * 10;

    return {
      price: totalPostMultipliers,
      currency: 'MZN',
      routeCoordinates, // Retornamos as coordenadas ao frontend!
      breakdown: {
        actualBaseFare,
        distanceCost,
        timeCost,
        extras,
        distanceKm,
        durationMin,
        multipliers: {
          timeAndDay: timeMult,
          weather: weatherMult,
          demand: demandMult,
          traffic: trafficMult,
          rating: providerRatingMult
        },
        vehicle: vehicle ? vehicle.name : null
      }
    };
  }
}

export default new PricingService();
