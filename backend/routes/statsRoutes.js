import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Province from '../models/ProvinceModel.js';
import User from '../models/UserModel.js';
import Order from '../models/OrderModel.js';
import RequestDeliver from '../models/RequestDeliverModel.js';
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
    const deliveries = await RequestDeliver.find({ isPaid: true, deleted: false });

    let receitaHoje = 0;
    let receitaSemana = 0;
    let receitaMes = 0;
    let lucroEstimado = 0;
    let numServicosConcluidos = 0;
    
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
        numServicosConcluidos++;
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
      if (d.deliveryPrice && d.deliveryman && d.deliveryman.pricetopay) {
        profit = d.deliveryPrice - d.deliveryman.pricetopay;
        if (profit < 0) profit = 0;
      } else {
        profit = (d.deliveryPrice || 0) * 0.1; // fallback 10%
      }
      processRecord(d, 'paidAt', 'deliveryPrice', profit, true);
    });

    const motoristasAtivos = await User.countDocuments({ isDeliveryMan: true, status: { $in: ['Disponível', 'Em Entrega'] } });
    const clientesAtivos = await User.countDocuments({ isDeliveryMan: false, isSeller: false });

    // Formatting ranking
    const ranking = Object.values(motoristasRanking).sort((a, b) => b.receita - a.receita).slice(0, 10);
    
    // Format services
    const servicos = Object.keys(receitaPorServico).map(name => ({
      name,
      value: receitaPorServico[name]
    }));

    const receitaTotal = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0) + deliveries.reduce((sum, d) => sum + (d.deliveryPrice || 0), 0);
    const ticketMedioReal = numServicosConcluidos > 0 ? receitaTotal / numServicosConcluidos : 0;

    res.send({
      receitaHoje,
      receitaSemana,
      receitaMes,
      lucroEstimado,
      numServicosConcluidos,
      ticketMedio: ticketMedioReal,
      comissaoArrecadada: lucroEstimado, // Usando o mesmo valor de lucro estimado para simplificar
      motoristasAtivos,
      clientesAtivos,
      rankingMotoristas: ranking,
      receitaPorServico: servicos
    });
  })
);

export default statsRouter;
