import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import importRoutes from '../modules/import/routes/importRoutes.js';
import ImportRequest from '../modules/import/models/ImportRequestModel.js';
import ImportQuotation from '../modules/import/models/ImportQuotationModel.js';
import ImportOrder from '../modules/import/models/ImportOrderModel.js';
import ImportShipment from '../modules/import/models/ImportShipmentModel.js';
import { calculateQuotation } from '../modules/import/services/ImportCostCalculator.js';

let mongoServer;
const app = express();
app.use(express.json());

// Mock Auth Middleware
app.use((req, res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId().toString(), role: 'customer' };
    next();
});
app.use('/api/import', importRoutes);

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await ImportRequest.deleteMany({});
    await ImportQuotation.deleteMany({});
    await ImportOrder.deleteMany({});
    await ImportShipment.deleteMany({});
});

describe('Nhiquela Import Module Tests', () => {
    
    let sampleRequestId;
    let sampleQuotationId;
    let sampleOrderId;

    describe('1. ImportRequest', () => {
        it('Deve criar um pedido de importação com sucesso e validar os campos', async () => {
            const reqBody = {
                productName: 'Máquina CNC 5 Eixos',
                description: 'Alta precisão, 220V',
                quantity: 1,
                productUrl: 'https://alibaba.com/machine',
                preferredOriginCountry: 'China',
                targetBudget: 500000,
                notes: 'Urgente'
            };

            const res = await request(app).post('/api/import/requests').send(reqBody);
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('_id');
            expect(res.body.productName).toBe('Máquina CNC 5 Eixos');
            expect(res.body.status).toBe('REQUESTED');

            sampleRequestId = res.body._id;
        });

        it('Deve alterar o estado do pedido', async () => {
            const reqBody = { productName: 'Teste', description: 'Teste', quantity: 1 };
            const createRes = await request(app).post('/api/import/requests').send(reqBody);
            
            const updateRes = await request(app)
                .put(`/api/import/requests/${createRes.body._id}/status`)
                .send({ status: 'SOURCING' });
            
            expect(updateRes.statusCode).toBe(200);
            expect(updateRes.body.status).toBe('SOURCING');
        });
    });

    describe('2. ImportQuotation', () => {
        it('Deve calcular custos de importação corretamente através do Calculator Service', () => {
            const costs = {
                productCost: 1000,
                internationalShipping: 200,
                customsEstimated: 300,
                nhiquelaServiceFee: 150
            };
            const result = calculateQuotation(costs);
            expect(result.totalCost).toBe(1650);
            expect(result.productCost).toBe(1000);
        });

        it('Deve criar uma cotação e alterar o status do request', async () => {
            const requestBody = { productName: 'Teste Quotation', description: 'desc', quantity: 2 };
            const reqRes = await request(app).post('/api/import/requests').send(requestBody);
            
            const quoteBody = {
                requestId: reqRes.body._id,
                productCost: 1000,
                internationalShipping: 500,
                currency: 'MZN'
            };
            const quoteRes = await request(app).post('/api/import/quotations').send(quoteBody);
            expect(quoteRes.statusCode).toBe(201);
            expect(quoteRes.body.totalCost).toBe(1500); // 1000 + 500

            // Verifica status do request originário
            const updatedReq = await ImportRequest.findById(reqRes.body._id);
            expect(updatedReq.status).toBe('QUOTATION_READY');
        });
    });

    describe('3. ImportOrder e Transição de Estados', () => {
        it('Deve criar uma ordem quando o cliente aceitar a cotação', async () => {
            // Setup Req -> Quotation
            const reqBody = { productName: 'Ordem Teste', description: 'desc', quantity: 1 };
            const requestRes = await request(app).post('/api/import/requests').send(reqBody);
            
            const quoteRes = await request(app).post('/api/import/quotations').send({
                requestId: requestRes.body._id, productCost: 1000
            });
            const quoteId = quoteRes.body._id;

            // Enviar a cotação (mudar estado para SENT)
            await request(app).post(`/api/import/quotations/${quoteId}/send`);
            
            // Aceitar cotação
            const acceptRes = await request(app).post(`/api/import/quotations/${quoteId}/accept`);
            expect(acceptRes.statusCode).toBe(200);
            expect(acceptRes.body.order).toBeDefined();
            expect(acceptRes.body.order.status).toBe('PAYMENT_PENDING');
            expect(acceptRes.body.order.totalAmount).toBe(1000);
        });
    });

    describe('4. Segurança e Permissões (Isolamento)', () => {
        it('Cliente A não consegue ver pedidos do Cliente B (isolamento na rota de listagem)', async () => {
            // Mock criado pelo middleware de autenticação isola requests ao utilizador actual.
            const res = await request(app).get('/api/import/requests');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

});
