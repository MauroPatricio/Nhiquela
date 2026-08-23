import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Settings from '../models/SettingsModel.js';
import { isAuth, isAdmin } from '../utils.js';

const settingsRouter = express.Router();

settingsRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const defaults = [
      { key: 'minimum_recommended_balance', value: '50', description: 'Saldo mínimo recomendado para o fornecedor continuar ativo (MT)', type: 'number' },
      { key: 'platform_commission_rate', value: '15', description: 'Percentagem de comissão padrão da plataforma sobre as vendas (%)', type: 'number' },
      { key: 'enable_first_sale_free', value: 'true', description: 'Ativar primeira venda gratuita para novos fornecedores', type: 'boolean' },
      { key: 'free_sales_count', value: '1', description: 'Número de primeiras vendas gratuitas concedidas', type: 'number' },
      { key: 'block_store_below_minimum', value: 'true', description: 'Bloquear automaticamente a loja se o saldo for menor que o recomendado', type: 'boolean' },
      { key: 'allow_negative_balance', value: 'false', description: 'Permitir que a carteira do fornecedor fique com saldo negativo', type: 'boolean' }
    ];

    for (const d of defaults) {
      const exist = await Settings.findOne({ key: d.key });
      if (!exist) {
        await Settings.create(d);
      }
    }

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
      return res.status(400).send({ message: 'A chave de configura��o j� existe' });
    }
    const newSetting = new Settings({
      key: req.body.key,
      value: req.body.value,
      description: req.body.description,
      type: req.body.type || 'string'
    });
    const createdSetting = await newSetting.save();
    res.status(201).send({ message: 'Defini��o criada', setting: createdSetting });
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
      res.send({ message: 'Defini��o atualizada', setting: updatedSetting });
    } else {
      res.status(404).send({ message: 'Defini��o n�o encontrada' });
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
      res.send({ message: 'Defini��o apagada' });
    } else {
      res.status(404).send({ message: 'Defini��o n�o encontrada' });
    }
  })
);

export default settingsRouter;
