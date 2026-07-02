const fs = require('fs');
let c = fs.readFileSync('routes/requestDeliverRoutes.js', 'utf8');

c = c.replace(
  /stepStatus:\s*req\.body\.stepStatus/,
  'stepStatus: req.body.stepStatus,\n      targetDriverId: req.body.targetDriverId,\n      latitude: req.body.latitude,\n      longitude: req.body.longitude'
);

const emitCode = `
    const io = req.app.get('io');
    if (io) {
      if (newOrder.targetDriverId) {
        io.to(\`driver_\${newOrder.targetDriverId}\`).emit('new_order', requestDeliv);
      } else {
        io.emit('new_order', requestDeliv);
      }
    }
`;

if (!c.includes("io.to(`driver_")) {
  c = c.replace(
    /const requestDeliv = await newOrder\.save\(\);/,
    `const requestDeliv = await newOrder.save();\n${emitCode}`
  );
}

const rejectRoute = `
// O motorista rejeita ou ocorre timeout
requestDeliver.put(
  '/:id/reject',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestDeliv.findById(req.params.id);
    if (order) {
      order.status = 'Cancelado';
      order.targetDriverId = null;
      order.stepStatus = 7; 
      order.canceledReason = 'Motorista indisponivel ou tempo esgotado';
      await order.save();
      const io = req.app.get('io');
      if (io) {
        io.to(\`order_\${order._id}\`).emit('order_updated', order);
      }
      res.send({ message: 'Pedido rejeitado/timeout', order: order });
    } else {
      res.status(404).send({ message: 'Pedido nao encontrado' });
    }
  })
);
`;

if (!c.includes('/:id/reject')) {
  c = c.replace('export default requestDeliver;', rejectRoute + '\nexport default requestDeliver;');
}

fs.writeFileSync('routes/requestDeliverRoutes.js', c);
console.log('Fixed properly using Regex!');
