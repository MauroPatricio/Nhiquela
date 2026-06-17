import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Subcategory from '../models/SubcategoryModel.js';

const subcategoryRouter = express.Router();

// GET all subcategories
subcategoryRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const subcategories = await Subcategory.find({});
    res.send(subcategories);
  })
);

// POST new subcategory
subcategoryRouter.post(
  '/',
  expressAsyncHandler(async (req, res) => {
    const newSubcategory = new Subcategory({
      name: req.body.name,
      categoryId: req.body.categoryId,
      status: req.body.status || 'Ativo',
    });
    const subcategory = await newSubcategory.save();
    res.status(201).send(subcategory);
  })
);

// PUT update subcategory
subcategoryRouter.put(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const subcategory = await Subcategory.findById(req.params.id);
    if (subcategory) {
      subcategory.name = req.body.name || subcategory.name;
      subcategory.categoryId = req.body.categoryId || subcategory.categoryId;
      subcategory.status = req.body.status || subcategory.status;

      const updatedSubcategory = await subcategory.save();
      res.send(updatedSubcategory);
    } else {
      res.status(404).send({ message: 'Subcategory Not Found' });
    }
  })
);

// DELETE subcategory
subcategoryRouter.delete(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const subcategory = await Subcategory.findById(req.params.id);
    if (subcategory) {
      await subcategory.deleteOne();
      res.send({ message: 'Subcategory Deleted' });
    } else {
      res.status(404).send({ message: 'Subcategory Not Found' });
    }
  })
);

export default subcategoryRouter;
