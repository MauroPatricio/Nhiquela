const fs = require('fs');
let c = fs.readFileSync('routes/requestServiceRoutes.js', 'utf8');

const target1 = "stepStatus: req.body.stepStatus";
const replace1 = "stepStatus: req.body.stepStatus,\n      targetDriverId: req.body.targetDriverId";

if (c.includes(target1) && !c.includes('targetDriverId: req.body.targetDriverId')) {
  c = c.replace(target1, replace1);
}

const target2 = "io.emit('new_order', requestService);";
const replace2 = "if (newOrder.targetDriverId) { io.to(`driver_${newOrder.targetDriverId}`).emit('new_order', requestService); } else { io.emit('new_order', requestService); }";

if (c.includes(target2) && !c.includes('driver_${newOrder.targetDriverId}')) {
  c = c.replace(target2, replace2);
}

const rejectRoute = `
requestService.put(
  '/:id/reject',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);
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
  c = c.replace('export default requestService;', rejectRoute + '\nexport default requestService;');
}

fs.writeFileSync('routes/requestServiceRoutes.js', c);
console.log('Fixed targetDriverId in requestServiceRoutes.js');
