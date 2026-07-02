import mongoose from 'mongoose';

const PricingEngineSchema = new mongoose.Schema(
  {
    platformCommission: { type: Number, default: 15 }, // %
    minFareDelivery: { type: Number, default: 80 },
    minFareService: { type: Number, default: 100 },
    defaultFreeWaitMinutes: { type: Number, default: 5 },
    defaultWaitingPricePerMinute: { type: Number, default: 3 },
    
    // Cancellation Fees
    cancellationFeeClient: { type: Number, default: 30 },
    cancellationFeeProvider: { type: Number, default: 0 },

    // Traffic Multipliers
    trafficMultipliers: {
      normal: { type: Number, default: 1.0 },
      moderate: { type: Number, default: 1.15 },
      heavy: { type: Number, default: 1.35 },
      severe: { type: Number, default: 1.60 },
    },

    // Weather Multipliers
    weatherMultipliers: {
      clear: { type: Number, default: 1.0 },
      drizzle: { type: Number, default: 1.10 },
      rain: { type: Number, default: 1.20 },
      storm: { type: Number, default: 1.40 },
    },

    // Time Multipliers
    timeMultipliers: {
      day: { type: Number, default: 1.0 },
      night: { type: Number, default: 1.15 },
      latenight: { type: Number, default: 1.25 },
    },

    // Day of Week / Holiday Multipliers
    dayMultipliers: {
      weekday: { type: Number, default: 1.0 },
      saturday: { type: Number, default: 1.10 },
      sunday: { type: Number, default: 1.15 },
      holiday: { type: Number, default: 1.20 },
    },

    // Demand (Surge) Multipliers
    demandMultipliers: {
      normal: { type: Number, default: 1.0 },
      high: { type: Number, default: 1.20 },
      veryHigh: { type: Number, default: 1.50 },
      extreme: { type: Number, default: 2.0 },
    },
    
    // Rating Multipliers (bonus for good providers)
    ratingMultipliers: {
      fiveStar: { type: Number, default: 1.05 }, // +5%
      fourStar: { type: Number, default: 1.02 }, // +2%
      threeStar: { type: Number, default: 1.0 },
      twoStar: { type: Number, default: 0.95 }, // -5%
      oneStar: { type: Number, default: 0.90 }, // -10%
    },

    // Financial Engine (Motor Financeiro para Motoristas)
    financialEngine: {
      minOperationalBalance: { type: Number, default: 50 },
      creditLimit: { type: Number, default: -100 },
      allowNegativeBalance: { type: Boolean, default: true },
      lowBalanceWarningThreshold: { type: Number, default: 100 },
      autoDisableOnLowBalance: { type: Boolean, default: true },
      driverCommissionRate: { type: Number, default: 0.15 }, // 15% default driver commission
    }
  },
  { timestamps: true }
);

export default mongoose.model('PricingEngine', PricingEngineSchema);
