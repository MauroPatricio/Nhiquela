import express from 'express';
import { isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/ProductModel.js';
import Color from '../models/ColorModel.js';

const colorRoutes = express.Router();

// All Categories
colorRoutes.get(
  '/',
  expressAsyncHandler(async (req, res) => {


    const page = req.query.page || 1;
    const pagecolor = 10

    const colors = await Color.find({ isActive: true }).sort({name: 'asc'});

    res.send({colors});
  })
);

colorRoutes.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newColor = new Color({
      name: req.body.name,
      nome: req.body.nome,
      isActive: true,
    });

    const color = await newColor.save();
    res
      .status(201)
      .send({ message: 'Cor criado com sucesso', color});
  })
);

// get color by id
colorRoutes.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const color = await Color.findById(req.params.id);
    if (color) {
      res.send(color);
    } else {
      res.status(404).send({ message: 'Cor não encontrada' });
    }
  })
);

colorRoutes.put(
  '/:id/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const color = await Color.findById(req.params.id);

    if (color) {
      color.name = req.body.name;
      color.nome = req.body.nome;

      color.isActive = req.body.isActive;

     if(!color.isActive){
     const colors = await Product.find({color: req.params.id});
      products.forEach(async p=>{
        p.isActive = false;
        await p.save();
      })
     }

      await color.save();
      res.send({ message: `Cor actualizada com sucesso` });
    } else {
      res.status(404).send({ message: 'Cor não encontrada' });
    }
  })
);

colorRoutes.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const color = await Color.findById(req.params.id);

    if (color) {
      color.isActive = false;

      await Product.deleteMany({color: color._id });


      await color.save();

      res.send({ message: `Cor Removida Com Sucesso` });
    } else {
      res.status(404).send({ message: 'Cor não encontrada' });
    }
  })
);

export default colorRoutes;
