import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    performedByName: { type: String, required: true },
    action: { type: String, required: true }, // ex: 'ROLE_PERMISSIONS_UPDATE', 'PARTNER_ASSIGN_DRIVER', 'PARTNER_REMOVE_DRIVER'
    targetRole: { type: String, default: null }, // ex: 'PARTNER', 'OPERATOR'
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    targetUserName: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' }
  },
  { timestamps: true }
);

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
