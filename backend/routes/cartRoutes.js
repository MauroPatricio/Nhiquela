import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Cart from '../models/CartModel.js';

const cartRoutes = express.Router();


cartRoutes.post(
    '/addOnCart',
    expressAsyncHandler(
        async (req, res) =>{
            const {userId, cartItem, quantity} = req.body;
        
            try{
        const cart = await Cart.findOne({userId});
        
        if(cart){
            const existingProduct = cart.find(
                (product) => product.cartItem.toString()===cartItem
            )
        
            if(existingProduct){
                existingProduct.quantity += 1;
            }else{
                cart.products.push(cartItem, quantity);
            }
            await cart.save();
            res.status(200).json("Produto adicionado na carinha");
        }else{
            const newCart = new Cart({
                userId,
                products:[{
                    cartItem, quantity: quantity
                }]
            })
        
            await newCart.save();
            res.status(200).json("Produto adicionado na carinha");
        
        }
        
        
            }catch(error){
                res.status(500).json("Falha ao adicionar");
        
            }
        
        }
 ) );


 cartRoutes.get(
    '/find/:id',
    expressAsyncHandler(
    async (req, res) =>{
        const userId = req.params.id
        try{
            const cart = await Cart.find({userId}).populate('products.cartItem',"_id nome name slug seller image images brand category province  description priceFromSeller comissionPercentage priceComission price countInStock rating numReviews onSale onSalePercentage isActive isGuaranteed guaranteedPeriod isOrdered orderPeriod discount color  size qualityType conditionStatus")
            
            res.status(200).json(cart);
        } catch(error){
            res.status(500).json(error)
        }
    }
 )
);


cartRoutes.post('/decrement',expressAsyncHandler(

    async (req, res) =>{
        const {userId, cartItem} = req.body;
    
        try{
            const cart = Cart.findOne({userId});
            if(!cart){
                return res.status(404).json("Cart not found");
            }
    
            const existingProduct = cart.products.find(
                (product) => product.cartItem.toString() == cartItem);
       
            if (!existingProduct){
                return res.status(404).json("Product not found")
            }
    
            if(existingProduct.quantity == 1){
                cart.products = cart.products.filter(
                    (product) => product.cartItem.toString() !== cartItem
                );
            }else{
                existingProduct.quantity -=1
            }
    
            await cart.save();
    
            if(existingProduct.quantity == 0){
                await Cart.updateOne({userId}, {$pull: {products: { cartItem}}})
            }
    
            res.status(200).json("Product updated")
       
            }catch(error){
                res.status(500).json(error)
            }
    }
));

cartRoutes.delete('/:cartItemId',expressAsyncHandler(async (req, res) =>{
    const cartItemId = req.params.cartItemId;

    try{

        const updatedCart = await Cart.findOneAndUpdate({'products._id': cartItemId},{$pull:{products: {_id:cartItemId}}},{new: true})

        if(!updatedCart){
            return res.status(404).json("Cart item not found")
        }
        res.status(200).json(updatedCart);
    }catch(error){
        res.status(500).json(error);

    }
}));
    
    export default cartRoutes;
