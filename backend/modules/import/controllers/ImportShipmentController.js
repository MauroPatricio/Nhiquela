import ImportShipment from '../models/ImportShipmentModel.js';
import ImportOrder from '../models/ImportOrderModel.js';
import ImportRequest from '../models/ImportRequestModel.js';

export const getShipments = async (req, res) => {
    try {
        const shipments = await ImportShipment.find()
            .populate('orders')
            .sort({ createdAt: -1 });
        res.status(200).json(shipments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getShipmentById = async (req, res) => {
    try {
        const shipment = await ImportShipment.findById(req.params.id)
            .populate({
                path: 'orders',
                populate: [
                    { path: 'customerId', select: 'name email phone' },
                    { 
                        path: 'quotationId', 
                        populate: { path: 'requestId', select: 'productName' }
                    }
                ]
            });
        if (!shipment) return res.status(404).json({ message: 'Carga não encontrada' });
        res.status(200).json(shipment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createShipment = async (req, res) => {
    try {
        const newShipment = new ImportShipment(req.body);
        const savedShipment = await newShipment.save();
        res.status(201).json(savedShipment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateShipment = async (req, res) => {
    try {
        const updatedShipment = await ImportShipment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedShipment) return res.status(404).json({ message: 'Carga não encontrada' });

        const status = req.body.status;
        if (status) {
            let orderStatus = null;
            let shippingStatus = status;

            if (status === 'IN_TRANSIT') {
                orderStatus = 'SHIPPED';
            } else if (status === 'CUSTOMS_CLEARANCE' || status === 'ARRIVED') {
                orderStatus = 'ARRIVED_AT_CUSTOMS';
            } else if (status === 'RELEASED') {
                orderStatus = 'READY_FOR_DELIVERY';
            } else if (status === 'DELIVERED') {
                orderStatus = 'DELIVERED';
            }

            if (orderStatus && updatedShipment.orders && updatedShipment.orders.length > 0) {
                const orders = await ImportOrder.find({ _id: { $in: updatedShipment.orders } }).populate('quotationId');
                
                await ImportOrder.updateMany(
                    { _id: { $in: updatedShipment.orders } },
                    { $set: { status: orderStatus, shippingStatus } }
                );

                for (const order of orders) {
                    if (order.quotationId && order.quotationId.requestId) {
                        await ImportRequest.findByIdAndUpdate(order.quotationId.requestId, { status: orderStatus });
                    }
                }
            }
        }

        res.status(200).json(updatedShipment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const addOrderToShipment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const shipment = await ImportShipment.findById(req.params.id);
        if (!shipment) return res.status(404).json({ message: 'Carga não encontrada' });

        if (!shipment.orders.includes(orderId)) {
            shipment.orders.push(orderId);
            await shipment.save();
        }

        // Update the order's status to SHIPPED
        const order = await ImportOrder.findByIdAndUpdate(orderId, { status: 'SHIPPED', shippingStatus: 'SHIPPED' }).populate('quotationId');
        
        if (order && order.quotationId && order.quotationId.requestId) {
            await ImportRequest.findByIdAndUpdate(order.quotationId.requestId, { status: 'SHIPPED' });
        }

        res.status(200).json(shipment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteShipment = async (req, res) => {
    try {
        const shipment = await ImportShipment.findByIdAndDelete(req.params.id);
        if (!shipment) return res.status(404).json({ message: 'Carga não encontrada' });
        res.status(200).json({ message: 'Carga eliminada com sucesso' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
