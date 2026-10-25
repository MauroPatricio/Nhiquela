import ImportRequest from '../models/ImportRequestModel.js';
import ImportQuotation from '../models/ImportQuotationModel.js';
import ImportSimulationLead from '../models/ImportSimulationLeadModel.js';

async function enrichRequestWithSimulationData(r) {
    try {
        let lead = null;
        if (r.simulationLeadId) {
            lead = await ImportSimulationLead.findById(r.simulationLeadId).lean();
        }
        if (!lead) {
            lead = await ImportSimulationLead.findOne({ requestId: r._id }).lean();
        }
        if (!lead && r.description) {
            const match = r.description.match(/#?(NQL-SIM-\w+)/i);
            if (match && match[1]) {
                lead = await ImportSimulationLead.findOne({ simulationCode: match[1].toUpperCase() }).lean();
            }
        }

        // Se houver lead associado
        if (lead) {
            r.simulationLead = lead;
            r.simulationCode = r.simulationCode || lead.simulationCode;
            r.unitPrice = r.unitPrice || lead.unitPrice || 0;
            r.currency = r.currency || lead.currency || 'USD';
            r.exchangeRate = r.exchangeRate || lead.calculationResult?.metadata?.exchangeRateToMzn || lead.estimatedRange?.exchangeRate || 75.0;
            
            const fobMzn = lead.calculationResult?.goodsSummary?.totalGoodsValueMzn || lead.calculationResult?.goodsSummary?.fobMzn || (r.unitPrice * (r.quantity || 1) * r.exchangeRate);
            r.productCostMzn = r.productCostMzn || fobMzn;

            const freightForeign = lead.freightKnownValue || lead.calculationResult?.logisticsSummary?.freightCurrency || (lead.calculationResult?.logisticsSummary?.freightMzn ? Number((lead.calculationResult.logisticsSummary.freightMzn / r.exchangeRate).toFixed(2)) : 0);
            r.freight = (r.freight !== undefined && r.freight !== null && r.freight > 0) ? r.freight : freightForeign;
            const freightMzn = lead.calculationResult?.logisticsSummary?.freightMzn || (r.freight * r.exchangeRate);
            r.freightMzn = r.freightMzn || freightMzn;

            const insuranceForeign = lead.calculationResult?.logisticsSummary?.insuranceCurrency || (lead.calculationResult?.logisticsSummary?.insuranceMzn ? Number((lead.calculationResult.logisticsSummary.insuranceMzn / r.exchangeRate).toFixed(2)) : 0);
            r.insurance = (r.insurance !== undefined && r.insurance !== null && r.insurance > 0) ? r.insurance : insuranceForeign;
            r.insuranceCurrency = r.insurance;
            r.insuranceMzn = r.insuranceMzn || lead.calculationResult?.logisticsSummary?.insuranceMzn || Number(((r.productCostMzn + r.freightMzn) * 0.01).toFixed(2));

            const customsValForeign = lead.calculationResult?.logisticsSummary?.customsValueCurrency || Number(((r.unitPrice * (r.quantity || 1)) + r.freight + r.insurance).toFixed(2));
            r.customsValueCurrency = r.customsValueCurrency || customsValForeign;
            r.customsValue = r.customsValue || lead.calculationResult?.logisticsSummary?.customsValueMzn || (r.productCostMzn + r.freightMzn + r.insuranceMzn);

            r.simulationData = r.simulationData || lead.calculationResult || null;
            r.originCountry = r.originCountry || lead.originCountry || 'China';
            r.destinationCity = r.destinationCity || lead.destinationCity || 'Maputo';
            r.productImage = r.productImage || lead.productImage || '';
            r.shippingMethod = r.shippingMethod || lead.transportType || 'SEA';

            r.customsDutyRate = (r.customsDutyRate !== undefined && r.customsDutyRate !== null) ? r.customsDutyRate : (lead.tariffItem?.daRate ?? lead.calculationResult?.taxSummary?.customsDuty?.rate ?? 5);
            r.ivaRate = (r.ivaRate !== undefined && r.ivaRate !== null) ? r.ivaRate : (lead.tariffItem?.ivaRate ?? lead.calculationResult?.taxSummary?.vat?.rate ?? 16);
            r.iceRate = (r.iceRate !== undefined && r.iceRate !== null) ? r.iceRate : (lead.tariffItem?.iceRate ?? lead.calculationResult?.taxSummary?.ice?.rate ?? 0);
            r.pautaCategory = r.pautaCategory || lead.tariffItem?.description || lead.tariffItem?.category || '';
            r.pautaShCode = r.pautaShCode || lead.tariffItem?.shCode || '';

            if (!r.importerContact || !r.importerContact.name) {
                r.importerContact = {
                    name: lead.contactName || '',
                    phone: lead.phone || '',
                    email: lead.email || '',
                    company: lead.companyName || ''
                };
            }
        }

        // Se ainda não tiver contacto do importador mas estiver na descrição
        if ((!r.importerContact || !r.importerContact.name) && r.description) {
            const impMatch = r.description.match(/Importador:\s*([^.\n]+)/i);
            const telMatch = r.description.match(/Telefone:\s*([^.\n]+)/i);
            if (impMatch || telMatch) {
                r.importerContact = {
                    name: impMatch ? impMatch[1].trim() : '',
                    phone: telMatch ? telMatch[1].trim() : '',
                    email: '',
                    company: ''
                };
            }
        }

        // Cotação oficial
        const quotation = await ImportQuotation.findOne({ requestId: r._id })
            .select('estimatedDeliveryDays estimatedArrivalDate quotationValidUntil productCost internationalShipping customsEstimated customsDutyRate vatRate iceRate status')
            .lean();
        if (quotation) {
            r.estimatedDeliveryDays = quotation.estimatedDeliveryDays || null;
            r.estimatedArrivalDate = quotation.estimatedArrivalDate || null;
            r.quotationValidUntil = quotation.quotationValidUntil || null;
            r.quotation = quotation;
        }
    } catch (err) {
        console.error('Erro ao enriquecer pedido de importação:', err);
    }
    return r;
}

export const createRequest = async (req, res) => {
    try {
        const { productName, description, quantity, productUrl, preferredOriginCountry, targetBudget, notes, productImage, shippingMethod, pautaCategory, pautaShCode } = req.body;
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
            pautaCategory,
            pautaShCode,
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

        // Enriquecer cada pedido com dados da simulação e da cotação
        const enriched = await Promise.all(requests.map(r => enrichRequestWithSimulationData(r)));

        res.status(200).json(enriched);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getRequestById = async (req, res) => {
    try {
        let request = await ImportRequest.findById(req.params.id)
            .populate('customerId', 'name email phoneNumber phone')
            .lean();
        if (!request) return res.status(200).json(null);

        // Marcar como visualizada se ainda não foi
        if (!request.isViewed) {
            await ImportRequest.findByIdAndUpdate(req.params.id, { isViewed: true });
            request.isViewed = true;
            const io = req.app?.get('io');
            if (io) {
                io.emit('import_request_updated', { requestId: req.params.id, isViewed: true });
            }
        }

        request = await enrichRequestWithSimulationData(request);
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
            { status, isViewed: true },
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

export const markRequestAsViewed = async (req, res) => {
    try {
        const request = await ImportRequest.findByIdAndUpdate(
            req.params.id,
            { isViewed: true },
            { new: true }
        );
        if (!request) return res.status(404).json({ message: 'Request not found' });

        const io = req.app?.get('io');
        if (io) {
            io.emit('import_request_updated', { requestId: req.params.id, isViewed: true });
        }
        res.status(200).json({ success: true, isViewed: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

