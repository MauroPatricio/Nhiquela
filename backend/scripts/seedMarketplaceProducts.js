import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/ProductModel.js';
import Category from '../models/CategoryModel.js';
import User from '../models/UserModel.js';
import Provider from '../models/ProviderModel.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nhiquela';

async function seedRealProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Ligado ao MongoDB para seed de produtos reais...');

    // 1. Criar/Obter Categorias Reais no MongoDB
    const categoriesData = [
      { name: 'Mercearia & Alimentos', nome: 'Mercearia & Alimentos', icon: '🛒', shortName: 'Mercearia', description: 'Produtos alimentares e mercearia geral' },
      { name: 'Eletrónica & Telefones', nome: 'Eletrónica & Telefones', icon: '📱', shortName: 'Eletrónica', description: 'Telemóveis, computadores e eletrónica' },
      { name: 'Gás & Combustíveis', nome: 'Gás & Combustíveis', icon: '🔥', shortName: 'Gás', description: 'Recargas de gás de cozinha e combustível' },
      { name: 'Eletrodomésticos', nome: 'Eletrodomésticos', icon: '📺', shortName: 'Eletrodomésticos', description: 'Frigoríficos, TV, micro-ondas' },
      { name: 'Vestuário & Moda', nome: 'Vestuário & Moda', icon: '👕', shortName: 'Moda', description: 'Roupas, calçado e acessórios' }
    ];

    const seededCategories = [];
    for (const cat of categoriesData) {
      let existing = await Category.findOne({ name: cat.name });
      if (!existing) {
        existing = await Category.create(cat);
      }
      seededCategories.push(existing);
    }
    console.log(`✓ ${seededCategories.length} Categorias no MongoDB!`);

    // 2. Criar/Obter Fornecedor/Vendedor Aprovado no MongoDB
    let sellerUser = await User.findOne({ isSeller: true, isApproved: true });
    if (!sellerUser) {
      sellerUser = await User.create({
        name: 'Loja Central Nhiquela',
        email: 'fornecedor@nhiquela.mz',
        phoneNumber: '840001122',
        password: 'password123#',
        isSeller: true,
        isApproved: true,
        isActive: true
      });
    }

    let provider = await Provider.findOne({ userId: sellerUser._id });
    if (!provider) {
      provider = await Provider.create({
        userId: sellerUser._id,
        name: 'Loja Central Nhiquela',
        status: 'active',
        city: 'Maputo',
        province: 'Maputo Cidade'
      });
    }

    // 3. Criar Produtos Reais no MongoDB
    const realProductsData = [
      {
        nome: 'Garrafa de Gás 11kg (Recarga Completa)',
        name: 'Garrafa de Gás 11kg (Recarga Completa)',
        slug: 'garrafa-de-gas-11kg',
        seller: provider._id,
        category: seededCategories[2]._id, // Gás
        brand: 'Mogas',
        description: 'Recarga rápida de botijão de gás doméstico de 11kg com selo de garantia.',
        priceFromSeller: 850,
        comissionPercentage: 10,
        priceComission: 100,
        price: 950,
        countInStock: 40,
        rating: 4.9,
        numReviews: 18,
        images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'],
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
        isActive: true
      },
      {
        nome: 'Saco de Arroz Premium 25kg (Tipo 1)',
        name: 'Saco de Arroz Premium 25kg (Tipo 1)',
        slug: 'saco-de-arroz-25kg',
        seller: provider._id,
        category: seededCategories[0]._id, // Mercearia
        brand: 'Cigala',
        description: 'Arroz agulha de alta qualidade, saco de 25kg para consumo familiar.',
        priceFromSeller: 1100,
        comissionPercentage: 10,
        priceComission: 150,
        price: 1250,
        countInStock: 100,
        rating: 4.8,
        numReviews: 32,
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500'],
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500',
        isActive: true
      },
      {
        nome: 'Smartphone Samsung Galaxy A15 128GB Dual SIM',
        name: 'Smartphone Samsung Galaxy A15 128GB Dual SIM',
        slug: 'samsung-galaxy-a15-128gb',
        seller: provider._id,
        category: seededCategories[1]._id, // Eletrónica
        brand: 'Samsung',
        description: 'Ecrã AMOLED 6.5", câmara tripla 50MP, 4GB RAM e bateria de 5000mAh.',
        priceFromSeller: 10500,
        comissionPercentage: 10,
        priceComission: 1000,
        price: 11500,
        countInStock: 15,
        rating: 5.0,
        numReviews: 12,
        images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500'],
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500',
        isActive: true
      },
      {
        nome: 'Smart TV LED 43" Full HD Smart Android',
        name: 'Smart TV LED 43" Full HD Smart Android',
        slug: 'smart-tv-led-43-full-hd',
        seller: provider._id,
        category: seededCategories[3]._id, // Eletrodomésticos
        brand: 'LG',
        description: 'Televisor inteligente 43 polegadas com Wi-Fi, Netflix e YouTube integrados.',
        priceFromSeller: 17000,
        comissionPercentage: 10,
        priceComission: 1900,
        price: 18900,
        countInStock: 8,
        rating: 4.7,
        numReviews: 9,
        images: ['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500'],
        image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500',
        isActive: true
      }
    ];

    for (const prodData of realProductsData) {
      let existing = await Product.findOne({ slug: prodData.slug });
      if (!existing) {
        await Product.create(prodData);
      }
    }

    console.log('✓ Seed de produtos reais executado com Sucesso no MongoDB!');
  } catch (err) {
    console.error('Erro ao fazer seed de produtos reais:', err);
  } finally {
    mongoose.disconnect();
  }
}

seedRealProducts();
