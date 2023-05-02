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
    name: {type: String, required: true, unique: true},
    slug: {type: String, required: true, unique: true},
    seller: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    image: {type: String, required: true },
    images: [String],
    brand: {type: String, required: true},
    category: {type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
    description: {type: String, required: true},
    price: {type: Number, required: true},
    countInStock: {type: Number, required: true},
    rating: {type: Number, required: true},
    numReviews: {type: Number, required: true},
    onSale: { type: Boolean, default: false },
    onSalePercentage: {type: Number, required: false},
    isActive:  { type: Boolean, default: true },
    discount: {type: Number, required: false},
    reviews: [reviewSchema],
},{
    timestamps: true
});


const Product = mongoose.model('Product', productSchema);


export default Product;