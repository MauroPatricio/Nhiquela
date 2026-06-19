import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import TipoEstabelecimento from '../models/TipoEstabelecimento.js';
import { isAuth } from '../utils.js';

const router = express.Router();

// Criar novo tipo de estabelecimento
router.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { nome, img } = req.body;
    const novoTipo = new TipoEstabelecimento({ nome, img });
    await novoTipo.save();
    res.status(201).json(novoTipo);
  })
);

// Atualizar tipo de estabelecimento por ID
router.put(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const tipoEstabelecimento = await TipoEstabelecimento.findById(req.params.id);

    if (tipoEstabelecimento) {
      tipoEstabelecimento.nome = req.body.nome || tipoEstabelecimento.nome;
      tipoEstabelecimento.img = req.body.img || tipoEstabelecimento.img;
      tipoEstabelecimento.isActive =
        req.body.isActive !== undefined ? req.body.isActive : tipoEstabelecimento.isActive;

      await tipoEstabelecimento.save();
      res.send({ message: 'Tipo de estabelecimento atualizado com sucesso' });
    } else {
      res.status(404).send({ message: 'Tipo de estabelecimento não encontrado' });
    }
  })
);

// Obter todos os tipos de estabelecimentos
router.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const tipoestabelecimentos = await TipoEstabelecimento.find();
    res.send({tipoestabelecimentos});

  })
);


// get Size by id
router.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const tipoestabelecimento = await TipoEstabelecimento.findById(req.params.id);
    if (tipoestabelecimento) {
      res.send(tipoestabelecimento);
    } else {
      res.status(404).send({ message: 'Tipo de estabelecimento não encontrado' });
    }
  })
);

// Remover tipo de estabelecimento por ID
router.delete(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const tipo = await TipoEstabelecimento.findById(req.params.id);
    if (tipo) {
      await tipo.deleteOne();
      res.status(200).json({ message: 'Tipo de estabelecimento removido com sucesso' });
    } else {
      res.status(404).json({ message: 'Tipo de estabelecimento não encontrado' });
    }
  })
);

export default router;
