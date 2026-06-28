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
      paid: mpesaRes.output_ResponseCode === 'INS-0',
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

    

    return res.status(result.paid ? 200 : 202).send(savedPayment);

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