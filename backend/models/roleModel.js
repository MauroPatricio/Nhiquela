import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false } // Protege roles padrão de serem eliminados
}, {
    timestamps: true
});

const Role = mongoose.model('Role', roleSchema);

export default Role;
