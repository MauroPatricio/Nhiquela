import InternationalSupplier from '../models/InternationalSupplierModel.js';

export const getSuppliers = async (req, res) => {
    try {
        const suppliers = await InternationalSupplier.find().sort({ createdAt: -1 });
        res.status(200).json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getSupplierById = async (req, res) => {
    try {
        const supplier = await InternationalSupplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Fornecedor não encontrado' });
        res.status(200).json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createSupplier = async (req, res) => {
    try {
        const newSupplier = new InternationalSupplier(req.body);
        const savedSupplier = await newSupplier.save();
        res.status(201).json(savedSupplier);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateSupplier = async (req, res) => {
    try {
        const updatedSupplier = await InternationalSupplier.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedSupplier) return res.status(404).json({ message: 'Fornecedor não encontrado' });
        res.status(200).json(updatedSupplier);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteSupplier = async (req, res) => {
    try {
        const deletedSupplier = await InternationalSupplier.findByIdAndDelete(req.params.id);
        if (!deletedSupplier) return res.status(404).json({ message: 'Fornecedor não encontrado' });
        res.status(200).json({ message: 'Fornecedor removido com sucesso' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
