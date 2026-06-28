const mongoose = require("mongoose");

const deliverymanUpdateRequestSchema = new mongoose.Schema({
  deliverymanId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedFields: { type: Object, required: true }, // guarda só os campos enviados
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reason: { type: String } // motivo para aprovação/rejeição
});

module.exports = mongoose.model("DeliverymanUpdateRequest", deliverymanUpdateRequestSchema);
