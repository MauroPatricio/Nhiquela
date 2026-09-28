import ImportRequest from '../models/ImportRequestModel.js';
import ImportQuotation from '../models/ImportQuotationModel.js';

export const createRequest = async (req, res) => {
    try {
        const { productName, description, quantity, productUrl, preferredOriginCountry, targetBudget, notes, productImage, shippingMethod } = req.body;
        // Assume req.user is set by existing auth middleware
        const customerId = req.user ? req.user._id : req.body.customerId;

        if (!customerId) {
            return res.status(400).json({ message: "Customer ID is required" });
        }

        if (!productImage) {
            return res.status(400).json({ message: "A fotografia do produto é obrigatória." });
        }

        const newRequest = new ImportRequest({
            customerId,
            productName,
            description,
            quantity,
            productUrl,
            productImage,
            preferredOriginCountry,
            shippingMethod,
            targetBudget,
            notes
        });

        const savedRequest = await newRequest.save();

        const io = req.app?.get('io');
        if (io) {
            io.emit('import_request_created', savedRequest);
            io.emit('admin_notification', {
                type: 'IMPORT_REQUEST_CREATED',
                title: 'Novo Pedido de Importação 📦',
                message: `Novo pedido recebido: ${savedRequest.productName}`,
                requestId: savedRequest._id
            });
        }

        res.status(201).json(savedRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getRequests = async (req, res) => {
    try {
        // Se for admin, vê todos. Se for cliente, vê só os seus.
        const filter = {};
        if (req.user && req.user.role === 'customer') {
            filter.customerId = req.user._id;
        }

        const requests = await ImportRequest.find(filter)
            .sort({ createdAt: -1 })
            .populate('customerId', 'name email phoneNumber phone')
            .lean();

        // Enriquecer cada pedido com dados da cotação (prazos e datas)
        const enriched = await Promise.all(requests.map(async (r) => {
            try {
                const quotation = await ImportQuotation.findOne({ requestId: r._id })
                    .select('estimatedDeliveryDays estimatedArrivalDate quotationValidUntil')
                    .lean();
                if (quotation) {
                    r.estimatedDeliveryDays = quotation.estimatedDeliveryDays || null;
                    r.estimatedArrivalDate = quotation.estimatedArrivalDate || null;
                    r.quotationValidUntil = quotation.quotationValidUntil || null;
                }
            } catch (_) { /* sem cotação — não é erro */ }
            return r;
        }));

        res.status(200).json(enriched);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getRequestById = async (req, res) => {
    try {
        const request = await ImportRequest.findById(req.params.id);
        if (!request) return res.status(200).json(null);
        res.status(200).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const updatedRequest = await ImportRequest.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!updatedRequest) return res.status(404).json({ message: 'Request not found' });
        
        const io = req.app?.get('io');
        if (io) {
            io.emit('import_request_updated', {
                requestId: updatedRequest._id,
                status: updatedRequest.status,
                updatedAt: new Date()
            });
        }

        res.status(200).json(updatedRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteRequest = async (req, res) => {
    try {
        const request = await ImportRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        
        await ImportRequest.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Request removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
