const fs = require('fs');

const filepath = 'routes/driverRoutes.js';
let content = fs.readFileSync(filepath, 'utf8');

const newRoutes = `

// ============================================================
// PEDIDOS DE ATUALIZAÇÃO DE DOCUMENTOS (DOC UPDATE)
// ============================================================

// POST /api/drivers/doc-update-request — Motorista submete pedido de alteração de documentos
router.post(
  '/doc-update-request',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const driver = await User.findById(req.user._id);
    if (!driver || !driver.isDeliveryMan) {
      return res.status(404).send({ message: 'Motorista não encontrado.' });
    }

    // Cancelar qualquer pedido pendente anterior do mesmo tipo
    await DeliverymanUpdateRequest.updateMany(
      { deliverymanId: req.user._id, type: 'profile_update', status: 'PENDING' },
      { status: 'REJECTED', reason: 'Substituído por novo pedido' }
    );

    // Criar novo pedido
    const docRequest = await DeliverymanUpdateRequest.create({
      deliverymanId: req.user._id,
      type: 'profile_update',
      status: 'PENDING',
    });

    // Atualizar estado no motorista
    if (!driver.deliveryman) driver.deliveryman = {};
    driver.deliveryman.docUpdateStatus = 'Pendente';
    await driver.save();

    res.send({ message: 'Pedido de atualização enviado com sucesso.', docRequest });
  })
);

// GET /api/drivers/doc-update-requests — Admin lista pedidos de documentos
router.get(
  '/doc-update-requests',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = { type: 'profile_update' };
    if (status) filter.status = status.toUpperCase();
    const requests = await DeliverymanUpdateRequest.find(filter)
      .populate('deliverymanId', 'name email deliveryman')
      .populate('reviewedBy', 'name')
      .sort({ requestedAt: -1 });
    res.send({ requests, total: requests.length });
  })
);

// PUT /api/drivers/doc-update-requests/:id/review — Admin aprova ou rejeita pedido de docs
router.put(
  '/doc-update-requests/:id/review',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const { decision, rejectionReason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).send({ message: 'Decisão inválida. Use APPROVED ou REJECTED.' });
    }

    const request = await DeliverymanUpdateRequest.findById(req.params.id);
    if (!request || request.type !== 'profile_update') {
      return res.status(404).send({ message: 'Pedido não encontrado.' });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).send({ message: 'Este pedido já foi processado.' });
    }

    request.status = decision;
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    request.reason = rejectionReason || '';
    await request.save();

    // Atualizar perfil do motorista
    const driver = await User.findById(request.deliverymanId);
    if (driver) {
      if (decision === 'APPROVED') {
        driver.deliveryman.docUpdateStatus = 'Aprovado';
      } else {
        driver.deliveryman.docUpdateStatus = 'Nenhum';
      }
      await driver.save();
    }

    // Notificação push opcional
    if (driver?.deviceToken) {
      try {
        const { Expo } = await import('expo-server-sdk');
        const expo = new Expo();
        const msg = decision === 'APPROVED'
          ? 'O seu pedido para atualizar documentos foi aprovado! Pode agora editar o seu perfil.'
          : 'O seu pedido para atualizar documentos foi rejeitado.';
        await expo.sendPushNotificationsAsync([{
          to: driver.deviceToken,
          sound: 'default',
          title: 'Atualização de Documentos',
          body: msg,
        }]);
      } catch (err) {
        console.error('Erro ao enviar push notification:', err);
      }
    }

    res.send({ message: \`Pedido \${decision === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}\`, request });
  })
);

// ============================================================
`;

if (!content.includes('/doc-update-request')) {
  // Insert right before price-request
  const marker = "// POST /api/drivers/price-request";
  content = content.replace(marker, newRoutes + marker);
  fs.writeFileSync(filepath, content);
  console.log('Routes added to driverRoutes.js');
} else {
  console.log('Routes already exist in driverRoutes.js');
}
