import mongoose from 'mongoose';
import PricingService from 'd:/Projectos/Nhiquela/backend/services/PricingService.js';
import Settings from 'd:/Projectos/Nhiquela/backend/models/SettingsModel.js';
import VehicleType from 'd:/Projectos/Nhiquela/backend/models/VehicleTypeModel.js';
import ProviderSubcategory from 'd:/Projectos/Nhiquela/backend/models/ProviderSubcategoryModel.js';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/nhiquela');
  
  const settings = await Settings.find({key: {$in: ['delivery_pricing_model', 'use_global_pricing', 'delivery_base_fee', 'delivery_price_per_km', 'delivery_step_1_price']}});
  console.log("Current Settings:", settings.map(s => ({key: s.key, value: s.value})));

  const service = await ProviderSubcategory.findOne({ name: { $regex: /entrega/i } });
  const vehicle = await VehicleType.findOne({ name: { $regex: /mota/i } });
  
  // Force day time, no rain, normal traffic
  const origin = { lat: -25.9692, lng: 32.5732 };
  const dest = { lat: -25.9692, lng: 32.5932 }; // Fake 2km
  
  // Mock OSRM just for exact 2KM
  PricingService.getRouteInfo = async () => ({
    distanceKm: 2,
    durationMin: 5,
    routeCoordinates: []
  });

  // Mock time multipliers
  PricingService.getTimeMultipliers = () => 1.0;

  try {
    const result = await PricingService.calculatePrice({
      serviceId: service ? service._id : '6677f526274431e2d78d22d2',
      originLoc: origin,
      destLoc: dest,
      vehicleTypeId: vehicle ? vehicle._id : null,
      isRaining: false,
      trafficCondition: 'normal',
      demandLevel: 'normal'
    });

    console.log("------------------------");
    console.log("Price Result:");
    console.log(JSON.stringify(result, null, 2));
  } catch(e) {
    console.error(e);
  }

  process.exit(0);
}

run();
