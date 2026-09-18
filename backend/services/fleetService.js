import FleetVehicle from '../models/FleetVehicleModel.js';
import FleetMaintenancePlan from '../models/FleetMaintenancePlanModel.js';
import FleetOdometerLog from '../models/FleetOdometerLogModel.js';
import FleetFuelLog from '../models/FleetFuelLogModel.js';
import FleetAlert from '../models/FleetAlertModel.js';
import User from '../models/UserModel.js';
import createNotification from '../utils/createNotification.js';

/**
 * Recalcula o estado de todos os planos de manutenção para um veículo
 */
export async function checkVehicleMaintenancePlans(vehicleId) {
  const vehicle = await FleetVehicle.findById(vehicleId);
  if (!vehicle) return;

  const plans = await FleetMaintenancePlan.find({ vehicle: vehicleId });
  const now = new Date();

  for (const plan of plans) {
    const nextKm = (plan.lastMaintenanceKm || 0) + (plan.intervalKm || 10000);
    let nextDate = plan.nextMaintenanceDate;
    if (!nextDate && plan.lastMaintenanceDate) {
      nextDate = new Date(new Date(plan.lastMaintenanceDate).getTime() + (plan.intervalDays || 180) * 86400000);
    }

    plan.nextMaintenanceKm = nextKm;
    if (nextDate) plan.nextMaintenanceDate = nextDate;

    const currentKm = vehicle.currentOdometer || 0;
    const advanceKm = plan.advanceNoticeKm || 500;
    const advanceDaysMs = (plan.advanceNoticeDays || 7) * 86400000;

    let newStatus = 'EM_DIA';
    let alertType = null;
    let alertTitle = '';
    let alertMessage = '';
    let severity = 'MEDIUM';

    const isOverdueKm = currentKm >= nextKm;
    const isOverdueDays = nextDate && now >= nextDate;

    if (isOverdueKm || isOverdueDays) {
      newStatus = 'VENCIDA';
      alertType = 'MAINTENANCE_OVERDUE';
      alertTitle = `Manutenção Vencida - ${vehicle.plateNumber}`;
      alertMessage = `A manutenção "${plan.serviceType.toUpperCase()}" do veículo ${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber}) está VENCIDA! (Km actual: ${currentKm}, Limite: ${nextKm})`;
      severity = 'HIGH';
    } else if ((nextKm - currentKm <= advanceKm) || (nextDate && (nextDate.getTime() - now.getTime() <= advanceDaysMs))) {
      newStatus = 'PROXIMA';
      alertType = nextKm - currentKm <= advanceKm ? 'MAINTENANCE_DUE_SOON_KM' : 'MAINTENANCE_DUE_SOON_DATE';
      alertTitle = `Manutenção Próxima - ${vehicle.plateNumber}`;
      alertMessage = `A manutenção "${plan.serviceType.toUpperCase()}" do veículo ${vehicle.plateNumber} está próxima da data/quilometragem prevista.`;
      severity = 'MEDIUM';
    }

    if (plan.status !== newStatus) {
      plan.status = newStatus;
      await plan.save();
    }

    // Se houver alerta de vencimento ou manutenção próxima, criar se não existir um pendente idêntico
    if (alertType) {
      const existingAlert = await FleetAlert.findOne({
        vehicle: vehicle._id,
        partner: vehicle.partner,
        type: alertType,
        status: 'PENDING',
        'metadata.planId': plan._id,
      });

      if (!existingAlert) {
        await FleetAlert.create({
          vehicle: vehicle._id,
          partner: vehicle.partner,
          type: alertType,
          severity: severity,
          title: alertTitle,
          message: alertMessage,
          status: 'PENDING',
          metadata: { planId: plan._id, serviceType: plan.serviceType, currentKm, nextKm, nextDate },
        });

        // Enviar notificação push ao gestor/parceiro
        createNotification({
          receiver_id: vehicle.partner,
          title: alertTitle,
          message: alertMessage,
          type: 'fleet_alert',
        }).catch((err) => console.error('Erro notificação frota:', err.message));
      }
    }
  }
}

/**
 * Regista leitura de odómetro com validação e detecção de anomalias
 */
export async function updateVehicleOdometer(vehicleId, driverId, odometerValue, partnerId, source = 'MANUAL_DRIVER', notes = '', tripId = null) {
  const vehicle = await FleetVehicle.findById(vehicleId);
  if (!vehicle) throw new Error('Veículo não encontrado');

  const parsedOdometer = Number(odometerValue);
  if (isNaN(parsedOdometer) || parsedOdometer < 0) {
    throw new Error('Valor de odómetro inválido');
  }

  const previousOdometer = vehicle.currentOdometer || 0;
  let isRegressive = false;

  if (parsedOdometer < previousOdometer) {
    isRegressive = true;
    // Criar alerta de anomalia sem travar a gravação do histórico
    await FleetAlert.create({
      vehicle: vehicle._id,
      partner: partnerId || vehicle.partner,
      type: 'ODOMETER_INCONSISTENT',
      severity: 'HIGH',
      title: `Odómetro Inconsistente - ${vehicle.plateNumber}`,
      message: `Quilometragem registada (${parsedOdometer} km) é inferior ao último registo (${previousOdometer} km).`,
      status: 'PENDING',
      metadata: { previousOdometer, attemptedOdometer: parsedOdometer, driverId, source },
    });

    createNotification({
      receiver_id: partnerId || vehicle.partner,
      title: `Alerta: Odómetro Regressivo (${vehicle.plateNumber})`,
      message: `Motorista submeteu ${parsedOdometer} km (Anterior: ${previousOdometer} km). Requer verificação.`,
      type: 'fleet_alert',
    }).catch((err) => console.error(err.message));
  } else {
    // Actualizar odómetro do veículo apenas se for maior
    vehicle.currentOdometer = parsedOdometer;
    await vehicle.save();
  }

  // Registar o log do odómetro
  const odometerLog = await FleetOdometerLog.create({
    vehicle: vehicle._id,
    driver: driverId || vehicle.assignedDriver,
    partner: partnerId || vehicle.partner,
    odometer: parsedOdometer,
    date: new Date(),
    trip: tripId,
    source,
    notes: isRegressive ? `[ANOMALIA] Odómetro inferior ao anterior (${previousOdometer} km). ${notes}` : notes,
  });

  // Re-avaliar manutenções do veículo
  await checkVehicleMaintenancePlans(vehicle._id);

  return { odometerLog, isRegressive, currentOdometer: vehicle.currentOdometer };
}

/**
 * Regista abastecimento de combustível com métricas e detecção de anomalias
 */
export async function recordFuelLog(vehicleId, driverId, partnerId, data) {
  const vehicle = await FleetVehicle.findById(vehicleId);
  if (!vehicle) throw new Error('Veículo não encontrado');

  const odometer = Number(data.odometer);
  const liters = Number(data.liters);
  const pricePerLiter = Number(data.pricePerLiter);
  let totalCost = Number(data.totalCost);

  if (isNaN(odometer) || odometer <= 0) throw new Error('Odómetro inválido');
  if (isNaN(liters) || liters <= 0) throw new Error('Litros inválidos');
  if (isNaN(pricePerLiter) || pricePerLiter < 0) throw new Error('Preço por litro inválido');

  if (!totalCost || isNaN(totalCost) || totalCost <= 0) {
    totalCost = liters * pricePerLiter;
  }

  // Buscar último abastecimento do veículo para calcular km percorridos e consumo
  const previousFuelLog = await FleetFuelLog.findOne({ vehicle: vehicleId }).sort({ date: -1, odometer: -1 });

  let calculatedKmDriven = 0;
  let calculatedKmL = 0;
  let calculatedL100km = 0;
  let calculatedCostPerKm = 0;

  if (previousFuelLog && odometer > previousFuelLog.odometer) {
    calculatedKmDriven = odometer - previousFuelLog.odometer;
    if (calculatedKmDriven > 0 && liters > 0) {
      calculatedKmL = Number((calculatedKmDriven / liters).toFixed(2));
      calculatedL100km = Number(((liters * 100) / calculatedKmDriven).toFixed(2));
      calculatedCostPerKm = Number((totalCost / calculatedKmDriven).toFixed(2));
    }
  }

  // Criar registo de abastecimento
  const fuelLog = await FleetFuelLog.create({
    vehicle: vehicle._id,
    driver: driverId || vehicle.assignedDriver,
    partner: partnerId || vehicle.partner,
    date: data.date ? new Date(data.date) : new Date(),
    gasStation: data.gasStation || 'Posto Não Especificado',
    odometer,
    liters,
    pricePerLiter,
    totalCost,
    receiptUrl: data.receiptUrl || '',
    calculatedKmDriven,
    calculatedKmL,
    calculatedL100km,
    calculatedCostPerKm,
    notes: data.notes || '',
  });

  // Atualizar odómetro do veículo
  await updateVehicleOdometer(
    vehicle._id,
    driverId || vehicle.assignedDriver,
    odometer,
    partnerId || vehicle.partner,
    'FUEL_LOG',
    `Abastecimento no posto ${data.gasStation || ''}`
  );

  // DETECÇÃO DE ANOMALIAS (Não culpa o utilizador, gera alertas para análise do gestor)
  const tankCapacity = vehicle.fuelTankCapacityLiters || 60;
  const targetConsumption = vehicle.targetConsumptionL100km || 10.0;

  // 1. Litros acima da capacidade do depósito
  if (liters > tankCapacity) {
    await FleetAlert.create({
      vehicle: vehicle._id,
      partner: partnerId || vehicle.partner,
      type: 'FUEL_CAPACITY_EXCEEDED',
      severity: 'HIGH',
      title: `Depósito Excedido - ${vehicle.plateNumber}`,
      message: `Abastecimento de ${liters}L excede a capacidade do depósito (${tankCapacity}L).`,
      status: 'PENDING',
      metadata: { fuelLogId: fuelLog._id, liters, tankCapacity },
    });
  }

  // 2. Consumo muito fora do padrão configurado
  if (calculatedKmDriven > 20 && calculatedL100km > targetConsumption * 1.6) {
    await FleetAlert.create({
      vehicle: vehicle._id,
      partner: partnerId || vehicle.partner,
      type: 'FUEL_HIGH_CONSUMPTION',
      severity: 'MEDIUM',
      title: `Consumo Atípico - ${vehicle.plateNumber}`,
      message: `Consumo registado de ${calculatedL100km} L/100km é 60% superior ao padrão (${targetConsumption} L/100km).`,
      status: 'PENDING',
      metadata: { fuelLogId: fuelLog._id, calculatedL100km, targetConsumption, calculatedKmDriven },
    });
  }

  // 3. Abastecimento duplicado ou suspeito (mesmo veículo abastecido num raio de 1 hora)
  const oneHourAgo = new Date(Date.now() - 3600000);
  const recentAbastecimento = await FleetFuelLog.findOne({
    vehicle: vehicle._id,
    _id: { $ne: fuelLog._id },
    createdAt: { $gte: oneHourAgo },
  });

  if (recentAbastecimento) {
    await FleetAlert.create({
      vehicle: vehicle._id,
      partner: partnerId || vehicle.partner,
      type: 'FUEL_DUPLICATE_SUSPECT',
      severity: 'HIGH',
      title: `Abastecimento Suspeito/Duplicado - ${vehicle.plateNumber}`,
      message: `Registados dois abastecimentos para o mesmo veículo num intervalo inferior a 1 hora.`,
      status: 'PENDING',
      metadata: { currentFuelLogId: fuelLog._id, previousFuelLogId: recentAbastecimento._id },
    });
  }

  return fuelLog;
}

/**
 * Métrica geral para o Dashboard de Gestão de Frota
 */
export async function getFleetDashboard(partnerIdOrIds, isAdmin = false, driverIds = []) {
  const partnerIds = Array.isArray(partnerIdOrIds) ? partnerIdOrIds : [partnerIdOrIds].filter(Boolean);

  let filter = { isDeleted: false };
  if (!isAdmin || partnerIds.length > 0) {
    const orConds = [{ partner: { $in: partnerIds } }];
    if (driverIds && driverIds.length > 0) {
      orConds.push({ assignedDriver: { $in: driverIds } });
    }
    filter = { isDeleted: false, $or: orConds };
  }

  let alertFilter = {};
  if (!isAdmin || partnerIds.length > 0) {
    alertFilter = { partner: { $in: partnerIds } };
  }

  const vehicles = await FleetVehicle.find(filter)
    .populate('assignedDriver', 'name phoneNumber email profileImage status isOnline rating isDeliveryMan')
    .sort({ createdAt: -1 });

  const totalVehicles = vehicles.length;
  const operationalVehicles = vehicles.filter((v) => v.status === 'Operacional').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'Em Manutenção').length;
  const inactiveVehicles = vehicles.filter((v) => v.status === 'Inativo').length;

  const vehicleIds = vehicles.map((v) => v._id);

  // Manutenções
  const maintenancePlans = await FleetMaintenancePlan.find({ vehicle: { $in: vehicleIds } });
  const upcomingMaintenance = maintenancePlans.filter((p) => p.status === 'PROXIMA').length;
  const overdueMaintenance = maintenancePlans.filter((p) => p.status === 'VENCIDA').length;

  // Fuel Logs ultimos 30 dias
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const fuelLogs = await FleetFuelLog.find({
    vehicle: { $in: vehicleIds },
    date: { $gte: thirtyDaysAgo },
  });

  let totalFuelLiters = 0;
  let totalFuelCost = 0;
  let totalKmDriven = 0;

  fuelLogs.forEach((log) => {
    totalFuelLiters += log.liters || 0;
    totalFuelCost += log.totalCost || 0;
    totalKmDriven += log.calculatedKmDriven || 0;
  });

  const avgL100km = totalKmDriven > 0 ? Number(((totalFuelLiters * 100) / totalKmDriven).toFixed(2)) : 0;
  const avgCostPerKm = totalKmDriven > 0 ? Number((totalFuelCost / totalKmDriven).toFixed(2)) : 0;

  // Alertas pendentes
  const pendingAlerts = await FleetAlert.find({ ...alertFilter, status: 'PENDING' })
    .populate('vehicle', 'plateNumber brand model')
    .sort({ createdAt: -1 })
    .limit(10);

  // ----------------------------------------------------
  // AGREGAÇÕES PARA GRÁFICOS KPI (Tomada de Decisão)
  // ----------------------------------------------------

  // 1. Tendência de Percursos (Km) e Consumo (L/100km) nos últimos 30 dias por semana/dia
  const trendMap = {};
  fuelLogs.forEach((log) => {
    const dayKey = new Date(log.date).toISOString().split('T')[0];
    if (!trendMap[dayKey]) {
      trendMap[dayKey] = { date: dayKey, kmDriven: 0, liters: 0, cost: 0 };
    }
    trendMap[dayKey].kmDriven += log.calculatedKmDriven || 0;
    trendMap[dayKey].liters += log.liters || 0;
    trendMap[dayKey].cost += log.totalCost || 0;
  });

  const consumptionAndKmTrend = Object.values(trendMap)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' }),
      kmDriven: item.kmDriven,
      liters: Number(item.liters.toFixed(1)),
      cost: Number(item.cost.toFixed(0)),
      l100km: item.kmDriven > 0 ? Number(((item.liters * 100) / item.kmDriven).toFixed(1)) : 0,
    }));

  // 2. Eficiência de Combustível por Veículo (Real vs Alvo)
  const vehicleEfficiencyData = vehicles.map((v) => {
    const vLogs = fuelLogs.filter((l) => String(l.vehicle) === String(v._id));
    let vLiters = 0;
    let vKm = 0;
    let vCost = 0;
    vLogs.forEach((l) => {
      vLiters += l.liters || 0;
      vKm += l.calculatedKmDriven || 0;
      vCost += l.totalCost || 0;
    });

    const realL100km = vKm > 0 ? Number(((vLiters * 100) / vKm).toFixed(1)) : 0;
    const costPerKm = vKm > 0 ? Number((vCost / vKm).toFixed(2)) : 0;

    return {
      plateNumber: v.plateNumber,
      brandModel: `${v.brand} ${v.model}`,
      realL100km,
      targetL100km: v.targetConsumptionL100km || 10.0,
      totalKm: vKm,
      costPerKm,
    };
  });

  // 3. Distribuição dos Custos da Frota (Combustível vs Manutenção)
  let totalMaintenanceCost = 0;
  maintenancePlans.forEach((p) => {
    totalMaintenanceCost += p.costMzn || 0;
  });

  const costDistribution = [
    { name: 'Combustível', value: Number(totalFuelCost.toFixed(0)), color: '#0D9488' },
    { name: 'Manutenção', value: Number(totalMaintenanceCost.toFixed(0)), color: '#F59E0B' },
  ];

  // 4. Distribuição do Estado de Manutenção
  const maintenanceStatusDistribution = [
    { name: 'Em Dia', value: maintenancePlans.filter((p) => p.status === 'EM_DIA').length, color: '#10B981' },
    { name: 'Próximas', value: upcomingMaintenance, color: '#F59E0B' },
    { name: 'Vencidas', value: overdueMaintenance, color: '#EF4444' },
  ];

  return {
    summary: {
      totalVehicles,
      operationalVehicles,
      maintenanceVehicles,
      inactiveVehicles,
      upcomingMaintenance,
      overdueMaintenance,
      totalFuelLiters: Number(totalFuelLiters.toFixed(2)),
      totalFuelCost: Number(totalFuelCost.toFixed(2)),
      totalKmDriven,
      avgL100km,
      avgCostPerKm,
      pendingAlertsCount: pendingAlerts.length,
    },
    recentAlerts: pendingAlerts,
    vehicles,
    charts: {
      consumptionAndKmTrend,
      vehicleEfficiencyData,
      costDistribution,
      maintenanceStatusDistribution,
    },
  };
}

/**
 * Agregação de Relatórios de Frota
 */
export async function getFleetReports(partnerId, { startDate, endDate, vehicleId, driverId, isAdmin = false }) {
  const matchFilter = {};
  if (!isAdmin || partnerId) {
    matchFilter.partner = partnerId;
  }

  if (vehicleId) {
    matchFilter.vehicle = vehicleId;
  }
  if (driverId) {
    matchFilter.driver = driverId;
  }

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);
  if (Object.keys(dateFilter).length > 0) {
    matchFilter.date = dateFilter;
  }

  // 1. Combustível por Veículo
  const fuelByVehicle = await FleetFuelLog.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$vehicle',
        totalLiters: { $sum: '$liters' },
        totalCost: { $sum: '$totalCost' },
        totalKm: { $sum: '$calculatedKmDriven' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'fleetvehicles',
        localField: '_id',
        foreignField: '_id',
        as: 'vehicleInfo',
      },
    },
    { $unwind: '$vehicleInfo' },
    {
      $project: {
        vehicleId: '$_id',
        plateNumber: '$vehicleInfo.plateNumber',
        brand: '$vehicleInfo.brand',
        model: '$vehicleInfo.model',
        totalLiters: { $round: ['$totalLiters', 2] },
        totalCost: { $round: ['$totalCost', 2] },
        totalKm: '$totalKm',
        avgL100km: {
          $cond: [
            { $gt: ['$totalKm', 0] },
            { $round: [{ $divide: [{ $multiply: ['$totalLiters', 100] }, '$totalKm'] }, 2] },
            0,
          ],
        },
        costPerKm: {
          $cond: [
            { $gt: ['$totalKm', 0] },
            { $round: [{ $divide: ['$totalCost', '$totalKm'] }, 2] },
            0,
          ],
        },
      },
    },
  ]);

  // 2. Combustível por Motorista
  const fuelByDriver = await FleetFuelLog.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$driver',
        totalLiters: { $sum: '$liters' },
        totalCost: { $sum: '$totalCost' },
        totalKm: { $sum: '$calculatedKmDriven' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'driverInfo',
      },
    },
    { $unwind: { path: '$driverInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        driverId: '$_id',
        driverName: { $ifNull: ['$driverInfo.name', 'Sem Motorista Atribuído'] },
        driverPhone: { $ifNull: ['$driverInfo.phoneNumber', ''] },
        driverEmail: { $ifNull: ['$driverInfo.email', ''] },
        driverPhoto: { $ifNull: ['$driverInfo.profileImage', ''] },
        totalLiters: { $round: ['$totalLiters', 2] },
        totalCost: { $round: ['$totalCost', 2] },
        totalKm: '$totalKm',
        costPerKm: {
          $cond: [
            { $gt: ['$totalKm', 0] },
            { $round: [{ $divide: ['$totalCost', '$totalKm'] }, 2] },
            0,
          ],
        },
      },
    },
  ]);

  // 3. Histórico de Manutenção por Veículo
  const maintenanceFilter = {};
  if (!isAdmin || partnerId) maintenanceFilter.partner = partnerId;
  if (vehicleId) maintenanceFilter.vehicle = vehicleId;

  const maintenanceHistory = await FleetMaintenancePlan.find(maintenanceFilter)
    .populate({
      path: 'vehicle',
      select: 'plateNumber brand model assignedDriver',
      populate: {
        path: 'assignedDriver',
        select: 'name phoneNumber email profileImage',
      },
    })
    .sort({ updatedAt: -1 });

  let totalMaintenanceCost = 0;
  maintenanceHistory.forEach((m) => {
    totalMaintenanceCost += m.costMzn || 0;
  });

  return {
    fuelByVehicle,
    fuelByDriver,
    maintenanceHistory,
    summaryCosts: {
      totalFuelCost: fuelByVehicle.reduce((acc, curr) => acc + curr.totalCost, 0),
      totalMaintenanceCost,
      grandTotalCost: fuelByVehicle.reduce((acc, curr) => acc + curr.totalCost, 0) + totalMaintenanceCost,
    },
  };
}
