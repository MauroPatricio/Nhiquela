import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import mongoose from 'mongoose';
import orderRouter from '../routes/orderRoutes';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// WebSocket para atualizações em tempo real
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // Entregador se inscreve para receber atualizações
  socket.on('deliveryman_subscribe', (deliverymanId) => {
    socket.join(`deliveryman_${deliverymanId}`);
    console.log(`📱 Entregador ${deliverymanId} inscrito para atualizações`);
  });

  // Cliente se inscreve para pedidos específicos
  socket.on('order_subscribe', (orderId) => {
    socket.join(`order_${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Middleware para disponibilizar io nas rotas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Suas rotas existentes
app.use('/api/orders', orderRouter);

// Exportar io para uso em outras partes do app
export { io };
export default server;