import ProviderClassification from '../models/ProviderClassificationModel.js';
import expressAsyncHandler from 'express-async-handler';

// @desc    Get all provider classifications
// @route   GET /api/provider-classifications
// @access  Private/Admin
export const getProviderClassifications = expressAsyncHandler(async (req, res) => {
  const classifications = await ProviderClassification.find({});
  res.json(classifications);
});

// @desc    Get provider classification by ID
// @route   GET /api/provider-classifications/:id
// @access  Private/Admin
export const getProviderClassificationById = expressAsyncHandler(async (req, res) => {
  const classification = await ProviderClassification.findById(req.params.id);

  if (classification) {
    res.json(classification);
  } else {
    res.status(404);
    throw new Error('Classificação não encontrada');
  }
});

// @desc    Create a provider classification
// @route   POST /api/provider-classifications
// @access  Private/Admin
export const createProviderClassification = expressAsyncHandler(async (req, res) => {
  const { name, description, isActive } = req.body;

  const classificationExists = await ProviderClassification.findOne({ name });

  if (classificationExists) {
    res.status(400);
    throw new Error('Classificação já existe');
  }

  const classification = new ProviderClassification({
    name,
    description,
    isActive,
  });

  const createdClassification = await classification.save();
  res.status(201).json(createdClassification);
});

// @desc    Update a provider classification
// @route   PUT /api/provider-classifications/:id
// @access  Private/Admin
export const updateProviderClassification = expressAsyncHandler(async (req, res) => {
  const { name, description, isActive } = req.body;

  const classification = await ProviderClassification.findById(req.params.id);

  if (classification) {
    classification.name = name || classification.name;
    classification.description = description || classification.description;
    if (isActive !== undefined) {
      classification.isActive = isActive;
    }

    const updatedClassification = await classification.save();
    res.json(updatedClassification);
  } else {
    res.status(404);
    throw new Error('Classificação não encontrada');
  }
});

// @desc    Delete a provider classification
// @route   DELETE /api/provider-classifications/:id
// @access  Private/Admin
export const deleteProviderClassification = expressAsyncHandler(async (req, res) => {
  const classification = await ProviderClassification.findById(req.params.id);

  if (classification) {
    await classification.deleteOne();
    res.json({ message: 'Classificação removida' });
  } else {
    res.status(404);
    throw new Error('Classificação não encontrada');
  }
});
