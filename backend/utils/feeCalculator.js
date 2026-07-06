// utils/feeCalculator.js
// Calculates the processing fee for a document order.
// It checks for a fee configuration for the specific service type and, if present,
// also looks for an establishment-specific override.

import ProcessingFee from '../models/ProcessingFee.js';

const calculateProcessingFee = async (order) => {
  // order contains serviceType, establishment, and (later) cart total if needed.
  const baseFee = await ProcessingFee.findOne({
    serviceType: order.serviceType,
    establishment: null,
  });

  const estFee = await ProcessingFee.findOne({
    serviceType: order.serviceType,
    establishment: order.establishment,
  });

  const feeConfig = estFee || baseFee;
  if (!feeConfig) return 0;

  if (feeConfig.exempt) return 0;
  if (feeConfig.amount != null) return feeConfig.amount;
  if (feeConfig.percentage != null && order.cartTotal != null) {
    return (order.cartTotal * feeConfig.percentage) / 100;
  }
  return 0;
};

export default { calculateProcessingFee };
