import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DRIVER_ID = '6a5e4b791190611b54292756';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  
  // 1. Verificar motorista
  const driver = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(DRIVER_ID) });
  console.log('\n===== MOTORISTA =====');
  if(driver) {
    console.log('Name:', driver.name);
    console.log('Status:', driver.status);
    console.log('Availability:', driver.availability);
    console.log('DeviceToken:', driver.deviceToken ? '✓ presente' : '✗ ausente');
    console.log('IsDeliveryMan:', driver.isDeliveryMan);
    console.log('transport_type (raw):', driver.deliveryman?.transport_type);
    console.log('locationGeo coordinates:', driver.locationGeo?.coordinates);
    console.log('latitude:', driver.latitude, '| longitude:', driver.longitude);
    console.log('hasActiveService:', driver.deliveryman?.hasActiveService);
  } else {
    console.log('Motorista NÃO ENCONTRADO!');
  }

  // 2. Verificar VehicleType com esse ID
  const vehicleTypeId = driver?.deliveryman?.transport_type;
  if (vehicleTypeId) {
    try {
      const vType = await db.collection('vehicletypes').findOne({ _id: new mongoose.Types.ObjectId(vehicleTypeId.toString()) });
      console.log('\n===== VEHICLE TYPE =====');
      console.log('VehicleType encontrado:', vType ? vType.name : 'NÃO ENCONTRADO (ID: ' + vehicleTypeId + ')');
    } catch(e) {
      const subcat = await db.collection('providersubcategories').findOne({ _id: new mongoose.Types.ObjectId(vehicleTypeId.toString()) });
      console.log('\n===== PROVIDER SUBCATEGORY =====');
      console.log('Subcategory encontrado:', subcat ? subcat.name : 'NÃO ENCONTRADO');
    }
  }

  // 3. Verificar TODOS os pedidos recentes (independente de stepStatus)
  const allOrders = await db.collection('requestservices').find({ deleted: false }).sort({ createdAt: -1 }).limit(5).toArray();
  console.log('\n===== ÚLTIMOS 5 PEDIDOS (todos) =====');
  console.log('Total recent:', allOrders.length);
  allOrders.forEach(o => {
    console.log(`  Code: ${o.code} | stepStatus: ${o.stepStatus} | status: ${o.status} | transportType: "${o.transportType}" | targetDriverId: ${o.targetDriverId || 'none'} | deleted: ${o.deleted}`);
  });

  // 4. Pedidos com stepStatus=3
  const pendingOrders = await db.collection('requestservices').find({ stepStatus: 3 }).toArray();
  console.log('\n===== PEDIDOS COM stepStatus=3 =====');
  console.log('Total:', pendingOrders.length);
  pendingOrders.forEach(o => {
    console.log(`  Code: ${o.code} | transportType: "${o.transportType}" | targetDriverId: ${o.targetDriverId || 'none'}`);
  });


  // 4. Token push
  const token = await db.collection('notificationtokens').findOne({ user: new mongoose.Types.ObjectId(DRIVER_ID) });
  console.log('\n===== NOTIFICATION TOKEN =====');
  console.log('Token:', token ? token.deviceToken?.substring(0,30) + '...' : 'NÃO ENCONTRADO');

  // 5. Wallet
  const wallet = await db.collection('wallets').findOne({ $or: [{ ownerId: new mongoose.Types.ObjectId(DRIVER_ID) }, { userId: new mongoose.Types.ObjectId(DRIVER_ID) }] });
  console.log('\n===== WALLET =====');
  console.log('Balance:', wallet ? wallet.balance : 'SEM WALLET');
  
  process.exit(0);
});

