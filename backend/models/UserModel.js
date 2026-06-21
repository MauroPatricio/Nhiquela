import mongoose from "mongoose";


const modelSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    phoneNumber: {type: Number, required: true, unique: true},
    isAdmin: {type: Boolean, default: false},
    isDeliveryMan: {type: Boolean, default: false},
    isSeller: {type: Boolean, default: false},
    // Reputation counters (denormalized for fast access)
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    rating: { type: String, default: 'Excelente' },
    isBanned: {type: Boolean, default: false},
    isApproved: {type: Boolean, default: false},
    location: {type: String},
    latitude: {type: String},
    longitude: {type: String},
    token: { type: String },
    isShopper: { type: Boolean, default: false },
    availability: { type: String, enum: ['active','paused','inactive'], default: 'inactive' },
    zones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }],
    assignedEstablishments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // References sellers/stores where the shopper works
    deviceToken: { type: String },
    seller:{
        name: {type: String},
        logo: {type: String},
        description: {type: String},
        rating: {type: Number, default: 0,},
        numReviews: {type: Number, default: 0, },
        province: {type: mongoose.Schema.Types.ObjectId, ref: 'Province',  default: null},
        tipoEstabelecimento: {type: mongoose.Schema.Types.ObjectId, ref: 'TipoEstabelecimento',  default: null},
        address: {type: String},
        latitude: {type: String},
        longitude: {type: String},
        openstore: {type: Boolean},
        workDayAndTime: [
            {
              dayNumber: Number,
              dayOfWeek: String,
              opentime:  String,
              closetime: String,
            },
          ],

        phoneNumberAccount: {type: Number},
        alternativePhoneNumberAccount: {type: Number},

        accountType:  {type: String},
        accountNumber: {type: Number},

        alternativeAccountType:  {type: String},
        alternativeAccountNumber: {type: Number},
    },
    deliveryman:{
        photo: {type: String},
        name: { type: String},
        phoneNumber: {type: Number},
        transport_type: {type: String},
        transport_color: {type: String},
        transport_registration: {type: String},

        vihicle_picture: {type: String},
        vihicle_inspection: {type: String},
        vihicle_Insurance: {type: String},

        license_front: {type: String},// Carta de conducao
        license_back: {type: String},

        document_type: {type: String}, // BI ou  Passaport ou Cedula Pessoal 
        document_front: {type: String},
        document_back: {type: String},

        Proof_of_Address: {type: String}, // Fatura de energia || Fatura de Agua || 
        Proof_of_Addres_Reason: {type: String},
        register_conformance: {
            type: String,
            enum: ["PENDING_CONFORMANCE", "CONFORMANCE", "INCONFORMANCE"],
            default: "PENDING_CONFORMANCE"
          }
        
    }
},{
    timestamps: true
});

const User = mongoose.model('User', modelSchema);

export default User;