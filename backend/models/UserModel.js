import mongoose from "mongoose";


const modelSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    resetToken: {type: String},
    phoneNumber: {type: Number, required: true, unique: true},
    isAdmin: {type: Boolean, default: false, required: true},
    isDeliveryMan: {type: Boolean, default: false},
    isSeller: {type: Boolean, default: false},
    isBanned: {type: Boolean, default: false},
    isApproved: {type: Boolean, default: false},
    seller:{
        name: {type: String},
        logo: {type: String},
        description: {type: String},
        rating: {type: Number, default: 0,},
        numReviews: {type: Number, default: 0, },
        opentime: {type: String},
        closetime: {type: String},
        province: {type: mongoose.Schema.Types.ObjectId, ref: 'Province',  default: null},
        address: {type: String},
        
        phoneNumberAccount: {type: Number},
        alternativePhoneNumberAccount: {type: Number},

        accountType:  {type: String},
        accountNumber: {type: Number},

        alternativeAccountType:  {type: String},
        alternativeAccountNumber: {type: Number},
    },
    deliveryman:{
        photo: {type: String},
        transport_type: {type: String},
        transport_color: {type: String},
        registration: {type: String},
    }
},{
    timestamps: true
});

const User = mongoose.model('User', modelSchema);

export default User;