const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Habilitar CORS para permitir chamadas de qualquer dispositivo na rede local (como celulares Expo)
app.use(cors());
app.use(express.json());

// Logger de chamadas da API
app.use((req, res, next) => {
  console.log(`[API ${req.method}] ${req.url} - ${new Date().toLocaleTimeString()}`);
  next();
});

// Mock Database em memória para saldos e transações
let walletBalances = {
  available: 2450.00,
  pending: 680.00
};

let walletTransactions = [
  {
    id: 'tx-001',
    type: 'credit',
    amount: 1500.00,
    description: 'Crédito de Entrega - Pedido #4088',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'tx-002',
    type: 'credit',
    amount: 80.00,
    description: 'Comissão de Entrega - Pedido #4089',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'tx-003',
    type: 'debit',
    amount: 500.00,
    description: 'Levantamento de Fundos - M-Pesa',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'tx-004',
    type: 'credit',
    amount: 1370.00,
    description: 'Crédito de Venda - Pedido #3991',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

// M-Pesa & e-Mola B2C Integration Service
const MobileMoneyService = {
  simulateLocalPayout: async (amount, phoneNumber, referenceId, gateway) => {
    console.log(`[SIMULADOR ${gateway}] Processando levantamento de ${amount} MT para ${phoneNumber}...`);
    
    // Simular atraso de rede móvel moçambicana
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Validar prefixos locais de Moçambique
    if (gateway === 'M-Pesa') {
      if (!phoneNumber.startsWith('25884') && !phoneNumber.startsWith('25885') && !phoneNumber.startsWith('84') && !phoneNumber.startsWith('85')) {
        return {
          success: false,
          errorMessage: 'Prefixo inválido para M-Pesa. Deve começar com 84 ou 85.'
        };
      }
    } else if (gateway === 'e-Mola') {
      if (!phoneNumber.startsWith('25886') && !phoneNumber.startsWith('25887') && !phoneNumber.startsWith('86') && !phoneNumber.startsWith('87')) {
        return {
          success: false,
          errorMessage: 'Prefixo inválido para e-Mola. Deve começar com 86 ou 87.'
        };
      }
    }

    const mockTxId = `TX_${gateway.toUpperCase()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    return {
      success: true,
      transactionId: mockTxId
    };
  }
};

// --- ROTAS DO ENDPOINT FINANCEIRO /API/WALLET ---

// 1. Obter Saldo Atual (Disponível e Pendente)
app.get('/api/wallet/balance', (req, res) => {
  return res.status(200).json({
    available_balance: walletBalances.available,
    pending_balance: walletBalances.pending,
    currency: 'MZN'
  });
});

// 2. Obter Histórico de Transações (Extrato)
app.get('/api/wallet/transactions', (req, res) => {
  return res.status(200).json(walletTransactions);
});

// 3. Obter Ganhos Diários e Semanais do Entregador
app.get('/api/wallet/driver-earnings', (req, res) => {
  return res.status(200).json({
    today: 750.00,
    week: 4850.00,
    currency: 'MZN'
  });
});

// 4. Solicitar Levantamento (Com Split Financeiro de Dupla Entrada)
app.post('/api/wallet/withdraw', async (req, res) => {
  const { amount, phone } = req.body;

  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Digite um valor de levantamento válido.' });
  }

  const requestedAmount = parseFloat(amount);

  if (requestedAmount > walletBalances.available) {
    return res.status(400).json({ message: 'Saldo disponível insuficiente.' });
  }

  if (!phone || phone.length < 9) {
    return res.status(400).json({ message: 'Digite um número de telefone válido para o envio.' });
  }

  try {
    // Cálculo da Taxa de Levantamento da Nhiquela (1%)
    const fee = requestedAmount * 0.01;
    const netAmount = requestedAmount - fee;
    const referenceId = `WDL_${Math.floor(100000 + Math.random() * 900000)}`;

    console.log(`\n==================================================`);
    console.log(`[LEDGER DOUBLE-ENTRY] Nova Solicitação de Levantamento ${referenceId}`);
    console.log(`DÉBITO TOTAL SOLICITADO: -${requestedAmount.toFixed(2)} MT`);
    console.log(`TAXA RETIDA NHIQUELA (1%): +${fee.toFixed(2)} MT (Receita Plataforma)`);
    console.log(`VALOR LÍQUIDO A TRANSFERIR: +${netAmount.toFixed(2)} MT (M-Pesa/e-Mola)`);
    console.log(`==================================================\n`);

    // Determinar operadora
    const cleanPhone = phone.replace('+', '');
    const isEmola = cleanPhone.startsWith('25886') || cleanPhone.startsWith('25887') || cleanPhone.startsWith('86') || cleanPhone.startsWith('87');
    const gatewayName = isEmola ? 'e-Mola' : 'M-Pesa';

    // Executar Payout via simulador
    const payoutResult = await MobileMoneyService.simulateLocalPayout(netAmount, cleanPhone, referenceId, gatewayName);

    if (payoutResult.success) {
      // Registrar Lançamento Contábil e Deduzir Saldo Disponível
      walletBalances.available -= requestedAmount;

      const ledgerDebitEntry = {
        id: referenceId,
        type: 'debit',
        amount: requestedAmount,
        description: `Levantamento ${gatewayName} (Líquido: ${netAmount.toFixed(2)} MT, Taxa: ${fee.toFixed(2)} MT)`,
        created_at: new Date().toISOString()
      };

      walletTransactions.unshift(ledgerDebitEntry);

      console.log(`[LEDGER SUCCESS] Balanço atualizado com sucesso. ID Transação: ${payoutResult.transactionId}`);

      return res.status(200).json({
        message: `Levantamento de ${netAmount.toFixed(2)} MT processado com sucesso para o número ${phone}! Taxa Nhiquela: ${fee.toFixed(2)} MT.`,
        transactionId: payoutResult.transactionId
      });
    } else {
      console.error(`[LEDGER FAILED] Falha no saque: ${payoutResult.errorMessage}`);
      return res.status(400).json({
        message: payoutResult.errorMessage || 'Falha de comunicação B2C.'
      });
    }

  } catch (error) {
    console.error('Erro ao processar levantamento:', error);
    return res.status(500).json({ message: 'Erro interno ao processar levantamento.', error: error.message });
  }
});

// Inicialização do servidor Express
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SERVIDOR MOCK DE CARTEIRAS NHIQUELA INICIADO COM SUCESSO`);
  console.log(`Endereço Local: http://localhost:${PORT}`);
  console.log(`Endereço Rede Móvel: http://192.168.226.176:${PORT}/api (Exemplo de IP)`);
  console.log(`Conecte as aplicações móveis a este servidor local para testar!`);
  console.log(`======================================================\n`);
});
