// ImportCostCalculator - Serviço para calcular cotações

export const calculateQuotation = (params) => {
    const productCost = Number(params.productCost) || 0;
    const internationalShipping = Number(params.internationalShipping) || 0;
    const insuranceCost = Number(params.insuranceCost) || 0;
    const customsEstimated = Number(params.customsEstimated) || 0;
    const handlingCost = Number(params.handlingCost) || 0;
    const localTransport = Number(params.localTransport) || 0;
    const nhiquelaServiceFee = Number(params.nhiquelaServiceFee) || 0;
    const otherCosts = Number(params.otherCosts) || 0;

    const totalCost = productCost + 
                      internationalShipping + 
                      insuranceCost + 
                      customsEstimated + 
                      handlingCost + 
                      localTransport + 
                      nhiquelaServiceFee + 
                      otherCosts;

    return {
        productCost,
        internationalShipping,
        insuranceCost,
        customsEstimated,
        handlingCost,
        localTransport,
        nhiquelaServiceFee,
        otherCosts,
        totalCost,
    };
};
