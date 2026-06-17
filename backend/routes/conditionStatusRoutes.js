import express from 'express';
import { isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import ConditionStatus from '../models/ConditionStatusModel.js';

const conditionStatusRouter = express.Router();

// All ConditionStatus
conditionStatusRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {


    const page = req.query.page || 1;
    const pageSize = 10

    const conditionStatus = await ConditionStatus.find({ isActive: true }).sort({name: 'asc'});

    res.send({conditionStatus});
  })
);

conditionStatusRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newConditionStatus = new ConditionStatus({
      name: req.body.name,
      nome: req.body.nome,
      description: req.body.description,
      isActive: true,
    });

    const conditionStatus = await newConditionStatus.save();
    res
      .status(201)
      .send({ message: 'Estado do produto criado com sucesso', conditionStatus });
  })
);

// get conditionStatus by id
conditionStatusRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const conditionStatus = await ConditionStatus.findById(req.params.id);
    if (conditionStatus) {
      res.send(conditionStatus);
    } else {
      res.status(404).send({ message: 'Estado do produto não encontrado' });
    }
  })
);

conditionStatusRouter.put(
  '/:id/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const conditionStatus = await ConditionStatus.findById(req.params.id);

    if (conditionStatus) {
      conditionStatus.icon = req.body.icon;
      conditionStatus.name = req.body.name;
      conditionStatus.description = req.body.description;
      conditionStatus.isActive = req.body.isActive;

     if(!conditionStatus.isActive){
     const products = await Product.find({conditionStatus: req.params.id});
      products.forEach(async p=>{
        p.isActive = false;
        await p.save();
      })
     }

      await conditionStatus.save();
      res.send({ message: `Estado do produto actualizado com sucesso` });
    } else {
      res.status(404).send({ message: 'Estado do produto não encontrado' });
    }
  })
);

conditionStatusRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const conditionStatus = await ConditionStatus.findById(req.params.id);

    if (conditionStatus) {
      conditionStatus.isActive = false;

      await Product.deleteMany({conditionStatus: conditionStatus._id });


      await conditionStatus.save();

      res.send({ message: `Estado do produto Removido Com Sucesso` });
    } else {
      res.status(404).send({ message: 'Estado do produto não encontrado' });
    }
  })
);

export default conditionStatusRouter;
