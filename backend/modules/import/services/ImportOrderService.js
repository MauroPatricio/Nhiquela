import ImportQuotation from '../models/ImportQuotationModel.js';
import ImportOrder from '../models/ImportOrderModel.js';
import ImportRequest from '../models/ImportRequestModel.js';
// Importação simulada dos serviços existentes - A ajustar com o path real, se necessário.
// import { processPayment } from '../../../services/paymentService.js'; 
// import { createDeliveryTask } from '../../../services/dispatchService.js';

export const acceptQuotationAndCreateOrder = async (quotationId, customerId, paymentProof) => {
    const quotation = await ImportQuotation.findById(quotationId);
    if (!quotation) throw new Error("Cotação não encontrada");

    // 0. Se já existir uma ordem criada para esta cotação, reaproveitar e atualizar o comprovativo se necessário
    let existingOrder = await ImportOrder.findOne({ quotationId: quotation._id });
    if (existingOrder) {
        if (paymentProof) {
            existingOrder.paymentProof = paymentProof;
            existingOrder.status = 'PAYMENT_CONFIRMED';
            existingOrder.paymentStatus = 'PENDING_VERIFICATION';
            await existingOrder.save();
        }
        return existingOrder;
    }

    // Aceitar cotação independentemente do estado anterior (ex: EXPIRED, REJECTED, DRAFT, SENT, QUOTATION_READY), a menos que tenha sido explicitamente CANCELLED
    const statusUpper = (quotation.status || '').toUpperCase();
    if (statusUpper === 'CANCELLED') {
        throw new Error(`Esta cotação foi cancelada e já não pode ser aceite.`);
    }

    // 1. Marcar cotação como aceite
    quotation.status = 'ACCEPTED';
    await quotation.save();

    // 2. Actualizar o status do pedido base
    if (quotation.requestId) {
        await ImportRequest.findByIdAndUpdate(quotation.requestId, { status: 'ACCEPTED' });
    }

    // 3. Criar a ImportOrder com fallbacks seguros
    let rawCust = customerId || quotation.customerId;
    if (rawCust && typeof rawCust === 'object') {
        rawCust = rawCust._id || rawCust.id || rawCust;
    }
    const finalCustomerId = rawCust ? rawCust.toString() : null;

    if (!finalCustomerId) {
        throw new Error("Customer ID é obrigatório para criar a ordem de importação.");
    }

    const newOrder = new ImportOrder({
        quotationId: quotation._id,
        requestId: quotation.requestId,
        customerId: finalCustomerId,
        totalAmount: quotation.totalCost,
        currency: quotation.currency || 'MZN',
        estimatedArrivalDate: quotation.estimatedArrivalDate || undefined,
        status: paymentProof ? 'PAYMENT_CONFIRMED' : 'PAYMENT_PENDING',
        paymentStatus: paymentProof ? 'PENDING_VERIFICATION' : 'PENDING',
        paymentProof: paymentProof || undefined
    });
    
    return await newOrder.save();
};

export const confirmOrderPayment = async (orderId) => {
    // No ecossistema Nhiquela, esta função deve ser chamada após o ledger processar o pagamento com sucesso
    const order = await ImportOrder.findById(orderId);
    if (!order) throw new Error("Ordem não encontrada");

    order.paymentStatus = 'PAID';
    order.status = 'PAYMENT_CONFIRMED';
    
    return await order.save();
};

export const markOrderAsReadyForDelivery = async (orderId) => {
    const order = await ImportOrder.findById(orderId);
    if (!order) throw new Error("Ordem não encontrada");

    order.status = 'READY_FOR_DELIVERY';
    
    // TODO: Aqui integraríamos a API de Dispatch existente do NhiquelaDriver
    // const localDelivery = await createDeliveryTask({...})
    // order.localDeliveryOrderId = localDelivery._id;

    return await order.save();
};
