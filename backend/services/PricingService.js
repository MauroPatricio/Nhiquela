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

    const getStringSetting = async (key, defaultValue, description) => {
      let setting = allSettings.find(s => s.key === key);
      if (!setting) {
        setting = await Settings.create({ key, value: defaultValue.toString(), description, type: 'string' });
        allSettings.push(setting);
      }
      return setting.value;
    };

    const engineConfig = {
      useGlobalPricing: await getStringSetting('use_global_pricing', 'false', 'Usar Variáveis Globais (Ignora Preço do Veículo)') === 'true',
      deliveryPricingModel: await getStringSetting('delivery_pricing_model', 'formula', 'steps ou formula'),
      deliveryBaseFee: await getSetting('delivery_base_fee', 50, 'Taxa Base de entrega (MZN)'),
      deliveryPricePerKm: await getSetting('delivery_price_per_km', 15, 'Valor cobrado por Quilómetro (MZN)'),
      deliverySteps: [
        {
          minKm: await getSetting('delivery_step_1_min_km', 0, 'Escalão 1 (Km Mínimo)'),
          maxKm: await getSetting('delivery_step_1_km', 3, 'Escalão 1 (Km)'),
          price: await getSetting('delivery_step_1_price', 80, 'Escalão 1 (Preço)')
        },
        {
          minKm: await getSetting('delivery_step_2_min_km', 3, 'Escalão 2 (Km Mínimo)'),
          maxKm: await getSetting('delivery_step_2_km', 7, 'Escalão 2 (Km)'),
          price: await getSetting('delivery_step_2_price', 120, 'Escalão 2 (Preço)')
        },
        {
          minKm: await getSetting('delivery_step_3_min_km', 7, 'Escalão 3 (Km Mínimo)'),
          maxKm: await getSetting('delivery_step_3_km', 12, 'Escalão 3 (Km)'),
          price: await getSetting('delivery_step_3_price', 180, 'Escalão 3 (Preço)')
        },
        {
          minKm: await getSetting('delivery_step_4_min_km', 12, 'Escalão 4 (Km Mínimo)'),
          maxKm: await getSetting('delivery_step_4_km', 20, 'Escalão 4 (Km)'),
          price: await getSetting('delivery_step_4_price', 250, 'Escalão 4 (Preço)')
        }
      ],
      minFareDelivery: await getSetting('min_fare_delivery', 80, 'Tarifa mnima (MT): Entregas e Txi'),
      minFareService: await getSetting('min_fare_service', 100, 'Tarifa mnima (MT): Servios (ex: Eletricista)'),
      
      weatherMultipliers: {
        clear: 1.0,
        rain: await getSetting('mult_weather_rain', 1.20, 'Multiplicador Preo: Quando chove (ex: 1.20 = +20%)'),
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
        if (provider.deliveryman.allowCustomPrice && provider.deliveryman.customPrice) {
          customBasePrice = provider.deliveryman.customPrice;
        } else if (provider.deliveryman.assigned_base_fee) {
          customBasePrice = provider.deliveryman.assigned_base_fee;
        }
        
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

    // 3. Somatório Base
    let actualBaseFare = 0;
    let distanceCost = 0;
    let timeCost = 0;
    let extras = 0;
    let serviceCost = 0;
    let overrideDistance = false;

    // Se o cliente definiu um preo sugerido ou o provedor tem um fixo
    if (clientSuggestedPrice !== null && clientSuggestedPrice !== undefined && clientSuggestedPrice > 0) {
      // IGNORAMOS o clientSuggestedPrice como serviceCost se houver providerId para evitar
      // cobrar a distncia a dobrar (pois a App envia o valor j com deslocao).
      if (!providerId) {
        serviceCost = Number(clientSuggestedPrice);
      }
    } 
    
    if (service.pricingMode === 'PROVIDER_DEFINED' && !serviceCost) {
      serviceCost = service.serviceFee || 0;
    }

    // Calcula a tarifa de deslocação (distancePrice) usando sempre os modelos globais/veículo da plataforma
    if (engineConfig.deliveryPricingModel === 'steps') {
      let stepFound = false;
      for (const step of engineConfig.deliverySteps) {
        if (distanceKm >= step.minKm && distanceKm <= step.maxKm) {
          actualBaseFare = step.price; 
          distanceCost = 0;
          stepFound = true;
          break;
        }
      }
      
      if (!stepFound) {
        const lastStep = engineConfig.deliverySteps[engineConfig.deliverySteps.length - 1];
        actualBaseFare = lastStep.price;
        const extraKm = distanceKm - lastStep.maxKm;
        const pKm = engineConfig.useGlobalPricing ? engineConfig.deliveryPricePerKm : (vehicle ? vehicle.pricePerKm || 40 : 40);
        distanceCost = extraKm * pKm;
      }
      
      timeCost = vehicle ? (durationMin * (vehicle.pricePerMinute || 0)) : 0;
    } 
    else {
      // formula
      if (engineConfig.useGlobalPricing) {
        actualBaseFare = engineConfig.deliveryBaseFee;
        let pKm = engineConfig.deliveryPricePerKm;
        if (distanceKm > 20) pKm = pKm * 0.85; 
        distanceCost = distanceKm * pKm;
      } else {
        actualBaseFare = (vehicle ? (vehicle.baseFare || 0) : 0);
        const FALLBACK_PRICE_PER_KM = 40; 
        let pKm = vehicle ? (vehicle.pricePerKm || FALLBACK_PRICE_PER_KM) : FALLBACK_PRICE_PER_KM; 
        if (distanceKm > 20) pKm = pKm * 0.85; 
        distanceCost = distanceKm * pKm;
      }
      timeCost = vehicle ? (durationMin * (vehicle.pricePerMinute || 0)) : 0;
    }

    if (hasHelper && service.supportsHelpers) extras += 200; 
    if (vehicle && vehicle.includesLoading) extras += vehicle.loadingFee;

    let distanceSubtotal = actualBaseFare + distanceCost + timeCost + extras;

    // 4. Multiplicadores (apenas na deslocação)
    let timeMult = this.getTimeMultipliers(engineConfig);
    let weatherMult = isRaining ? engineConfig.weatherMultipliers.rain : engineConfig.weatherMultipliers.clear;
    let demandMult = engineConfig.demandMultipliers[demandLevel] || 1.0;
    let trafficMult = engineConfig.trafficMultipliers[trafficCondition] || 1.0;

    let distanceTotalPostMultipliers = distanceSubtotal * timeMult * weatherMult * demandMult * trafficMult * providerRatingMult;

    // Minimums on distance
    if (vehicle && distanceTotalPostMultipliers < vehicle.minFare) {
      actualBaseFare += (vehicle.minFare - distanceTotalPostMultipliers);
      distanceTotalPostMultipliers = vehicle.minFare;
    }
    const minSystemFare = service.pricingMode === 'PROVIDER_DEFINED' ? 0 : engineConfig.minFareDelivery;
    if (service.pricingMode !== 'PROVIDER_DEFINED' && distanceTotalPostMultipliers < minSystemFare) {
      actualBaseFare += (minSystemFare - distanceTotalPostMultipliers);
      distanceTotalPostMultipliers = minSystemFare;
    }

    // Calcular subtotal final
    let subtotalFinal = distanceTotalPostMultipliers + serviceCost;
    
    // Se temos um motorista com preco customizado, aplicamos a logica para calcular o valor real (Base Motorista + Deslocacao Global)
    if (customBasePrice !== null) {
      // O valor global base seria a juncao do distance multipliers com o service fee
      let globalPrice = distanceTotalPostMultipliers + (service.serviceFee || 0);
      let serviceBase = service.baseFare || 0;
      let deslocacao = globalPrice > serviceBase ? globalPrice - serviceBase : 0;
      
      subtotalFinal = customBasePrice + deslocacao;
      actualBaseFare = customBasePrice; // Atualiza para refretir na breakdown
      distanceCost = deslocacao; // A deslocacao cobrada em excesso ao base
    } else if (clientSuggestedPrice !== null && clientSuggestedPrice > 0 && !providerId) {
      subtotalFinal = Number(clientSuggestedPrice);
    }

    // Arredondamento (apenas usar duas casas decimais)
    subtotalFinal = Math.round(subtotalFinal * 100) / 100; 

    return {
      price: subtotalFinal,
      currency: 'MT',
      routeCoordinates,
      breakdown: {
        distancePrice: distanceTotalPostMultipliers,
        servicePrice: serviceCost,
        subtotal: subtotalFinal,
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
