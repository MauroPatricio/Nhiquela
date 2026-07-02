import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Settings from '../models/SettingsModel.js';
import { isAuth, isAdmin } from '../utils.js';

const settingsRouter = express.Router();

settingsRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const settings = await Settings.find();
    res.send(settings);
  })
);

settingsRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const exist = await Settings.findOne({ key: req.body.key });
    if (exist) {
      return res.status(400).send({ message: 'A chave de configuração já existe' });
    }
    const newSetting = new Settings({
      key: req.body.key,
      value: req.body.value,
      description: req.body.description,
      type: req.body.type || 'string'
    });
    const createdSetting = await newSetting.save();
    res.status(201).send({ message: 'Definição criada', setting: createdSetting });
  })
);

settingsRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const setting = await Settings.findById(req.params.id);
    if (setting) {
      setting.value = req.body.value !== undefined ? req.body.value : setting.value;
      setting.description = req.body.description || setting.description;
      const updatedSetting = await setting.save();
      res.send({ message: 'Definição atualizada', setting: updatedSetting });
    } else {
      res.status(404).send({ message: 'Definição não encontrada' });
    }
  })
);

settingsRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const setting = await Settings.findById(req.params.id);
    if (setting) {
      await setting.deleteOne();
      res.send({ message: 'Definição apagada' });
    } else {
      res.status(404).send({ message: 'Definição não encontrada' });
    }
  })
);

export default settingsRouter;
