import ImportOrder from '../models/ImportOrderModel.js';
import ImportRequest from '../models/ImportRequestModel.js';
import ImportQuotation from '../models/ImportQuotationModel.js';

export const getOrders = async (req, res) => {
    try {
        const orders = await ImportOrder.find()
            .populate('customerId', 'name email phone')
            .populate({
                path: 'quotationId',
                populate: {
                    path: 'requestId',
                    model: 'ImportRequest'
                }
            })
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrderById = async (req, res) => {
    try {
        const order = await ImportOrder.findById(req.params.id)
            .populate('customerId', 'name email phone')
            .populate({
                path: 'quotationId',
                populate: {
                    path: 'requestId',
                    model: 'ImportRequest'
                }
            });
        if (!order) return res.status(404).json({ message: 'Ordem não encontrada' });
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { status, paymentStatus, purchaseStatus, shippingStatus, customsStatus } = req.body;
        
        const updateData = {};
        if (status) updateData.status = status;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (purchaseStatus) updateData.purchaseStatus = purchaseStatus;
        if (shippingStatus) updateData.shippingStatus = shippingStatus;
        if (customsStatus) updateData.customsStatus = customsStatus;

        const updatedOrder = await ImportOrder.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('quotationId');

        if (!updatedOrder) return res.status(404).json({ message: 'Ordem não encontrada' });

        const io = req.app?.get('io');
        if (io) {
            io.emit('import_request_updated', {
                requestId: updatedOrder.quotationId?.requestId || updatedOrder.requestId,
                orderId: updatedOrder._id,
                status: updatedOrder.status,
                updatedAt: new Date()
            });
        }
        
        // Se houver alteração de status geral, refletir no ImportRequest correspondente
        if (status && updatedOrder.quotationId && updatedOrder.quotationId.requestId) {
            await ImportRequest.findByIdAndUpdate(updatedOrder.quotationId.requestId, { status });
        }

        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const sendToLocalDelivery = async (req, res) => {
    try {
        const order = await ImportOrder.findById(req.params.id)
            .populate('customerId')
            .populate({ path: 'quotationId', populate: { path: 'requestId' } });
        
        if (!order) return res.status(404).json({ message: 'Ordem não encontrada' });
        
        // This is where we create a standard Trip for the Nhiquela Driver App
        // For demonstration, we simply update the status to IN_DELIVERY
        // In reality: const newTrip = new Trip({ customer: order.customerId, type: 'IMPORT_DELIVERY', ... })

        order.status = 'IN_DELIVERY';
        order.shippingStatus = 'DELIVERED';
        await order.save();

        if (order.quotationId && order.quotationId.requestId) {
            await ImportRequest.findByIdAndUpdate(order.quotationId.requestId, { status: 'DELIVERED' });
        }

        res.status(200).json({ message: 'Enviado para frota local', order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
