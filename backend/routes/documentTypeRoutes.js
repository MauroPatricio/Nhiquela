import express from 'express';
import { isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import DocumentType from '../models/DocumentTypeModel.js';

const documentTypeRoutes = express.Router();

// All Categories
documentTypeRoutes.get(
  '/',
  expressAsyncHandler(async (req, res) => {


    const page = req.query.page || 1;
    const pageSize = 10

    const documentTypes = await DocumentType.find({ isActive: true }).skip(pageSize *(page -1)).limit(pageSize).sort({name: 'asc'});
    const countDocumentTypes = await DocumentType.countDocuments({ isActive: true });
    const  pages = Math.ceil(countDocumentTypes/pageSize);

    res.send({documentTypes, pages});
  })
);

documentTypeRoutes.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newDocumentType = new DocumentType({
      name: req.body.name,
      nome: req.body.nome,
      isActive: true,
    });

    const documenType = await newDocumentType.save();
    res
      .status(201)
      .send({ message: 'Tipo de documento criado com sucesso', documenType });
  })
);

// get documenType by id
documentTypeRoutes.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const documenType = await DocumentType.findById(req.params.id);
    if (documenType) {
      res.send(documenType);
    } else {
      res.status(404).send({ message: 'Tipo de documento não encontrado' });
    }
  })
);

documentTypeRoutes.put(
  '/:id/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const documenType = await DocumentType.findById(req.params.id);

    if (documenType) {
      documenType.name = req.body.name;
      documenType.nome = req.body.nome;
      documenType.isActive = req.body.isActive;

      await documenType.save();
      res.send({ message: `Tipo de documento actualizado com sucesso` });
    } else {
      res.status(404).send({ message: 'Tipo de documento não encontrado' });
    }
  })
);

documentTypeRoutes.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const documenType = await DocumentType.findById(req.params.id);

    if (documenType) {
      documenType.isActive = false;
      await documenType.save();

      res.send({ message: `Tipo de documento Removido Com Sucesso` });
    } else {
      res.status(404).send({ message: 'Tipo de documento não encontrado' });
    }
  })
);

export default documentTypeRoutes;
