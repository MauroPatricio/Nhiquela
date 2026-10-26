import mongoose from "mongoose";

const importQuotationSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: "ImportRequest", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productCost: { type: Number, required: true },
    productCurrency: { type: String, required: true },
    internationalShipping: { type: Number, default: 0 },
    insuranceCost: { type: Number, default: 0 },
    customsValue: { type: Number, default: 0 }, // VA = Mercadoria + Frete + Seguro
    customsDutyRate: { type: Number, default: 5 }, // Taxa Pautal (DA) %
    customsEstimated: { type: Number, default: 0 }, // DA = VA * Taxa Pautal
    iceRate: { type: Number, default: 0 }, // Taxa de ICE % (Lei 19/2022 e Lei 7/2025)
    iceCost: { type: Number, default: 0 }, // ICE = VA * iceRate
    vatBase: { type: Number, default: 0 }, // Base do IVA = VA + DA + ICE
    vatRate: { type: Number, default: 16 }, // Taxa de IVA % (16% em Moçambique, 0% se Isento Lei 22/2022)
    vatCost: { type: Number, default: 0 }, // IVA = Base do IVA * vatRate
    handlingCost: { type: Number, default: 0 },
    localTransport: { type: Number, default: 0 },
    nhiquelaCommissionRate: { type: Number, default: 30 }, // Taxa de Serviço %
    nhiquelaServiceFee: { type: Number, default: 0 }, // Comissão Nhiquela = VM * 30%
    importTotalCost: { type: Number, default: 0 }, // Total de Importação = VA + DA + ICE + IVA
    otherCosts: { type: Number, default: 0 },
    otherTaxesDescription: { type: String, default: '' },
    otherTaxesAmount: { type: Number, default: 0 },
    otherTaxes: [
      {
        description: { type: String, default: '' },
        amount: { type: Number, default: 0 }
      }
    ],
    totalCost: { type: Number, required: true }, // Total Final = Total de Importação + Nhiquela
    pautaCategory: { type: String, default: '' },
    pautaShCode: { type: String, default: '' },
    currency: { type: String, required: true, default: 'MZN' }, // or USD depending on system defaults
    exchangeRate: { type: Number, default: 1 }, // Used if converting productCurrency to local currency
    estimatedDeliveryDays: { type: String }, // e.g., "20-30 dias"
    estimatedArrivalDate: { type: Date }, // Concrete estimated arrival date
    quotationValidUntil: { type: Date },
    notes: { type: String },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      default: 'DRAFT'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin id
  },
  {
    timestamps: true,
  }
);

const ImportQuotation = mongoose.model("ImportQuotation", importQuotationSchema);

export default ImportQuotation;
