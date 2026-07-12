import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';
import asyncHandler from 'express-async-handler';

// GET /api/provider-subcategories
export const list = asyncHandler(async (req, res) => {
  try {
    const subcategories = await ProviderSubcategory.find()
      .populate({
        path: 'providerTypeId',
        select: 'name classificationId description',
        populate: { path: 'classificationId', select: 'name' }
      })
      .populate('vehicleTypes')
      .sort({ order: 1 });
    res.json(subcategories);
  } catch (error) {
    console.error('Error listing subcategories', error);
    res.status(500).json({ message: 'Erro ao listar subcategorias' });
  }
});

// GET /api/provider-subcategories/:id
export const getById = asyncHandler(async (req, res) => {
  try {
    const subcategory = await ProviderSubcategory.findById(req.params.id)
      .populate({
        path: 'providerTypeId',
        select: 'name classificationId description',
        populate: { path: 'classificationId', select: 'name' }
      })
      .populate('vehicleTypes');
    if (!subcategory) return res.status(404).json({ message: 'Subcategoria não encontrada' });
    res.json(subcategory);
  } catch (error) {
    console.error('Error fetching subcategory', error);
    res.status(500).json({ message: 'Erro ao obter subcategoria' });
  }
});

// POST /api/provider-subcategories
export const create = asyncHandler(async (req, res) => {
  try {
    const { name, order, providerTypeId, description, isActive, metadata, iconUrl, motives, originFloors, loadingHelpOptions, requiresPhotos, vehicleTypes, pricingMode } = req.body;
    
    // Auto-reorder: Se já existir algum com esta ordem, empurra todos para baixo
    const parsedOrder = order !== undefined ? parseInt(order, 10) : 0;
    const exists = await ProviderSubcategory.exists({ order: parsedOrder, providerTypeId });
    if (exists) {
      await ProviderSubcategory.updateMany(
        { order: { $gte: parsedOrder }, providerTypeId },
        { $inc: { order: 1 } }
      );
    }

    const newSub = new ProviderSubcategory({ name, order: parsedOrder, providerTypeId, description, isActive, metadata, iconUrl, motives, originFloors, loadingHelpOptions, requiresPhotos, vehicleTypes, pricingMode });
    await newSub.save();
  
  const io = req.app.get('io');
  if (io) {
    io.emit('catalogUpdated');
  }

  res.status(201).json(newSub);
  } catch (error) {
    console.error('Error creating subcategory', error);
    res.status(500).json({ message: 'Erro ao criar subcategoria' });
  }
});

// PUT /api/provider-subcategories/:id
export const update = asyncHandler(async (req, res) => {
  try {
    const { name, order, providerTypeId, description, isActive, metadata, iconUrl, motives, originFloors, loadingHelpOptions, requiresPhotos, vehicleTypes, pricingMode } = req.body;
    
    // Auto-reorder: Se a ordem mudou ou mudou de tipo, precisamos de empurrar os existentes para baixo
    if (order !== undefined) {
      const parsedOrder = parseInt(order, 10);
      const existingSub = await ProviderSubcategory.findById(req.params.id);
      
      if (existingSub && (existingSub.order !== parsedOrder || existingSub.providerTypeId.toString() !== providerTypeId)) {
        // Apenas empurra se já existir um (diferente deste) nessa posição e no mesmo tipo
        const conflict = await ProviderSubcategory.exists({ order: parsedOrder, providerTypeId, _id: { $ne: req.params.id } });
        if (conflict) {
          await ProviderSubcategory.updateMany(
            { order: { $gte: parsedOrder }, providerTypeId, _id: { $ne: req.params.id } },
            { $inc: { order: 1 } }
          );
        }
      }
    }

    const updated = await ProviderSubcategory.findByIdAndUpdate(
      req.params.id,
      { name, order, providerTypeId, description, isActive, metadata, iconUrl, motives, originFloors, loadingHelpOptions, requiresPhotos, vehicleTypes, pricingMode },
      { new: true }
    )
    .populate({
      path: 'providerTypeId',
      select: 'name classificationId',
      populate: { path: 'classificationId', select: 'name' }
    })
    .populate('vehicleTypes');
    if (!updated) return res.status(404).json({ message: 'Subcategoria não encontrada' });

    const io = req.app.get('io');
    if (io) {
      io.emit('catalogUpdated');
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating subcategory', error);
    res.status(500).json({ message: 'Erro ao atualizar subcategoria' });
  }
});

// DELETE /api/provider-subcategories/:id
export const remove = asyncHandler(async (req, res) => {
  try {
    const deleted = await ProviderSubcategory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Subcategoria não encontrada' });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('catalogUpdated');
    }
    
    res.json({ message: 'Subcategoria removida' });
  } catch (error) {
    console.error('Error deleting subcategory', error);
    res.status(500).json({ message: 'Erro ao remover subcategoria' });
  }
});

export default {
  list,
  getById,
  create,
  update,
  remove,
};



/* Duplicate controller definitions removed */

