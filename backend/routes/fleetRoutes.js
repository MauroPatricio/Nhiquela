import express from 'express';
import { isAuth } from '../utils.js';
import FleetVehicle from '../models/FleetVehicleModel.js';
import FleetMaintenancePlan from '../models/FleetMaintenancePlanModel.js';
import FleetOdometerLog from '../models/FleetOdometerLogModel.js';
import FleetFuelLog from '../models/FleetFuelLogModel.js';
import FleetAlert from '../models/FleetAlertModel.js';
import FleetTrackingSession from '../models/FleetTrackingSessionModel.js';
import FleetLocationPoint from '../models/FleetLocationPointModel.js';
import FleetTrip from '../models/FleetTripModel.js';
import FleetGeofence from '../models/FleetGeofenceModel.js';
import {
  updateVehicleOdometer,
  recordFuelLog,
  getFleetDashboard,
  getFleetReports,
  checkVehicleMaintenancePlans,
} from '../services/fleetService.js';
import {
  startTrackingSession,
  endTrackingSession,
  ingestLocationPoints,
} from '../services/fleetTrackingService.js';

import User from '../models/UserModel.js';
import Partner from '../models/PartnerModel.js';
import ProviderSubcategory from '../models/ProviderSubcategoryModel.js';

const router = express.Router();

// Helper para obter IDs do parceiro e motoristas associados
const getPartnerIdsAndDrivers = async (req) => {
  const user = req.user;
  const partnerIds = [user._id];
  if (user.partnerId) partnerIds.push(user.partnerId);

  const pDoc = await Partner.findOne({ $or: [{ userId: user._id }, { email: user.email }, { _id: user.partnerId }] });
  if (pDoc) partnerIds.push(pDoc._id);

  // Buscar todos os motoristas associados a este parceiro
  const drivers = await User.find({
    $or: [
      { partnerId: { $in: partnerIds } },
      { _id: { $in: partnerIds } }
    ],
    $or: [{ role: 'DRIVER' }, { isDeliveryMan: true }]
  }).select('_id name email phoneNumber deliveryman profileImage status isOnline');

  const driverIds = drivers.map((d) => d._id);

  return {
    partnerIds,
    drivers,
    driverIds,
    primaryPartnerId: pDoc?._id || user.partnerId || user._id,
  };
};

const getPartnerOrUserId = (req) => {
  return req.user.partnerId || req.user._id;
};

// ==========================================
// 1. VEÍCULOS
// ==========================================

// Listar todos os veículos do parceiro / admin (com auto-descoberta das viaturas dos motoristas)
router.get('/vehicles', isAuth, async (req, res) => {
  try {
    const { partnerIds, drivers, driverIds, primaryPartnerId } = await getPartnerIdsAndDrivers(req);

    // Auto-descoberta e sincronização: se um motorista tem matrícula/veículo no seu perfil que ainda não existe no FleetVehicle, cria automaticamente
    for (const d of drivers) {
      if (d.deliveryman && d.deliveryman.transport_registration) {
        const plate = d.deliveryman.transport_registration.toUpperCase().trim();
        if (plate && plate !== '') {
          const existing = await FleetVehicle.findOne({ plateNumber: plate, isDeleted: false });
          if (!existing) {
            let brand = d.deliveryman.transport_brand || 'Viatura';
            let model = d.deliveryman.transport_model || d.deliveryman.transport_type || 'Geral';
            let vType = 'Ligeiro';

            if (d.deliveryman.transport_type) {
              const typeStr = String(d.deliveryman.transport_type).toLowerCase();
              if (typeStr.includes('moto') || typeStr.includes('motor')) vType = 'Motociclo';
              else if (typeStr.includes('van') || typeStr.includes('carrinha')) vType = 'Van';
              else if (typeStr.includes('pesado') || typeStr.includes('camiao') || typeStr.includes('camião')) vType = 'Pesado';
            }

            try {
              await FleetVehicle.create({
                plateNumber: plate,
                brand,
                model,
                year: 2022,
                type: vType,
                capacityKg: vType === 'Motociclo' ? 50 : 500,
                fuelType: vType === 'Motociclo' ? 'Gasolina' : 'Gasóleo',
                fuelTankCapacityLiters: vType === 'Motociclo' ? 15 : 60,
                targetConsumptionL100km: vType === 'Motociclo' ? 3.5 : 10.0,
                currentOdometer: 0,
                status: 'Operacional',
                assignedDriver: d._id,
                partner: primaryPartnerId,
                notes: `Sincronizado do perfil do motorista ${d.name}`,
              });
            } catch (errCreate) {
              console.log('Ignorando duplicado no auto-sync de frota:', errCreate.message);
            }
          } else if (!existing.assignedDriver) {
            existing.assignedDriver = d._id;
            await existing.save();
          }
        }
      }
    }

    const filter = req.user.isAdmin
      ? { isDeleted: false }
      : {
          isDeleted: false,
          $or: [
            { partner: { $in: partnerIds } },
            { assignedDriver: { $in: driverIds } },
            { assignedDriver: req.user._id },
          ],
        };

    const vehicles = await FleetVehicle.find(filter)
      .populate('assignedDriver', 'name phoneNumber email profileImage status isOnline rating isDeliveryMan deliveryman')
      .sort({ createdAt: -1 });

    res.send(vehicles);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Endpoint explícito para sincronizar viaturas de todos os motoristas
router.post('/sync-driver-vehicles', isAuth, async (req, res) => {
  try {
    const { partnerIds, drivers, primaryPartnerId } = await getPartnerIdsAndDrivers(req);
    let syncedCount = 0;

    for (const d of drivers) {
      if (d.deliveryman && d.deliveryman.transport_registration) {
        const plate = d.deliveryman.transport_registration.toUpperCase().trim();
        if (plate && plate !== '') {
          let existing = await FleetVehicle.findOne({ plateNumber: plate, isDeleted: false });
          if (!existing) {
            let brand = d.deliveryman.transport_brand || 'Viatura';
            let model = d.deliveryman.transport_model || d.deliveryman.transport_type || 'Geral';
            let vType = 'Ligeiro';

            if (d.deliveryman.transport_type) {
              const typeStr = String(d.deliveryman.transport_type).toLowerCase();
              if (typeStr.includes('moto') || typeStr.includes('motor')) vType = 'Motociclo';
              else if (typeStr.includes('van') || typeStr.includes('carrinha')) vType = 'Van';
              else if (typeStr.includes('pesado') || typeStr.includes('camiao') || typeStr.includes('camião')) vType = 'Pesado';
            }

            await FleetVehicle.create({
              plateNumber: plate,
              brand,
              model,
              year: 2022,
              type: vType,
              capacityKg: vType === 'Motociclo' ? 50 : 500,
              fuelType: vType === 'Motociclo' ? 'Gasolina' : 'Gasóleo',
              fuelTankCapacityLiters: vType === 'Motociclo' ? 15 : 60,
              targetConsumptionL100km: vType === 'Motociclo' ? 3.5 : 10.0,
              currentOdometer: 0,
              status: 'Operacional',
              assignedDriver: d._id,
              partner: primaryPartnerId,
              notes: `Sincronizado do perfil do motorista ${d.name}`,
            });
            syncedCount++;
          } else {
            if (!existing.assignedDriver || String(existing.assignedDriver) !== String(d._id)) {
              existing.assignedDriver = d._id;
              await existing.save();
              syncedCount++;
            }
          }
        }
      }
    }

    res.send({ message: `Sincronização concluída. ${syncedCount} viatura(s) sincronizada(s).`, syncedCount });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Obter dados da viatura associada a um motorista específico
router.get('/driver-vehicle/:driverId', isAuth, async (req, res) => {
  try {
    const driverId = req.params.driverId;
    let vehicle = await FleetVehicle.findOne({ assignedDriver: driverId, isDeleted: false })
      .populate('assignedDriver', 'name phoneNumber email profileImage status isOnline rating isDeliveryMan deliveryman');

    if (!vehicle) {
      // Procurar diretamente no perfil do motorista
      const driver = await User.findById(driverId).select('name phoneNumber email profileImage status isOnline isDeliveryMan deliveryman');
      if (driver && driver.deliveryman && driver.deliveryman.transport_registration) {
        vehicle = {
          plateNumber: driver.deliveryman.transport_registration,
          brand: driver.deliveryman.transport_brand || 'Viatura',
          model: driver.deliveryman.transport_model || driver.deliveryman.transport_type || 'Geral',
          color: driver.deliveryman.transport_color || '',
          type: driver.deliveryman.transport_type || 'Ligeiro',
          assignedDriver: driver,
          isProfileFallback: true,
        };
      }
    }

    if (!vehicle) {
      return res.status(404).send({ message: 'Nenhuma viatura associada a este motorista.' });
    }

    res.send(vehicle);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Criar novo veículo
router.post('/vehicles', isAuth, async (req, res) => {
  try {
    const partnerId = getPartnerOrUserId(req);
    const existing = await FleetVehicle.findOne({
      plateNumber: req.body.plateNumber.toUpperCase().trim(),
      isDeleted: false,
    });
    if (existing) {
      return res.status(400).send({ message: 'Já existe um veículo com esta matrícula registado.' });
    }

    const vehicle = new FleetVehicle({
      plateNumber: req.body.plateNumber.toUpperCase().trim(),
      brand: req.body.brand,
      model: req.body.model,
      year: req.body.year,
      type: req.body.type || 'Ligeiro',
      capacityKg: req.body.capacityKg || 0,
      fuelType: req.body.fuelType || 'Gasóleo',
      fuelTankCapacityLiters: req.body.fuelTankCapacityLiters || 60,
      targetConsumptionL100km: req.body.targetConsumptionL100km || 10.0,
      currentOdometer: req.body.currentOdometer || 0,
      status: req.body.status || 'Operacional',
      assignedDriver: req.body.assignedDriver || null,
      partner: partnerId,
      notes: req.body.notes || '',
    });

    const savedVehicle = await vehicle.save();
    res.status(201).send(savedVehicle);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// Obter detalhes de um veículo
router.get('/vehicles/:id', isAuth, async (req, res) => {
  try {
    const vehicle = await FleetVehicle.findById(req.params.id).populate('assignedDriver', 'name phoneNumber email profileImage status isOnline rating isDeliveryMan');
    if (!vehicle) return res.status(404).send({ message: 'Veículo não encontrado' });
    res.send(vehicle);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Actualizar veículo
router.put('/vehicles/:id', isAuth, async (req, res) => {
  try {
    const vehicle = await FleetVehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).send({ message: 'Veículo não encontrado' });

    if (req.body.plateNumber) vehicle.plateNumber = req.body.plateNumber.toUpperCase().trim();
    if (req.body.brand) vehicle.brand = req.body.brand;
    if (req.body.model) vehicle.model = req.body.model;
    if (req.body.year) vehicle.year = req.body.year;
    if (req.body.type) vehicle.type = req.body.type;
    if (req.body.capacityKg !== undefined) vehicle.capacityKg = req.body.capacityKg;
    if (req.body.fuelType) vehicle.fuelType = req.body.fuelType;
    if (req.body.fuelTankCapacityLiters) vehicle.fuelTankCapacityLiters = req.body.fuelTankCapacityLiters;
    if (req.body.targetConsumptionL100km) vehicle.targetConsumptionL100km = req.body.targetConsumptionL100km;
    if (req.body.status) vehicle.status = req.body.status;
    if (req.body.assignedDriver !== undefined) vehicle.assignedDriver = req.body.assignedDriver || null;
    if (req.body.notes !== undefined) vehicle.notes = req.body.notes;

    if (req.body.currentOdometer !== undefined && req.body.currentOdometer !== vehicle.currentOdometer) {
      await updateVehicleOdometer(
        vehicle._id,
        req.user._id,
        req.body.currentOdometer,
        getPartnerOrUserId(req),
        'MANUAL_MANAGER',
        'Actualização manual pelo gestor'
      );
    } else {
      await vehicle.save();
    }

    res.send(vehicle);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// Eliminar veículo (soft-delete)
router.delete('/vehicles/:id', isAuth, async (req, res) => {
  try {
    const vehicle = await FleetVehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).send({ message: 'Veículo não encontrado' });
    vehicle.isDeleted = true;
    await vehicle.save();
    res.send({ message: 'Veículo removido com sucesso' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// ==========================================
// 2. MANUTENÇÃO
// ==========================================

// Listar planos de manutenção
router.get('/maintenance', isAuth, async (req, res) => {
  try {
    const partnerId = getPartnerOrUserId(req);
    const filter = req.user.isAdmin ? {} : { partner: partnerId };
    if (req.query.vehicleId) {
      filter.vehicle = req.query.vehicleId;
      try {
        await checkVehicleMaintenancePlans(req.query.vehicleId);
      } catch (checkErr) {
        console.log('Erro ao recalcular planos de manutenção:', checkErr.message);
      }
    }

    const plans = await FleetMaintenancePlan.find(filter)
      .populate({
        path: 'vehicle',
        select: 'plateNumber brand model currentOdometer assignedDriver status',
        populate: {
          path: 'assignedDriver',
          select: 'name phoneNumber email profileImage status isOnline rating',
        },
      })
      .sort({ status: -1, nextMaintenanceDate: 1 });

    res.send(plans);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Criar plano de manutenção
router.post('/maintenance', isAuth, async (req, res) => {
  try {
    const partnerId = getPartnerOrUserId(req);
    const vehicle = await FleetVehicle.findById(req.body.vehicle);
    if (!vehicle) return res.status(404).send({ message: 'Veículo não encontrado' });

    const lastKm = req.body.lastMaintenanceKm || vehicle.currentOdometer || 0;
    const intervalKm = req.body.intervalKm || 10000;
    const intervalDays = req.body.intervalDays || 180;
    const lastDate = req.body.lastMaintenanceDate ? new Date(req.body.lastMaintenanceDate) : new Date();

    const nextKm = lastKm + intervalKm;
    const nextDate = new Date(lastDate.getTime() + intervalDays * 86400000);

    const serviceType = req.body.serviceType
      ? String(req.body.serviceType).toLowerCase().replace('inspecao', 'inspeccao')
      : 'outros';

    const plan = new FleetMaintenancePlan({
      vehicle: vehicle._id,
      partner: partnerId,
      serviceType,
      customTitle: req.body.customTitle || '',
      intervalKm,
      intervalDays,
      lastMaintenanceKm: lastKm,
      lastMaintenanceDate: lastDate,
      nextMaintenanceKm: nextKm,
      nextMaintenanceDate: nextDate,
      advanceNoticeKm: req.body.advanceNoticeKm || 500,
      advanceNoticeDays: req.body.advanceNoticeDays || 7,
      costMzn: req.body.costMzn || 0,
      serviceProvider: req.body.serviceProvider || '',
      notes: req.body.notes || '',
    });

    await plan.save();
    await checkVehicleMaintenancePlans(vehicle._id);
    res.status(201).send(plan);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// Registo/Conclusão de manutenção realizada
router.put('/maintenance/:id', isAuth, async (req, res) => {
  try {
    const plan = await FleetMaintenancePlan.findById(req.params.id);
    if (!plan) return res.status(404).send({ message: 'Plano não encontrado' });

    if (req.body.markCompleted) {
      const vehicle = await FleetVehicle.findById(plan.vehicle);
      const doneKm = req.body.doneKm || (vehicle ? vehicle.currentOdometer : plan.nextMaintenanceKm);
      const doneDate = req.body.doneDate ? new Date(req.body.doneDate) : new Date();

      plan.lastMaintenanceKm = doneKm;
      plan.lastMaintenanceDate = doneDate;
      plan.nextMaintenanceKm = doneKm + plan.intervalKm;
      plan.nextMaintenanceDate = new Date(doneDate.getTime() + plan.intervalDays * 86400000);
      plan.status = 'EM_DIA';
      if (req.body.costMzn) plan.costMzn = req.body.costMzn;
      if (req.body.serviceProvider) plan.serviceProvider = req.body.serviceProvider;
    } else {
      if (req.body.intervalKm) plan.intervalKm = req.body.intervalKm;
      if (req.body.intervalDays) plan.intervalDays = req.body.intervalDays;
      if (req.body.advanceNoticeKm) plan.advanceNoticeKm = req.body.advanceNoticeKm;
      if (req.body.advanceNoticeDays) plan.advanceNoticeDays = req.body.advanceNoticeDays;
      if (req.body.status) plan.status = req.body.status;
      if (req.body.notes !== undefined) plan.notes = req.body.notes;
    }

    await plan.save();
    await checkVehicleMaintenancePlans(plan.vehicle);
    res.send(plan);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// Eliminar plano de manutenção
router.delete('/maintenance/:id', isAuth, async (req, res) => {
  try {
    await FleetMaintenancePlan.findByIdAndDelete(req.params.id);
    res.send({ message: 'Plano de manutenção removido' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// ==========================================
// 3. ODÓMETRO
// ==========================================

// Obter histórico de odómetro de um veículo
router.get('/odometer/:vehicleId', isAuth, async (req, res) => {
  try {
    const logs = await FleetOdometerLog.find({ vehicle: req.params.vehicleId })
      .populate('driver', 'name email phoneNumber profileImage status isOnline')
      .sort({ date: -1 })
      .limit(50);
    res.send(logs);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Submeter nova leitura de odómetro
router.post('/odometer', isAuth, async (req, res) => {
  try {
    const { vehicleId, odometer, notes, tripId } = req.body;
    const partnerId = getPartnerOrUserId(req);
    const result = await updateVehicleOdometer(
      vehicleId,
      req.user._id,
      odometer,
      partnerId,
      req.user.isDeliveryMan ? 'MANUAL_DRIVER' : 'MANUAL_MANAGER',
      notes,
      tripId
    );
    res.status(201).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// ==========================================
// 4. COMBUSTÍVEL
// ==========================================

// Listar abastecimentos
router.get('/fuel', isAuth, async (req, res) => {
  try {
    const partnerId = getPartnerOrUserId(req);
    const filter = req.user.isAdmin ? {} : { partner: partnerId };
    if (req.query.vehicleId) filter.vehicle = req.query.vehicleId;

    const fuelLogs = await FleetFuelLog.find(filter)
      .populate({
        path: 'vehicle',
        select: 'plateNumber brand model currentOdometer assignedDriver',
        populate: {
          path: 'assignedDriver',
          select: 'name phoneNumber email profileImage status isOnline',
        },
      })
      .populate('driver', 'name email phoneNumber profileImage status isOnline')
      .sort({ date: -1 });

    res.send(fuelLogs);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Regista abastecimento
router.post('/fuel', isAuth, async (req, res) => {
  try {
    const partnerId = getPartnerOrUserId(req);
    const fuelLog = await recordFuelLog(req.body.vehicle, req.user._id, partnerId, req.body);
    res.status(201).send(fuelLog);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// ==========================================
// 5. ALERTAS E ANOMALIAS
// ==========================================

// Listar alertas
router.get('/alerts', isAuth, async (req, res) => {
  try {
    const partnerId = getPartnerOrUserId(req);
    const filter = req.user.isAdmin ? {} : { partner: partnerId };
    if (req.query.status) filter.status = req.query.status;

    const alerts = await FleetAlert.find(filter)
      .populate({
        path: 'vehicle',
        select: 'plateNumber brand model currentOdometer assignedDriver',
        populate: {
          path: 'assignedDriver',
          select: 'name phoneNumber email profileImage status isOnline rating',
        },
      })
      .sort({ createdAt: -1 });

    res.send(alerts);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Resolver/Reconhecer alerta
router.put('/alerts/:id/resolve', isAuth, async (req, res) => {
  try {
    const alert = await FleetAlert.findById(req.params.id);
    if (!alert) return res.status(404).send({ message: 'Alerta não encontrado' });

    alert.status = req.body.status || 'RESOLVED';
    alert.resolvedBy = req.user._id;
    alert.resolvedAt = new Date();
    await alert.save();

    res.send(alert);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// ==========================================
// 6. DASHBOARD & RELATÓRIOS
// ==========================================

// Obter resumo de KPIs do Dashboard
router.get('/dashboard', isAuth, async (req, res) => {
  try {
    const { partnerIds, drivers, driverIds } = await getPartnerIdsAndDrivers(req);
    const data = await getFleetDashboard(partnerIds, req.user.isAdmin, driverIds);
    res.send(data);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Obter Relatórios consolidados
router.get('/reports', isAuth, async (req, res) => {
  try {
    const partnerId = getPartnerOrUserId(req);
    const reports = await getFleetReports(partnerId, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      vehicleId: req.query.vehicleId,
      driverId: req.query.driverId,
      isAdmin: req.user.isAdmin,
    });
    res.send(reports);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// ==========================================
// 7. MOTORISTA - VEÍCULOS ATRIBUÍDOS (COM AUTO-DESCOBERTA DE MATRÍCULA)
// ==========================================
router.get('/driver/assigned-vehicle', isAuth, async (req, res) => {
  try {
    let vehicles = await FleetVehicle.find({ assignedDriver: req.user._id, isDeleted: false }).populate(
      'assignedDriver',
      'name email phoneNumber profileImage status isOnline'
    );

    // Auto-descoberta: se o motorista não tem veículo na coleção FleetVehicle mas tem matrícula no perfil deliveryman
    if ((!vehicles || vehicles.length === 0) && req.user.deliveryman && req.user.deliveryman.transport_registration) {
      const plate = req.user.deliveryman.transport_registration.toUpperCase().trim();
      if (plate) {
        let existing = await FleetVehicle.findOne({ plateNumber: plate, isDeleted: false });
        if (existing) {
          if (!existing.assignedDriver) {
            existing.assignedDriver = req.user._id;
            await existing.save();
          }
          vehicles = [existing];
        } else {
          // Criar veículo de frota automaticamente
          const primaryPartnerId = req.user.partnerId || req.user._id;
          let brand = req.user.deliveryman.transport_brand || 'Viatura';
          let model = req.user.deliveryman.transport_model || req.user.deliveryman.transport_type || 'Geral';
          let vType = 'Ligeiro';

          if (req.user.deliveryman.transport_type) {
            const typeStr = String(req.user.deliveryman.transport_type).toLowerCase();
            if (typeStr.includes('moto') || typeStr.includes('motor')) vType = 'Motociclo';
            else if (typeStr.includes('van') || typeStr.includes('carrinha')) vType = 'Van';
            else if (typeStr.includes('pesado') || typeStr.includes('camiao')) vType = 'Pesado';
          }

          const created = await FleetVehicle.create({
            plateNumber: plate,
            brand,
            model,
            year: 2022,
            type: vType,
            capacityKg: vType === 'Motociclo' ? 50 : 500,
            fuelType: vType === 'Motociclo' ? 'Gasolina' : 'Gasóleo',
            fuelTankCapacityLiters: vType === 'Motociclo' ? 15 : 60,
            targetConsumptionL100km: vType === 'Motociclo' ? 3.5 : 10.0,
            currentOdometer: 0,
            status: 'Operacional',
            assignedDriver: req.user._id,
            partner: primaryPartnerId,
            notes: `Auto-criado a partir do perfil do motorista ${req.user.name}`,
          });
          vehicles = [created];
        }
      }
    }

    if (!vehicles || vehicles.length === 0) {
      return res.status(404).send({ message: 'Nenhum veículo atribuído a este motorista.' });
    }

    res.send({
      vehicles,
      vehicle: vehicles[0],
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// ==========================================
// 8. RASTREAMENTO E SESSÕES OPERACIONAIS DE FROTA
// ==========================================

// Iniciar Sessão de Tracking (Quando o motorista fica ONLINE)
router.post('/tracking/start', isAuth, async (req, res) => {
  try {
    const driverId = req.user._id;
    const { vehicleId, latitude, longitude } = req.body;
    const partnerId = getPartnerOrUserId(req);

    const session = await startTrackingSession(driverId, vehicleId, partnerId, latitude, longitude);
    
    await User.updateOne({ _id: driverId }, { $set: { availability: 'active', isOnline: true } });

    const io = req.app.get('io');
    if (io) {
      const payload = {
        driverId: driverId.toString(),
        partnerId: partnerId ? partnerId.toString() : null,
        availability: 'active',
        isOnline: true,
        status: 'ONLINE',
        latitude,
        longitude,
      };
      io.emit('driver_availability_updated', payload);
      io.emit('driver_status_updated', payload);
      io.emit('fleet_location_update', payload);
    }

    res.status(201).send(session);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Encerrar Sessão de Tracking (Quando o motorista fica OFFLINE)
router.post('/tracking/stop', isAuth, async (req, res) => {
  try {
    const driverId = req.user._id;
    const { latitude, longitude } = req.body;

    const session = await endTrackingSession(driverId, latitude, longitude);

    await User.updateOne({ _id: driverId }, { $set: { availability: 'paused', isOnline: false } });

    const io = req.app.get('io');
    if (io) {
      const payload = {
        driverId: driverId.toString(),
        partnerId: req.user.partnerId ? req.user.partnerId.toString() : null,
        availability: 'paused',
        isOnline: false,
        status: 'OFFLINE',
        latitude,
        longitude,
      };
      io.emit('driver_availability_updated', payload);
      io.emit('driver_status_updated', payload);
      io.emit('fleet_location_update', payload);
    }

    res.send({ message: 'Sessão encerrada com sucesso', session });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Envio de Ponto Único ou em Lote (Suporte Offline Sync)
router.post(['/location', '/location/batch'], isAuth, async (req, res) => {
  try {
    const driverId = req.user._id;
    const points = req.body.points || req.body.locations || [req.body];
    const ioServer = req.app.get('io') || null;

    const result = await ingestLocationPoints(driverId, points, ioServer);
    res.send({ message: 'Pontos sincronizados com sucesso', ...result });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Mapa em Tempo Real (Todas as viaturas ativas)
router.get('/live', isAuth, async (req, res) => {
  try {
    const { partnerIds, driverIds } = await getPartnerIdsAndDrivers(req);

    const filterVehicles = req.user.isAdmin
      ? { isDeleted: false }
      : { isDeleted: false, $or: [{ partner: { $in: partnerIds } }, { assignedDriver: { $in: driverIds } }] };

    const vehicles = await FleetVehicle.find(filterVehicles).populate(
      'assignedDriver',
      'name phoneNumber email profileImage status isOnline availability'
    );

    const activeSessions = await FleetTrackingSession.find({
      status: 'ACTIVE',
      $or: [{ partner: { $in: partnerIds } }, { driver: { $in: driverIds } }],
    });

    const sessionMap = {};
    activeSessions.forEach((s) => {
      sessionMap[String(s.driver)] = s;
    });

    const liveData = [];
    const driversWithVehicles = new Set();

    for (const v of vehicles) {
      let lastPoint = null;
      if (v.assignedDriver) {
        driversWithVehicles.add(String(v.assignedDriver._id));
        lastPoint = await FleetLocationPoint.findOne({ driver: v.assignedDriver._id }).sort({ capturedAt: -1 });
      }

      const activeSession = v.assignedDriver ? sessionMap[String(v.assignedDriver._id)] : null;
      const isOnline = v.assignedDriver?.availability === 'active' || v.assignedDriver?.isOnline || false;
      const speed = lastPoint?.speedKmh || 0;

      let state = 'OFFLINE';
      if (isOnline) {
        state = speed > 3 ? 'MOVING' : 'IDLE';
      }

      const lat = lastPoint?.latitude || v.assignedDriver?.latitude || v.assignedDriver?.location?.coordinates?.[1] || -25.9692;
      const lng = lastPoint?.longitude || v.assignedDriver?.longitude || v.assignedDriver?.location?.coordinates?.[0] || 32.5732;

      liveData.push({
        vehicle: v,
        driver: v.assignedDriver,
        session: activeSession,
        lastLocation: {
          latitude: Number(lat),
          longitude: Number(lng),
          speedKmh: speed,
          heading: lastPoint?.heading || 0,
          batteryLevel: lastPoint?.batteryLevel || 1,
          updatedAt: lastPoint?.capturedAt || new Date(),
        },
        state,
      });
    }

    const { drivers } = await getPartnerIdsAndDrivers(req);
    for (const d of drivers) {
      if (!driversWithVehicles.has(String(d._id))) {
        let lastPoint = await FleetLocationPoint.findOne({ driver: d._id }).sort({ capturedAt: -1 });
        const isOnline = d.availability === 'active' || d.isOnline || false;
        const speed = lastPoint?.speedKmh || 0;
        let state = 'OFFLINE';
        if (isOnline) {
          state = speed > 3 ? 'MOVING' : 'IDLE';
        }

        const lat = lastPoint?.latitude || d.latitude || -25.9692;
        const lng = lastPoint?.longitude || d.longitude || 32.5732;

        liveData.push({
          vehicle: {
            _id: `temp_${d._id}`,
            plateNumber: d.deliveryman?.transport_registration || 'Viatura',
            brand: d.deliveryman?.transport_brand || 'Motorista',
            model: d.deliveryman?.transport_model || d.deliveryman?.transport_type || 'Geral',
            type: d.deliveryman?.transport_type || 'Ligeiro',
            currentOdometer: 0,
            status: 'Operacional',
          },
          driver: d,
          session: sessionMap[String(d._id)] || null,
          lastLocation: {
            latitude: Number(lat),
            longitude: Number(lng),
            speedKmh: speed,
            heading: lastPoint?.heading || 0,
            batteryLevel: lastPoint?.batteryLevel || 1,
            updatedAt: lastPoint?.capturedAt || new Date(),
          },
          state,
        });
      }
    }

    res.send(liveData);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Rota Histórica e Pontos da Viagem por Motorista/Veículo/Data
router.get('/history', isAuth, async (req, res) => {
  try {
    const { driverId, vehicleId, date, startDate, endDate } = req.query;
    const filter = {};

    if (driverId) filter.driver = driverId;
    if (vehicleId) filter.vehicle = vehicleId;

    if (date) {
      const d = new Date(date);
      const startOfDay = new Date(new Date(date).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999));
      filter.capturedAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate && endDate) {
      filter.capturedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      filter.capturedAt = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    }

    const points = await FleetLocationPoint.find(filter)
      .sort({ capturedAt: 1 })
      .limit(5000);

    const sessionIds = [...new Set(points.map((p) => String(p.sessionId)))];
    const sessions = await FleetTrackingSession.find({ _id: { $in: sessionIds } });
    const trips = await FleetTrip.find({ sessionId: { $in: sessionIds } });

    const alertFilter = {};
    if (driverId) alertFilter.driver = driverId;
    if (vehicleId) alertFilter.vehicle = vehicleId;
    if (filter.capturedAt) alertFilter.createdAt = filter.capturedAt;

    const events = await FleetAlert.find(alertFilter).sort({ createdAt: 1 });

    res.send({ points, sessions, trips, events });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Listagem de Viagens Operacionais
router.get('/trips', isAuth, async (req, res) => {
  try {
    const { partnerIds, driverIds } = await getPartnerIdsAndDrivers(req);
    const filter = req.user.isAdmin
      ? {}
      : { $or: [{ partner: { $in: partnerIds } }, { driver: { $in: driverIds } }] };

    if (req.query.driverId) filter.driver = req.query.driverId;
    if (req.query.vehicleId) filter.vehicle = req.query.vehicleId;

    const trips = await FleetTrip.find(filter)
      .populate('driver', 'name phoneNumber email profileImage')
      .populate('vehicle', 'plateNumber brand model')
      .sort({ startedAt: -1 })
      .limit(100);

    res.send(trips);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// CRUD de Zonas Geográficas (Geofences)
router.get('/geofences', isAuth, async (req, res) => {
  try {
    const partnerId = getPartnerOrUserId(req);
    const filter = req.user.isAdmin ? {} : { partner: partnerId };
    const geofences = await FleetGeofence.find(filter).sort({ createdAt: -1 });
    res.send(geofences);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

router.post('/geofences', isAuth, async (req, res) => {
  try {
    const partnerId = getPartnerOrUserId(req);
    const geofence = new FleetGeofence({
      partner: partnerId,
      name: req.body.name,
      description: req.body.description || '',
      type: req.body.type || 'CUSTOM',
      centerLatitude: req.body.centerLatitude,
      centerLongitude: req.body.centerLongitude,
      radiusMeters: req.body.radiusMeters || 200,
      polygon: req.body.polygon || [],
      active: req.body.active !== undefined ? req.body.active : true,
    });
    await geofence.save();
    res.status(201).send(geofence);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.put('/geofences/:id', isAuth, async (req, res) => {
  try {
    const geofence = await FleetGeofence.findById(req.params.id);
    if (!geofence) return res.status(404).send({ message: 'Geofence não encontrada' });

    if (req.body.name) geofence.name = req.body.name;
    if (req.body.description !== undefined) geofence.description = req.body.description;
    if (req.body.type) geofence.type = req.body.type;
    if (req.body.centerLatitude !== undefined) geofence.centerLatitude = req.body.centerLatitude;
    if (req.body.centerLongitude !== undefined) geofence.centerLongitude = req.body.centerLongitude;
    if (req.body.radiusMeters !== undefined) geofence.radiusMeters = req.body.radiusMeters;
    if (req.body.polygon) geofence.polygon = req.body.polygon;
    if (req.body.active !== undefined) geofence.active = req.body.active;

    await geofence.save();
    res.send(geofence);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.delete('/geofences/:id', isAuth, async (req, res) => {
  try {
    await FleetGeofence.findByIdAndDelete(req.params.id);
    res.send({ message: 'Geofence eliminada com sucesso' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Relatório Diário de Frota Consolidado
router.get('/reports/daily', isAuth, async (req, res) => {
  try {
    const { partnerIds, driverIds } = await getPartnerIdsAndDrivers(req);
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const sessions = await FleetTrackingSession.find({
      startedAt: { $gte: startOfDay, $lte: endOfDay },
      $or: [{ partner: { $in: partnerIds } }, { driver: { $in: driverIds } }],
    })
      .populate('driver', 'name email phoneNumber profileImage')
      .populate('vehicle', 'plateNumber brand model targetConsumptionL100km fuelTankCapacityLiters');

    const result = sessions.map((s) => {
      const targetCons = s.vehicle?.targetConsumptionL100km || 10;
      const estimatedFuelLiters = (s.totalDistanceKm * targetCons) / 100;
      const estimatedCostMzn = estimatedFuelLiters * 95;

      return {
        sessionId: s._id,
        driver: s.driver,
        vehicle: s.vehicle,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        totalDistanceKm: s.totalDistanceKm,
        totalDurationSeconds: s.totalDurationSeconds,
        movingDurationSeconds: s.movingDurationSeconds,
        idleDurationSeconds: s.idleDurationSeconds,
        averageSpeedKmh: s.averageSpeedKmh,
        maxSpeedKmh: s.maxSpeedKmh,
        estimatedFuelLiters: Number(estimatedFuelLiters.toFixed(1)),
        estimatedCostMzn: Math.round(estimatedCostMzn),
        status: s.status,
      };
    });

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

export default router;
