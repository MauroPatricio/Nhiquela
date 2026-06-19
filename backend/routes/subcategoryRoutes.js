import express from 'express';
import { isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Subcategory from '../models/SubcategoryModel.js';
import Product from '../models/ProductModel.js';

const subcategoryRouter = express.Router();

// All Subcategories (paginação opcional)
subcategoryRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = 10;

    const subcategories = await Subcategory.find({ isActive: true })
      .populate('category', 'name')
      .sort({ name: 'asc' })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    res.status(200).send({ subcategories });
  })
);

// Create new Subcategory
subcategoryRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newSubcategory = new Subcategory({
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description,
      category: req.body.category, // ID da categoria pai
      image: req.body.image,
      isActive: true,
    });

    const subcategory = await newSubcategory.save();
    res.status(201).send({
      message: 'Nova subcategoria criada com sucesso',
      subcategory,
    });
  })
);

// Get Subcategory by ID
subcategoryRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const subcategory = await Subcategory.findById(req.params.id).populate(
      'category',
      'name'
    );

    if (subcategory) {
      res.send(subcategory);
    } else {
      res.status(404).send({ message: 'Subcategoria não encontrada' });
    }
  })
);

// Update Subcategory
subcategoryRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const subcategory = await Subcategory.findById(req.params.id);

    if (subcategory) {
      subcategory.name = req.body.name || subcategory.name;
      subcategory.slug = req.body.slug || subcategory.slug;
      subcategory.description = req.body.description || subcategory.description;
      subcategory.category = req.body.category || subcategory.category;
      subcategory.image = req.body.image || subcategory.image;
      subcategory.isActive =
        req.body.isActive !== undefined ? req.body.isActive : subcategory.isActive;

      // Se desativar subcategoria, desativar produtos relacionados
      if (!subcategory.isActive) {
        const products = await Product.find({ subcategory: req.params.id });
        for (const p of products) {
          p.isActive = false;
          await p.save();
        }
      }

      await subcategory.save();
      res.send({ message: 'Subcategoria atualizada com sucesso', subcategory });
    } else {
      res.status(404).send({ message: 'Subcategoria não encontrada' });
    }
  })
);

// Delete Subcategory (soft delete)
subcategoryRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const subcategory = await Subcategory.findById(req.params.id);

    if (subcategory) {
      subcategory.isActive = false;
      await subcategory.save();

      // Desativar produtos relacionados
      await Product.updateMany(
        { subcategory: subcategory._id },
        { $set: { isActive: false } }
      );

      res.send({ message: 'Subcategoria removida com sucesso' });
    } else {
      res.status(404).send({ message: 'Subcategoria não encontrada' });
    }
  })
);

export default subcategoryRouter;
