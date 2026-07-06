import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Category from '../models/CategoryModel.js';
import Product from '../models/ProductModel.js';
import Service from '../models/ServiceModel.js';
import User from '../models/UserModel.js';

const homeRouter = express.Router();

homeRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    // 1?? Categories with product counts
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products',
        },
      },
      { $addFields: { productCount: { $size: '$products' } } },
      {
        $project: {
          _id: 1,
          name: 1,
          icon: 1,
          img: 1,
          productCount: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    // 2?? Featured products (fallback to highest rated if no explicit flag)
    const featuredProducts = await Product.find({ isActive: true })
      .sort({ featured: -1, rating: -1 })
      .limit(8)
      .lean();

    // 3?? Service count (only active services)
    const servicesCount = await Service.countDocuments({ status: 'Ativo' });

    // 4?? Driver count
    const driversCount = await User.countDocuments({ isDeliveryMan: true });

    // 5?? Static promotional content (hard-coded for now)
    const promos = {
      tagline: 'Tudo o que precisa, entregue à distância de um clique.',
      searchPlaceholder: 'Pesquisar produtos, serviços ou motoristas...',
      highlights: [
        { title: 'Entrega < 30 min', icon: '??' },
        { title: 'Pagamento seguro', icon: '??' },
        { title: 'Suporte 24/7', icon: '??' },
      ],
      howItWorks: [
        { step: 1, title: 'Escolha', description: 'Selecione um produto ou serviço entre milhares de opções.' },
        { step: 2, title: 'Confirme', description: 'Pagamento seguro e confirmação instantânea.' },
        { step: 3, title: 'Acompanhe', description: 'Siga em tempo real no mapa interativo.' },
        { step: 4, title: 'Receba', description: 'Entregue no local que indicar, sem complicação.' },
      ],
      forSuppliers: {
        title: 'Para Fornecedores',
        points: [
          'Venda mais sem abrir novas lojas.',
          'Maior visibilidade digital',
          'Mais clientes todos os dias',
          'Gestão simplificada',
          'Relatórios avançados de vendas',
        ],
      },
      forDrivers: {
        title: 'Para Motoristas',
        points: [
          'Ganhe dinheiro com a sua viatura.',
          'Horários 100% flexíveis',
          'Pagamentos rápidos e seguros',
          'Mais oportunidades por semana',
          'Suporte dedicado ao motorista',
        ],
      },
    };

    res.send({
      promos,
      categories,
      featuredProducts,
      stats: {
        services: servicesCount,
        drivers: driversCount,
      },
    });
  })
);

export default homeRouter;
