import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  // Quem fez o pedido
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // A quem pertence o pedido (fornecedor)
  seller: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // Entregador que aceitou o pedido (pode ser null até aceitar)
  deliveryMan: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },

  // Produtos, quantidades, valores, etc.
  items: [
    {
      name: String,
      quantity: Number,
      price: Number
    }
  ],

  // Localizações envolvidas
  pickupLocation: {
    address: String,
    latitude: String,
    longitude: String
  },
  deliveryLocation: {
    address: String,
    latitude: String,
    longitude: String
  },

  // Estado do pedido
  status: {
    type: String,
    enum: [
      'PENDING_SELLER',        // Aguardando aceite do seller
      'WAITING_DELIVERY',      // Aguardando entregador aceitar
      'ON_THE_WAY',            // Entregador em rota
      'DELIVERED',             // Cliente confirmou entrega
      'CANCELLED'              // Pedido cancelado
    ],
    default: 'PENDING_SELLER'
  },

  // Histórico opcional
  history: [
    {
      status: String,
      changedAt: { type: Date, default: Date.now },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // quem mudou o estado
    }
  ],

  totalPrice: Number,
  paymentMethod: String,
  
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
