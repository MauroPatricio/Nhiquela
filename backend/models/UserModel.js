import mongoose from "mongoose";


const modelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: Number, required: true, unique: true },
    profileImage: { type: String }, // Foto de perfil do cliente
    savedLocations: [{
        name: { type: String, required: true }, // ex: 'Casa', 'Trabalho'
        address: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    }],
    isAdmin: { type: Boolean, default: false },
    isDeliveryMan: { type: Boolean, default: false },
    isSeller: { type: Boolean, default: false },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }, // Nova referência para Role dinâmica
    preferredPaymentMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' },
    // Reputation counters (denormalized for fast access)
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    consecutiveCancellations: { type: Number, default: 0 }, // New for 5 cancellations rule
    blockedUntil: { type: Date }, // New for 30-day penalty
    rating: { type: String, default: 'Excelente' },
    isBanned: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    requirePasswordChange: { type: Boolean, default: false },
    location: { type: String },
    latitude: { type: String },
    longitude: { type: String },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    locationGeo: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0] // [longitude, latitude]
        }
    },
    token: { type: String },
    isShopper: { type: Boolean, default: false },
    availability: { type: String, enum: ['active', 'paused', 'inactive'], default: 'inactive' },
    isDeleted: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['Pendente', 'Disponível', 'Em Entrega', 'Inativo'],
        default: 'Pendente'
    },
    zones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }],
    assignedEstablishments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // References sellers/stores where the shopper works
    deviceToken: { type: String },
    seller: {
        name: { type: String },
        logo: { type: String },
        description: { type: String },
        rating: { type: Number, default: 0, },
        numReviews: { type: Number, default: 0, },
        province: { type: mongoose.Schema.Types.ObjectId, ref: 'Province', default: null },
        tipoEstabelecimento: { type: mongoose.Schema.Types.ObjectId, ref: 'EstablishmentType', default: null },
        address: { type: String },
        latitude: { type: String },
        longitude: { type: String },
        openstore: { type: Boolean },
        workDayAndTime: [
            {
                dayNumber: Number,
                dayOfWeek: String,
                opentime: String,
                closetime: String,
            },
        ],

        phoneNumberAccount: { type: Number },
        alternativePhoneNumberAccount: { type: Number },

        accountType: { type: String },
        accountNumber: { type: Number },

        alternativeAccountType: { type: String },
        alternativeAccountNumber: { type: Number },
    },
    deliveryman: {
        photo: { type: String },
        name: { type: String },
        phoneNumber: { type: Number },
        transport_type: { type: String },
        transport_color: { type: String },
        transport_registration: { type: String },
        vehicle_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType' },
        assigned_base_fee: { type: Number },
        transferPreferences: {
            mPesaNumber: { type: String, default: '' },
            eMolaNumber: { type: String, default: '' }
        },

        vihicle_picture: { type: String }, // DEPRECATED
        vihicle_picture_front: { type: String },
        vihicle_picture_back: { type: String },
        vihicle_inspection: { type: String },
        vihicle_Insurance: { type: String },
        vihicle_logbook: { type: String },

        license_front: { type: String },// Carta de conducao
        license_back: { type: String },

        document_type: { type: String }, // BI ou  Passaport ou Cedula Pessoal 
        document_front: { type: String },
        document_back: { type: String },

        Proof_of_Address: { type: String }, // Fatura de energia || Fatura de Agua || 
        Proof_of_Addres_Reason: { type: String },
        register_conformance: {
            type: String,
            enum: ["PENDING_CONFORMANCE", "CONFORMANCE", "INCONFORMANCE"],
            default: "PENDING_CONFORMANCE"
        },
        providedServices: [
            {
                serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
                customBasePrice: { type: Number }, // Optional override
                isAvailable: { type: Boolean, default: true }
            }
        ],
        hasHelpers: { type: Boolean, default: false },
        helperCount: { type: Number, default: 0 },
        // Preço Personalizado
        allowCustomPrice: { type: Boolean, default: false },     // Toggle: permite definir preço próprio
        customPrice: { type: Number, default: null },             // Preço aprovado pelo admin
        pendingCustomPrice: { type: Number, default: null },      // Preço aguardando aprovação
        priceRequestStatus: { type: String, enum: ['Pendente', 'Aprovado', 'Rejeitado', null], default: null },
        priceRequestRejectionReason: { type: String, default: '' },
        // Permissão para atualizar documentos
        docUpdateStatus: { type: String, enum: ['Nenhum', 'Pendente', 'Aprovado'], default: 'Nenhum' },
        // Controlo de serviço ativo — impede receber novos pedidos até o cliente confirmar conclusão
        hasActiveService: { type: Boolean, default: false },
        
        // AGENDAMENTO INTELIGENTE
        upcomingScheduledTrips: [{
            tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'RequestService' },
            scheduledAt: { type: Date },
            estimatedDurationMins: { type: Number, default: 30 }
        }],
        isBlockedForLongTrips: { type: Boolean, default: false }, // Ativado quando um agendamento está próximo
        
        averageRating: { type: Number, default: 0 },
        totalRatings: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Adicionar índice 2dsphere para pesquisas geoespaciais eficientes
modelSchema.index({ locationGeo: "2dsphere" });

// Otimizações de Performance: Índices para matchmaking de motoristas
modelSchema.index({ isDeliveryMan: 1, availability: 1, status: 1 });

const User = mongoose.models.User || mongoose.model('User', modelSchema);

export default User;
