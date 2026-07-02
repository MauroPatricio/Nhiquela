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
      .populate('vehicleTypes');
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
    const { name, providerTypeId, description, isActive, metadata, iconUrl, motives, originFloors, loadingHelpOptions, requiresPhotos, vehicleTypes } = req.body;
  const newSub = new ProviderSubcategory({ name, providerTypeId, description, isActive, metadata, iconUrl, motives, originFloors, loadingHelpOptions, requiresPhotos, vehicleTypes });
  await newSub.save();
  res.status(201).json(newSub);
  } catch (error) {
    console.error('Error creating subcategory', error);
    res.status(500).json({ message: 'Erro ao criar subcategoria' });
  }
});

// PUT /api/provider-subcategories/:id
export const update = asyncHandler(async (req, res) => {
  try {
    const { name, providerTypeId, description, isActive, metadata, iconUrl, motives, originFloors, loadingHelpOptions, requiresPhotos, vehicleTypes } = req.body;
    const updated = await ProviderSubcategory.findByIdAndUpdate(
      req.params.id,
      { name, providerTypeId, description, isActive, metadata, iconUrl, motives, originFloors, loadingHelpOptions, requiresPhotos, vehicleTypes },
      { new: true }
    )
    .populate({
      path: 'providerTypeId',
      select: 'name classificationId',
      populate: { path: 'classificationId', select: 'name' }
    })
    .populate('vehicleTypes');
    if (!updated) return res.status(404).json({ message: 'Subcategoria não encontrada' });
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

