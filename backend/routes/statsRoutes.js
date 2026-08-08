import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Province from '../models/ProvinceModel.js';
import User from '../models/UserModel.js';
import Order from '../models/OrderModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Transaction from '../models/TransactionModel.js';

const statsRouter = express.Router();

statsRouter.get(
  '/landing',
  expressAsyncHandler(async (req, res) => {
    const provincesCount = await Province.countDocuments({ isActive: true });
    const clientsCount = await User.countDocuments({ isSeller: false, isDeliveryMan: false, isAdmin: false });

    res.send({
      provinces: provincesCount || 11,
      cities: 38, // Placeholder para cidades
      clients: clientsCount || 0,
    });
  })
);


statsRouter.get(
  '/financial',
  expressAsyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Fetch orders (products)
    const orders = await Order.find({ isPaid: true, deleted: false });
    // Fetch deliveries
    const deliveries = await RequestService.find({ isPaid: true, deleted: false });

    let receitaHoje = 0;
    let receitaSemana = 0;
    let receitaMes = 0;
    let lucroEstimado = 0;
    let numServicosConcluídos = 0;
    
    const motoristasRanking = {};
    const receitaPorServico = {};

    const processRecord = (record, dateField, priceField, taxField, isDelivery) => {
      const recordDate = new Date(record[dateField] || record.createdAt);
      const price = Number(record[priceField]) || 0;
      const tax = Number(taxField) || 0;
      
      // Receita
      if (recordDate >= today) receitaHoje += price;
      if (recordDate >= startOfWeek) receitaSemana += price;
      if (recordDate >= startOfMonth) receitaMes += price;

      lucroEstimado += tax;

      if (record.status === 'Entregue' || record.isDelivered || record.status === 'delivered') {
        numServicosConcluídos++;
      }

      // Ranking
      if (record.deliveryman && record.deliveryman.id) {
        const dId = record.deliveryman.id.toString();
        if (!motoristasRanking[dId]) {
          motoristasRanking[dId] = {
            id: dId,
            name: record.deliveryman.name || 'Desconhecido',
            receita: 0,
            viagens: 0
          };
        }
        motoristasRanking[dId].receita += price;
        motoristasRanking[dId].viagens += 1;
      }

      // Receita por Servico
      const servicoType = isDelivery ? (record.transportType || 'Entrega/Transporte') : 'Ecommerce/Produtos';
      if (!receitaPorServico[servicoType]) receitaPorServico[servicoType] = 0;
      receitaPorServico[servicoType] += price;
    };

    orders.forEach(o => processRecord(o, 'paidAt', 'totalPrice', o.siteTax || 0, false));
    deliveries.forEach(d => {
      let profit = 0;
      // 1. Usar a comissao real oficial gravada no aceite do servico (Nova Regra)
      if (d.platformCommission !== undefined && d.platformCommission !== null) {
        profit = d.platformCommission;
      } 
      // 2. Legacy fallback
      else if (d.deliveryPrice && d.deliveryman && d.deliveryman.pricetopay) {
        profit = d.deliveryPrice - d.deliveryman.pricetopay;
        if (profit < 0) profit = 0;
      } 
      // 3. Fallback genérico (15% por omissao)
      else {
        profit = (d.deliveryPrice || 0) * 0.15; 
      }
      
      processRecord(d, 'paidAt', 'deliveryPrice', profit, true);
    });

    const motoristasAtivos = await User.countDocuments({ isDeliveryMan: true, status: { $in: ['Dispon�vel', 'Em Entrega'] } });
    const clientesAtivos = await User.countDocuments({ isDeliveryMan: false, isSeller: false });

    // Formatting ranking
    const ranking = Object.values(motoristasRanking).sort((a, b) => b.receita - a.receita).slice(0, 10);
    
    // Format services
    const servicos = Object.keys(receitaPorServico).map(name => ({
      name,
      value: receitaPorServico[name]
    }));

    const receitaTotal = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0) + deliveries.reduce((sum, d) => sum + (d.deliveryPrice || 0), 0);
    const ticketMedioReal = numServicosConcluídos > 0 ? receitaTotal / numServicosConcluídos : 0;

    res.send({
      receitaHoje,
      receitaSemana,
      receitaMes,
      lucroEstimado,
      numServicosConcluídos,
      ticketMedio: ticketMedioReal,
      comissaoArrecadada: lucroEstimado, // Usando o mesmo valor de lucro estimado para simplificar
      motoristasAtivos,
      clientesAtivos,
      rankingMotoristas: ranking,
      receitaPorServico: servicos
    });
  })
);
statsRouter.get(
  '/admin-badges',
  expressAsyncHandler(async (req, res) => {
    // 1. Pending Recharges (Transactions with type credit/deposit and status pendente)
    // Considering all 'pendente' transactions might be enough, or specifically 'credit'
    const pendingRecharges = await Transaction.countDocuments({ status: 'pendente', type: 'credit' });
    
    // 2. Pending Drivers
    const pendingDrivers = await User.countDocuments({ isDeliveryMan: true, status: 'Pendente' });
    
    // 3. Pending Orders (status: Pendente or Nova)
    const pendingOrders = await Order.countDocuments({ status: 'Pendente', deleted: false });

    res.send({
      pendingRecharges,
      pendingDrivers,
      pendingOrders
    });
  })
);

export default statsRouter;
