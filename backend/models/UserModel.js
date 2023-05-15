import mongoose from "mongoose";


const modelSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
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
        province: {type: mongoose.Schema.Types.ObjectId, ref: 'Province'},
        docType: {type: mongoose.Schema.Types.ObjectId, ref: 'DocumentType'},
        docNumber: {type: String},
        frontDocImg: {type: String},
        backDocImg: {type: String},

    }
},{
    timestamps: true
});


const User = mongoose.model('User', modelSchema);


export default User;