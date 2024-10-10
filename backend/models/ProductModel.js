import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    name: {type: String, required: true},
    comment: {type: String, required: true},
    rating: {type: String, required: true},
},
{
    timestamps: true
});


const productSchema = new mongoose.Schema({
    nome: {type: String, required: true},
    name: {type: String, required: true},
    slug: {type: String, required: true, unique: true},
    seller: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    image: {type: String},
    images: [String],
    brand: {type: String, required: true},
    category: {type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
    province: {type: mongoose.Schema.Types.ObjectId, ref: 'Province'},
    description: {type: String, required: true},
    priceFromSeller: {type: Number},
    comissionPercentage: {type: Number},
    priceComission: {type: Number},
    price: {type: Number, required: true},
    countInStock: {type: Number, required: true},
    rating: {type: Number, required: false},
    numReviews: {type: Number, required: false},
    onSale: { type: Boolean, default: false },
    onSalePercentage: {type: Number, required: false},
    isActive:  { type: Boolean, default: true },
    isGuaranteed:  { type: Boolean, default: false },
    guaranteedPeriod:  { type: String },
    isOrdered: { type: Boolean, default: false },
    orderPeriod: { type: String },
    discount: {type: Number, required: false},
    color: [ {type: mongoose.Schema.Types.ObjectId, ref: 'Color'}], // vermelho, preto, castanho, azul
    size: [ {type: mongoose.Schema.Types.ObjectId, ref: 'Size'}], // S, M, L, XL, XXL or 20,21,22,23,24, [...] 40,41,42,43
    qualityType: {type: mongoose.Schema.Types.ObjectId, ref: 'QualityType'}, // Original, Replica
    conditionStatus: {type: mongoose.Schema.Types.ObjectId, ref: 'ConditionStatus'}, // Novo, usado
    reviews: [reviewSchema],
},{
    timestamps: true
});


const Product = mongoose.model('Product', productSchema);


export default Product;