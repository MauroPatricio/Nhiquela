import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import TipoEstabelecimento from '../models/TipoEstabelecimento.js';
import { body, validationResult } from 'express-validator';
import { isAuth, isSellerOrAdmin } from '../utils.js';

const router = express.Router();

// Criar novo tipo de estabelecimento
router.post(
  '/',
  isAuth,
  isSellerOrAdmin,
  [
    body('nome').notEmpty().withMessage('Nome � obrigat�rio'),
    body('img').notEmpty().withMessage('Imagem � obrigat�ria'),
    body('averagePreparationTime').isNumeric().withMessage('averagePreparationTime deve ser num�rico'),
    body('autoAssignDriver').isBoolean().withMessage('autoAssignDriver deve ser boolean'),
  ],
  expressAsyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { nome, img, averagePreparationTime, autoAssignDriver, paymentMethods } = req.body;
    const novoTipo = new TipoEstabelecimento({ nome, img, averagePreparationTime, autoAssignDriver, paymentMethods });
    await novoTipo.save();
    res.status(201).json(novoTipo);
  })
);

// Atualizar tipo de estabelecimento por ID
router.put(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  [
    body('nome').optional().notEmpty().withMessage('Nome n�o pode ser vazio'),
    body('img').optional().notEmpty().withMessage('Imagem n�o pode ser vazia'),
    body('averagePreparationTime').optional().isNumeric().withMessage('averagePreparationTime deve ser num�rico'),
    body('autoAssignDriver').optional().isBoolean().withMessage('autoAssignDriver deve ser boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive deve ser boolean'),
  ],
  expressAsyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const tipoEstabelecimento = await TipoEstabelecimento.findById(req.params.id);

    if (tipoEstabelecimento) {
      if (req.body.nome !== undefined) tipoEstabelecimento.nome = req.body.nome;
      if (req.body.img !== undefined) tipoEstabelecimento.img = req.body.img;
      if (req.body.isActive !== undefined) tipoEstabelecimento.isActive = req.body.isActive;
      if (req.body.averagePreparationTime !== undefined) {
        tipoEstabelecimento.averagePreparationTime = req.body.averagePreparationTime;
      }
      if (req.body.autoAssignDriver !== undefined) {
        tipoEstabelecimento.autoAssignDriver = req.body.autoAssignDriver;
      }
      if (req.body.paymentMethods !== undefined) {
        tipoEstabelecimento.paymentMethods = req.body.paymentMethods;
      }
      await tipoEstabelecimento.save();
      res.send({ message: 'Tipo de estabelecimento atualizado com sucesso' });
    } else {
      res.status(404).send({ message: 'Tipo de estabelecimento n�o encontrado' });
    }
  })
);

// Obter todos os tipos de estabelecimentos com pagina��o e busca
router.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';

    const filter = search && search !== 'all' ? { nome: { $regex: search, $options: 'i' } } : {};

    const [tipoestabelecimentos, total] = await Promise.all([
      TipoEstabelecimento.find(filter)
        .populate('paymentMethods')
        .skip(pageSize * (page - 1))
        .limit(pageSize)
        .lean(),
      TipoEstabelecimento.countDocuments(filter),
    ]);

    res.send({
      tipoestabelecimentos,
      page,
      pages: Math.ceil(total / pageSize),
      total,
    });
  })
);


// get Size by id
router.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const tipoestabelecimento = await TipoEstabelecimento.findById(req.params.id).populate('paymentMethods');
    if (tipoestabelecimento) {
      res.send(tipoestabelecimento);
    } else {
      res.status(404).send({ message: 'Tipo de estabelecimento n�o encontrado' });
    }
  })
);

// Remover tipo de estabelecimento por ID
router.delete(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const tipo = await TipoEstabelecimento.findById(req.params.id);
    if (tipo) {
      await tipo.deleteOne();
      res.status(200).json({ message: 'Tipo de estabelecimento removido com sucesso' });
    } else {
      res.status(404).json({ message: 'Tipo de estabelecimento n�o encontrado' });
    }
  })
);

// Toggle active status
router.patch(
  '/:id/toggle-status',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const tipo = await TipoEstabelecimento.findById(req.params.id);
    if (!tipo) {
      return res.status(404).json({ message: 'Tipo de estabelecimento n�o encontrado' });
    }
    tipo.isActive = !tipo.isActive;
    await tipo.save();
    res.send({ message: `Tipo de estabelecimento ${tipo.isActive ? 'ativado' : 'desativado'}`, tipo });
  })
);

export default router;
