import mongoose from "mongoose";

const importDocumentSchema = new mongoose.Schema(
  {
    importOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "ImportOrder", required: true },
    type: {
      type: String,
      enum: ['INVOICE', 'PACKING_LIST', 'PAYMENT_PROOF', 'SHIPPING_DOCUMENT', 'CUSTOMS_DOCUMENT', 'RECEIPT', 'OTHER'],
      required: true
    },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

const ImportDocument = mongoose.model("ImportDocument", importDocumentSchema);

export default ImportDocument;
