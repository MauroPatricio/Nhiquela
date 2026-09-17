import 'dotenv/config';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import Order from '../models/OrderModel.js';
import User from '../models/UserModel.js';
import Provider from '../models/ProviderModel.js';
import Product from '../models/ProductModel.js';
import orderRouter from '../routes/orderRoutes.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

const ioMock = {
  to: () => ({ emit: () => {} }),
  emit: () => {}
};
app.set('io', ioMock);

app.use('/api/orders', orderRouter);

describe('Order Respond (/orders/:id/respond) Endpoint', () => {
  let sellerToken, sellerId, clientId, orderId, product;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nhiquela_test');
    }

    const client = new User({
      name: 'Cliente Teste Respond',
      email: `client_respond_${Date.now()}@test.com`,
      password: 'password',
      phoneNumber: 840000000 + Math.floor(Math.random() * 1000000),
    });
    await client.save();
    clientId = client._id;

    const seller = new User({
      name: 'Vendedor Teste Respond',
      email: `seller_respond_${Date.now()}@test.com`,
      password: 'password',
      phoneNumber: 840000000 + Math.floor(Math.random() * 1000000),
      isSeller: true,
    });
    await seller.save();
    sellerId = seller._id;

    sellerToken = jwt.sign(
      { _id: sellerId, name: seller.name, email: seller.email, isSeller: true, isAdmin: false },
      process.env.JWT_SECRET || 'somethingsecret',
      { expiresIn: '30d' }
    );

    product = new Product({
      name: 'Produto Teste Respond',
      nome: 'Produto Teste Respond',
      slug: `produto-respond-${Date.now()}`,
      category: new mongoose.Types.ObjectId(),
      image: 'http://test.com/img.png',
      price: 500,
      priceFromSeller: 425,
      priceComission: 75,
      comissionPercentage: 15,
      brand: 'TestBrand',
      rating: 5,
      numReviews: 1,
      description: 'Descricao teste',
      countInStock: 10,
      seller: sellerId
    });
    await product.save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('1. Deve aceitar o pedido com sucesso ao enviar action "accept"', async () => {
    const order = new Order({
      user: clientId,
      seller: sellerId,
      orderItems: [{
        name: product.name,
        quantity: 2,
        price: 500,
        product: product._id,
        seller: sellerId.toString()
      }],
      totalPrice: 1000,
      itemsPrice: 1000,
      status: 'Pendente',
      code: '888111',
      stepStatus: 1
    });
    await order.save();
    orderId = order._id;

    const res = await request(app)
      .put(`/api/orders/${orderId}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ action: 'accept' });

    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.status).toBe('Aceite');
    expect(res.body.order.isAccepted).toBe(true);
    expect(res.body.order.stepStatus).toBe(2);
  });

  it('2. Deve rejeitar o pedido e repor o stock ao enviar action "reject"', async () => {
    const order2 = new Order({
      user: clientId,
      seller: sellerId,
      orderItems: [{
        name: product.name,
        quantity: 3,
        price: 500,
        product: product._id,
        seller: sellerId.toString()
      }],
      totalPrice: 1500,
      itemsPrice: 1500,
      status: 'Pendente',
      code: '888222',
      stepStatus: 1
    });
    await order2.save();

    const initialStock = (await Product.findById(product._id)).countInStock;

    const res = await request(app)
      .put(`/api/orders/${order2._id}/respond`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ action: 'reject', reason: 'Sem stock no momento' });

    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.status).toBe('Rejeitado');
    expect(res.body.order.isCanceled).toBe(true);
    expect(res.body.order.canceledReason).toBe('Sem stock no momento');

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.countInStock).toBe(initialStock + 3);
  });
});
