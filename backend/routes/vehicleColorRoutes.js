import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import VehicleColor from '../models/VehicleColorModel.js';

const vehicleColorRouter = express.Router();

// GET all colors
vehicleColorRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const { activeOnly } = req.query;
    const filter = {};
    if (activeOnly === 'true') {
      filter.isActive = true;
    }
    const colors = await VehicleColor.find(filter).sort({ sortOrder: 1, name: 1 });
    res.send(colors);
  })
);

// SEED initial colors
vehicleColorRouter.post(
  '/seed',
  expressAsyncHandler(async (req, res) => {
    const existingColors = await VehicleColor.find({});
    if (existingColors.length > 0) {
      return res.status(400).send({ message: 'Colors already seeded.' });
    }

    const defaultColors = [
      { name: 'Preto', hexCode: '#000000', rgbCode: 'RGB(0,0,0)', sortOrder: 1 },
      { name: 'Branco', hexCode: '#FFFFFF', rgbCode: 'RGB(255,255,255)', sortOrder: 2 },
      { name: 'Vermelho', hexCode: '#FF0000', rgbCode: 'RGB(255,0,0)', sortOrder: 3 },
      { name: 'Verde', hexCode: '#008000', rgbCode: 'RGB(0,128,0)', sortOrder: 4 },
      { name: 'Azul', hexCode: '#0000FF', rgbCode: 'RGB(0,0,255)', sortOrder: 5 },
      { name: 'Amarelo', hexCode: '#FFFF00', rgbCode: 'RGB(255,255,0)', sortOrder: 6 },
      { name: 'Cinza', hexCode: '#808080', rgbCode: 'RGB(128,128,128)', sortOrder: 7 },
      { name: 'Prata', hexCode: '#C0C0C0', rgbCode: 'RGB(192,192,192)', sortOrder: 8 },
      { name: 'Dourado', hexCode: '#FFD700', rgbCode: 'RGB(255,215,0)', sortOrder: 9 },
      { name: 'Castanho', hexCode: '#8B4513', rgbCode: 'RGB(139,69,19)', sortOrder: 10 },
      { name: 'Bege', hexCode: '#F5F5DC', rgbCode: 'RGB(245,245,220)', sortOrder: 11 },
      { name: 'Laranja', hexCode: '#FFA500', rgbCode: 'RGB(255,165,0)', sortOrder: 12 },
      { name: 'Roxo', hexCode: '#800080', rgbCode: 'RGB(128,0,128)', sortOrder: 13 },
      { name: 'Rosa', hexCode: '#FFC0CB', rgbCode: 'RGB(255,192,203)', sortOrder: 14 },
      { name: 'Bordô', hexCode: '#800000', rgbCode: 'RGB(128,0,0)', sortOrder: 15 },
      { name: 'Azul Escuro', hexCode: '#000080', rgbCode: 'RGB(0,0,128)', sortOrder: 16 },
      { name: 'Verde Escuro', hexCode: '#006400', rgbCode: 'RGB(0,100,0)', sortOrder: 17 },
      { name: 'Preto Fosco', hexCode: '#1C1C1C', rgbCode: 'RGB(28,28,28)', sortOrder: 18 },
      { name: 'Prata Metálico', hexCode: '#BFC1C2', rgbCode: 'RGB(191,193,194)', sortOrder: 19 },
      { name: 'Branco Pérola', hexCode: '#F8F8FF', rgbCode: 'RGB(248,248,255)', sortOrder: 20 },
    ];

    const createdColors = await VehicleColor.insertMany(defaultColors);
    res.send({ message: 'Colors seeded successfully', colors: createdColors });
  })
);

// POST new color
vehicleColorRouter.post(
  '/',
  expressAsyncHandler(async (req, res) => {
    const newColor = new VehicleColor({
      name: req.body.name,
      hexCode: req.body.hexCode,
      rgbCode: req.body.rgbCode,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      sortOrder: req.body.sortOrder || 0,
    });
    
    // Validations (handled mostly by mongoose unique constraints, but we can catch them)
    try {
      const color = await newColor.save();
      res.status(201).send({ message: 'Cor Criada', color });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).send({ message: 'Nome, HEX ou RGB já existente.' });
      }
      res.status(400).send({ message: error.message });
    }
  })
);

// PUT update color
vehicleColorRouter.put(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const color = await VehicleColor.findById(req.params.id);
    if (color) {
      color.name = req.body.name || color.name;
      color.hexCode = req.body.hexCode || color.hexCode;
      color.rgbCode = req.body.rgbCode || color.rgbCode;
      color.isActive = req.body.isActive !== undefined ? req.body.isActive : color.isActive;
      color.sortOrder = req.body.sortOrder !== undefined ? req.body.sortOrder : color.sortOrder;

      try {
        const updatedColor = await color.save();
        res.send({ message: 'Cor Atualizada', color: updatedColor });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(400).send({ message: 'Nome, HEX ou RGB já existente noutra cor.' });
        }
        res.status(400).send({ message: error.message });
      }
    } else {
      res.status(404).send({ message: 'Cor não encontrada' });
    }
  })
);

// DELETE color
vehicleColorRouter.delete(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const color = await VehicleColor.findById(req.params.id);
    if (color) {
      await VehicleColor.deleteOne({ _id: req.params.id });
      res.send({ message: 'Cor Eliminada' });
    } else {
      res.status(404).send({ message: 'Cor não encontrada' });
    }
  })
);

// PATCH toggle active
vehicleColorRouter.patch(
  '/:id/toggle',
  expressAsyncHandler(async (req, res) => {
    const color = await VehicleColor.findById(req.params.id);
    if (color) {
      color.isActive = !color.isActive;
      const updatedColor = await color.save();
      res.send({ message: 'Estado da Cor Atualizado', color: updatedColor });
    } else {
      res.status(404).send({ message: 'Cor não encontrada' });
    }
  })
);

export default vehicleColorRouter;
