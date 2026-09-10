import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Service from './models/ServiceModel.js';
import Settings from './models/SettingsModel.js';
import { getFinancialConfig } from './services/walletService.js';

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const services = await Service.find({}).select('name basePrice pricingModel pricePerKm').lean();
    const settings = await Settings.find({}).lean();
    const configs = await getFinancialConfig();

    console.log('=== TODOS OS SERVICOS ===');
    console.table(services);
    
    console.log('\n=== TODAS AS SETTINGS ===');
    console.log(settings.length > 0 ? settings : 'Nenhuma configuracao encontrada na collection settings');
    
    console.log('\n=== FINANCIAL CONFIG (Comissoes) ===');
    console.log(configs ? configs : 'Nenhuma config financeira encontrada');
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
