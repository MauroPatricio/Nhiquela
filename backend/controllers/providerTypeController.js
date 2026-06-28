import ProviderType from '../models/ProviderTypeModel.js';
import expressAsyncHandler from 'express-async-handler';

// @desc    Get all provider types
// @route   GET /api/provider-types
// @access  Private/Admin
export const getProviderTypes = expressAsyncHandler(async (req, res) => {
  const providerTypes = await ProviderType.find({}).populate('classificationId', 'name description');
  res.json(providerTypes);
});

// @desc    Get provider type by ID
// @route   GET /api/provider-types/:id
// @access  Private/Admin
export const getProviderTypeById = expressAsyncHandler(async (req, res) => {
  const providerType = await ProviderType.findById(req.params.id).populate('classificationId', 'name description');

  if (providerType) {
    res.json(providerType);
  } else {
    res.status(404);
    throw new Error('Provider type not found');
  }
});

// @desc    Create a provider type
// @route   POST /api/provider-types
// @access  Private/Admin
export const createProviderType = expressAsyncHandler(async (req, res) => {
  const { name, classificationId, description, isActive, iconUrl } = req.body;

  const providerTypeExists = await ProviderType.findOne({ name });

  if (providerTypeExists) {
    res.status(400);
    throw new Error('Provider type already exists');
  }

  const providerType = new ProviderType({
    name,
    classificationId,
    description,
    isActive,
    iconUrl,
  });

  const createdProviderType = await providerType.save();
  res.status(201).json(createdProviderType);
});

// @desc    Update a provider type
// @route   PUT /api/provider-types/:id
// @access  Private/Admin
export const updateProviderType = expressAsyncHandler(async (req, res) => {
  const { name, classificationId, description, isActive, iconUrl } = req.body;

  const providerType = await ProviderType.findById(req.params.id);

  if (providerType) {
    providerType.name = name || providerType.name;
    providerType.classificationId = classificationId || providerType.classificationId;
    providerType.description = description || providerType.description;
    if (isActive !== undefined) {
      providerType.isActive = isActive;
    }
    if (iconUrl !== undefined) {
      providerType.iconUrl = iconUrl;
    }

    const updatedProviderType = await providerType.save();
    res.json(updatedProviderType);
  } else {
    res.status(404);
    throw new Error('Provider type not found');
  }
});

// @desc    Delete a provider type
// @route   DELETE /api/provider-types/:id
// @access  Private/Admin
export const deleteProviderType = expressAsyncHandler(async (req, res) => {
  const providerType = await ProviderType.findById(req.params.id);

  if (providerType) {
    await providerType.deleteOne();
    res.json({ message: 'Provider type removed' });
  } else {
    res.status(404);
    throw new Error('Provider type not found');
  }
});
