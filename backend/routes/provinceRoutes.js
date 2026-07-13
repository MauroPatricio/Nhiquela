import express from 'express';
import { isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import Province from '../models/ProvinceModel.js';

const provinceRoutes = express.Router();

// All Provinces
provinceRoutes.get(
  '/',
  expressAsyncHandler(async (req, res) => {


    const page = req.query.page || 1;
    const pageSize = 10

    const provinces = await Province.find({ isActive: true }).skip(pageSize *(page -1)).limit(pageSize).sort({name: 'asc'});
    const countProvinces = await Province.countDocuments({ isActive: true });
    const  pages = Math.ceil(countProvinces/pageSize);

    res.send({provinces, pages});
  })
);

provinceRoutes.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newProvince = new Province({
      name: req.body.name,
      nome: req.body.nome || req.body.name,
      code: req.body.code,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    });

    const province = await newProvince.save();
    res
      .status(201)
      .send({ message: 'Prov�ncia criada com sucesso', province });
  })
);

// get province by id
provinceRoutes.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const province = await Province.findById(req.params.id);
    if (province) {
      res.send(province);
    } else {
      res.status(404).send({ message: 'Prov�ncia n�o encontrada' });
    }
  })
);


provinceRoutes.put(
  '/:id/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const province = await Province.findById(req.params.id);

    if (province) {
      province.name = req.body.name;
      if (req.body.nome) province.nome = req.body.nome;
      if (req.body.code !== undefined) province.code = req.body.code;
      if (req.body.isActive !== undefined) province.isActive = req.body.isActive;

      await province.save();
      res.send({ message: `Prov�ncia actualizada com sucesso` });
    } else {
      res.status(404).send({ message: 'Prov�ncia n�o encontrada' });
    }
  })
);

provinceRoutes.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const province = await Province.findById(req.params.id);

    if (province) {
      province.isActive = false;
      await province.save();

      res.send({ message: `Prov�ncia removida Com Sucesso` });
    } else {
      res.status(404).send({ message: 'Prov�ncia n�o encontrada' });
    }
  })
);

export default provinceRoutes;
