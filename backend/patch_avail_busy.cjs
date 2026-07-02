const fs = require('fs');

try {
  let content = fs.readFileSync('routes/driverRoutes.js', 'utf8');

  // Import RequestDeliv if not already imported
  if (!content.includes("import RequestDeliv from '../models/RequestDeliverModel.js';")) {
    content = content.replace(
      "import User from '../models/UserModel.js';",
      "import User from '../models/UserModel.js';\nimport RequestDeliv from '../models/RequestDeliverModel.js';"
    );
  }

  // Inject active order check in /available
  const oldQuery = `const drivers = await User.find(filter).lean();`;
  const newQuery = `
    // Try to find drivers
    let drivers = await User.find(filter).lean();
    
    // EXCLUDE OCCUPIED DRIVERS (drivers with active orders or pending direct requests)
    const activeOrders = await RequestDeliv.find({
       status: { $nin: ['Finalizado', 'Cancelado'] }
    }).select('deliveryman targetDriverId').lean();
    
    const busyDriverIds = new Set();
    activeOrders.forEach(order => {
       if (order.deliveryman && order.deliveryman.id) {
          busyDriverIds.add(order.deliveryman.id.toString());
       }
       if (order.targetDriverId) {
          busyDriverIds.add(order.targetDriverId.toString());
       }
    });

    drivers = drivers.filter(d => !busyDriverIds.has(d._id.toString()));
  `;

  if (!content.includes('EXCLUDE OCCUPIED DRIVERS')) {
    content = content.replace(oldQuery, newQuery);
  }

  fs.writeFileSync('routes/driverRoutes.js', content, 'utf8');
  console.log('Patched driverRoutes.js to exclude occupied drivers successfully.');
} catch (e) {
  console.error('Error patching:', e);
}
