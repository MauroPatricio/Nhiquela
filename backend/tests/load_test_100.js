import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Configuração
const CONCURRENT_REQUESTS = 100;
const API_URL = 'http://localhost:5000/api/request-service';
const CLIENT_TOKEN = process.env.TEST_CLIENT_TOKEN || 'coloque_aqui_um_token_de_cliente_valido'; // Substituir ou passar via ENV

// Gera dados mock de um pedido
const generateOrderPayload = (index) => ({
  name: `Load Test Client ${index}`,
  phoneNumber: '840000000',
  deliverCity: 'Maputo',
  destination: `Destino ${index}`,
  origin: `Origem ${index}`,
  transportType: 'Ligeiro',
  goodType: 'Passageiro',
  price: 500,
  deliveryPrice: 500,
  distance: '5 km',
  originDetails: { lat: -25.9614, lng: 32.5731 },
  destinationDetails: { lat: -25.9692, lng: 32.5832 },
  // Simular targetDriverId ou deixar para o sistema encontrar
});

async function runLoadTest() {
  console.log(`🚀 Iniciando Teste de Carga: ${CONCURRENT_REQUESTS} pedidos simultâneos...`);
  
  if (CLIENT_TOKEN === 'coloque_aqui_um_token_de_cliente_valido') {
    console.error('❌ ERRO: Precisa fornecer um token JWT válido de cliente na variável de ambiente TEST_CLIENT_TOKEN.');
    process.exit(1);
  }

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  // Criar array de Promises
  const requests = Array.from({ length: CONCURRENT_REQUESTS }).map(async (_, index) => {
    try {
      const response = await axios.post(API_URL, generateOrderPayload(index), {
        headers: {
          'Authorization': `Bearer ${CLIENT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.status === 201 || response.status === 200) {
        successCount++;
      }
    } catch (error) {
      errorCount++;
      // console.error(`[Pedido ${index}] Falhou:`, error.response?.data?.message || error.message);
    }
  });

  // Disparar todas simultaneamente
  await Promise.all(requests);

  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;

  console.log(`\n==============================================`);
  console.log(`📊 RESULTADOS DO TESTE DE CARGA (100 PEDIDOS)`);
  console.log(`==============================================`);
  console.log(`⏱️  Tempo Total: ${totalTime.toFixed(2)} segundos`);
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Falhas: ${errorCount}`);
  console.log(`📈 Taxa de Transferência: ${(CONCURRENT_REQUESTS / totalTime).toFixed(2)} req/s`);
  console.log(`==============================================\n`);
  process.exit(0);
}

runLoadTest();
