import express from 'express';
import { isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Category from '../models/CategoryModel.js';
import Product from '../models/ProductModel.js';

const categoryRouter = express.Router();

// All Categories
categoryRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {


    const page = req.query.page || 1;
    const pageSize = 10

    const categories = await Category.find({ isActive: true }).sort({nome: 'asc'});

    res.status(200)
    .send({categories});
  })
);

categoryRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newCategory = new Category({
      icon: req.body.icon,
      name: req.body.name,
      nome: req.body.nome,
      description: req.body.description,
      isActive: true,
    });


    const category = await newCategory.save();
    res
      .status(201)
      .send({ message: 'Nova categoria criada com sucesso', category });
  })
);

// get category by id
categoryRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (category) {
      res.send(category);
    } else {
      res.status(404).send({ message: 'Categoria não encontrada' });
    }
  })
);

categoryRouter.put(
  '/:id/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (category) {
      category.icon = req.body.icon;
      category.name = req.body.name;
      category.nome = req.body.nome;

      category.description = req.body.description;
      category.isActive = req.body.isActive;

     if(!category.isActive){
     const products = await Product.find({category: req.params.id});
      products.forEach(async p=>{
        p.isActive = false;
        await p.save();
      })
     }

      await category.save();
      res.send({ message: `Categoria actualizada com sucesso` });
    } else {
      res.status(404).send({ message: 'Categoria não encontrada' });
    }
  })
);

categoryRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (category) {
      category.isActive = false;

      await Product.deleteMany({category: category._id });


      await category.save();

      res.send({ message: `Categoria removida com sucesso` });
    } else {
      res.status(404).send({ message: 'Categoria não encontrada' });
    }
  })
);

export default categoryRouter;
