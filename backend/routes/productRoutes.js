import express from 'express';
import Product from '../models/ProductModel.js';
import expressAsyncHandler from 'express-async-handler';
import { isAuth, isSellerOrAdmin } from '../utils.js';
import User from '../models/UserModel.js';
import http from 'http';
import { Server } from 'socket.io';
import { v2 as cloudinary } from 'cloudinary';

const productRoutes = express.Router();

const app = express();
const httpServer = http.Server(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function for pagination and filtering
const getFilteredProducts = async (query, additionalFilters = {}) => {
  const pageSize = parseInt(query.pageSize) || 10;
  const page = parseInt(query.page) || 1;
  const category = query.category || '';
  const price = query.price || '';
  const rating = query.rating || '';
  const order = query.order || '';
  const province = query.province || '';
  const searchQuery = query.query || '';

  const queryFilter = searchQuery && searchQuery !== 'all' ? {
    nome: { $regex: searchQuery, $options: 'i' }
  } : {};

  const categoryFilter = category && category !== 'all' ? { category } : {};
  const provinceFilter = province && province !== 'all' ? { province } : {};
  const ratingFilter = rating && rating !== 'all' ? { rating: { $gte: Number(rating) } } : {};
  const priceFilter = price && price !== 'all' ? {
    price: { $gte: Number(price.split('-')[0]), $lte: Number(price.split('-')[1]) }
  } : {};

  const sortOrder = order === 'featured' ? { featured: -1 } :
    order === 'lowest' ? { price: 1 } :
      order === 'highest' ? { price: -1 } :
        order === 'toprated' ? { rating: -1 } :
          order === 'newest' ? { createdAt: -1 } : { _id: -1 };

  const filters = {
    ...queryFilter,
    ...categoryFilter,
    ...priceFilter,
    ...ratingFilter,
    ...provinceFilter,
    ...additionalFilters,
    isActive: true,
  };

  const products = await Product.find(filters)
    .populate('seller category seller.province province conditionStatus qualityType size color')
    .sort(sortOrder)
    .skip(pageSize * (page - 1))
    .limit(pageSize);

  const countProducts = await Product.countDocuments(filters);

  return { products, countProducts, page, pages: Math.ceil(countProducts / pageSize) };
};

// Get products by category
productRoutes.get('/bycategory', async (req, res) => {
  try {
    const categoriesWithProducts = await Product.aggregate([
      // Join com categorias
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: '$categoryDetails' },

      // Join com sellers
      {
        $lookup: {
          from: 'users',
          localField: 'seller',
          foreignField: '_id',
          as: 'sellerDetails',
        },
      },
      { $unwind: '$sellerDetails' },

      // Join com províncias
      {
        $lookup: {
          from: 'provinces',
          localField: 'province',
          foreignField: '_id',
          as: 'provinceDetails',
        },
      },
      { $unwind: '$provinceDetails' },

      // Join com Estabelecimentos
      {
        $lookup: {
          from: 'tipoestabelecimentos',
          localField: 'tipoestabelecimento',
          foreignField: '_id',
          as: 'tipoestabelecimentoDetails',
        },
      },
      { $unwind: { path: '$tipoestabelecimentoDetails', preserveNullAndEmptyArrays: true } },

      // Agrupar por categoria
      {
        $group: {
          _id: '$categoryDetails._id',
          category: { $first: '$categoryDetails' },
          products: {
            $push: {
              _id: '$_id',
              name: '$name',
              slug: '$slug',
              description: '$description',
              image: '$image',
              images: '$images',
              brand: '$brand',
              price: '$price',
              priceFromSeller: '$priceFromSeller',
              comissionPercentage: '$comissionPercentage',
              priceComission: '$priceComission',
              countInStock: '$countInStock',
              onSale: '$onSale',
              onSalePercentage: '$onSalePercentage',
              isActive: '$isActive',
              isGuaranteed: '$isGuaranteed',
              guaranteedPeriod: '$guaranteedPeriod',
              isOrdered: '$isOrdered',
              orderPeriod: '$orderPeriod',
              color: '$color',
              size: '$size',
              reviews: '$reviews',
              createdAt: '$createdAt',
              updatedAt: '$updatedAt',
              seller: '$sellerDetails',
              province: '$provinceDetails',
              tipoestabelecimento: '$tipoestabelecimentoDetails',
            },
          },
        },
      },

      // Ordenar por nome da categoria
      { $sort: { 'category.name': 1 } },
    ]);

    res.status(200).json({ categoriesWithProducts });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar categorias com produtos.' });
  }
});




// Get products by category ID with pagination
productRoutes.get('/bycategory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;

    const products = await Product.find({ category: id })
      .populate('seller color size category province qualityType conditionStatus')
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const totalProducts = await Product.countDocuments({ category: id });

    if (products.length > 0) {
      res.status(200).json({
        totalPages: Math.ceil(totalProducts / pageSize),
        currentPage: page,
        totalProducts,
        products,
      });
    } else {
      res.status(404).send({ message: 'Nenhum produto encontrado para esta categoria' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar produtos pela categoria', error });
  }
});

// Get all products with pagination and filtering
productRoutes.get('/', async (req, res) => {
  try {
    const seller = req.query.seller || '';
    const sellerFilter = seller ? { seller } : {};
    const { products, pages } = await getFilteredProducts(req.query, sellerFilter);
    res.send({ products, pages });
  } catch (error) {
    res.status(500).send({ message: 'Ops... Não consegui me conectar com o servidor' });
  }
});

// Update a product
productRoutes.put('/:id', isAuth, isSellerOrAdmin, expressAsyncHandler(async (req, res) => {
  try {
    const comission_price = parseFloat(process.env.COMISSION_PRICE);
    const priceFromSeller = parseFloat(req.body.priceFromSeller);
    const priceComission = parseFloat(priceFromSeller * comission_price);
    const priceWithComission = parseFloat(priceComission + priceFromSeller);

    const product = await Product.findById(req.params.id);
    if (product) {
      Object.assign(product, {
        ...req.body,
        priceFromSeller,
        priceComission,
        price: priceWithComission,
        comissionPercentage: comission_price,
      });
      await product.save();
      
      io.emit('newProduct', product);
      
      res.send({ message: 'Produto actualizado com Sucesso' });
    } else {
      res.status(404).send({ message: 'Produto não encontrado' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Erro ao actualizar o produto', error });
  }
}));

// Delete a product
productRoutes.delete('/:id', isAuth, isSellerOrAdmin, expressAsyncHandler(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await cloudinary.uploader.destroy(product.image);
      await product.deleteOne();
      res.send({ message: 'Produto Removido com Sucesso' });
    } else {
      res.status(404).send({ message: 'Produto não encontrado' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Erro ao remover o produto', error });
  }
}));

// Create a new product
productRoutes.post('/', isAuth, isSellerOrAdmin, expressAsyncHandler(async (req, res) => {
  try {
    if (!req.body.image) {
      res.status(400).send({ message: 'A imagem do produto é obrigatória' });
      return;
    }

    const comission_price = parseFloat(process.env.COMISSION_PRICE);
    const priceFromSeller = parseFloat(req.body.price);
    const priceComission = parseFloat(priceFromSeller * comission_price);
    const priceWithComission = parseFloat(priceComission + priceFromSeller);

    const user = await User.findById(req.user._id);
    const newProduct = new Product({
      ...req.body,
      seller: req.user._id,
      priceFromSeller,
      priceComission,
      price: priceWithComission,
      comissionPercentage: comission_price,
      isActive: user.isApproved,
    });

    if (req.body.onSale) {
      newProduct.discount = newProduct.price - (newProduct.price * (newProduct.onSalePercentage / 100));
    }

    const product = await newProduct.save();
    res.send({ message: 'Produto criado', product });
  } catch (error) {
    res.status(500).send({ message: 'Erro no servidor', error: error.message });
  }
}));

// Search products
productRoutes.get('/search', expressAsyncHandler(async (req, res) => {
  try {
    const { products, countProducts, page, pages } = await getFilteredProducts(req.query);
    res.send({ products, countProducts, page, pages });
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar produtos', error });
  }
}));

// Get products on sale
productRoutes.get('/onsale', expressAsyncHandler(async (req, res) => {
  try {
    const { products, countProducts, page, pages } = await getFilteredProducts(req.query, { onSale: true });
    res.send({ products, countProducts, page, pages });
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar produtos em promoção', error });
  }
}));

// Get product by slug
productRoutes.get('/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate('seller category conditionStatus qualityType size color')
      .sort({ 'reviews.createdAt': -1 });
    if (product) {
      res.send(product);
    } else {
      res.status(404).send({ message: 'Produto não encontrado' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar o produto', error });
  }
});

// Get products by seller ID
productRoutes.get('/productsBySeller/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      const products = await Product.find({ seller: req.params.id });
      res.send(products);
    } else {
      res.status(404).send({ message: 'Fornecedor não encontrado' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Erro no servidor', error: error.message });
  }
});

// Get all products for admin
productRoutes.get('/admin', isAuth, expressAsyncHandler(async (req, res) => {
  try {
    const { products, countProducts, page, pages } = await getFilteredProducts(req.query);
    res.send({ products, countProducts, page, pages });
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar produtos', error });
  }
}));

// Get categories with product count
productRoutes.get('/categoriesWithCount', async (req, res) => {
  try {
    const categoriesWithCount = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'categoryDetails' } },
      { $unwind: '$categoryDetails' },
      { $project: { _id: '$categoryDetails._id', name: '$categoryDetails.name', nome: '$categoryDetails.nome', icon: '$categoryDetails.icon', description: '$categoryDetails.description', img: '$categoryDetails.img', count: 1 } }
    ]);
    res.send({ categories: categoriesWithCount });
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar categorias com contagem', error });
  }
});

// Get distinct categories
productRoutes.get('/categories', async (req, res) => {
  try {
    const categories = await Product.find({ isActive: true }).distinct('category');
    res.send(categories);
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar categorias', error });
  }
});

// Get product by ID
productRoutes.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller color size category province qualityType conditionStatus');
    if (product) {
      res.send(product);
    } else {
      res.status(404).send({ message: 'Produto não encontrado' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar o produto', error });
  }
});

// Add review to product
productRoutes.post('/:id/reviews', isAuth, expressAsyncHandler(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      if (product.reviews.find((x) => x.name === req.user.name)) {
        return res.status(400).send({ message: 'Já possui um comentário adicionado' });
      }

      const review = {
        name: req.user.name,
        rating: Number(req.body.rating),
        comment: req.body.comment,
      };
      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating = product.reviews.reduce((acc, curr) => acc + curr.rating, 0) / product.reviews.length;

      const updatedProduct = await product.save();
      res.status(201).send({
        message: 'Comentário adicionado com sucesso',
        review: updatedProduct.reviews[updatedProduct.reviews.length - 1],
        numReviews: product.numReviews,
        rating: product.rating,
        product: updatedProduct,
      });
    } else {
      res.status(404).send({ message: 'Produto não encontrado' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Erro ao adicionar comentário', error });
  }
}));

export default productRoutes;