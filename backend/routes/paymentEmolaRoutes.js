// paymentRouterEmola.js

import express from 'express';
import axios from 'axios';
import Payment from '../models/PaymentModel.js';
import expressAsyncHandler from 'express-async-handler';

const paymentRouterEmola = express.Router();

const AUTH_URL = 'https://testewallet.vitae-erp.co.mz/api/nhiquela+/token/auth';
const PUSH_USSD_URL = 'https://testewallet.vitae-erp.co.mz/api/nhiquela+/push-ussd';
const DISBURSE_URL = 'https://testewallet.vitae-erp.co.mz/api/nhiquela+/disbursement-b2c';
const BALANCE_URL = 'https://testewallet.vitae-erp.co.mz/api/nhiquela+/balance';

let bearerToken = null;

// Autenticar e obter token
async function getAuthToken() {
  try {
    const response = await axios.post(AUTH_URL, {
      nhiquela_email: 'nhiquela+@nhiquela.co.mz',
      userkey: '67e3dfa4-d15d-493c-a4eb-acca952f8c4e',
      uId: 'UID-68639a29d89c4',
    });
    bearerToken = response.data.token || response.data.access_token;
    return bearerToken;
  } catch (error) {
    console.error('Erro ao autenticar:', error.response?.data || error.message);
    throw new Error('Falha na autenticação com API Vitae');
  }
}

// Middleware para garantir token válido
async function ensureToken(req, res, next) {
  if (!bearerToken) {
    try {
      await getAuthToken();
    } catch (err) {
      return res.status(500).json({ error: 'Autenticação falhou' });
    }
  }
  next();
}

// Enviar solicitação de pagamento via Push USSD
paymentRouterEmola.post('/pay', ensureToken, expressAsyncHandler(async (req, res) => {
  const { phone, amount, orderId } = req.body;

  if (!phone || !amount || !orderId) {
    return res.status(400).json({ error: 'Campos obrigatórios: phone, amount, orderId' });
  }

  const transId = `NHIQUELA-${Date.now()}`;
  const refNo = `NHIQUELA+${orderId}`;

  try {
    const response = await axios.post(PUSH_USSD_URL, {
      msisdn: phone,
      transId,
      smsContent: `Pagamento de pedido ${orderId}`,
      transAmount: amount,
      language: 'pt',
      refNo,
    }, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    // Registra o pagamento no banco
    const paymentData = new Payment({
      senderNumber: phone,
      receiverNumber: 'NHIQUELA',
      amount: amount.toString(),
      code: response.data.code || transId,
      description: 'Pagamento via Emola',
      transation: transId,
      conversationId: response.data.conversationId || 'N/A',
      reference: refNo,
      paid: false,
      descriptionOfPayment: `Pagamento iniciado por ${phone}`,
    });

    await paymentData.save();

    res.status(200).json({
      message: 'Solicitação de pagamento enviada com sucesso',
      data: response.data,
    });
  } catch (err) {
    console.error('Erro no pagamento Emola:', err.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao enviar solicitação Emola' });
  }
}));

// Verificar saldo
paymentRouterEmola.get('/balance', ensureToken, expressAsyncHandler(async (req, res) => {
  try {
    const response = await axios.get(BALANCE_URL, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    res.status(200).json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter saldo' });
  }
}));

// Fazer disbursement (pagamento ao fornecedor)
paymentRouterEmola.post('/disburse', ensureToken, expressAsyncHandler(async (req, res) => {
  const { phone, amount, orderId } = req.body;

  if (!phone || !amount || !orderId) {
    return res.status(400).json({ error: 'Campos obrigatórios: phone, amount, orderId' });
  }

  const transaction_id = `NHIQUELA-${orderId}`;

  try {
    const response = await axios.post(DISBURSE_URL, {
      phone_number: phone,
      transaction_id,
      amount,
      message: 'NHIQUELA Payment for services',
    }, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    res.status(200).json({
      message: 'Pagamento ao fornecedor enviado com sucesso',
      data: response.data,
    });
  } catch (err) {
    console.error('Erro ao fazer disbursement:', err.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao enviar disbursement' });
  }
}));

// Webhook para confirmação assíncrona do E-Mola
paymentRouterEmola.post('/webhook', expressAsyncHandler(async (req, res) => {
  console.log('🔔 Webhook E-Mola Recebido:', req.body);
  
  // Exemplo de estrutura que a Vitae/E-mola envia no body do webhook
  // Deve ajustar as propriedades abaixo caso a documentação da Vitae use nomes diferentes.
  const { reference, transId, status } = req.body;

  if (!reference) {
    return res.status(400).send({ error: 'Referência não fornecida no webhook' });
  }

  try {
    const payment = await Payment.findOne({ reference });
    
    if (!payment) {
      console.error('❌ Pagamento não encontrado para a referência:', reference);
      return res.status(404).send({ error: 'Pagamento não encontrado' });
    }

    // "SUCCESS" ou "0" é o código comum para sucesso, depende da API E-Mola.
    if (status === 'SUCCESS' || status === '0' || status === 'COMPLETED') {
      payment.paid = true;
      payment.status = 'Sucesso';
      payment.transaction = transId || payment.transaction;
      await payment.save();
      console.log(`✅ Pagamento E-Mola ${reference} confirmado com sucesso!`);
    } else {
      payment.paid = false;
      payment.status = 'Falha';
      await payment.save();
      console.log(`❌ Pagamento E-Mola ${reference} falhou ou foi cancelado. Status: ${status}`);
    }

    res.status(200).send({ message: 'Webhook processado' });
  } catch (error) {
    console.error('Erro ao processar webhook E-Mola:', error);
    res.status(500).send({ error: 'Erro interno' });
  }
}));

export default paymentRouterEmola;
