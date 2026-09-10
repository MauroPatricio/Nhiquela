const fs = require('fs');

try {
  let content = fs.readFileSync('routes/requestServiceRoutes.js', 'utf8');

  // Add targetDriverId to the newOrder creation
  if (!content.includes('targetDriverId: req.body.targetDriverId,')) {
    content = content.replace(
      'stepStatus: req.body.stepStatus\n    });',
      'stepStatus: req.body.stepStatus,\n      targetDriverId: req.body.targetDriverId\n    });'
    );
  }
  
  // Replace WebSocket broadcast
  if (!content.includes('if (newOrder.targetDriverId) {')) {
    const oldWsCode = `    // Emitir WebSocket para notificar motoristas (nhiqueladriver)
    const io = req.app.get('io');
    if (io) {
      io.emit('new_order', requestService);
    }`;

    const newWsCode = `    // Emitir WebSocket para notificar motoristas (nhiqueladriver)
    const io = req.app.get('io');
    if (io) {
      if (newOrder.targetDriverId) {
        io.to(\`driver_\${newOrder.targetDriverId}\`).emit('new_order', requestService);
      } else {
        io.emit('new_order', requestService);
      }
    }`;

    content = content.replace(oldWsCode, newWsCode);
  }

  // Also create a route for rejecting a request (timeout/reject)
  const rejectRoute = `
// O motorista ou sistema rejeita/timeout do pedido
requestService.put(
  '/:id/reject',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await RequestService.findById(req.params.id);

    if (order) {
      order.status = 'Cancelado'; // or maybe keep it Pendente but remove targetDriverId so the client can search again?
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

  if (!content.includes('/:id/reject')) {
    content = content.replace('export default requestService;', rejectRoute + '\nexport default requestService;');
  }

  fs.writeFileSync('routes/requestServiceRoutes.js', content, 'utf8');
  console.log('Patched requestServiceRoutes.js for targetDriverId and reject route.');
} catch (e) {
  console.error('Error patching:', e);
}
