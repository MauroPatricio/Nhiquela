import RequestService from '../models/RequestServiceModel.js';
import User from '../models/UserModel.js';

export const runIntelligentDispatch = async (io) => {
  try {
    // 1. Procurar pedidos pendentes em fase de busca
    const activeRequests = await RequestService.find({
      status: 'Pendente',
      isSearching: true,
      deleted: false,
      isCanceled: false
    });

    if (activeRequests.length === 0) return;

    for (const request of activeRequests) {
      const now = new Date();
      // Se não houver data de último dispatch, inicializamos
      const lastDispatch = request.lastDispatchTime || request.createdAt;
      const diffInSeconds = (now - lastDispatch) / 1000;

      // Definir um tempo limite para aceitação (ex: 30 segundos)
      const TIMEOUT_SECONDS = 30;

      // Se é o primeiro ciclo de dispatch ou passou o tempo limite para os motoristas atuais
      if (!request.lastDispatchTime || diffInSeconds >= TIMEOUT_SECONDS) {
        
        // Se não for o primeiro ciclo, significa que nenhum dos contactados aceitou, aumenta o raio
        if (request.lastDispatchTime) {
          request.searchRadius += 2000; // Aumenta 2km a cada iteração
        }

        // Se passar do raio limite (ex: 15km), cancela o pedido
        if (request.searchRadius > 15000) {
          request.status = 'Cancelado';
          request.isSearching = false;
          request.canceledReason = 'Nenhum motorista encontrado no raio de 15km';
          await request.save();
          // Notificar o cliente que não há motoristas
          io.to(request.user.toString()).emit('no_driver_found', { orderId: request._id });
          continue;
        }

        // Validar coordenadas para evitar erro do MongoDB (coordinates: [null, null])
        const requestLng = request.longitude || request.originDetails?.lng || request.originDetails?.longitude;
        const requestLat = request.latitude || request.originDetails?.lat || request.originDetails?.latitude;

        if (!requestLng || !requestLat) {
          console.warn(`[Intelligent Dispatch] Pedido ${request._id} não tem coordenadas válidas. Cancelando busca.`);
          request.isSearching = false;
          request.status = 'Cancelado';
          request.canceledReason = 'Coordenadas de origem inválidas no pedido';
          await request.save();
          continue;
        }

        // 2. Procurar motoristas próximos
        const nearestDrivers = await User.find({
          isDeliveryMan: true,
          isApproved: true,
          status: { $ne: 'Inativo' },
          availability: 'active',
          _id: { $nin: request.contactedDrivers }, // Excluir motoristas já contactados
          locationGeo: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [requestLng, requestLat]
              },
              $maxDistance: request.searchRadius // Distância em metros
            }
          }
        }).limit(5); // Pega apenas os 5 mais próximos

        if (nearestDrivers.length > 0) {
          const newDriverIds = nearestDrivers.map(d => d._id);
          
          // Adiciona aos contactados
          request.contactedDrivers.push(...newDriverIds);
          request.lastDispatchTime = now;
          await request.save();

          // 3. Emitir evento apenas para estes 5 motoristas
          nearestDrivers.forEach(driver => {
            io.to(`driver_${driver._id.toString()}`).emit('new_order', request);
          });
          
          console.log(`[Intelligent Dispatch] Pedido ${request._id} enviado para ${nearestDrivers.length} motoristas no raio de ${request.searchRadius}m`);
        } else {
          // Nenhum motorista novo encontrado neste raio, forçamos um update no lastDispatchTime 
          // para que na próxima vez aumente o raio sem esperar os 30s completos se quisermos,
          // mas vamos apenas aguardar os 30s ou acelerar o aumento.
          request.lastDispatchTime = now; 
          await request.save();
          console.log(`[Intelligent Dispatch] Nenhum motorista encontrado para o pedido ${request._id} no raio de ${request.searchRadius}m`);
        }
      }
    }
  } catch (error) {
    console.error('[Intelligent Dispatch Error]', error);
  }
};
