import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index.js';
import User from '../models/UserModel.js';
import Provider from '../models/ProviderModel.js';
import Product from '../models/ProductModel.js';
import Order from '../models/OrderModel.js';
import { connectTestDB, disconnectTestDB, clearCollections } from './setup.js';

describe('E2E Simulation: NhiquelaSeller -> Nhiquela', () => {
  let sellerUser, sellerToken, providerId;
  let clientUser, clientToken;
  let productId, categoryId;

  beforeAll(async () => {
    await connectTestDB();
    // await clearCollections(); // Do not clear the whole db to avoid timeout
  });

  afterAll(async () => {
    // await clearCollections();
    await disconnectTestDB();
  });

  it('1. Vendedor regista-se e cria perfil de Provider', async () => {
    sellerUser = await User.create({
      name: 'Vendedor Teste',
      phoneNumber: '258841112222',
      password: 'password123',
      isSeller: true,
      isAdmin: false,
    });
    
    sellerToken = generateToken(sellerUser);

    const provider = await Provider.create({
      ownerId: sellerUser._id,
      userId: sellerUser._id,
      name: 'Loja do Vendedor Teste',
      phoneNumber: '258841112222',
      nuit: '123456789',
      status: 'active'
    });
    providerId = provider._id;

    expect(sellerUser._id).toBeDefined();
    expect(providerId).toBeDefined();
  });

  it('2. Vendedor cria um produto no NhiquelaSeller', async () => {
    const category = await Category.create({ name: 'Eletrónicos', slug: 'eletronicos' });
    categoryId = category._id;

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Smartphone X',
        nome: 'Smartphone X',
        slug: 'smartphone-x',
        price: 15000,
        countInStock: 10,
        category: categoryId,
        brand: 'TechBrand',
        description: 'Smartphone de ltima gerao',
        image: 'http://example.com/image.png'
      });

    expect(res.status).toBe(201);
    expect(res.body.product).toBeDefined();
    expect(res.body.product.name).toBe('Smartphone X');
    expect(res.body.product.seller.toString()).toBe(providerId.toString());

    productId = res.body.product._id;
  });

  it('3. Cliente regista-se e obtém token', async () => {
    clientUser = await User.create({
      name: 'Cliente Teste',
      phoneNumber: '258849998888',
      password: 'password123',
    });
    
    clientToken = generateToken(clientUser);

    expect(clientUser._id).toBeDefined();
    expect(clientToken).toBeDefined();
  });

  it('4. Cliente consegue visualizar o produto na loja (Nhiquela)', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ pageSize: 10, page: 1 });
      
    expect(res.status).toBe(200);
    expect(res.body.products).toBeDefined();
    
    const found = res.body.products.find(p => p._id.toString() === productId.toString());
    expect(found).toBeDefined();
    expect(found.price).toBeGreaterThan(15000); 
  });

  it('5. Cliente compra o produto (cria pedido) no Nhiquela', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderItems: [
          {
            _id: productId,
            name: 'Smartphone X',
            quantity: 1,
            seller: providerId,
            price: 15000,
            image: 'http://example.com/image.png'
          }
        ],
        address: {
          fullName: 'Cliente Teste',
          address: 'Rua Principal',
          city: 'Maputo',
          phoneNumber: '258849998888'
        },
        paymentMethod: 'mpesa',
        itemsPrice: 15000, 
        deliveryPrice: 100,
        taxPrice: 0,
        totalPrice: 15100,
        itemsPriceForSeller: 15000,
        isUserWantDelivery: true,
        isPaid: false
      });

    expect(res.status).toBe(201);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.user.toString()).toBe(clientUser._id.toString());
    
    // Simular o pagamento M-Pesa 
    await Order.findByIdAndUpdate(res.body.order._id, { isPaid: true, status: 'Pago' });
  });

  it('6. Pedido aparece na lista de "Meus Pedidos" do cliente com isPaid = true', async () => {
    const res = await request(app)
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    
    const myOrder = res.body[0];
    expect(myOrder.isPaid).toBe(true);
    expect(myOrder.status).toBe('Pago');
    expect(myOrder.deleted).toBe(false);
    expect(myOrder.orderItems[0].name).toBe('Smartphone X');
  });

});
