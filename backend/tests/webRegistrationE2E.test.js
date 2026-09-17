import 'dotenv/config';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';

import User from '../models/UserModel.js';
import Provider from '../models/ProviderModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import ProviderType from '../models/ProviderTypeModel.js';
import ProviderClassification from '../models/ProviderClassificationModel.js';
import Province from '../models/ProvinceModel.js';

import userRouter from '../routes/userRoutes.js';

let app;
let testSubcategoryId;
let testProvinceId;
const TS = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'somethingsecret';
  
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  app = express();
  app.use(express.json());
  app.use('/api/users', userRouter);

  // Criar Província no DB para satisfazer busca por ObjectId/Nome
  let provDoc = await Province.findOne({ name: 'Maputo Cidade' });
  if (!provDoc) {
    provDoc = await Province.create({ name: 'Maputo Cidade' });
  }
  testProvinceId = provDoc._id.toString();

  // Criar Classificação & Tipo para testes de Subcategoria
  let businessCls = await ProviderClassification.findOne({ name: 'BUSINESS' });
  if (!businessCls) {
    businessCls = await ProviderClassification.create({ name: 'BUSINESS' });
  }

  let businessType = await ProviderType.findOne({ classificationId: businessCls._id });
  if (!businessType) {
    businessType = await ProviderType.create({ name: `Comércio Geral ${TS}`, classificationId: businessCls._id });
  }

  const subcat = await ProviderSubcategory.create({
    name: `Mercearia & Supermercado ${TS}`,
    providerTypeId: businessType._id,
    isActive: true,
  });
  testSubcategoryId = subcat._id.toString();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('E2E Test: Registo e Autenticação Web (Cliente vs Fornecedor)', () => {

  // =========================================================================
  // CENÁRIO 1: REGISTO WEB DE CLIENTE (isSeller: false)
  // =========================================================================
  describe('Cenário 1: Registo Web de Cliente (isSeller: false)', () => {
    const clientData = {
      name: 'Cliente Web Teste',
      email: `clienteweb_${TS}@nhiquela.test`,
      phoneNumber: `+2588499${TS.toString().slice(-4)}`,
      password: 'password123',
      isSeller: false,
      registeredFrom: 'nhiquelaweb',
    };

    it('1.1 Registar cliente web com sucesso e retornar token JWT', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send(clientData);

      expect(res.status).toBe(200);
      expect(res.body._id).toBeDefined();
      expect(res.body.name).toBe(clientData.name);
      expect(res.body.email).toBe(clientData.email);
      expect(res.body.isSeller).toBe(false);
      expect(res.body.token).toBeDefined();

      // Verificar criação de utilizador no MongoDB
      const userInDb = await User.findById(res.body._id);
      expect(userInDb).toBeDefined();
      expect(userInDb.isSeller).toBe(false);
    });

    it('1.2 Efetuar login do cliente web por email ou telemóvel', async () => {
      // Login por E-mail
      const resEmail = await request(app)
        .post('/api/users/signin')
        .send({
          email: clientData.email,
          password: clientData.password,
        });

      expect(resEmail.status).toBe(200);
      expect(resEmail.body.token).toBeDefined();
      expect(resEmail.body.email).toBe(clientData.email);

      // Login por Número de Telemóvel
      const resPhone = await request(app)
        .post('/api/users/signin')
        .send({
          phoneNumber: clientData.phoneNumber,
          password: clientData.password,
        });

      expect(resPhone.status).toBe(200);
      expect(resPhone.body.token).toBeDefined();
      expect(resPhone.body.name).toBe(clientData.name);
    });
  });

  // =========================================================================
  // CENÁRIO 2: REGISTO WEB DE FORNECEDOR / NEGÓCIO (isSeller: true)
  // =========================================================================
  describe('Cenário 2: Registo Web de Fornecedor / Negócio (isSeller: true)', () => {
    const sellerData = {
      name: 'Proprietario Loja Teste',
      email: `fornecedorweb_${TS}@nhiquela.test`,
      phoneNumber: `+2588699${TS.toString().slice(-4)}`,
      password: 'password123',
      isSeller: true,
      registeredFrom: 'nhiquelaweb',
      seller: {
        name: `Supermercado Nhiquela Web ${TS}`,
        logo: 'https://nhiquela.co.mz/logo.png',
        description: 'Venda de bens alimentares e eletrodomésticos',
        address: 'Av. 24 de Julho, nº 2500, Maputo',
        province: testProvinceId,
        tipoEstabelecimento: testSubcategoryId,
        phoneNumberAccount: '841234567',
        alternativePhoneNumberAccount: '861234567',
        bankAccount: '12345678901',
        latitude: -25.9692,
        longitude: 32.5732,
      },
    };

    let createdSellerId;

    it('2.1 Registar fornecedor web criando Utilizador e Estabelecimento (Provider)', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send(sellerData);

      expect(res.status).toBe(200);
      expect(res.body._id).toBeDefined();
      expect(res.body.name).toBe(sellerData.name);
      expect(res.body.isSeller).toBe(true);
      expect(res.body.token).toBeDefined();
      createdSellerId = res.body._id;

      // Verificar criação de registo na colecção Provider (Estabelecimento) pelo userId
      const providerInDb = await Provider.findOne({ userId: createdSellerId });
      expect(providerInDb).toBeDefined();
      expect(providerInDb.name).toBe(sellerData.seller.name);
      expect(providerInDb.location.address).toBe(sellerData.seller.address);
    });

    it('2.2 Efetuar login do fornecedor web e retornar credenciais com isSeller: true', async () => {
      const res = await request(app)
        .post('/api/users/signin')
        .send({
          email: sellerData.email,
          password: sellerData.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.isSeller).toBe(true);
      expect(res.body.email).toBe(sellerData.email);
    });
  });

  // =========================================================================
  // CENÁRIO 3: VALIDAÇÕES DE SEGURANÇA E REJEIÇÕES
  // =========================================================================
  describe('Cenário 3: Validações de Segurança no Registo e Login Web', () => {
    it('3.1 Rejeitar registo com e-mail duplicado (409 Conflict)', async () => {
      const duplicateData = {
        name: 'Usuario Duplicado',
        email: `clienteweb_${TS}@nhiquela.test`, // E-mail já usado no Cenário 1
        phoneNumber: '+258841112233',
        password: 'password123',
      };

      const res = await request(app)
        .post('/api/users/signup')
        .send(duplicateData);

      expect(res.status).toBe(409);
      expect(res.body.message).toBeDefined();
    });

    it('3.2 Rejeitar login com senha incorreta (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/users/signin')
        .send({
          email: `clienteweb_${TS}@nhiquela.test`,
          password: 'senha_errada',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBeDefined();
    });
  });
});
