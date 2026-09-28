import ImportDocument from '../models/ImportDocumentModel.js';

export const getDocuments = async (req, res) => {
    try {
        const documents = await ImportDocument.find()
            .populate('importOrderId')
            .sort({ createdAt: -1 });
        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getDocumentsByOrderId = async (req, res) => {
    try {
        const documents = await ImportDocument.find({ importOrderId: req.params.orderId })
            .sort({ createdAt: -1 });
        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const uploadDocument = async (req, res) => {
    try {
        // In a real scenario, handle file upload to S3/Cloud Storage here.
        // For now, we mock the file URL.
        const { importOrderId, type, fileName } = req.body;
        
        const newDoc = new ImportDocument({
            importOrderId,
            type,
            fileName,
            fileUrl: `https://storage.nhiquela.com/docs/${Date.now()}_${fileName}`,
            uploadedBy: req.user ? req.user._id : null
        });

        const savedDoc = await newDoc.save();
        res.status(201).json(savedDoc);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const deletedDoc = await ImportDocument.findByIdAndDelete(req.params.id);
        if (!deletedDoc) return res.status(404).json({ message: 'Documento não encontrado' });
        res.status(200).json({ message: 'Documento removido com sucesso' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
