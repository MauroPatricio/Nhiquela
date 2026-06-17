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
      nome: req.body.nome,
      isActive: true,
    });

    const province = await newProvince.save();
    res
      .status(201)
      .send({ message: 'Província criada com sucesso', province });
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
      res.status(404).send({ message: 'Província não encontrada' });
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
      province.nome = req.body.nome;
      province.isActive = req.body.isActive;

      await province.save();
      res.send({ message: `Província actualizada com sucesso` });
    } else {
      res.status(404).send({ message: 'Província não encontrada' });
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

      res.send({ message: `Província removida Com Sucesso` });
    } else {
      res.status(404).send({ message: 'Província não encontrada' });
    }
  })
);

export default provinceRoutes;
