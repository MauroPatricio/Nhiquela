// backend/tests/digitalProductsE2E.test.js
import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index.js';
import User from '../models/UserModel.js';
import Product from '../models/ProductModel.js';
import Order from '../models/OrderModel.js';
import Provider from '../models/ProviderModel.js';
import Category from '../models/CategoryModel.js';
import { generateToken } from '../utils.js';

let sellerToken;
let clientToken;
let sellerUser;
let clientUser;
let providerDoc;
let categoryDoc;
let createdProductId;

beforeAll(async () => {
  let attempts = 0;
  while (mongoose.connection.readyState !== 1 && attempts < 15) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }

  const TS = Date.now();
  sellerUser = await User.create({
    name: 'Digital Seller Test',
    email: `seller_digital_${TS}@test.com`,
    password: 'password123',
    phoneNumber: 840000000 + Math.floor(Math.random() * 900000),
    isSeller: true,
    isApproved: true,
    seller: { openstore: true }
  });
  sellerToken = generateToken(sellerUser);

  providerDoc = await Provider.create({
    ownerId: sellerUser._id,
    userId: sellerUser._id,
    name: 'Digital Store'
  });

  clientUser = await User.create({
    name: 'Digital Buyer Test',
    email: `buyer_digital_${TS}@test.com`,
    password: 'password123',
    phoneNumber: 840000000 + Math.floor(Math.random() * 900000)
  });
  clientToken = generateToken(clientUser);

  categoryDoc = await Category.create({ nome: 'Digital Test Category' });
});

afterAll(async () => {
  if (sellerUser) await User.deleteOne({ _id: sellerUser._id });
  if (clientUser) await User.deleteOne({ _id: clientUser._id });
  if (providerDoc) await Provider.deleteOne({ _id: providerDoc._id });
  if (categoryDoc) await Category.deleteOne({ _id: categoryDoc._id });
  if (createdProductId) await Product.deleteOne({ _id: createdProductId });
  await Order.deleteMany({ code: 'DIG-TEST-001' });
});

describe('Digital Products & Licensing E2E Flow', () => {
  it('1. Deve permitir ao Vendedor cadastrar um Produto Digital com Chaves de Ativação', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Cartão PSN 10 USD (Digital)',
        nome: 'Cartão PSN 10 USD (Digital)',
        brand: 'PlayStation',
        category: categoryDoc._id,
        description: 'Código de carregamento para PlayStation Store',
        price: 750,
        image: '/images/products/psn10.jpg',
        countInStock: 2,
        productType: 'DIGITAL',
        digitalType: 'KEY',
        digitalDeliveryMode: 'AUTOMATIC',
        digitalInstructions: 'Resgatar na PlayStation Store em Adicionar Códigos.',
        initialKeys: ['PSN-10USD-AAAA', 'PSN-10USD-BBBB']
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.product).toBeDefined();
    expect(res.body.product.productType).toBe('DIGITAL');
    expect(res.body.product.digitalDeliveryMode).toBe('AUTOMATIC');
    expect(res.body.product.digitalStockKeys.length).toBe(2);
    expect(res.body.product.countInStock).toBe(2);

    createdProductId = res.body.product._id;
  });

  it('2. Deve permitir adicionar mais chaves ao stock do produto digital', async () => {
    const res = await request(app)
      .post(`/api/products/${createdProductId}/digital-keys`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        keys: ['PSN-10USD-CCCC', 'PSN-10USD-DDDD']
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.countInStock).toBe(4);
    expect(res.body.totalKeys).toBe(4);
  });

  it('3. Deve processar a compra do produto digital com entrega instantânea da chave', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderItems: [
          {
            _id: createdProductId,
            product: createdProductId,
            name: 'Cartão PSN 10 USD (Digital)',
            image: '/images/products/psn10.jpg',
            price: 750,
            quantity: 1,
            seller: providerDoc._id,
            productType: 'DIGITAL'
          }
        ],
        paymentMethod: 'M-Pesa',
        itemsPrice: 750,
        itemsPriceForSeller: 750,
        deliveryPrice: 0,
        totalPrice: 750,
        isUserWantDelivery: false,
        isPaid: true
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.isDigitalOrder).toBe(true);
    expect(res.body.order.deliveryPrice).toBe(0);
    expect(res.body.order.digitalDeliveredItems.length).toBe(1);
    expect(res.body.order.digitalDeliveredItems[0].key).toBe('PSN-10USD-AAAA');
    expect(res.body.order.status).toBe('Entregue');

    // Verificar se o stock foi atualizado para 3
    const updatedProduct = await Product.findById(createdProductId);
    expect(updatedProduct.countInStock).toBe(3);
    const usedKeys = updatedProduct.digitalStockKeys.filter(k => k.isUsed);
    expect(usedKeys.length).toBe(1);
  });
});
