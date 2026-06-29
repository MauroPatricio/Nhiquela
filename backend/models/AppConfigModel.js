import mongoose from 'mongoose';

const AppConfigSchema = new mongoose.Schema(
  {
    // Version Control (Force Update)
    minAppVersionClient: { type: String, default: '1.0.0' },
    minAppVersionDriver: { type: String, default: '1.0.0' },
    appStoreUrlClient: { type: String, default: 'https://apps.apple.com/app/nhiquela' },
    playStoreUrlClient: { type: String, default: 'https://play.google.com/store/apps/details?id=com.nhiquela.client' },
    appStoreUrlDriver: { type: String, default: 'https://apps.apple.com/app/nhiquela-driver' },
    playStoreUrlDriver: { type: String, default: 'https://play.google.com/store/apps/details?id=com.nhiquela.driver' },

    // Maintenance Mode
    isMaintenanceModeClient: { type: Boolean, default: false },
    isMaintenanceModeDriver: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'Estamos em manutenção para melhorar a plataforma. Voltaremos em breve!' },

    // Contact Information & Links
    supportWhatsApp: { type: String, default: '+258840000000' },
    supportEmail: { type: String, default: 'suporte@nhiquela.com' },
    termsUrl: { type: String, default: 'https://nhiquela.com/termos' },
    privacyUrl: { type: String, default: 'https://nhiquela.com/privacidade' },

    // Active Payment Methods (Toggle remotely)
    enabledPaymentMethods: {
      type: [String],
      default: ['MPESA', 'EMOLA', 'CASH']
    }
  },
  { timestamps: true }
);

export default mongoose.model('AppConfig', AppConfigSchema);
