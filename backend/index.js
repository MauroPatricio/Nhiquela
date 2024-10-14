import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
 import mongoose from 'mongoose';
import seedRoutes from './routes/seedRoutes.js';
import productRoutes from './routes/productRoutes.js';
import userRouter from './routes/userRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import uploadRouter from './routes/uploadRoutes.js';
import http from 'http';
import {Server} from 'socket.io';
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
import notificationRoutes from './routes/notificationRoutes.js';

import notificationRoutesNhabanga from './routes/notificationRoutesNhabanga.js';

import { fileURLToPath } from 'url';

import admin from 'firebase-admin';
import { dirname } from 'path';
import { readFile } from 'fs/promises';

// Get the current directory of the module
// Define the path to the service account JSON file
const serviceAccountPath = new URL('./reactnativepushnotificat-a322b-firebase-adminsdk-n3ra9-635e334e58.json', import.meta.url);

// Read the service account JSON file
const serviceAccount = await readFile(serviceAccountPath, 'utf-8').then(JSON.parse);


// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Carregando o ficheiro .env
dotenv.config();

// Conectando com a database MongoDB Atlas
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connectei me ao MongoDB com SUCESSO');
  })
  .catch((err) => {
    console.log(err.message);
  });

const app = express();

// ADD THIS
app.use(cors());


app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use('/api/seed', seedRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/provinces', provinceRoutes);
app.use('/api/documents', documentTypeRoutes);
app.use('/api/qualitytype', qualityTypeRouter);
app.use('/api/conditionstatus', conditionStatusRouter);
app.use('/api/colors', colorRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/requestdeliver', requestDeliverRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/notifications', notificationRoutes);

//Nhabanga
app.use('/api/notificationsNhabanga', notificationRoutesNhabanga);

const __dirname = path.resolve();
// const rootDir = path.join(__dirname, '..');
app.use(express.static(path.join(__dirname, '/frontend/build')));


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/frontend/build/index.html'));
});




app.use((err, req, res, next) => {
  console.log(err)

  res.status(500).send({message: err.message});
});

const port = process.env.PORT || 5000;

const httpServer = http.Server(app);
const users = [];

const io = new Server(httpServer, {cors: {origin: '*'}});
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

  socket.on('onUserSelected', (user) => {
    const admin = users.find((x) => x.isAdmin && x.online);
    if (admin) {
      const existUser = users.find((x) => x._id === user._id);
      io.to(admin.socketId).emit('selectUser', existUser);
    }
  });

  socket.on('onMessage', (message) => {
    if (message.isAdmin) {
      const user = users.find((x) => x._id === message._id && x.online);
      if (user) {
        io.to(user.socketId).emit('message', message);
        user.messages.push(message);
      }
    } else {
      const admin = users.find((x) => x.isAdmin && x.online);
      if (admin) {
        io.to(admin.socketId).emit('message', message);
        const user = users.find((x) => x._id === message._id && x.online);
        user.messages.push(message);
      } else {
        io.to(socket.id).emit('message', {
          name: 'Admin',
          body: 'Me desculpe. Neste momento não me encontro disponível',
        });
      }
    }
  });
});
httpServer.listen(port, ()=>{
    console.log(`server is at http://localhost:${port}`)
})

//iniciando o servidor
// app.listen(port, ()=>{
//     console.log(`server is at http://localhost:${port}`)
// })
