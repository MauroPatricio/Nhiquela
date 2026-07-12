// seedRoutes.js - seeds initial data for development/testing
import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/UserModel.js';

import PricingEngine from '../models/PricingEngineModel.js';
import Settings from '../models/SettingsModel.js';
import Color from '../models/ColorModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import PaymentMethod from '../models/PaymentMethod.js';
import ProviderType from '../models/ProviderTypeModel.js';
import VehicleType from '../models/VehicleTypeModel.js';
import Province from '../models/ProvinceModel.js';
import AppConfig from '../models/AppConfigModel.js';
import ProviderClassification from '../models/ProviderClassificationModel.js';
import VehicleColor from '../models/VehicleColorModel.js';

import providerSubcategoriesData from '../seeds/providerSubcategories.js';
import paymentMethodsData from '../seeds/paymentMethods.js';
import providerTypesData from '../seeds/providerTypes.js';
import vehicleTypesData from '../seeds/vehicleTypes.js';
import provincesData from '../seeds/provinces.js';
import settingsData from '../seeds/settings.js';
import appConfigsData from '../seeds/appConfigs.js';
import providerClassificationsData from '../seeds/providerClassifications.js';
import pricingEnginesData from '../seeds/pricingEngines.js';
import vehicleColorsData from '../seeds/vehicleColors.js';
import colorsData from '../seeds/colors.js';

const seedRoutes = express.Router();

seedRoutes.get('/', async (req, res) => {
  try {
    const messages = [];

    // 1. Seed Admin User Safely
    const adminEmail = 'owner@example.com';
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      const newAdmin = new User({
        name: 'Owner Admin',
        email: adminEmail,
        phoneNumber: '840000000',
        password: bcrypt.hashSync('password123#', 8),
        isAdmin: true,
        isDeliveryMan: false,
        isActive: true,
      });
      await newAdmin.save();
      messages.push(`Admin ${adminEmail} criado com sucesso.`);
    } else {
      messages.push(`Admin ${adminEmail} já existe.`);
    }

    // 2. Seed Settings
    await Settings.deleteMany({});
    await Settings.insertMany(settingsData);
    messages.push('Configurações (Settings) atualizadas.');

    // 3. Seed Pricing Engine
    await PricingEngine.deleteMany({});
    await PricingEngine.insertMany(pricingEnginesData);
    messages.push('Preços de Viagens (PricingEngine) atualizados.');

    // 4. Seed Colors
    await Color.deleteMany({});
    await Color.insertMany(colorsData);
    messages.push('Cores de Veículos Genéricas (Colors) atualizadas.');

    // 5. Seed Provider Subcategories
    await ProviderSubcategory.deleteMany({});
    await ProviderSubcategory.insertMany(providerSubcategoriesData);
    messages.push('Subcategorias de Serviço (ProviderSubcategories) atualizadas.');

    // 6. Seed Payment Methods
    await PaymentMethod.deleteMany({});
    await PaymentMethod.insertMany(paymentMethodsData);
    messages.push('Formas de Pagamento (PaymentMethods) atualizadas.');

    // 7. Seed Provider Types
    await ProviderType.deleteMany({});
    await ProviderType.insertMany(providerTypesData);
    messages.push('Tipos de Prestadores (ProviderTypes) atualizados.');

    // 8. Seed Vehicle Types
    await VehicleType.deleteMany({});
    await VehicleType.insertMany(vehicleTypesData);
    messages.push('Tipos de Veículo (VehicleTypes) atualizados.');

    // 9. Seed Provinces
    await Province.deleteMany({});
    await Province.insertMany(provincesData);
    messages.push('Províncias (Provinces) atualizadas.');

    // 10. Seed App Configs
    await AppConfig.deleteMany({});
    await AppConfig.insertMany(appConfigsData);
    messages.push('Configurações da App (AppConfigs) atualizadas.');

    // 11. Seed Provider Classifications
    await ProviderClassification.deleteMany({});
    await ProviderClassification.insertMany(providerClassificationsData);
    messages.push('Classificações de Prestador (ProviderClassifications) atualizadas.');

    // 12. Seed Vehicle Colors Específicas
    await VehicleColor.deleteMany({});
    await VehicleColor.insertMany(vehicleColorsData);
    messages.push('Cores de Veículos Específicas (VehicleColors) atualizadas.');

    res.json({ message: 'Seed de Sistema executado com SUCESSO (Com dados de Base)!', logs: messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default seedRoutes;
