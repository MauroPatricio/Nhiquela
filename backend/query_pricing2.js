import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Service from './models/ServiceModel.js';
import Settings from './models/SettingsModel.js';
import FinancialConfig from './models/FinancialConfigModel.js';

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const deliverService = await Service.findOne({ name: { $regex: /deliver/i } });
    const settings = await Settings.find({ 
      key: { $in: ['delivery_pricing_model', 'delivery_base_fee', 'delivery_price_per_km', 'delivery_service_fee'] } 
    }).lean();
    
    const configs = await FinancialConfig.findOne({}).lean();

    console.log('=== SERVICO DELIVER ===');
    console.log(deliverService ? { name: deliverService.name, basePrice: deliverService.basePrice, pricingModel: deliverService.pricingModel, pricePerKm: deliverService.pricePerKm } : 'Nao encontrado');
    
    console.log('\n=== SETTINGS (Configuracoes de entrega) ===');
    console.log(settings.length > 0 ? settings : 'Nenhuma configuracao especifica encontrada na collection settings');
    
    console.log('\n=== FINANCIAL CONFIG (Comissoes) ===');
    console.log(configs ? configs : 'Nenhuma config financeira encontrada');
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
