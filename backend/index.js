import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import seedRoutes from './routes/seedRoutes.js';
import productRoutes from './routes/productRoutes.js';
import userRouter from './routes/userRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import uploadRouter from './routes/uploadRoutes.js';
import http from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import categoryRouter from './routes/categoryRoutes.js';
import subcategoryRouter from './routes/subcategoryRoutes.js';
import path from 'path';
import provinceRoutes from './routes/provinceRoutes.js';
import documentTypeRoutes from './routes/documentTypeRoutes.js';
import qualityTypeRouter from './routes/qualityTypeRoutes.js';
import conditionStatusRouter from './routes/conditionStatusRoutes.js';
import colorRoutes from './routes/colorRoutes.js';
import sizeRoutes from './routes/sizeRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import requestServiceRoutes from './routes/requestServiceRoutes.js';
import bodyParser from 'body-parser';
import cartRoutes from './routes/cartRoutes.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFile } from 'fs/promises';
import './firebase.js';

// **Nova importao**
import tipoEstabelecimentoRoutes from './routes/tipoEstabelecimentoRoutes.js';
import serviceRouter from './routes/serviceRoutes.js';
import homeRouter from './routes/homeRoutes.js';
import statsRouter from './routes/statsRoutes.js';
import adminOpsRoutes from './routes/adminOpsRoutes.js';
import NotificationRoutesNhabanga from './routes/notificationRoutesNhabanga.js';
import providerRouter from './routes/providerRoutes.js';
import User from './models/UserModel.js';
import providerTypeRoutes from './routes/providerTypeRoutes.js';
import providerClassificationRoutes from './routes/providerClassificationRoutes.js';
import providerSubcategoryRoutes from './routes/providerSubcategoryRoutes.js';
import NotificationModel from './models/NotificationModel.js';

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

// WORKERS (Intelligent Scheduling)
import { startSchedulingEngine } from './workers/schedulingEngine.js';
import { startTripValidator } from './workers/tripValidator.js';
import { startFraudEngine } from './workers/fraudEngine.js';
import processingFeeRoutes from './routes/processingFeeRoutes.js';
import tripChatRouter from './routes/tripChatRoutes.js';
import routingRoutes from './routes/routingRoutes.js';
import appConfigRouter from './routes/appConfigRoutes.js';
import { initScheduledOrderService } from './services/scheduledOrderService.js';


// Conectar ao MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // ? 30 segundos timeout
    socketTimeoutMS: 45000, // ? 45 segundos socket
    maxPoolSize: 100, // Elevado para 100 para produção
    minPoolSize: 5, // ? Mnimo de conexes
    retryWrites: true, // ? Re-tentar escritas
    w: 'majority' // ? Write concern
  })
  .then(() => {
    console.log('? Conectei me ao MongoDB com SUCESSO');
  })
  .catch((err) => {
    console.log('? ERRO INICIAL MongoDB:', err.message);
    process.exit(1); // Exit if initial connection fails so nodemon/pm2 restarts it
  });

mongoose.connection.on('disconnected', () => {
  console.log('?? MongoDB desconectado. O Mongoose tentar reconectar automaticamente...');
});

mongoose.connection.on('error', (err) => {
  console.log('? ERRO MongoDB na conexo ativa:', err.message);
});

// **Inicializando Express**
const app = express();

// Confia no proxy para que express-rate-limit funcione corretamente
app.set('trust proxy', 1);

app.use(express.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.BASE_URL, 'https://nhiquelaservicos.com', 'https://www.nhiquelaservicos.com'] 
    : '*',
  credentials: true
}));

// Protees bsicas de segurana (Helmet)
// Protees bsicas de segurana (Helmet)
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Permite carregar imagens de outros domnios

// Rate Limiting (Bloqueia DDoS e ataques de fora bruta)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 800, // Proteção DDoS ativa em produção
  message: { message: 'Muitas requisições deste IP, tente novamente mais tarde.' }
});
app.use('/api', limiter); // Aplica o limitador a todas as rotas de API

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import establishmentTypeRoutes from './routes/establishmentTypeRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import planRoutes from './routes/planRoutes.js';
import vehicleTypeRoutes from './routes/vehicleTypeRoutes.js';
import vehicleColorRoutes from './routes/vehicleColorRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import marketingRoutes from './routes/marketingRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import pricingRoutes from './routes/pricingRoutes.js';

import serviceCatalogRoutes from './routes/serviceCatalogRoutes.js';
import serviceRequestRoutes from './routes/serviceRequestRoutes.js';
import roleRouter from './routes/roleRoutes.js';
import supportRouter from './routes/supportRoutes.js';

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Mount API routers under the '/api' namespace
app.use('/api/catalog', serviceCatalogRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/subcategories', subcategoryRouter);
app.use('/api/tipoEstabelecimentos', tipoEstabelecimentoRoutes);
app.use('/api/services', serviceRouter);
app.use('/api/service-requests', requestServiceRoutes);
app.use('/api/providers', providerRouter);

app.use('/api/provinces', provinceRoutes);
app.use('/api/admin-ops', adminOpsRoutes);
app.use('/api/document-types', documentTypeRoutes);
app.use('/api/quality-types', qualityTypeRouter);
app.use('/api/condition-status', conditionStatusRouter);
app.use('/api/provider-types', providerTypeRoutes);
app.use('/api/provider-classifications', providerClassificationRoutes);
app.use('/api/provider-subcategories', providerSubcategoryRoutes);
app.use('/api/colors', colorRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/request-service', requestServiceRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/tipo-estabelecimento', tipoEstabelecimentoRoutes);
app.use('/api/establishment-types', establishmentTypeRoutes);
app.use('/api/trip-chat', tripChatRouter);
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
app.use('/api/drivers', driverRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/vehicle-types', vehicleTypeRoutes);
app.use('/api/vehicle-colors', vehicleColorRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/routing', routingRoutes);
app.use('/api/support', supportRouter);
app.use('/api/roles', roleRouter);
app.use('/api/system/app-config', appConfigRouter);

// 🔧 DEBUG: endpoint para testar emissão de socket e ver utilizadores ligados
app.get('/api/debug/socket-status', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Forbidden in production' });
  const io = req.app.get('io');
  const users = req.app.get('users') || [];
  const rooms = io ? [...io.sockets.adapter.rooms.keys()].filter(r => r.startsWith('driver_')) : [];
  res.json({
    connectedUsers: users.map(u => ({ _id: u._id, name: u.name, socketId: u.socketId, online: u.online, isDeliveryMan: u.isDeliveryMan })),
    driverRooms: rooms,
  });
});

app.get('/api/debug/emit-test/:driverId', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Forbidden in production' });
  const io = req.app.get('io');
  const users = req.app.get('users') || [];
  const { driverId } = req.params;
  const { status = 'Disponível' } = req.query;
  const payload = { status, isApproved: status === 'Disponível', message: 'Teste de socket' };
  const room = `driver_${driverId}`;
  io.to(room).emit('driver_status_updated', payload);
  const driverUser = users.find(u => u._id && u._id.toString() === driverId);
  if (driverUser?.socketId) {
    io.to(driverUser.socketId).emit('driver_status_updated', payload);
  }
  res.json({ sent: true, room, driverSocketId: driverUser?.socketId || null, payload });
});
// Error handling middleware
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send({ message: err.message });
});

const httpServer = http.Server(app);
let pubClient;

// Iniciar serviço de agendamento automático de pedidos
if (process.env.NODE_ENV !== 'test') {
  const io = new Server(httpServer, { cors: { origin: '*' } });
  app.set('io', io);

  // Redis Adapter Configuration
  try {
    pubClient = createClient({ 
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      socket: { reconnectStrategy: false }
    });
    const subClient = pubClient.duplicate();
    
    pubClient.on('error', () => {}); // Mute errors to prevent console spam
    subClient.on('error', () => {});
    
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis Adapter for Socket.io initialized successfully.');
  } catch (err) {
    console.error('⚠️ Could not connect to Redis. Falling back to in-memory Socket.io', err.message);
  }

  initScheduledOrderService(io);
  
  io.on('connection', (socket) => {
  socket.on('disconnect', async () => {
    try {
      if (pubClient && pubClient.isOpen) {
        const userStr = await pubClient.hGet('active_users', socket.id);
        if (userStr) {
          const user = JSON.parse(userStr);
          console.log('Offline', user.name);
          await pubClient.hDel('active_users', socket.id);
          
          const allUsersObj = await pubClient.hGetAll('active_users');
          const admin = Object.values(allUsersObj).map(u => JSON.parse(u)).find(x => x.isAdmin);
          if (admin) {
            io.to(admin.socketId).emit('updateUser', { ...user, online: false });
          }
        }
      }
    } catch(err) {
      console.log('Redis disconnect error', err);
    }
  });

  socket.on('onLogin', async (user) => {
    try {
      const updatedUser = {
        ...user,
        online: true,
        socketId: socket.id,
        messages: [],
      };
      console.log('Online', user.name);

      if (user._id && user.isDeliveryMan) {
        const driverRoom = `driver_${user._id}`;
        socket.join(driverRoom);
        console.log(`✅ Motorista ${user.name} (${user._id}) entrou na sala ${driverRoom}`);
      } else {
        console.log(`ℹ️  onLogin recebido de ${user.name} — isDeliveryMan: ${user.isDeliveryMan}, _id: ${user._id}`);
      }

      if (pubClient && pubClient.isOpen) {
        await pubClient.hSet('active_users', socket.id, JSON.stringify(updatedUser));
        
        const allUsersObj = await pubClient.hGetAll('active_users');
        const activeUsers = Object.values(allUsersObj).map(u => JSON.parse(u));
        const admin = activeUsers.find(x => x.isAdmin);
        
        if (admin) {
          io.to(admin.socketId).emit('updateUser', updatedUser);
        }
        if (updatedUser.isAdmin) {
          io.to(updatedUser.socketId).emit('listUsers', activeUsers);
        }
      }
    } catch(err) {
      console.log('Redis onLogin error', err);
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
    
    socket.on('join_trip_chat', (data) => {
      if (data && data.tripId) {
        const roomName = `trip_${data.tripId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined trip chat ${roomName}`);
      }
    });

  socket.on('leaveRoom', (data) => {
    if (data && data.orderId) {
      const roomName = `order_${data.orderId}`;
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left room ${roomName}`);
    }
  });

  // Memória cache para evitar sobrecarga na DB
  const locationUpdateCache = new Map();

  // Alta Performance: Receber localizacao do motorista via WebSocket
  socket.on('update_location', async (data) => {
    try {
      const { driverId, orderId, latitude, longitude, heading, speed } = data;
      if (driverId && latitude && longitude) {
        const now = Date.now();
        const lastUpdate = locationUpdateCache.get(driverId) || 0;

        if (pubClient && pubClient.isOpen) {
           await pubClient.set(`driver_location:${driverId}`, JSON.stringify(data), { EX: 300 });
        }
        
        // Debounce: Apenas escreve na Base de Dados a cada 15 segundos
        if (now - lastUpdate > 15000) {
          await User.updateOne(
            { _id: driverId },
            {
              latitude: latitude.toString(),
              longitude: longitude.toString(),
              locationGeo: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              heading: heading || 0,
              speed: speed || 0,
            }
          );
          locationUpdateCache.set(driverId, now);
        }

        // Limpeza de cache a cada 24 horas omitida para simplicidade (GC gere maps estáticos razoavelmente se limitados a drivers ativos)

        // Enviar a localização via WebSockets imediatamente (sem debounce para o UI ser fluído)
        if (orderId) {
          const roomName = `order_${orderId}`;
          io.to(roomName).emit('driver_location_update', {
            driverId,
            latitude,
            longitude,
            heading,
            speed,
          });
        }
      }
    } catch (err) {
      console.error('Erro no update_location socket:', err.message);
    }
  });
});
}



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

//           console.log(`? Pagamento realizado para o pedido ${orderToProcess.code}`);
//         }
//       } catch (err) {
//         console.error(`? Erro no pagamento do pedido ${order.code}: ${err.message}`);
//         await Order.findByIdAndUpdate(order._id, { $set: { isSupplierPaid: false } });
//       }
//     }));
//   } catch (err) {
//     console.error('Erro ao verificar pedidos pagos pelo comprador!', err?.message);
//   } finally {
//     const duration = Date.now() - start;
//     console.log(`? Fim da execu��o do cron. Dura��o: ${duration}ms`);
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
const port = process.env.PORT || 5000;
console.log('Port configuration: process.env.PORT =', process.env.PORT);
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    
    // Iniciar cron workers do Scheduling Engine
    const appIo = app.get('io');
    // Iniciar serviços em background
    startSchedulingEngine(appIo);
    startTripValidator(appIo);
    startFraudEngine();
    
    // Processar pedidos em fallback
    setInterval(async () => {

    }, 5000); // Executa a cada 5 segundos
  });
}

// Export the Express app for integration testing when in test mode
export default app;

// trigger restart

// clean restart
