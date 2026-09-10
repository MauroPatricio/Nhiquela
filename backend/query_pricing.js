import mongoose from 'mongoose';

(async () => {
  try {
    await mongoose.connect('mongodb+srv://nhiquelabd:root123@nhiquela.7pafgjv.mongodb.net/?retryWrites=true&w=majority');
    // Using the default db from URI
    const db = mongoose.connection.useDb('test'); // mongoose defaults to test if not specified, but let's query the main one
    
    const Service = mongoose.connection.collection('services');
    const Settings = mongoose.connection.collection('settings');
    const Configs = mongoose.connection.collection('financialconfigs');
    
    const deliverService = await Service.findOne({ name: { $regex: /deliver/i } });
    const settings = await Settings.find({ 
      key: { $in: ['delivery_pricing_model', 'delivery_base_fee', 'delivery_price_per_km', 'delivery_service_fee'] } 
    }).toArray();
    
    const configs = await Configs.find({}).toArray();

    console.log('=== SERVICO DELIVER ===');
    console.log(deliverService ? { name: deliverService.name, basePrice: deliverService.basePrice, pricingModel: deliverService.pricingModel } : 'Não encontrado');
    
    console.log('\n=== SETTINGS (Configuracoes de entrega) ===');
    console.log(settings.length > 0 ? settings : 'Nenhuma configuracao especifica encontrada');
    
    console.log('\n=== FINANCIAL CONFIG (Comissoes) ===');
    console.log(configs.length > 0 ? configs : 'Nenhuma config financeira encontrada');
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
