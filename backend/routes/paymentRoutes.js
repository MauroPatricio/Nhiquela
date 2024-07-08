import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import mpesa from 'mpesa-node-api';

import Payment from '../models/PaymentModel.js'
import config from '../config.js';
import { isAuth } from '../utils.js';
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


paymentRouter.post('/mpesa',expressAsyncHandler(async (req,response)=>{


    const {customerNumber, amount}= req.body;
    const randomCode = randomString(5);


    mpesa.initializeApi({
        baseUrl: config.MPESA_API_HOST,
        apiKey: config.MPESA_API_KEY,
        publicKey: config.MPESA_PUBLIC_KEY,
        origin: config.MPESA_ORIGIN,
        serviceProviderCode: config.MPESA_SERVICE_PROVIDER_CODE
    });
    try{

        const mpesa_res = await mpesa.initiate_c2b(amount, /* msisdn */ customerNumber, randomCode, randomCode);
        if (mpesa_res){
                  const res = {
                      "response_code":mpesa_res.output_ResponseCode,
                      "response_description":mpesa_res.output_ResponseDesc,
                      "response_transactionId":mpesa_res.output_TransactionID,
                      "response_conversationId":mpesa_res.output_ConversationID,
                      "response_reference":mpesa_res.output_ThirdPartyReference,
                }

                const paymentMpesa = new Payment();
  
                paymentMpesa.senderNumber= customerNumber;
                paymentMpesa.amount = amount;
                paymentMpesa.code = res.response_code;
                paymentMpesa.description = res.response_description;
                paymentMpesa.transation = res.response_transactionId;
                paymentMpesa.conversationId = res.response_conversationId;
                paymentMpesa.reference = res.response_reference;
                paymentMpesa.paid = true;
                paymentMpesa.receiverNumber = config.MPESA_SERVICE_PROVIDER_CODE;
  
                const payment =  await paymentMpesa.save();
                response.send(payment);
            

              }else{  
                const error = {
                      "response_code":mpesa_res.output_ResponseCode,
                      "response_description":mpesa_res.output_ResponseDesc,
                      "response_transactionId":mpesa_res.output_TransactionID,
                      "response_conversationId":mpesa_res.output_ConversationID,
                      "response_reference":mpesa_res.output_ThirdPartyReference,
                      }

              const paymentMpesa = new Payment();

              paymentMpesa.senderNumber = customerNumber;
              paymentMpesa.amount = amount;
              paymentMpesa.code = error.response_code;
              paymentMpesa.description = error.response_description;
              paymentMpesa.transation = error.response_transactionId;
              paymentMpesa.conversationId = error.response_conversationId;
              paymentMpesa.reference = error.response_reference;
              paymentMpesa.paid = false;
              paymentMpesa.receiverNumber = config.MPESA_SERVICE_PROVIDER_CODE;
  
              const payment =  await paymentMpesa.save();
              response.send(payment);
  
              }
    }catch(error){
   const e = {
    "response_code":error.output_ResponseCode,
    "response_description":error.output_ResponseDesc,
    "response_transactionId":error.output_TransactionID,
    "response_conversationId":error.output_ConversationID,
    "response_reference":error.output_ThirdPartyReference,
    }

    const paymentMpesa = new Payment();
    
    paymentMpesa.senderNumber = customerNumber;
    paymentMpesa.amount = amount;
    paymentMpesa.code = e.response_code;
    paymentMpesa.description = e.response_description;
    paymentMpesa.transation = e.response_transactionId;
    paymentMpesa.conversationId = e.response_conversationId;
    paymentMpesa.reference = e.response_reference;
    paymentMpesa.paid = false;
    paymentMpesa.receiverNumber = config.MPESA_SERVICE_PROVIDER_CODE;

    const payment =  await paymentMpesa.save();
    response.send(payment);
}

}));

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

