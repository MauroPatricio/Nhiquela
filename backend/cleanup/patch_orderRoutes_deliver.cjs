const fs = require('fs');
let c = fs.readFileSync('routes/orderRoutes.js', 'utf8');

const startMatch = c.indexOf('// O cliente finaliza a confirmar a recepcao do pedido');
const endMatch = c.indexOf('// Em caso de cancelamento do pedido');

if (startMatch !== -1 && endMatch !== -1) {
  const oldBlock = c.substring(startMatch, endMatch);
  
  const newBlock = `// O cliente finaliza a confirmar a recepcao do pedido
orderRouter.put(
  '/:id/deliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(req.params.id).session(session);

      if (order) {
        order.status = 'Entregue';
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.stepStatus = 6;

        await reputationTracker.recordOrderCompleted(order.user);

        // Calculate and debit commission if a deliveryman exists
        if (order.deliveryman && order.deliveryman.id) {
          const financialConfig = await getFinancialConfig();
          const commissionRate = financialConfig?.driverCommissionRate || 0.15;
          const serviceValue = order.deliveryPrice || order.totalPrice || 0;
          const commissionAmount = serviceValue * commissionRate;

          try {
            await debitDriverCommissionWithSession(
              order.deliveryman.id,
              commissionAmount,
              \`Comissão de serviço para o pedido \${order.code}\`,
              'wallet',
              session
            );
          } catch (error) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ message: error.message });
          }
        }

        const savedOrder = await order.save({ session });
        await session.commitTransaction();
        session.endSession();

        let message = \`A Nhiquela informa que o pedido \${order.code} foi entregue com sucesso.\`;

        const sellerOfProduct = await User.findById(order.seller);
        const clientOfProduct = await User.findById(order.user);

        if (sellerOfProduct && sellerOfProduct.pushToken) {
          await createNotification({
            message: message,
            receiver_id: order.seller,
            sender_id: order.user,
            orderID: order._id,
            pushToken: sellerOfProduct.pushToken,
          });
        }

        if (clientOfProduct && clientOfProduct.pushToken) {
          await createNotification({
            message: message,
            receiver_id: order.user,
            sender_id: order.seller,
            orderID: order._id,
            pushToken: clientOfProduct.pushToken
          });
        }

        const io = req.app.get('io');
        if (io) {
          io.to(\`order_\${order._id}\`).emit('order_updated', savedOrder);
          if (order.deliveryman?.id) {
            io.to(\`driver_\${order.deliveryman.id}\`).emit('order_updated', savedOrder);
          }
        }

        res.send({ order: savedOrder, message: \`Pedido entregue com sucesso\` });
      } else {
        await session.abortTransaction();
        session.endSession();
        res.status(404).send({ message: 'Pedido não encontrado' });
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).send({ message: error.message || 'Erro ao finalizar o pedido.' });
    }
  })
);

`;

  c = c.replace(oldBlock, newBlock);
  fs.writeFileSync('routes/orderRoutes.js', c);
  console.log('Replaced successfully');
} else {
  console.log('Block not found');
}
