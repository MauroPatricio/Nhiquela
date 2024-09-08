import express from 'express';
import Product from '../models/ProductModel.js';

import expressAsyncHandler from 'express-async-handler';
import { isAuth, isSellerOrAdmin } from '../utils.js';
import User from '../models/UserModel.js';


import {v2 as cloudinary} from 'cloudinary';

const productRoutes = express.Router();



//by category
productRoutes.get('/bycategory', async (req, res) => {
     try {
       const productsByCategory = await Product.aggregate([
         {
           $lookup: {
             from: 'categories',
             localField: 'category',
             foreignField: '_id',
             as: 'categoryDetails',
           },
         },
         {
           $unwind: '$categoryDetails',
         },
         {
          $lookup: {
            from: 'users', // Join with the sellers collection
            localField: 'seller', // Field from the Product collection
            foreignField: '_id', // Field from the Seller collection
            as: 'sellerDetails', // Alias for the joined data
          },
        },
        {
          $unwind: '$sellerDetails', // Unwind the sellerDetails array
        },
        
        {
          $lookup: {
            from: 'qualityTypes', // Join with the sellers collection
            localField: 'qualityType', // Field from the Product collection
            foreignField: '_id', // Field from the Seller collection
            as: 'qualityTypeDetails', // Alias for the joined data
          },
        },
        {
          $unwind: '$qualityTypeDetails', // Unwind the qualityTypeDetails array
        },

        {
          $lookup: {
            from: 'conditionStatuses', // Join with the sellers collection
            localField: 'conditionStatus', // Field from the Product collection
            foreignField: '_id', // Field from the Seller collection
            as: 'conditionStatusDetails', // Alias for the joined data
          },
        },
        {
          $unwind: '$conditionStatusDetails', // Unwind the conditionStatusDetails array
        },
        {
          $lookup: {
            from: 'provinces', // Join with the sellers collection
            localField: 'province', // Field from the Product collection
            foreignField: '_id', // Field from the Seller collection
            as: 'provinceDetails', // Alias for the joined data
          },
        },
        {
          $unwind: '$provinceDetails', // Unwind the provinceDetails array
        },
         {
           $sort: {
             'categoryDetails.name': 1, // Sort by category title in ascending order
           },
         },
       ])
       res.json(productsByCategory);
     } catch (error) {
       res.status(500).json({ error: 'Ocorreu um erro no servidor' });
     }
   });


// All Products
productRoutes.get('/', async (req, res) => {
     try{
          const seller = req.query.seller || '';
          const page = req.query.page || 1;
          const pageSize = 10

          const sellerFilter = seller? {seller}: {};

          const countProducts = await Product.countDocuments({...sellerFilter, isActive:true});

          const { category } = req.query;
    
          let query = Product.find();
          
          if (category) {
            query = query.where('category', category);
          }

          const products = await Product.find({...sellerFilter, isActive:true}).populate(  [  { path: 'seller'},
          { path: 'category' }, { path: 'province' },  { path: 'qualityType' },  { path: 'conditionStatus' },  { path: 'size' },  { path: 'color' }]).skip(pageSize *(page -1)).limit(pageSize).sort({category: 1, createdAt: -1});

         const  pages = Math.ceil(countProducts/pageSize);

         res.send({products, pages: pages});
     }catch(e){
          res.status(500).send({message: 'Ops... Não consegui me conectar com o servidor'});

     }
});

// Put 
productRoutes.put('/:id',isAuth, isSellerOrAdmin,expressAsyncHandler( async (req, res) => {

     const comission_price = parseFloat(process.env.COMISSION_PRICE)

     const priceFromSeller = parseFloat(req.body.priceFromSeller);

     const priceComission = parseFloat(priceFromSeller*comission_price);

     const priceWithComission = parseFloat(priceComission+priceFromSeller);

     const productId = req.params.id;
     const product = await Product.findById(productId);
     if(product){
      product.nome = req.body.nome!=null?req.body.nome.trim():req.body.nome;
      product.name = req.body.name!=null?req.body.name.trim(): req.body.name;
      product.slug = req.body.slug!=null?req.body.slug.trim():req.body.slug;
      product.priceFromSeller = priceFromSeller;
      product.priceComission = priceComission;
      product.price = priceWithComission;
      product.comissionPercentage = comission_price
      product.image = req.body.image;
      product.images = req.body.images;
      product.category = req.body.category;
      product.province = req.body.province;
      product.brand = req.body.brand;
      product.countInStock = req.body.countInStock;
      product.description = req.body.description;
      product.qualityType = req.body.qualityTyp;
      product.conditionStatus = req.body.conditionStatu;
      product.color = req.body.selectedColors;
      product.size = req.body.selectedSizes;
      product.isOrdered = req.body.isOrdered;
      product.orderPeriod = req.body.orderPeriod;
      product.isGuaranteed =  req.body.isGuaranteed;
      product.guaranteedPeriod = req.body.guaranteedPeriod;

      product.save();

      res.send({message: 'Produto actualizado com Sucesso'});
     }else{
      res.status(404).send({message: 'Produto não encontrado'});
 
     }
 }));

 // delete
 productRoutes.delete('/:id',isAuth,expressAsyncHandler( async (req, res) => {
     cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
      });

     const productId = req.params.id;
     const product = await Product.findById(productId);
     if(product){

          const publicIdToDelete = product.image;

          // Delete the image
          cloudinary.uploader.destroy(publicIdToDelete, (error, result) => {
          if (error) {
          console.error(error);
          } else {
          console.log(`Image deleted successfully. Result: ${result}`);
          }
          });
     
      product.deleteOne();

      res.send({message: 'Produto Removido com Sucesso'});
     }else{
      res.status(404).send({message: 'Produto não encontrado'});
 
     }
 }));



// Post 
productRoutes.post('/',isAuth,isSellerOrAdmin,expressAsyncHandler( async (req, res) => {

     if(!req.body.image){
          res.status(404).send({message: 'A imagem do produto é obrigatória'});
          return
     }

     const comission_price = parseFloat(process.env.COMISSION_PRICE)

     const user = await User.findById( req.user._id);

     const priceFromSeller = parseFloat(req.body.price);

     const priceComission = parseFloat(priceFromSeller*comission_price);

     const priceWithComission = parseFloat(priceComission+priceFromSeller);

     const newProduct = new Product({
          nome: req.body.nome!=null?req.body.nome.trim():req.body.nome,
          name: req.body.name!=null?req.body.name.trim(): req.body.name,
          slug: req.body.slug!=null?req.body.slug.trim():req.body.slug,
          seller: req.user._id,
          image: req.body.image,
          images: req.body.images,
          priceFromSeller: req.body.price,
          comissionPercentage: comission_price,
          priceComission: priceComission,
          price: priceWithComission,
          category: req.body.category,
          province: req.body.province,
          brand: req.body.brand,
          countInStock: req.body.countInStock,
          rating: req.body.rating,
          numReviews: req.body.numReviews,
          description: req.body.description,
          onSale: req.body.onSale,
          onSalePercentage: req.body.onSalePercentage,
          qualityType :req.body.qualityTyp,
          conditionStatus : req.body.conditionStatu,
          color : req.body.selectedColors,
          size : req.body.selectedSizes,
          isOrdered: req.body.isOrdered,
          orderPeriod: req.body.orderPeriod,
          isGuaranteed:  req.body.isGuaranteed,
          guaranteedPeriod: req.body.guaranteedPeriod,
          isActive: user.isApproved,
     });
     if(req.body.onSale){  
          newProduct.discount = newProduct.price - newProduct.price*newProduct.onSalePercentage;
     }

     const product = await newProduct.save();
     res.send({message: 'Produto criado', product});
}));


// Search
const PAGE_SIZE = 10;
productRoutes.get('/search',expressAsyncHandler( async (req, res) => {
     const {query} = req;

    const pageSize = query.pageSize || PAGE_SIZE;
    const page = query.page || 1;
    const category = query.category || '';
    const price = query.price || '';
    const rating = query.rating || '';
    const order = query.order || '';
    const province = query.province || '';
    const searchQuery = query.query || '';

    const queryFilter = searchQuery && searchQuery !== 'all'?{
     name:{
          $regex: searchQuery,
          $options: 'i'
     }
    }:{};

    const categoryFilter = category && category !== 'all'?{
     category
    }:{};

    const provinceFilter = province && province !== 'all'?{
     province
    }:{};

    const ratingFilter = rating && rating !== 'all'?{
     rating:{
          $gte: Number(rating),
     }
    }:{};

    const priceFilter = price && price !== 'all'?{
     price:{
          $gte: Number(price.split('-')[0]),
          $lte: Number(price.split('-')[1]),
     }
    }:{};


    const sortOrder = order === 'featured'?
    {featured: -1}: order === 'lowest'?
    {price: 1}: order === 'highest'?
    {price: -1}: order === 'toprated'?
    {rating: -1}: order === 'newest'?
    {createdAt: -1}:{_id:-1}



    const products = await Product.find({
     ...queryFilter,
     ...categoryFilter,
     ...priceFilter,
     ...ratingFilter,
     ...provinceFilter,
     isActive: true
   } ).populate('seller category seller.province province conditionStatus qualityType size color').sort(sortOrder).skip(pageSize *(page -1)).limit(pageSize);


//    const products = allProducts.filter((product)=>product.seller&&product.seller.isApproved===true);

    const countProducts = await Product.countDocuments(
     {...queryFilter,
     ...categoryFilter,
     ...provinceFilter,
     ...priceFilter,
     ...ratingFilter, isActive: true});
    
     res.send({products, countProducts, page, pages: Math.ceil(countProducts/pageSize)});
}));


productRoutes.get('/onsale',expressAsyncHandler( async (req, res) => {
     const {query} = req;

    const pageSize = query.pageSize || PAGE_SIZE;
    const page = query.page || 1;
    const category = query.category || '';
    const price = query.price || '';
    const rating = query.rating || '';
    const order = query.order || '';
    const province = query.province || '';
    const searchQuery = query.query || '';

    const queryFilter = searchQuery && searchQuery !== 'all'?{
     name:{
          $regex: searchQuery,
          $options: 'i'
     }
    }:{};

    const categoryFilter = category && category !== 'all'?{
     category
    }:{};

    const provinceFilter = province && province !== 'all'?{
     province
    }:{};

    const ratingFilter = rating && rating !== 'all'?{
     rating:{
          $gte: Number(rating),
     }
    }:{};

    const priceFilter = price && price !== 'all'?{
     price:{
          $gte: Number(price.split('-')[0]),
          $lte: Number(price.split('-')[1]),
     }
    }:{};


    const sortOrder = order === 'featured'?
    {featured: -1}: order === 'lowest'?
    {price: 1}: order === 'highest'?
    {price: -1}: order === 'toprated'?
    {rating: -1}: order === 'newest'?
    {createdAt: -1}:{_id:-1}



    const products = await Product.find({
     ...queryFilter,
     ...categoryFilter,
     ...priceFilter,
     ...ratingFilter,
     ...provinceFilter,
     onSale: true,
     isActive: true
   } ).populate('seller category seller.province province conditionStatus qualityType size color').sort(sortOrder).skip(pageSize *(page -1)).limit(pageSize);


//    const products = allProducts.filter((product)=>product.seller&&product.seller.isApproved===true);

    const countProducts = await Product.countDocuments(
     {...queryFilter,
     ...categoryFilter,
     ...provinceFilter,
     ...priceFilter,
     ...ratingFilter, onSale: true, isActive: true});
    
     res.send({products, countProducts, page, pages: Math.ceil(countProducts/pageSize)});
}));

// Products by slug
productRoutes.get('/slug/:slug',async (req, res)=>{
  
  const product = await Product.findOne({slug:req.params.slug}).populate('seller category conditionStatus qualityType size color').sort({'reviews.createdAt': -1});
  if(product){
       res.send(product);
  }else{
       res.status(404).send({message: 'Produto não encontrado'});
  }
});


// Get Products by userId
productRoutes.get('/productsBySeller/:id', async (req, res) => {
     try {
         const user = await User.findById(req.params.id);
         if (user) {
             const products = await Product.find({ seller: req.params.id }); // Fetch products by userId
             res.send(products);
         } else {
             res.status(404).send({ message: 'Fornecedor não encontrado' });
         }
     } catch (error) {
         res.status(500).send({ message: 'Erro no servidor', error: error.message });
     }
 });


productRoutes.get('/admin',
isAuth, 
expressAsyncHandler(async (req, res)=>{
     const {query} = req;
     const page = query.page || 1;
     const pageSize = query.pageSize || PAGE_SIZE;

     const products = await Product.find().populate('category seller conditionStatus qualityType size color').skip(pageSize * (page -1)).limit(10);
     
     const countProducts = await Product.countDocuments({ isActive:true});
     res.send({products, countProducts, page, pages: Math.ceil(countProducts/10)})
}));

productRoutes.get('/categories',async (req, res)=>{
  
     const categories = await Product.find({ isActive: true}).populate('seller').distinct('category');
     if(categories){
          res.send(categories);
     }else{
          res.status(404).send({message: 'Categorias não encontradas'});
     }
   });



// Porduct by Id
productRoutes.get('/:id',async (req, res)=>{
 
   const product = await Product.findById(req.params.id).populate('seller color size category province qualityType conditionStatus');
   if(product){
        res.send(product);
   }else{
        res.status(404).send({message: 'Produto não encontrado'});
   }
});


// Post reviews of product by Id
productRoutes.post('/:id/reviews',isAuth, expressAsyncHandler( async (req, res)=>{
 
     const product = await Product.findById(req.params.id);
     if(product){
          if(product.reviews.find((x)=>x.name === req.user.name)){
               return res.status(400).send({message: 'Já possui um comentário adicionado'})
          }

          const review = {
               name: req.user.name,
               rating: Number(req.body.rating),
               comment: req.body.comment
          }
          product.reviews.push(review);
          product.numReviews = product.reviews.length;

     

          product.rating = product.reviews.reduce((acc, curr) => acc + parseInt(curr.rating), 0)/product.reviews.length;
          const updateProduct = await product.save();
          res.status(201).send({message: 'Comentário adicionado com sucesso', 
          review: updateProduct.reviews[updateProduct.reviews.length - 1],
          numReviews: product.numReviews,
          rating: product.rating,
          product: updateProduct});

     }else{
          res.status(404).send({message: 'Comentário não adicionado'});
     }
  }));
export default productRoutes;