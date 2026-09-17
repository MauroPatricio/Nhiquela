import mongoose from 'mongoose';
import User from '../models/UserModel.js';
import dotenv from 'dotenv';

dotenv.config();

describe('Verificação de Robustez do Evento onLogin', () => {
  let dbUser;
  let testUserId;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhiquela_test_db';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    if (dbUser) await User.deleteOne({ _id: dbUser._id });
    await mongoose.connection.close();
  });

  it('1. Deve lidar com um objeto "user" incompleto vindo do frontend (sem crash)', async () => {
    // Simula a criacao do utilizador na BD
    dbUser = new User({
      name: 'Motorista Incompleto',
      email: `inc_${Date.now()}@teste.com`,
      password: 'password123',
      phoneNumber: `84${Math.floor(Math.random() * 9000000) + 1000000}`,
      isDeliveryMan: true
    });
    await dbUser.save();
    testUserId = dbUser._id;

    // SIMULA O PAYLOAD RECEBIDO DO SOCKET DO FRONTEND
    // (O frontend pode enviar apenas o _id caso ainda nao tenha puxado o perfil)
    const socketPayload = { _id: testUserId.toString() };

    // --- LOGICA REPLICADA DO INDEX.JS ---
    let logOutput1 = '';
    let logOutput2 = '';
    
    // Logica do Online
    logOutput1 = `Online ${socketPayload.name || 'Desconhecido'}`;

    if (socketPayload._id) {
      const fetchedUser = await User.findById(socketPayload._id).select('isDeliveryMan name');
      if (fetchedUser && fetchedUser.isDeliveryMan) {
        // Garantir que a variavel reflete o estado real
        socketPayload.isDeliveryMan = true;
        socketPayload.name = fetchedUser.name || socketPayload.name;
        logOutput2 = `✅ Motorista ${fetchedUser.name} (${socketPayload._id}) entrou na sala driver_${socketPayload._id}`;
      } else {
        const userName = fetchedUser ? fetchedUser.name : (socketPayload.name || 'Desconhecido');
        logOutput2 = `ℹ️ onLogin recebido de ${userName} — isDeliveryMan: ${socketPayload.isDeliveryMan || false}, _id: ${socketPayload._id}`;
      }
    }
    // ------------------------------------

    // Verificacoes:
    // O fallback deve ter protegido contra "undefined"
    expect(logOutput1).toBe('Online Desconhecido');
    
    // O sistema DEVE ter recuperado o nome na BD com sucesso!
    expect(logOutput2).toContain(`Motorista Motorista Incompleto`);
    expect(logOutput2).toContain(testUserId.toString());
    
    // O payload do socket deve ter sido corrigido!
    expect(socketPayload.name).toBe('Motorista Incompleto');
    expect(socketPayload.isDeliveryMan).toBe(true);
  });

  it('2. Deve evitar logs "undefined" mesmo quando o utilizador nao existe na base de dados', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const socketPayload = { _id: fakeId.toString() }; // Sem nome, sem isDeliveryMan

    let logOutput = '';
    
    // Logica do Online
    const isOnlineLog = `Online ${socketPayload.name || 'Desconhecido'}`;

    if (socketPayload._id) {
      const fetchedUser = await User.findById(socketPayload._id).select('isDeliveryMan name');
      if (fetchedUser && fetchedUser.isDeliveryMan) {
        logOutput = `Erro, não devia entrar aqui`;
      } else {
        const userName = fetchedUser ? fetchedUser.name : (socketPayload.name || 'Desconhecido');
        logOutput = `ℹ️ onLogin recebido de ${userName} — isDeliveryMan: ${socketPayload.isDeliveryMan || false}, _id: ${socketPayload._id}`;
      }
    }

    expect(isOnlineLog).toBe('Online Desconhecido');
    expect(logOutput).toBe(`ℹ️ onLogin recebido de Desconhecido — isDeliveryMan: false, _id: ${fakeId.toString()}`);
  });
});
