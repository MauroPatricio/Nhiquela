import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true }, // ex: CLIENT, DRIVER, SELLER, OPERATOR, PARTNER, ADMIN
    name: { type: String, required: true },
    description: { type: String },
    permissions: [{ type: String }], // Array de códigos de ação (ex: 'DASHBOARD_VIEW', 'DRIVER_CREATE', 'ORDER_CANCEL')
    status: { type: String, enum: ['Ativo', 'Inativo'], default: 'Ativo' },
    isSystem: { type: Boolean, default: false } // Protege roles de sistema contra eliminação
}, {
    timestamps: true
});

const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

export default Role;
