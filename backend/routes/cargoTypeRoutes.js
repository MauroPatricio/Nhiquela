import express from 'express';
import CargoType from '../models/CargoTypeModel.js';
import { isAuth, isAdmin } from '../utils.js';

const cargoTypeRoutes = express.Router();

// 1. Obter todos os Tipos de Carga (Público / Clientes)
cargoTypeRoutes.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    const cargoTypes = await CargoType.find(filter).sort({ order: 1, createdAt: -1 });
    res.send(cargoTypes);
  } catch (error) {
    res.status(500).send({ message: error.message || 'Erro ao carregar tipos de carga.' });
  }
});

// 2. Obter por ID
cargoTypeRoutes.get('/:id', async (req, res) => {
  try {
    const item = await CargoType.findById(req.params.id);
    if (!item) return res.status(404).send({ message: 'Tipo de carga não encontrado.' });
    res.send(item);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// 3. Criar Novo Tipo de Carga (Admin)
cargoTypeRoutes.post('/', isAuth, isAdmin, async (req, res) => {
  try {
    const { name, icon, description, status, order } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).send({ message: 'O nome do tipo de carga é obrigatório.' });
    }

    const existing = await CargoType.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).send({ message: 'Já existe um tipo de carga com este nome.' });
    }

    const cargoType = new CargoType({
      name: name.trim(),
      icon: icon || '📦',
      description: description || '',
      status: status || 'Ativo',
      order: Number(order) || 0
    });

    const saved = await cargoType.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('catalogUpdated', { type: 'cargoType', item: saved });
    }

    res.status(210).send(saved);
  } catch (error) {
    res.status(500).send({ message: error.message || 'Erro ao criar tipo de carga.' });
  }
});

// 4. Atualizar Tipo de Carga (Admin)
cargoTypeRoutes.put('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const cargoType = await CargoType.findById(req.params.id);
    if (!cargoType) {
      return res.status(404).send({ message: 'Tipo de carga não encontrado.' });
    }

    if (req.body.name) cargoType.name = req.body.name.trim();
    if (req.body.icon !== undefined) cargoType.icon = req.body.icon;
    if (req.body.description !== undefined) cargoType.description = req.body.description;
    if (req.body.status) cargoType.status = req.body.status;
    if (req.body.order !== undefined) cargoType.order = Number(req.body.order);

    const updated = await cargoType.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('catalogUpdated', { type: 'cargoType', item: updated });
    }

    res.send(updated);
  } catch (error) {
    res.status(500).send({ message: error.message || 'Erro ao atualizar tipo de carga.' });
  }
});

// 5. Eliminar Tipo de Carga (Admin)
cargoTypeRoutes.delete('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const cargoType = await CargoType.findById(req.params.id);
    if (!cargoType) {
      return res.status(404).send({ message: 'Tipo de carga não encontrado.' });
    }

    await cargoType.deleteOne();

    const io = req.app.get('io');
    if (io) {
      io.emit('catalogUpdated', { type: 'cargoType', id: req.params.id });
    }

    res.send({ message: 'Tipo de carga eliminado com sucesso!' });
  } catch (error) {
    res.status(500).send({ message: error.message || 'Erro ao eliminar tipo de carga.' });
  }
});

export default cargoTypeRoutes;
