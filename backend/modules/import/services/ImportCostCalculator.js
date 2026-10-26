// ImportCostCalculator - Serviço para calcular cotações oficiais de importação (Moçambique)

export const calculateQuotation = (params = {}) => {
    // 1. Valor da Mercadoria (VM)
    const productCost = Number(params.productCost) || 0;
    
    // 2. Frete Internacional
    const internationalShipping = Number(params.internationalShipping !== undefined ? params.internationalShipping : params.freight) || 0;
    
    // 3. Seguro = (VM + Frete) * 1%
    const insuranceCost = Number(((productCost + internationalShipping) * 0.01).toFixed(2));
    
    // 4. VA (Valor Aduaneiro / CIF) = VM + Frete + Seguro
    const customsValue = Number((productCost + internationalShipping + insuranceCost).toFixed(2));
    
    // 5. DA (Direitos Aduaneiros) = VA * Taxa Pautal (Padrão 5%)
    const customsDutyRate = params.customsDutyRate !== undefined ? Number(params.customsDutyRate) : 5;
    const customsEstimated = (params.customsEstimated !== undefined && params.customsEstimated !== null && params.manualCustoms)
        ? Number(params.customsEstimated)
        : Number((customsValue * (customsDutyRate / 100)).toFixed(2));

    // 6. ICE (Imposto sobre Consumos Específicos - Lei 19/2022 e 7/2025)
    const iceRate = params.iceRate !== undefined ? Number(params.iceRate) : 0;
    const iceCost = params.iceCost !== undefined && params.manualIce
        ? Number(params.iceCost)
        : Number((customsValue * (iceRate / 100)).toFixed(2));
    
    // 7. Base do IVA = VA + DA + ICE
    const vatBase = Number((customsValue + customsEstimated + iceCost).toFixed(2));
    
    // 8. IVA da Importação = Base do IVA * Taxa de IVA (16% em Moçambique, 0% se Isento Lei 22/2022)
    const vatRate = params.vatRate !== undefined ? Number(params.vatRate) : 16;
    const vatCost = Number((vatBase * (vatRate / 100)).toFixed(2));
    
    // Custos operacionais e outros impostos adicionais
    const handlingCost = Number(params.handlingCost) || 0;
    const localTransport = Number(params.localTransport) || 0;

    let otherTaxesList = [];
    if (Array.isArray(params.otherTaxes)) {
        otherTaxesList = params.otherTaxes
            .filter(t => t && (t.description || t.amount))
            .map(t => ({
                description: t.description ? String(t.description).trim() : '',
                amount: Number(t.amount) || 0
            }));
    }

    const otherTaxesAmount = otherTaxesList.length > 0
        ? Number(otherTaxesList.reduce((acc, t) => acc + t.amount, 0).toFixed(2))
        : Number(params.otherTaxesAmount !== undefined ? params.otherTaxesAmount : (params.otherCosts || 0));

    const otherTaxesDescription = otherTaxesList.length > 0
        ? otherTaxesList.map(t => t.description).filter(Boolean).join(', ')
        : (params.otherTaxesDescription || '');

    const otherCosts = otherTaxesAmount;

    // 9. Taxa Nhiquela = VM * 30%
    const nhiquelaCommissionRate = params.nhiquelaCommissionRate !== undefined ? Number(params.nhiquelaCommissionRate) : 30;
    const nhiquelaServiceFee = (params.nhiquelaServiceFee !== undefined && params.manualServiceFee)
        ? Number(params.nhiquelaServiceFee)
        : Number((productCost * (nhiquelaCommissionRate / 100)).toFixed(2));
        
    // 10. Total de Importação = VA + DA + ICE + IVA + handling + localTransport + outros impostos
    const importTotalCost = Number((customsValue + customsEstimated + iceCost + vatCost + handlingCost + localTransport + otherTaxesAmount).toFixed(2));
    
    // 11. Total Final = Total de Importação + Taxa Nhiquela
    const totalCost = Number((importTotalCost + nhiquelaServiceFee).toFixed(2));

    return {
        productCost,
        internationalShipping,
        insuranceCost,
        customsValue,
        customsDutyRate,
        customsEstimated,
        iceRate,
        iceCost,
        vatBase,
        vatRate,
        vatCost,
        handlingCost,
        localTransport,
        otherCosts,
        otherTaxes: otherTaxesList,
        otherTaxesDescription,
        otherTaxesAmount,
        nhiquelaCommissionRate,
        nhiquelaServiceFee,
        importTotalCost,
        totalCost,
        pautaCategory: params.pautaCategory || '',
        pautaShCode: params.pautaShCode || ''
    };
};
