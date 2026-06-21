import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import seedRoutes from './routes/seedRoutes.js';
import productRoutes from './routes/productRoutes.js';
import userRouter from './routes/userRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import uploadRouter from './routes/uploadRoutes.js';
import http from 'http';
import { Server } from 'socket.io';
import categoryRouter from './routes/categoryRoutes.js';
import path from 'path';
import provinceRoutes from './routes/provinceRoutes.js';
import documentTypeRoutes from './routes/documentTypeRoutes.js';
import qualityTypeRouter from './routes/qualityTypeRoutes.js';
import conditionStatusRouter from './routes/conditionStatusRoutes.js';
import colorRoutes from './routes/colorRoutes.js';
import sizeRoutes from './routes/sizeRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import requestDeliverRoutes from './routes/requestDeliverRoutes.js';
import bodyParser from 'body-parser';
import cartRoutes from './routes/cartRoutes.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFile } from 'fs/promises';
import './firebase.js';

// **Nova importação**
import tipoEstabelecimentoRoutes from './routes/tipoEstabelecimentoRoutes.js';
import serviceRouter from './routes/serviceRoutes.js';
import homeRouter from './routes/homeRoutes.js';
import statsRouter from './routes/statsRoutes.js';

import mpesa from 'mpesa-node-api';

import Payment from './models/PaymentModel.js'
import config from './config.js';
import documentOrderRoutes from './routes/documentOrderRoutes.js';
import Order from './models/OrderModel.js';
import cron from 'node-cron';
import notificationRouter from './routes/notificationRoutes.js';
import paymentRouterEmola from './routes/paymentEmolaRoutes.js';
import walletRouter from './routes/walletRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import paymentMethodRoutes from './routes/paymentMethodRoutes.js';
import processingFeeRoutes from './routes/processingFeeRoutes.js';



// Conectar ao MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // ✅ 30 segundos timeout
    socketTimeoutMS: 45000, // ✅ 45 segundos socket
    maxPoolSize: 10, // ✅ Limite de conexões
    minPoolSize: 5, // ✅ Mínimo de conexões
    retryWrites: true, // ✅ Re-tentar escritas
    w: 'majority' // ✅ Write concern
  })
  .then(() => {
    console.log('Conectei me ao MongoDB com SUCESSO');
  })
  .catch((err) => {
    console.log('❌ ERRO MongoDB:', err.message);
    console.log('🔧 Dica: Verifique:');
    console.log('   - String de conexão no .env');
    console.log('   - MongoDB Atlas online');
    console.log('   - Internet estável');
  });

// **Inicializando Express**
const app = express();
app.use(express.json());
app.use(cors());

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Mount API routers under the '/api' namespace
app.use('/api/seed', seedRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/provinces', provinceRoutes);
app.use('/api/document-types', documentTypeRoutes);
app.use('/api/quality-types', qualityTypeRouter);
app.use('/api/condition-status', conditionStatusRouter);
app.use('/api/colors', colorRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/request-deliver', requestDeliverRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/tipo-estabelecimento', tipoEstabelecimentoRoutes);
app.use('/api/notifications', notificationRouter);
app.use('/api/payments-emola', paymentRouterEmola);
app.use('/api/wallet', walletRouter);
app.use('/api/tracking', trackingRoutes);
app.use('/api/stats', statsRouter);
app.use('/api/services', serviceRouter);
app.use('/api/home', homeRouter);
app.use('/api/document-order', documentOrderRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/processing-fees', processingFeeRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send({ message: err.message });
});

const httpServer = http.Server(app);

const users = [];

const io = new Server(httpServer, { cors: { origin: '*' } });
app.set('io', io);



io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    const user = users.find((x) => x.socketId === socket.id);
    if (user) {
      user.online = false;
      console.log('Offline', user.name);
      const admin = users.find((x) => x.isAdmin && x.online);
      if (admin) {
        io.to(admin.socketId).emit('updateUser', user);
      }
    }
  });

  socket.on('onLogin', (user) => {
    const updatedUser = {
      ...user,
      online: true,
      socketId: socket.id,
      messages: [],
    };
    const existUser = users.find((x) => x._id === updatedUser._id);
    if (existUser) {
      existUser.socketId = socket.id;
      existUser.online = true;
    } else {
      users.push(updatedUser);
    }
    console.log('Online', user.name);
    const admin = users.find((x) => x.isAdmin && x.online);
    if (admin) {
      io.to(admin.socketId).emit('updateUser', updatedUser);
    }
    if (updatedUser.isAdmin) {
      io.to(updatedUser.socketId).emit('listUsers', users);
    }
  });

  // Tracking Rooms
  socket.on('joinRoom', (data) => {
    if (data && data.orderId) {
      const roomName = `order_${data.orderId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room ${roomName}`);
    }
  });

  socket.on('leaveRoom', (data) => {
    if (data && data.orderId) {
      const roomName = `order_${data.orderId}`;
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left room ${roomName}`);
    }
  });
});



// const port = process.env.PORT || 5001;

//     await Promise.allSettled(orders.map(async (order) => {
//       try {
//         const orderToProcess = await Order.findOneAndUpdate(
//           { _id: order._id, isSupplierPaid: false },
//           { $set: { isSupplierPaid: true } },
//           { new: true }
//         );

//         if (!orderToProcess) return;

//         const numbrSeller = order.seller?.seller?.phoneNumberAccount;
//         const sellerNumber =
//           numbrSeller?.toString().length === 9
//             ? Number('258' + numbrSeller)
//             : numbrSeller;

//         const priceForSeller = order.itemsPriceForSeller;

//         if (sellerNumber && priceForSeller) {
//           const supplier = await paySupplier(sellerNumber, priceForSeller, orderToProcess);

//           await salvarPagamento({
//             senderNumber: sellerNumber,
//             amount: priceForSeller,
//             code: 'INS-0',
//             description: `Pagamento realizado ao Fornecedor pelo pedido ${orderToProcess?.code}`,
//             transaction: supplier.transactionId,
//             conversationId: supplier.conversationId,
//             reference: supplier.reference,
//             paid: true,
//             receiverNumber: process.env.MPESA_SERVICE_PROVIDER_CODE,
//           });

//           console.log(`✅ Pagamento realizado para o pedido ${orderToProcess.code}`);
//         }
//       } catch (err) {
//         console.error(`❌ Erro no pagamento do pedido ${order.code}: ${err.message}`);
//         await Order.findByIdAndUpdate(order._id, { $set: { isSupplierPaid: false } });
//       }
//     }));
//   } catch (err) {
//     console.error('Erro ao verificar pedidos pagos pelo comprador!', err?.message);
//   } finally {
//     const duration = Date.now() - start;
//     console.log(`✅ Fim da execução do cron. Duração: ${duration}ms`);
//   }
// });



async function paySupplier(sellerNumber, priceForSeller, order, maxAttempts = 2, delay = 5000) {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const referenceCode = randomString(5);
      mpesa.initializeApi({ 
        baseUrl: config.MPESA_API_HOST,
        apiKey: config.MPESA_API_KEY,
        publicKey: config.MPESA_PUBLIC_KEY,
        origin: config.MPESA_ORIGIN,
        serviceProviderCode: config.MPESA_SERVICE_PROVIDER_CODE,
      });


      const response = await mpesa.initiate_b2c(priceForSeller, sellerNumber, referenceCode, referenceCode);

      if (response?.data?.output_ResponseCode === 'INS-0') {
        return {
          transactionId: response.data.output_TransactionID,
          conversationId: response.data.output_ConversationID,
          reference: response.data.output_ThirdPartyReference,
        };
      } else {
        lastError = new Error(response?.data);
        console.log(`Tentativa ${attempt} Pedido: ${order.code} falhou: ${lastError}`);

        await new Promise(r => setTimeout(r, delay)); 
      }
    } catch (err) {
      lastError = err;
      console.log(lastError)
      console.log(`Tentativa ${attempt} Pedido: ${order.code} deu erro: ${lastError.output_ResponseDesc}`);

      await new Promise(r => setTimeout(r, delay)); 
    }
  }
  
  throw lastError;
}


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
const port = process.env.PORT || 5002;
console.log('Port configuration: process.env.PORT =', process.env.PORT);
httpServer.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

// Export the Express app for integration testing when in test mode
export default app;
