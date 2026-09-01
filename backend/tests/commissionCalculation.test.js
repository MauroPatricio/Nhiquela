import 'dotenv/config';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';
import Wallet from '../models/WalletModel.js';
import Transaction from '../models/TransactionModel.js';
import { debitCommission } from '../services/walletService.js';
import statsRouter from '../routes/statsRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/stats', statsRouter);

describe('Cálculo de Comissões e Atualização da Base de Dados', () => {
  let driver;
  let delivery;
  let initialBalance = 1000;
  let commissionAmount = 150; // 15% de 1000, por exemplo
  
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_db';
    await mongoose.connect(uri);

    // 1. Criar um Motorista de Teste
    driver = new User({
      name: 'Motorista Comissão',
      email: `driver_comm_${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
      isDeliveryMan: true,
      status: 'Disponível'
    });
    await driver.save();

    // 2. Dar saldo inicial na carteira do motorista
    await Wallet.create({
      ownerId: driver._id,
      ownerType: 'driver',
      userId: driver._id,
      balance: initialBalance
    });

    // 3. Simular uma Viagem Paga e Concluída (Entregue)
    delivery = new RequestService({
      name: 'Entrega Teste',
      phoneNumber: '840000000',
      goodType: 'Documentos',
      transportType: 'Mota',
      deliverCity: 'Maputo',
      origin: 'Ponto A',
      destination: 'Ponto B',
      description: 'Teste',
      paymentMethod: 'Cash',
      paymentOption: 'Cash',
      deliveryPrice: 1000, // Preço da viagem
      isPaid: true,
      paidAt: new Date(),
      status: 'Entregue',
      isDelivered: true,
      platformCommission: commissionAmount, // Nova regra
      deliveryman: { id: driver._id, name: driver.name }
    });
    await delivery.save();
  });

  afterAll(async () => {
    if (driver) await User.deleteOne({ _id: driver._id });
    if (delivery) await RequestService.deleteOne({ _id: delivery._id });
    await Wallet.deleteMany({ ownerId: driver._id });
    await Transaction.deleteMany({ walletId: { $exists: true } }); // Limpar as transações
    await mongoose.connection.close();
  });

  it('1. O sistema deve debitar o saldo do motorista corretamente', async () => {
    // Quando a viagem termina, o debitCommission é invocado
    await debitCommission(driver._id, commissionAmount);
    
    // Verificar o saldo da carteira
    const wallet = await Wallet.findOne({ ownerId: driver._id });
    expect(wallet.balance).toBe(initialBalance - commissionAmount); // 1000 - 150 = 850
  });

  it('2. Os cálculos devem refletir na API de Estatísticas Financeiras (Dashboard)', async () => {
    // Fazer uma requisição ao endpoint de stats que alimenta os cartões do dashboard
    const response = await request(app).get('/api/stats/financial');
    
    expect(response.status).toBe(200);
    const stats = response.body;

    // Verificar se o lucro/comissão está a ser agregado na receita diária/semanal
    // O valor comissaoArrecadada deve ser pelo menos commissionAmount (se a bd estiver vazia) 
    // ou no mínimo conter o valor.
    expect(stats.comissaoArrecadada).toBeGreaterThanOrEqual(commissionAmount);
    expect(stats.numServicosConcluídos).toBeGreaterThanOrEqual(1);
    
    // Validar se o motorista entrou no ranking (já que ele fez a viagem e o statsRoutes gera um ranking)
    const driverNoRanking = stats.rankingMotoristas.find(m => m.id === driver._id.toString());
    expect(driverNoRanking).toBeDefined();
    expect(driverNoRanking.receita).toBeGreaterThanOrEqual(1000); // 1000 da entrega
    expect(driverNoRanking.viagens).toBeGreaterThanOrEqual(1);
  });
});
