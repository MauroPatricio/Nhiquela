import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import io from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function emitStoreStatusUpdate() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);

  const socket = io('http://localhost:5000');
  socket.on('connect', () => {
    console.log('Connected to socket server');
    socket.emit('storeStatusChanged', {
      userId: '6a961368bdc1063337ad622c',
      sellerId: '6a961369bdc1063337ad622e',
      isOpen: true,
      sellerName: 'Novo estabelecimento'
    });
    console.log('✅ Emitted storeStatusChanged event to sockets');
    setTimeout(() => {
      socket.disconnect();
      mongoose.disconnect();
    }, 1000);
  });
}

emitStoreStatusUpdate();
