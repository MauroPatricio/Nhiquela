import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/UserModel.js';
import Order from '../models/OrderModel.js';
import { isAuth, isSellerOrAdmin } from '../utils.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Get all drivers (delivery men)
// Get all drivers (delivery men) with pagination and optional search
router.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const filter = { isDeliveryMan: true };
    if (search && search !== 'all') {
      const regex = { $regex: search, $options: 'i' };
      filter.$or = [{ name: regex }, { email: regex }];
    }
    const [drivers, total] = await Promise.all([
      User.find(filter)
        .skip(pageSize * (page - 1))
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);
    res.send({ drivers, page, pages: Math.ceil(total / pageSize), total });
  })
);

// Rota ultra-rápida (Ping) para os Motoristas atualizarem a sua localização (10 em 10 segs)
router.put(
  '/ping',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).send({ message: 'Coordenadas (lat, lng) são obrigatórias' });
    }

    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          geoPosition: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)] // Padrão GeoJSON [longitude, latitude]
          },
          lastPingAt: new Date(),
        }
      }
    );

    res.send({ message: 'Ping recebido' });
  })
);

// Estatísticas do Motorista
router.get(
  '/stats/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Conta as viagens concluídas pelo motorista autenticado
    const totalTrips = await Order.countDocuments({
      'deliveryman.id': req.user._id,
      isDelivered: true
    });

    // Rating fixo para já (4.8), no futuro virá da média das avaliações das ordens
    res.send({
      totalTrips: totalTrips || 0,
      rating: 4.8
    });
  })
);

// Create a new driver (admin only)
router.post(
  '/',
  isAuth,
  isSellerOrAdmin,
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
    body('phoneNumber').notEmpty().withMessage('Telefone é obrigatório'),
  ],
  expressAsyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, password, phoneNumber } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (exists) {
      return res.status(400).send({ message: 'Email ou telefone já registado' });
    }
    const driver = new User({
      name,
      email,
      password,
      phoneNumber,
      isDeliveryMan: true,
    });
    await driver.save();
    res.status(201).send({ message: 'Motorista criado', driver });
  })
);

// Get driver by ID (auth driver or admin)
router.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const driver = await User.findById(req.params.id);
    if (!driver || !driver.isDeliveryMan) {
      return res.status(404).send({ message: 'Motorista não encontrado' });
    }
    // Allow self or admin
    if (req.user._id !== driver._id.toString() && !req.user.isAdmin) {
      return res.status(403).send({ message: 'Acesso negado' });
    }
    res.send(driver);
  })
);

// Update driver (admin or self)
router.put(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  [
    body('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('phoneNumber').optional().notEmpty().withMessage('Telefone não pode ser vazio'),
    body('password').optional().isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
  ],
  expressAsyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const driver = await User.findById(req.params.id);
    if (!driver || !driver.isDeliveryMan) {
      return res.status(404).send({ message: 'Motorista não encontrado' });
    }
    if (req.user._id !== driver._id.toString() && !req.user.isAdmin) {
      return res.status(403).send({ message: 'Acesso negado' });
    }
    const { name, email, phoneNumber, password } = req.body;
    if (name) driver.name = name;
    if (email) driver.email = email;
    if (phoneNumber) driver.phoneNumber = phoneNumber;
    if (password) driver.password = password;
    await driver.save();
    res.send({ message: 'Motorista atualizado', driver });
  })
);

// Delete driver (admin only)
router.delete(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const driver = await User.findById(req.params.id);
    if (!driver || !driver.isDeliveryMan) {
      return res.status(404).send({ message: 'Motorista não encontrado' });
    }
    await driver.deleteOne();
    res.send({ message: 'Motorista removido' });
  })
);

export default router;
