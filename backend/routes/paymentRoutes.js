import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import mpesa from 'mpesa-node-api';

import Payment from '../models/PaymentModel.js'
import config from '../config.js';
import PaymentMethod from '../models/PaymentMethod.js';


const paymentRouter = express.Router();


paymentRouter.get(
    '/',
    expressAsyncHandler(async ( req, res) => {
    const payments = await PaymentMethod.find({ isActive: true }).sort({shortName: 'asc'});
    res.send(payments);
    })
  );


  paymentRouter.post(
    '/',
    // isAuth,
    expressAsyncHandler(async (req, res) => {
      const newPaymentMethod = new PaymentMethod({
        shortName: req.body.shortName,
        fullName:  req.body.fullName,
        description: req.body.description,
        accountNumber: req.body.accountNumber,
        accountNumberAlternative: req.body.accountNumberAlternative,
        shortCode: req.body.shortCode,
        NIB: req.body.NIB,
        NUIB: req.body.NUIB,
        NUIT: req.body.NUIT,
        logo: req.body.logo,
        isActive: true,
      });
  
  
      const paymentMethod = await newPaymentMethod.save();
      res
        .status(201)
        .send({ message: 'Novo tipo de pagamento criado com sucesso', paymentMethod });
    })
  );


paymentRouter.post('/mpesa/c2b', expressAsyncHandler(async (req, res) => {
  const { customerNumber, amount } = req.body;

  if (!customerNumber || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).send({ message: 'Número ou valor inválido.' });
  }

  const referenceCode = randomString(5);

  mpesa.initializeApi({
    baseUrl: config.MPESA_API_HOST,
    apiKey: config.MPESA_API_KEY,
    publicKey: config.MPESA_PUBLIC_KEY,
    origin: config.MPESA_ORIGIN,
    serviceProviderCode: config.MPESA_SERVICE_PROVIDER_CODE,
    timeout: 60000 // 60 segundos
  });

  try {
    const mpesaRes = await mpesa.initiate_c2b(amount, customerNumber, referenceCode, referenceCode);

    const result = {
      response_code: mpesaRes.output_ResponseCode,
      response_description: mpesaRes.output_ResponseDesc+'-'+customerNumber+'-'+amount,
      transactionId: mpesaRes.output_TransactionID,
      conversationId: mpesaRes.output_ConversationID,
      reference: mpesaRes.output_ThirdPartyReference,
      // INS-0 apenas significa que o pedido foi enviado para o telefone do cliente.
      // A confirmação real será feita via Webhook.
      paid: false, 
      status: mpesaRes.output_ResponseCode === 'INS-0' ? 'Pendente' : 'Falha'
    };

    const savedPayment = await salvarPagamento({
      senderNumber: customerNumber,
      amount,
      code: result.response_code,
      description: result.response_description,
      transaction: result.transactionId,
      conversationId: result.conversationId,
      reference: result.reference,
      paid: result.paid,
      receiverNumber: config.MPESA_SERVICE_PROVIDER_CODE,
    });

    return res.status(result.status === 'Pendente' ? 200 : 400).send({
      ...savedPayment._doc,
      message: result.status === 'Pendente' ? 'Verifique o seu telemóvel para colocar o PIN.' : 'Falha ao iniciar pagamento.'
    });

  } catch (err) {
    console.error('Erro no pagamento MPESA:', err?.message || err);

    const output = err?.response?.data?.output || err?.output || {};
    const fallbackResponse = {
      response_code: output.ResponseCode || 'ERR-01',
      response_description: output.ResponseDesc || 'Erro desconhecido'+'-'+customerNumber+'-'+amount,
      transactionId: output.TransactionID || '',
      conversationId: output.ConversationID || '',
      reference: output.ThirdPartyReference || '',
      paid: false,
    };

    const failedPayment = await salvarPagamento({
      senderNumber: customerNumber,
      amount,
      code: fallbackResponse.response_code,
      description: fallbackResponse.response_description,
      transaction: fallbackResponse.transactionId,
      conversationId: fallbackResponse.conversationId,
      reference: fallbackResponse.reference,
      paid: false,
      receiverNumber: config.MPESA_SERVICE_PROVIDER_CODE,
    });

    return res.status(500).send({
      message: 'Falha no pagamento',
      error: err?.message || 'Erro desconhecido no servidor.',
      mpesa: fallbackResponse,
    });
  }
}));

// Webhook para confirmação assíncrona do M-Pesa
paymentRouter.post('/mpesa/webhook', expressAsyncHandler(async (req, res) => {
  console.log('?? Webhook M-Pesa Recebido:', req.body);
  
  // O M-Pesa envia o estado da transação no body. Exemplo de estrutura comum:
  // { ThirdPartyReference, TransactionID, ResponseCode, ResponseDesc, ... }
  const { ThirdPartyReference, TransactionID, ResponseCode } = req.body;

  if (!ThirdPartyReference) {
    return res.status(400).send({ message: 'ThirdPartyReference não encontrado.' });
  }

  // Verificar na base de dados o pagamento com a referência
  const payment = await Payment.findOne({ reference: ThirdPartyReference });
  
  if (!payment) {
    console.error('? Pagamento não encontrado para a referência:', ThirdPartyReference);
    return res.status(404).send({ message: 'Pagamento não encontrado.' });
  }

  // Verifica se o pagamento foi concluído com sucesso
  // O código 'INS-0' na confirmação significa sucesso na transferência.
  if (ResponseCode === 'INS-0' || ResponseCode === '0') {
    payment.paid = true;
    payment.status = 'Sucesso';
    payment.transaction = TransactionID || payment.transaction;
    await payment.save();
    
    // Atualizar Order ou Wallet consoante o sistema
    // ... Aqui poderá colocar a lógica de recarga de saldo do utilizador (wallet) ...
    console.log(`? Pagamento M-Pesa ${ThirdPartyReference} confirmado com sucesso!`);
  } else {
    payment.paid = false;
    payment.status = 'Falha';
    await payment.save();
    console.log(`? Pagamento M-Pesa ${ThirdPartyReference} falhou ou foi cancelado.`);
  }

  // O M-Pesa espera um 200 OK para saber que o webhook foi processado.
  return res.status(200).send({ message: 'Webhook recebido com sucesso.' });
}));

async function salvarPagamento(data) {
  const pagamento = new Payment(data);
  return await pagamento.save();
}

function randomString(codeLength){
    const chars =
    "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890";
    const randomArray = Array.from(
        { length: codeLength },
        (v, k) => chars[Math.floor(Math.random() * chars.length)]
      );
      
    const randomString = randomArray.join("");
    return randomString;
}




export default paymentRouter;
