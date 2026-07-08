// seedRoutes.js � seeds initial data for development/testing
import express from 'express';
import Product from '../models/ProductModel.js';
import Service from '../models/ServiceModel.js';
import Category from '../models/CategoryModel.js';
import User from '../models/UserModel.js';
import Establishment from '../models/Establishment.js';
import ProcessingFee from '../models/ProcessingFee.js';
import CancellationPolicy from '../models/CancellationPolicy.js';
import data from '../data.js';

const seedRoutes = express.Router();

seedRoutes.get('/', async (req, res) => {
  try {
    // Clear existing collections
    await Promise.all([
      Product.deleteMany({}),
      Service.deleteMany({}),
      User.deleteMany({}),
      Category.deleteMany({}),
      Establishment.deleteMany({}),
      ProcessingFee.deleteMany({}),
      CancellationPolicy.deleteMany({}),
    ]);

    // Insert default categories
    const defaultCategories = await Category.insertMany([
      { icon: '??', name: 'Supermercado', nome: 'Supermercado', description: 'Supermercado', isActive: true },
      { icon: '??', name: 'Restaurantes', nome: 'Restaurantes', description: 'Restaurantes', isActive: true },
      { icon: '??', name: 'Farm�cia', nome: 'Farm�cia', description: 'Farm�cia', isActive: true },
      { icon: '???', name: 'Servi�os', nome: 'Servi�os', description: 'Servi�os', isActive: true },
    ]);

    // Seed sample users and products
    const createdUsers = await User.insertMany(data.users);
    const createdProducts = await Product.insertMany(data.products || []);

    // Seed establishments (example entries)
    const establishments = await Establishment.insertMany([
      { name: 'Supermercado Central', type: 'supermarket', active: true },
      { name: 'Farm�cia Sa�de', type: 'pharmacy', active: true },
    ]);

    // Seed processing fees (example overrides)
    await ProcessingFee.insertMany([
      // Base fee for prescription service (fixed amount)
      { serviceType: 'prescription', amount: 5, exempt: false },
      // Shopping list fee � 2% of order total (no fixed amount)
      { serviceType: 'shopping_list', percentage: 2, exempt: false },
      // Special order fee � exempt (no charge)
      { serviceType: 'special_order', exempt: true },
      // Per-establishment override example (supermarket incurs 3% instead of base 2%)
      {
        serviceType: 'shopping_list',
        percentage: 3,
        establishment: establishments.find(e => e.type === 'supermarket')._id,
      },
    ]);

    // Seed cancellation policies (example messages)
    await CancellationPolicy.insertMany([
      { stage: 'pending', chargeProcessingFee: false, message: 'Cancel anytime before validation without fee.' },
      { stage: 'in_validation', chargeProcessingFee: true, message: 'Cancellation after validation will retain processing fee.' },
      { stage: 'validated', chargeProcessingFee: true, message: 'Cancellation after validation incurs full processing fee.' },
    ]);

    res.json({ createdUsers, establishments, message: 'Seed data loaded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default seedRoutes;
