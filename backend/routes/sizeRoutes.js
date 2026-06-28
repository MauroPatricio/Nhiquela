import express from 'express';
import { isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/ProductModel.js';
import Size from '../models/SizeModel.js';

const sizeRoutes = express.Router();

// All Categories
sizeRoutes.get(
  '/',
  expressAsyncHandler(async (req, res) => {


    const page = req.query.page || 1;
    const pageSize = 10

    const sizes = await Size.find({ isActive: true }).sort({name: 'asc'});

    res.send({sizes});
  })
);

sizeRoutes.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newSize = new Size({
      name: req.body.name,
      nome: req.body.nome,
      isActive: true,
    });

    const size = await newSize.save();
    res
      .status(201)
      .send({ message: 'Novo tamanho criado com sucesso', size});
  })
);

// get Size by id
sizeRoutes.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const size = await Size.findById(req.params.id);
    if (size) {
      res.send(size);
    } else {
      res.status(404).send({ message: 'Tamanho não encontrada' });
    }
  })
);

sizeRoutes.put(
  '/:id/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const size = await Size.findById(req.params.id);

    if (size) {
      size.name = req.body.name;
      size.nome = req.body.nome;
      size.isActive = req.body.isActive;

     if(!size.isActive){
     const products = await Product.find({size: req.params.id});
      products.forEach(async p=>{
        p.isActive = false;
        await p.save();
      })
     }

      await size.save();
      res.send({ message: `Tamanhos actualizados com sucesso` });
    } else {
      res.status(404).send({ message: 'Tamanho não encontrado' });
    }
  })
);

sizeRoutes.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const size = await Size.findById(req.params.id);

    if (size) {
      size.isActive = false;

      await Product.deleteMany({size: size._id });


      await size.save();

      res.send({ message: `Tamanho Removido Com Sucesso` });
    } else {
      res.status(404).send({ message: 'Tamanho não encontrado' });
    }
  })
);

export default sizeRoutes;
