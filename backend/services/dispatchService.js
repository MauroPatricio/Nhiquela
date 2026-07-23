// backend/services/DispatchService.js
import mongoose from 'mongoose';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import createNotification from '../utils/createNotification.js';

class DispatchService {
  /**
   * Procura motoristas disponíveis perto de uma localização e tenta atribuir a viagem em cascata
   * @param {Object} order - O documento do pedido (RequestService)
   * @param {Object} io - A instância do socket.io
   */
  async startDispatch(order, io) {
    try {
      console.log(`[DispatchService] Iniciando despacho para o pedido ${order.code}`);
      
      const originDetails = order.originDetails;
      if (!originDetails || !originDetails.lat || !originDetails.lng) {
        console.error(`[DispatchService] Falha: O pedido ${order.code} não tem coordenadas válidas.`);
        return this._markUnavailable(order, io, 'Coordenadas inválidas para buscar motoristas.');
      }

      const MAX_DISTANCE_METERS = 10000; // 10km radius

      // Montar a query base de pesquisa de motoristas
      const query = {
        isDeliveryMan: true,
        status: { $nin: ['Inativo', 'Pendente'] }, // Garantir que não está bloqueado ou pendente de aprovação
        availability: 'active', // Motorista marcou-se como online na app
        'deliveryman.hasActiveService': { $ne: true }, // Não está em viagem
        'locationGeo.coordinates.0': { $ne: 0 }, // Tem GPS válido
        'locationGeo.coordinates.1': { $ne: 0 },
        locationGeo: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(originDetails.lng), parseFloat(originDetails.lat)]
            },
            $maxDistance: MAX_DISTANCE_METERS
          }
        }
      };

      // Se a viagem exige um tipo de veículo específico (Carro, Mota, Reboque)
      if (order.transportTypeId) {
        query['deliveryman.transportType'] = order.transportTypeId;
      }

      // Busca geospacial dos motoristas disponíveis
      const availableDrivers = await User.find(query).select('_id name deviceToken locationGeo').limit(5);


      if (availableDrivers.length === 0) {
        console.log(`[DispatchService] Nenhum motorista disponível num raio de 10km para o pedido ${order.code}`);
        return this._markUnavailable(order, io, 'Nenhum motorista disponível perto de si.');
      }

      console.log(`[DispatchService] Encontrados ${availableDrivers.length} motoristas potenciais para o pedido ${order.code}`);

      // Começa o loop de ping em cascata
      this._pingDriversSequentially(order, availableDrivers, io);

    } catch (error) {
      console.error('[DispatchService] Erro crítico no dispatch:', error);
    }
  }

  async _pingDriversSequentially(order, drivers, io) {
    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i];
      
      // Verificar se o pedido ainda está "Pendente" antes de contactar o próximo
      const currentOrderState = await RequestService.findById(order._id).populate('user', 'name profileImage photo phoneNumber');
      if (!currentOrderState || currentOrderState.status !== 'Pendente') {
        console.log(`[DispatchService] Pedido ${order.code} já foi aceite ou cancelado. Terminando dispatch.`);
        return;
      }

      console.log(`[Dispatch Flow] 🎯 Motorista Alvo: ${driver.name}`);
      console.log(`[Dispatch Flow] 🔑 Token extraído do UserModel: ${driver.deviceToken ? driver.deviceToken.substring(0, 15) + '...' : 'NENHUM TOKEN/UNDEFINED'}`);
      
      const driverSocketId = io.sockets.adapter.rooms.get(`driver_${driver._id}`);
      if (driverSocketId && driverSocketId.size > 0) {
        console.log(`[Dispatch Flow] 📡 WebSocket Status: ONLINE ✅`);
      } else {
        console.log(`[Dispatch Flow] 📡 WebSocket Status: OFFLINE ❌ (A app do motorista está fechada, vai tentar via Push)`);
      }

      console.log(`====================================================`);

      // 1. Atualizar o pedido para apontar para este targetTemporario
      currentOrderState.targetDriverId = driver._id;
      await currentOrderState.save();

      // 2. Emitir o evento via WebSocket e Push Notification
      const orderPayload = { ...currentOrderState.toObject(), type: 'requestService' };
      io.to(`driver_${driver._id}`).emit('new_order', orderPayload);

      // Send Push Notification
      const pickupLocation = currentOrderState.initialLocationName || 'Localização perto de si';
      console.log(`[DispatchService] 📲 Enviando push para motorista ${driver.name} (token: ${driver.deviceToken ? '✓' : 'sem token'})`);
      await createNotification({
        message: `📍 Nova viagem! Recolha em: ${pickupLocation}. Clique para aceitar.`,
        receiver_id: driver._id,
        pushToken: driver.deviceToken || null // deviceToken é o campo correto no UserModel
      });

      // 3. Esperar 30 segundos usando uma Promise
      await new Promise(resolve => setTimeout(resolve, 30000));

      // 4. Verificar após 30s se o motorista aceitou
      const checkOrder = await RequestService.findById(order._id);
      if (checkOrder && checkOrder.status === 'Pendente') {
        // Motorista não aceitou a tempo. Vamos avisá-lo para remover do ecrã
        console.log(`[DispatchService] ❌ Motorista ${driver.name} ignorou/demorou. Passando ao próximo...`);
        // Opcional: Emitimos evento de order_expired para este motorista fechar o pop-up
        io.to(`driver_${driver._id}`).emit('order_expired', checkOrder);
      } else {
        // Alguém aceitou (ou cliente cancelou)
        console.log(`[DispatchService] ✅ Motorista aceitou ou pedido fechado. Dispatch concluído.`);
        return;
      }
    }

    // Se saiu do loop, nenhum dos 5 motoristas aceitou
    console.log(`[DispatchService] 🚨 Fim da linha. Nenhum dos ${drivers.length} motoristas aceitou o pedido ${order.code}.`);
    await this._markUnavailable(order, io, 'Nenhum motorista aceitou a sua viagem a tempo.');
  }

  async _markUnavailable(order, io, reason) {
    try {
      const finalOrder = await RequestService.findById(order._id);
      if (finalOrder && finalOrder.status === 'Pendente') {
        finalOrder.status = 'Motorista indisponível';
        finalOrder.targetDriverId = null;
        finalOrder.canceledReason = reason;
        await finalOrder.save();

        // Notificar cliente
        io.to(`order_${finalOrder._id}`).emit('order_updated', finalOrder);
        // Emissão redundante para ter a certeza que o frontend capta a resposta
        io.emit('order_unavailable', finalOrder);
      }
    } catch (e) {
      console.error('[DispatchService] Erro ao marcar como indisponível', e);
    }
  }
}

export default new DispatchService();
