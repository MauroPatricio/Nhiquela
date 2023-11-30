import express from 'express';
import { isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import QualityType from '../models/QualityTypeModel.js';

const qualityTypeRouter = express.Router();

// All QualityType
qualityTypeRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const qualityTypes = await QualityType.find({ isActive: true }).sort({name: 'asc'});
    res.send({qualityTypes});
  })
);

qualityTypeRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newQualityType = new QualityType({
      name: req.body.name,
      nome: req.body.nome,
      description: req.body.description,
      isActive: true,
    });

    const qualityType = await newQualityType.save();
    res
      .status(201)
      .send({ message: 'Qualidade do produto criado com sucesso', qualityType });
  })
);

// get QualityType by id
qualityTypeRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const qualityType = await QualityType.findById(req.params.id);
    if (qualityType) {
      res.send(qualityType);
    } else {
      res.status(404).send({ message: 'Qualidade do produto não encontrado' });
    }
  })
);

qualityTypeRouter.put(
  '/:id/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const qualityType = await QualityType.findById(req.params.id);

    if (qualityType) {
      qualityType.name = req.body.name;
      qualityType.nome = req.body.nome;
      qualityType.description = req.body.description;
      qualityType.isActive = req.body.isActive;

     if(!qualityType.isActive){
     const products = await Product.find({qualityType: req.params.id});
      products.forEach(async p=>{
        p.isActive = false;
        await p.save();
      })
     }

      await qualityType.save();
      res.send({ message: `Qualidade do produto actualizado com sucesso` });
    } else {
      res.status(404).send({ message: 'Qualidade não encontrada' });
    }
  })
);

qualityTypeRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const qualityType = await QualityType.findById(req.params.id);

    if (qualityType) {
      qualityType.isActive = false;

      await Product.deleteMany({qualityType: qualityType._id });


      await qualityType.save();

      res.send({ message: `Qualidade Removida Com Sucesso` });
    } else {
      res.status(404).send({ message: 'Qualidade não encontrada' });
    }
  })
);

export default qualityTypeRouter;
