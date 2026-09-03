import mongoose from 'mongoose';

async function run() {
  console.log('🔗 Conectando ao MongoDB...');
  await mongoose.connect('mongodb+srv://root:root@cluster0.uw5pjuq.mongodb.net/?appName=Cluster0');
  console.log('✅ Conectado!');

  console.log('🔎 Procurando utilizadores de teste...');
  const User = mongoose.connection.collection('users');
  const Provider = mongoose.connection.collection('providers');
  const Order = mongoose.connection.collection('orders');
  const Wallet = mongoose.connection.collection('wallets');

  const client = await User.findOne({ role: 'USER' });
  const driver = await User.findOne({ role: 'DRIVER' });
  const sellerUser = await User.findOne({ role: 'SELLER' });
  
  if (!client || !driver || !sellerUser) {
    console.log('❌ Utilizadores insuficientes para simulação E2E.');
    process.exit(1);
  }

  const provider = await Provider.findOne({ userId: sellerUser._id });

  console.log('\n--- 1. NHIQUELA (CLIENTE APP) ---');
  console.log('👤 Cliente cria um pedido de 300 MT no parceiro:', provider ? provider.name : sellerUser.name);
  
  const orderId = new mongoose.Types.ObjectId();
  await Order.insertOne({
    _id: orderId,
    user: client._id,
    seller: provider ? provider._id : sellerUser._id,
    orderItems: [{ name: 'Produto E2E', price: 300, quantity: 1 }],
    totalPrice: 350,
    itemsPrice: 300,
    deliveryPrice: 50,
    status: 'Pendente',
    paymentMethod: 'Carteira',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('✅ Pedido criado! ID:', orderId);

  console.log('\n--- 2. NHIQUELA SELLER (APP LOJA) ---');
  console.log('🏪 Vendedor aceita e prepara o pedido...');
  await Order.updateOne({ _id: orderId }, { $set: { status: 'Preparando', updatedAt: new Date() } });
  console.log('✅ Status do Pedido: Preparando');
  
  await Order.updateOne({ _id: orderId }, { $set: { status: 'Pronto para entrega', updatedAt: new Date() } });
  console.log('✅ Status do Pedido: Pronto para entrega');

  console.log('\n--- 3. NHIQUELA DRIVER (APP MOTORISTA) ---');
  console.log('🛵 Sistema despacha e motorista aceita entrega...');
  await Order.updateOne({ _id: orderId }, { 
    $set: { 
      status: 'Em Andamento', 
      deliveryman: driver._id,
      'deliveryman.id': driver._id,
      updatedAt: new Date() 
    } 
  });
  console.log('✅ Status do Pedido: Em Andamento');

  console.log('📍 Motorista chega ao destino e conclui a entrega...');
  await Order.updateOne({ _id: orderId }, { $set: { status: 'Entregue', isDelivered: true, deliveredAt: new Date(), updatedAt: new Date() } });
  console.log('✅ Status do Pedido: Entregue');

  console.log('\n--- 4. NHIQUELA WEB (ADMIN / PARTNER PANEL) ---');
  console.log('💻 Painel do Parceiro calcula KPIs e deduz comissões...');
  
  // Simulando a carteira do Vendedor (Revenue + Dedução)
  let sellerWallet = await Wallet.findOne({ ownerId: sellerUser._id });
  if(!sellerWallet) {
    await Wallet.insertOne({ ownerId: sellerUser._id, balance: 500, ownerType: 'seller' });
    sellerWallet = await Wallet.findOne({ ownerId: sellerUser._id });
  }

  let driverWallet = await Wallet.findOne({ ownerId: driver._id });
  if(!driverWallet) {
    await Wallet.insertOne({ ownerId: driver._id, balance: 100, ownerType: 'driver' });
    driverWallet = await Wallet.findOne({ ownerId: driver._id });
  }

  console.log(`💰 Saldo do Parceiro antes da comissão: ${sellerWallet.balance} MT`);
  console.log(`💰 Saldo do Motorista antes da comissão: ${driverWallet.balance} MT`);
  
  const commissionPlataforma = 350 * 0.15; // 15% de 350 MT = 52.5 MT
  await Wallet.updateOne({ _id: sellerWallet._id }, { $inc: { balance: -commissionPlataforma } });
  
  console.log(`💸 Comissão deduzida com sucesso (-${commissionPlataforma} MT).`);
  console.log(`✅ Fluxo E2E Completo! Os dashboards no Admin já processarão este pedido como [Concluído].`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(console.error);
