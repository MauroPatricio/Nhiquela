import express, { query } from 'express';
import Product from '../models/ProductModel.js';
import expressAsyncHandler from 'express-async-handler';
import { isAdmin, isAuth, isSeller, isSellerOrAdmin } from '../utils.js';

const productRoutes = express.Router();

// All Products
productRoutes.get('/', async (req, res) => {

     try{
          const seller = req.query.seller || '';
          const page = req.query.page || 1;
          const pageSize = 10

          const sellerFilter = seller? {seller}: {};
          const countProducts = await Product.countDocuments({...sellerFilter});

          const products = await Product.find({...sellerFilter}).populate('seller category province').skip(pageSize *(page -1)).limit(pageSize).sort({createdAt: -1}); 
          
         const  pages = Math.ceil(countProducts/pageSize);
          res.send({products, pages: pages});
     }catch(e){
          res.status(500).send({message: 'Ops... Não consegui me conectar ao servidor '});

     }
});

// Put 
productRoutes.put('/:id',isAuth, isSellerOrAdmin,expressAsyncHandler( async (req, res) => {
  
     const productId = req.params.id;
     const product = await Product.findById(productId);
     if(product){
      product.name = req.body.name;
      product.slug = req.body.slug;
      product.price = req.body.price;
      product.image = req.body.image;
      product.images = req.body.images;
      product.category = req.body.category;
      product.province = req.body.province;
      product.brand = req.body.brand;
      product.countInStock = req.body.countInStock;
      product.description = req.body.description;
            product.save()

      res.send({message: 'Produto Actualizado com Sucesso'});
     }else{
      res.status(404).send({message: 'Produto não encontrado'});
 
     }
 }));

 // delete
 productRoutes.delete('/:id',isAuth,expressAsyncHandler( async (req, res) => {
     
     const productId = req.params.id;
     const product = await Product.findById(productId);
     if(product){
     
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
     const newProduct = new Product({
          name: req.body.name,
          slug: req.body.slug,
          seller: req.user._id,
          image: req.body.image,
          images: req.body.images,
          price: req.body.price,
          category: req.body.category,
          province: req.body.province,
          brand: req.body.brand,
          countInStock: req.body.countInStock,
          rating: req.body.rating,
          numReviews: req.body.numReviews,
          description: req.body.description,
          onSale: req.body.onSale,
          onSalePercentage: req.body.onSalePercentage

     });

     if(req.body.onSale){  
          newProduct.discount = newProduct.price - newProduct.price*newProduct.onSalePercentage;
     }

     const product = await newProduct.save();
     res.send({message: 'Producto criado', product});
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
   } ).populate('seller category seller.province province').sort(sortOrder).skip(pageSize *(page -1)).limit(pageSize);

    const countProducts = await Product.countDocuments(
     {...queryFilter,
     ...categoryFilter,
     ...provinceFilter,
     ...priceFilter,
     ...ratingFilter});
    
     res.send({products, countProducts, page, pages: Math.ceil(countProducts/pageSize)});
}));

// Products by slug
productRoutes.get('/slug/:slug',async (req, res)=>{
  
  const product = await Product.findOne({slug:req.params.slug}).populate('seller category').sort({'reviews.createdAt': -1});
  if(product){
       res.send(product);
  }else{
       res.status(404).send({message: 'Producto não encontrado'});
  }
});


productRoutes.get('/admin',
isAuth, 
expressAsyncHandler(async (req, res)=>{
     const {query} = req;
     const page = query.pag || 1;
     const pageSize = query.pageSize || PAGE_SIZE;

     const products = await Product.find().populate('category').skip(pageSize * (page -1)).limit(10);
     
     const countProducts = await Product.countDocuments();
     res.send({products, countProducts, page, pages: Math.ceil(countProducts/10)})
}));

productRoutes.get('/categories',async (req, res)=>{
  
     const categories = await Product.find().distinct('category');
     if(categories){
          res.send(categories);
     }else{
          res.status(404).send({message: 'Categorias não encontradas'});
     }
   });



// Porduct by Id
productRoutes.get('/:id',async (req, res)=>{
 
   const product = await Product.findById(req.params.id).populate('seller');
   if(product){
        res.send(product);
   }else{
        res.status(404).send({message: 'Producto não encontrado'});
   }
});


// Porduct by Id
productRoutes.post('/:id/reviews',isAuth, expressAsyncHandler( async (req, res)=>{
 
     const product = await Product.findById(req.params.id);
     if(product){
          if(product.reviews.find((x)=>x.name === req.user.name)){
               return res.status(400).send({message: 'Ja possui um comentário adicionado'})
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