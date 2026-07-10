import axios from 'axios';
import VehicleType from '../models/VehicleTypeModel.js';
import PricingEngine from '../models/PricingEngineModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import User from '../models/UserModel.js';

class PricingService {
  /**
   * Obt�m as defini��es globais armazenadas na base de dados (SettingsModel)
   */
  async getGlobalSettings() {
    const Settings = (await import('../models/SettingsModel.js')).default;
    const allSettings = await Settings.find();
    
    // Helper to get or create setting
    const getSetting = async (key, defaultValue, description) => {
      let setting = allSettings.find(s => s.key === key);
      if (!setting) {
        setting = await Settings.create({ key, value: defaultValue.toString(), description, type: 'number' });
        allSettings.push(setting);
      }
      return Number(setting.value);
    };

    const engineConfig = {
      minFareDelivery: await getSetting('min_fare_delivery', 80, 'Tarifa m�nima (MT): Entregas e T�xi'),
      minFareService: await getSetting('min_fare_service', 100, 'Tarifa m�nima (MT): Servi�os (ex: Eletricista)'),
      
      weatherMultipliers: {
        clear: 1.0,
        rain: await getSetting('mult_weather_rain', 1.20, 'Multiplicador Pre�o: Quando chove (ex: 1.20 = +20%)'),
      },
      
      timeMultipliers: {
        day: 1.0,
        night: await getSetting('mult_time_night', 1.15, 'Multiplicador Pre�o: Noite (20h �s 02h)'),
        latenight: await getSetting('mult_time_latenight', 1.25, 'Multiplicador Pre�o: Madrugada (02h �s 06h)'),
      },
      
      dayMultipliers: {
        weekday: 1.0,
        saturday: await getSetting('mult_day_saturday', 1.10, 'Multiplicador Pre�o: S�bados'),
        sunday: await getSetting('mult_day_sunday', 1.15, 'Multiplicador Pre�o: Domingos'),
      },
      
      demandMultipliers: {
        normal: 1.0,
        high: await getSetting('mult_demand_high', 1.20, 'Multiplicador Pre�o: Alta Procura (Surge)'),
      },
      
      trafficMultipliers: {
        normal: 1.0,
        moderate: 1.15,
        heavy: await getSetting('mult_traffic_heavy', 1.35, 'Multiplicador Pre�o: Tr�nsito Intenso'),
        severe: 1.60
      },

      ratingMultipliers: {
        fiveStar: 1.0,
        fourStar: 1.0,
        threeStar: 1.0,
        twoStar: 1.0,
        oneStar: 1.0,
      }
    };

    return engineConfig;
  }

  /**
   * Consulta a API do OSRM para obter dist�ncia (em km) e tempo (em min)
   * Agora utiliza o servi�o centralizado routingService.js (com cache!)
   */
  async getRouteInfo(originLoc, destLoc) {
    if (!originLoc || !destLoc) return { distanceKm: 0, durationMin: 0, routeCoordinates: [] };
    try {
      // Importa dinamicamente para evitar depend�ncias circulares (se houver) ou usa o import no topo
      const { getRoute } = await import('./routingService.js');
      
      // O getRoute centralizado j� converte coordenadas e aplica caching
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
    
    // Fallback b�sico
    return { distanceKm: 5, durationMin: 15, routeCoordinates: [] };
  }

  /**
   * Sele��o autom�tica do ve�culo baseada no peso ou noutros crit�rios
   */
  async autoSelectVehicle(weightKg, requestedVehicleTypeId = null) {
    if (requestedVehicleTypeId) {
      return await VehicleType.findById(requestedVehicleTypeId);
    }

    // L�gica inteligente simples
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
    // Feriados n�o implementados nativamente (precisaria de API externa)

    return timeMult * dayMult;
  }

  /**
   * C�lculo Final
   */
  async calculatePrice({ serviceId, originLoc, destLoc, weightKg = 0, vehicleTypeId = null, hasHelper = false, isRaining = false, trafficCondition = 'normal', demandLevel = 'normal', providerId = null, clientSuggestedPrice = null }) {
    const engineConfig = await this.getGlobalSettings();
    const service = await ProviderSubcategory.findById(serviceId);
    
    if (!service) throw new Error("Servi�o n�o encontrado");

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

    // 2. Veculo
    let vehicle = null;
    if (service.requiresVehicleType || distanceKm > 0) {
      vehicle = await this.autoSelectVehicle(weightKg, vehicleTypeId);
    }

    // 3. Somatrio Base
    let actualBaseFare = (service.baseFare || 0) + (vehicle ? (vehicle.baseFare || 0) : 0);
    
    // Se o cliente definiu um preço sugerido, esse preço torna-se a taxa base
    if (clientSuggestedPrice !== null && clientSuggestedPrice !== undefined && clientSuggestedPrice > 0) {
      actualBaseFare = Number(clientSuggestedPrice);
    } 
    // Caso contrário, se o provedor tem um preço base definido
    else if (service.pricingMode === 'PROVIDER_DEFINED' && customBasePrice !== null && customBasePrice !== undefined) {
      actualBaseFare = customBasePrice;
    }

    const FALLBACK_PRICE_PER_KM = 40; 
    let pKm = vehicle ? (vehicle.pricePerKm || service.pricePerKm || FALLBACK_PRICE_PER_KM) : (service.pricePerKm || FALLBACK_PRICE_PER_KM); 
    
    // Desconto para viagens longas (ex: acima de 20 km, reduz 15% o valor por km)
    if (distanceKm > 20) {
      pKm = pKm * 0.85; 
    }
    
    let distanceCost = distanceKm * pKm;
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
    if (vehicle && totalPostMultipliers < vehicle.minFare) {
      actualBaseFare += (vehicle.minFare - totalPostMultipliers);
      totalPostMultipliers = vehicle.minFare;
    }
    const minSystemFare = service.pricingMode === 'PROVIDER_DEFINED' ? engineConfig.minFareService : engineConfig.minFareDelivery;
    if (totalPostMultipliers < minSystemFare) {
      actualBaseFare += (minSystemFare - totalPostMultipliers);
      totalPostMultipliers = minSystemFare;
    }

    // Arredondamento (multiplos de 10)
    totalPostMultipliers = Math.round(totalPostMultipliers * 100) / 100; // Nao arredondar para a dezena, apenas usar duas casas decimais

    return {
      price: totalPostMultipliers,
      currency: 'MT',
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
