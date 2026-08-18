import express from 'express';
import Product from '../models/ProductModel.js';
import expressAsyncHandler from 'express-async-handler';
import { isAuth, isSellerOrAdmin, isAdmin } from '../utils.js';
import User from '../models/UserModel.js';
import http from 'http';
import { Server } from 'socket.io';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Wallet from '../models/WalletModel.js';

// Inicializa��o
const productRoutes = express.Router();
const app = express();
const httpServer = http.Server(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Configura��o Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ----------------------------- Helpers -----------------------------

// Cache em memória para os IDs de fornecedores activos (TTL: 60 segundos)
// Evita 3 queries sequenciais ao MongoDB em cada pedido de pesquisa.
let _activeProviderCache = null;
let _activeProviderCacheAt = 0;
const ACTIVE_PROVIDER_CACHE_TTL = 60 * 1000; // 60 segundos

// Invalida o cache manualmente (chamar após alterações de estado de fornecedor)
export const invalidateActiveProviderCache = () => {
  _activeProviderCache = null;
  _activeProviderCacheAt = 0;
};

export const getActiveProviderIds = async () => {
  // Devolver do cache se válido
  if (_activeProviderCache && (Date.now() - _activeProviderCacheAt) < ACTIVE_PROVIDER_CACHE_TTL) {
    return _activeProviderCache;
  }

  const sellers = await User.find({ 
    isSeller: true, 
    isApproved: true,
    isBanned: { $ne: true },
    isDeleted: { $ne: true }
  }, '_id seller.hasUsedFreeSale');
  const sellerIds = sellers.map(s => s._id);
  
  // Verificar carteiras dos vendedores
  const wallets = await Wallet.find({ ownerId: { $in: sellerIds }, ownerType: 'seller' });
  const walletMap = new Map();
  wallets.forEach(w => walletMap.set(w.ownerId.toString(), w));
  
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // Filtrar apenas vendedores com conta aprovada e saldo maior que zero
  const activeSellerIds = sellers.filter(s => {
    if (!s.seller?.hasUsedFreeSale) return true; // Primeira venda gratuita, sempre activo
    const wallet = walletMap.get(s._id.toString());
    // Excluir se o saldo for menor ou igual a 0
    if (!wallet || wallet.balance <= 0) {
      return false;
    }
    return true;
  }).map(s => s._id);

  // Retornar APENAS os Provider IDs correspondentes (nunca User IDs directos).
  // Produtos cujo campo seller aponte para um User ID sem Provider registado
  // são considerados inválidos e não devem ser contados nem apresentados.
  const activeProviders = await mongoose.model('Provider').find({ 
    userId: { $in: activeSellerIds },
    status: { $nin: ['inactive', 'suspended', 'deleted'] }
  }, '_id userId');
  
  _activeProviderCache = activeProviders.map(p => p._id);
  _activeProviderCacheAt = Date.now();
  return _activeProviderCache;
};


const getFilteredProducts = async (query, additionalFilters = {}, showAllIsActive = false) => {
  const pageSize = parseInt(query.pageSize) || 10;
  const page = parseInt(query.page) || 1;
  const category = query.category || '';
  const price = query.price || '';
  const rating = query.rating || '';
  const order = query.order || '';
  const province = query.province || '';
  const searchQuery = query.query || '';

  // Usar $text para pesquisa rápida (índice de texto), regex apenas como fallback
  const queryFilter =
    searchQuery && searchQuery !== 'all'
      ? { $text: { $search: searchQuery } }
      : {};

  const categoryFilter = category && category !== 'all' ? { category } : {};
  const provinceFilter = province && province !== 'all' ? { province } : {};
  const ratingFilter = rating && rating !== 'all' ? { rating: { $gte: Number(rating) } } : {};
  const priceFilter =
    price && price !== 'all'
      ? {
          price: {
            $gte: Number(price.split('-')[0]),
            $lte: Number(price.split('-')[1]),
          },
        }
      : {};

  const sortOrder =
    order === 'featured'
      ? { featured: -1 }
      : order === 'lowest'
      ? { price: 1 }
      : order === 'highest'
      ? { price: -1 }
      : order === 'toprated'
      ? { rating: -1 }
      : order === 'newest'
      ? { createdAt: -1 }
      : order === 'oldest'
      ? { createdAt: 1 }
      : { _id: -1 };

    // --- SELLER WALLET & ACTIVE SUPPLIER PRE-FILTER ---
    let activeProviderIds = null;
    if (!showAllIsActive) {
      activeProviderIds = await getActiveProviderIds();
    }
  
    const filters = {
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
      ...provinceFilter,
      ...additionalFilters,
      ...(showAllIsActive ? {} : { isActive: true }),
      ...(activeProviderIds ? { seller: { $in: activeProviderIds } } : {})
    };

  const [products, countProducts] = await Promise.all([
    Product.find(filters)
      .populate({ path: 'seller', populate: { path: 'subcategoryId' } })
      .populate('category province conditionStatus qualityType size color')
      .sort(sortOrder)
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .lean(),
    Product.countDocuments(filters),
  ]);

  // Excluir estritamente produtos sem fornecedor válido (populate retornou null)
  // Isto garante que contagens e listagens são consistentes.
  const validProducts = showAllIsActive
    ? products
    : products.filter(p => {
        if (!p.seller || typeof p.seller !== 'object') return false; // sem Provider válido
        if (p.seller.status === 'inactive' || p.seller.status === 'suspended') return false;
        return true;
      });

  return { products: validProducts, countProducts, page, pages: Math.ceil(countProducts / pageSize) };
};

// ----------------------------- ROTAS -----------------------------

// GET /products/admin/all (Retorna TODOS os produtos para o painel Admin Web)
productRoutes.get('/admin/all', isAuth, isAdmin, expressAsyncHandler(async (req, res) => {
  const products = await Product.find({})
    .populate({ path: 'seller', populate: { path: 'subcategoryId' } })
    .populate('category province conditionStatus qualityType size color')
    .sort({ createdAt: -1 })
    .lean();
  res.send({ products, pages: 1 });
}));

// GET /products (lista com filtros + paginao)
productRoutes.get('/', async (req, res) => {
  try {
    const sellerQuery = req.query.seller || '';
    // Exclude literal "undefined" string sent by mistake from frontend
    const seller = (sellerQuery === 'undefined') ? '' : sellerQuery;
    
    let sellerFilter = {};
    if (seller && mongoose.Types.ObjectId.isValid(seller)) {
      const provider = await mongoose.model('Provider').findOne({ $or: [{ ownerId: seller }, { userId: seller }] });
      sellerFilter = { seller: provider ? provider._id : seller };
    } else if (seller) {
      sellerFilter = { seller };
    }
    const showAllIsActive = !!seller;

    const { products, pages } = await getFilteredProducts(req.query, sellerFilter, showAllIsActive);
    res.send({ products, pages });
  } catch (error) {
    res.status(500).send({ message: 'Erro ao carregar produtos', error });
  }
});

// GET /products/bycategory
productRoutes.get('/bycategory', async (req, res) => {
  try {
    const activeProviderIds = await getActiveProviderIds();

    const categoriesWithProducts = await Product.aggregate([
      { 
        $match: { 
          isActive: true,
          seller: { $in: activeProviderIds }
        } 
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: '$categoryDetails' },
      {
        $lookup: {
          from: 'providers',
          localField: 'seller',
          foreignField: '_id',
          as: 'sellerDetails',
        },
      },
      { $unwind: { path: '$sellerDetails', preserveNullAndEmptyArrays: true } },
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
              price: '$price',
              isActive: '$isActive',
              seller: '$sellerDetails',
            },
          },
        },
      },
      { $sort: { 'category.name': 1 } },
    ]);

    res.status(200).json({ categoriesWithProducts });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar categorias com produtos.' });
  }
});


// Add review to product
productRoutes.post('/:id/reviews', isAuth, expressAsyncHandler(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      if (product.reviews.find((x) => x.name === req.user.name)) {
        return res.status(400).send({ message: 'J� possui um coment�rio adicionado' });
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
        message: 'Coment�rio adicionado com sucesso',
        review: updatedProduct.reviews[updatedProduct.reviews.length - 1],
        numReviews: product.numReviews,
        rating: product.rating,
        product: updatedProduct,
      });
    } else {
      res.status(404).send({ message: 'Produto n�o encontrado' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Erro ao adicionar coment�rio', error });
  }
}));

// GET /products/bycategory/:id
productRoutes.get('/bycategory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'ID de categoria inv�lido' });
    }

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const activeProviderIds = await getActiveProviderIds();

    const filter = { 
      category: id, 
      isActive: true,
      seller: { $in: activeProviderIds }
    };

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .populate({ path: 'seller', populate: { path: 'subcategoryId' } })
        .populate('category province')
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      totalPages: Math.ceil(totalProducts / pageSize),
      currentPage: page,
      totalProducts,
      products,
    });
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar produtos pela categoria', error });
  }
});


// Get products on sale
productRoutes.get('/onsale', expressAsyncHandler(async (req, res) => {
  try {
    const { products, countProducts, page, pages } = await getFilteredProducts(req.query, { onSale: true });
    res.send({ products, countProducts, page, pages });
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar produtos em promo��o', error });
  }
}));

// PUT /products/:id  (atualiza produto)
productRoutes.put('/:id', isAuth, isSellerOrAdmin, expressAsyncHandler(async (req, res) => {
  try {
      const comissionPercentage = parseFloat(process.env.COMISSION_PRICE) || 0.3;
      const priceFromSeller = parseFloat(req.body.price);
      const priceComission = 0;
      const price = priceFromSeller;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send({ message: 'Produto no encontrado' });

      if (req.body.onSale) {
        const discount = price * (req.body.onSalePercentage / 100);
        const sellerEarningsAfterDiscount = price - discount;

      Object.assign(product, {
        ...req.body,
        priceFromSeller,
        priceComission,
        price,
        comissionPercentage,
        discount,
        onSale: true,
        onSalePercentage: req.body.onSalePercentage,
        sellerEarningsAfterDiscount,
      });
    } else {
      Object.assign(product, {
        ...req.body,
        priceFromSeller,
        priceComission,
        price,
        comissionPercentage,
        discount: 0,
        onSale: false,
        onSalePercentage: 0,
        sellerEarningsAfterDiscount: 0,
      });
    }

    await product.save();
    io.emit('newProduct', product); // notifica clientes
    res.send({ message: 'Produto atualizado com Sucesso', product });
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Erro ao salvar o produto.';
    console.log(errorMessage);
    res.status(500).send({ message: 'Erro ao atualizar o produto', errorMessage });
  }
}));

// DELETE /products/:id
productRoutes.delete(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).send({ message: 'Produto no encontrado' });

      await product.deleteOne();
      io.emit('productDeleted', { _id: req.params.id });
      res.send({ message: 'Produto removido com sucesso' });
    } catch (error) {
      res.status(500).send({ message: 'Erro ao remover o produto', error });
    }
  })
);

// POST /products  (cria produto)
productRoutes.post('/', isAuth, isSellerOrAdmin, expressAsyncHandler(async (req, res) => {
  try {
    if (!req.body.image) {
      return res.status(400).send({ message: 'A imagem do produto  obrigatria' });
    }

      const comission_price = parseFloat(process.env.COMISSION_PRICE) || 0.3;
      const priceFromSeller = parseFloat(req.body.price);
      // The commission is deducted later from the seller's wallet, so the selling price is the same as the seller's price
      const priceComission = 0; 
      const priceWithComission = priceFromSeller;

    const user = await User.findById(req.user._id);
    const provider = await mongoose.model('Provider').findOne({ $or: [{ ownerId: req.user._id }, { userId: req.user._id }] });
    
    if (!provider) {
      return res.status(400).send({ message: 'Provider profile not found for this user.' });
    }

    const newProduct = new Product({
      ...req.body,
      seller: provider._id,
      priceFromSeller,
      priceComission,
      price: priceWithComission,
      comissionPercentage: comission_price,
      isActive: user.isApproved,
      slug: crypto.randomBytes(3).toString('hex'),
    });

      if (req.body.onSale) {
        newProduct.discount = priceFromSeller * (req.body.onSalePercentage / 100);
        newProduct.price = priceFromSeller - newProduct.discount;
        newProduct.sellerEarningsAfterDiscount = newProduct.price; // commission deducted from wallet later
      }

    const product = await newProduct.save();
    io.emit('newProduct', product); // notifica clientes
    res.send({ message: 'Produto criado', product });
  } catch (error) {
    res.status(500).send({ message: 'Erro no servidor', error: error.message });
  }
}));

// GET /products/slug/:slug
productRoutes.get('/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate({ path: 'seller', populate: { path: 'subcategoryId' } })
      .populate('category conditionStatus qualityType size color')
      .lean();

    if (!product) return res.status(404).send({ message: 'Produto n�o encontrado' });
    res.send(product);
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar produto', error });
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


// PATCH /products/:id/toggle-status
productRoutes.patch(
  '/:id/toggle-status',
  isAuth,
  isSellerOrAdmin, // garante que s� vendedor/admin pode alterar
  expressAsyncHandler(async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).send({ message: 'Produto n�o encontrado' });

      // Alterna o status
      product.isActive = !product.isActive;

      await product.save();

      // Notifica clientes via socket.io
      io.emit('productStatusChanged', { _id: product._id, isActive: product.isActive });

      res.status(200).send({
        message: `Produto ${product.isActive ? 'ativado' : 'desativado'} com sucesso`,
        product,
      });
    } catch (error) {
      console.error('Erro ao alternar status do produto:', error);
      res.status(500).send({ message: 'Erro ao atualizar status do produto', error });
    }
  })
);




// GET /products/categoriesWithCount - apenas categorias com produtos de fornecedores activos
productRoutes.get('/categoriesWithCount', async (req, res) => {
  try {
    // Reutiliza a mesma lógica de filtragem de fornecedores activos
    const activeProviderIds = await getActiveProviderIds();

    const categories = await Product.aggregate([
      // 1. Apenas produtos activos de fornecedores activos
      { 
        $match: { 
          isActive: true,
          seller: { $in: activeProviderIds }
        } 
      },
      // 2. Agrupar por categoria e contar
      { $group: { _id: '$category', count: { $sum: 1 } } },
      // 3. Remover produtos sem categoria
      { $match: { _id: { $ne: null } } },
      // 4. Obter detalhes da categoria
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      // 5. Ignorar categorias sem detalhes registados
      { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: false } },
      // 6. Projectar campos necessários
      {
        $project: {
          _id: '$categoryDetails._id',
          name: '$categoryDetails.nome',
          image: '$categoryDetails.image',
          count: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.status(200).json({ categories });
  } catch (error) {
    console.error('Erro em categoriesWithCount:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Search products
productRoutes.get('/search', expressAsyncHandler(async (req, res) => {
  try {
    const { products, countProducts, page, pages } = await getFilteredProducts(req.query);
    res.send({ products, countProducts, page, pages });
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar produtos', error });
  }
}));

// GET /products/:id
productRoutes.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({ path: 'seller', populate: { path: 'subcategoryId' } })
      .populate('color size category province qualityType conditionStatus')
      .lean();

    if (!product) return res.status(404).send({ message: 'Produto n�o encontrado' });
    res.send(product);
  } catch (error) {
    res.status(500).send({ message: 'Erro ao buscar o produto', error });
  }
});

export default productRoutes;

