import jwt from 'jsonwebtoken';
import ImportQuotation from '../models/ImportQuotationModel.js';
import ImportRequest from '../models/ImportRequestModel.js';
import { calculateQuotation } from '../services/ImportCostCalculator.js';
import { acceptQuotationAndCreateOrder } from '../services/ImportOrderService.js';
import User from '../../../models/UserModel.js';
import { sendImportQuotationEmail } from '../../../utils.js';

export const createQuotation = async (req, res) => {
    try {
        const { requestId } = req.body;
        const request = await ImportRequest.findById(requestId);
        
        if (!request) return res.status(404).json({ message: "Request not found" });

        const costs = calculateQuotation(req.body);

        const newQuotation = new ImportQuotation({
            requestId,
            customerId: request.customerId,
            ...costs,
            currency: req.body.currency || 'MZN',
            productCurrency: req.body.productCurrency || 'MZN', // Garantir que este campo obrigatório está presente
            estimatedDeliveryDays: req.body.estimatedDeliveryDays,
            quotationValidUntil: req.body.quotationValidUntil,
            notes: req.body.notes,
            createdBy: req.user ? req.user._id : null
        });

        const savedQuotation = await newQuotation.save();
        
        // Atualiza status do request
        request.status = 'QUOTATION_READY';
        await request.save();

        // Notificar o cliente por email
        try {
            const customer = await User.findById(request.customerId);
            if (customer && customer.email) {
                sendImportQuotationEmail(
                    customer.email,
                    customer.name,
                    request.productName,
                    savedQuotation,
                    request._id
                );
            }
        } catch (emailErr) {
            console.error('[ImportQuotation] Erro ao enviar email de cotação:', emailErr.message);
        }

        res.status(201).json(savedQuotation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getQuotationById = async (req, res) => {
    try {
        const quotation = await ImportQuotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
        res.status(200).json(quotation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getQuotationByRequestId = async (req, res) => {
    try {
        const quotation = await ImportQuotation.findOne({ requestId: req.params.requestId });
        if (!quotation) return res.status(200).json(null); // Retornar null em vez de 404 para evitar erros vermelhos na consola
        res.status(200).json(quotation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateQuotation = async (req, res) => {
    try {
        const quotation = await ImportQuotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ message: 'Cotação não encontrada' });

        const nonEditableStatuses = ['ACCEPTED', 'PROCESSING', 'SHIPPED', 'ARRIVED_AT_CUSTOMS', 'CUSTOMS_CLEARED', 'READY_FOR_DELIVERY', 'DELIVERED'];
        if (nonEditableStatuses.includes((quotation.status || '').toUpperCase())) {
            return res.status(400).json({ message: 'Não é possível editar uma cotação que já foi aceite pelo cliente.' });
        }

        const costs = calculateQuotation(req.body);
        
        quotation.productCost = costs.productCost;
        quotation.internationalShipping = costs.internationalShipping;
        quotation.customsEstimated = costs.customsEstimated;
        quotation.nhiquelaServiceFee = costs.nhiquelaServiceFee;
        quotation.totalCost = costs.totalCost;
        if(req.body.estimatedDeliveryDays) quotation.estimatedDeliveryDays = req.body.estimatedDeliveryDays;

        await quotation.save();
        res.status(200).json(quotation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const sendQuotation = async (req, res) => {
    try {
        const quotation = await ImportQuotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        quotation.status = 'SENT';
        await quotation.save();

        if (quotation.requestId) {
            await ImportRequest.findByIdAndUpdate(quotation.requestId, { status: 'QUOTATION_SENT' });
        }

        // TODO: Enviar notificação ao cliente usando serviço existente
        
        res.status(200).json(quotation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const acceptQuotation = async (req, res) => {
    try {
        const quotation = await ImportQuotation.findById(req.params.id);
        if (!quotation) {
            return res.status(404).json({ message: 'Cotação não encontrada' });
        }

        // Tentar extrair user do req.user ou do token Bearer no header
        let tokenUserId = req.user?._id || req.user?.id;
        if (!tokenUserId && req.headers.authorization) {
            try {
                const token = req.headers.authorization.startsWith('Bearer ')
                    ? req.headers.authorization.slice(7)
                    : req.headers.authorization;
                const decode = jwt.verify(token, process.env.JWT_SECRET || 'somethingsecret');
                if (decode) {
                    tokenUserId = decode._id || decode.id;
                }
            } catch (jwtErr) {
                console.warn('[acceptQuotation] Token decode warn:', jwtErr.message);
            }
        }

        // Extrair customerId limpo (seja string ou objeto com _id)
        let rawCustomerId = tokenUserId || req.body.customerId || quotation.customerId;
        if (rawCustomerId && typeof rawCustomerId === 'object') {
            rawCustomerId = rawCustomerId._id || rawCustomerId.id || rawCustomerId;
        }

        const customerId = rawCustomerId ? rawCustomerId.toString() : null;

        if (!customerId) {
            return res.status(400).json({ message: 'Customer ID é obrigatório' });
        }

        const { paymentProof } = req.body;

        const order = await acceptQuotationAndCreateOrder(req.params.id, customerId, paymentProof);

        // Notificar via WebSocket em tempo real para atualização instantânea no painel Admin
        const io = req.app?.get('io');
        if (io) {
            io.emit('import_request_updated', {
                requestId: quotation.requestId,
                quotationId: quotation._id,
                orderId: order._id,
                status: 'ACCEPTED',
                updatedAt: new Date()
            });
            io.emit('admin_notification', {
                type: 'IMPORT_QUOTATION_ACCEPTED',
                title: 'Cotação Aceite! 🎉',
                message: `A cotação do pedido foi aceite e o pagamento foi enviado pelo cliente.`,
                requestId: quotation.requestId,
                orderId: order._id
            });
        }

        res.status(200).json({ message: 'Cotação aceite, ordem criada com sucesso', order });
    } catch (error) {
        console.error('[acceptQuotation]', error.message);
        res.status(500).json({ message: error.message });
    }
};

export const rejectQuotation = async (req, res) => {
    try {
        const quotation = await ImportQuotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

        quotation.status = 'REJECTED';
        await quotation.save();

        if (quotation.requestId) {
            await ImportRequest.findByIdAndUpdate(quotation.requestId, { status: 'REJECTED' });
        }

        // Notificar via WebSocket em tempo real para atualização instantânea no painel Admin
        const io = req.app?.get('io');
        if (io) {
            io.emit('import_request_updated', {
                requestId: quotation.requestId,
                quotationId: quotation._id,
                status: 'REJECTED',
                updatedAt: new Date()
            });
            io.emit('admin_notification', {
                type: 'IMPORT_QUOTATION_REJECTED',
                title: 'Cotação Rejeitada ❌',
                message: `O cliente rejeitou a cotação apresentada.`,
                requestId: quotation.requestId
            });
        }
        
        res.status(200).json(quotation);
    } catch (error) {
        console.error('[rejectQuotation]', error.message);
        res.status(500).json({ message: error.message });
    }
};
