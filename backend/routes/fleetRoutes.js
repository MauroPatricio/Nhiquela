import express from 'express';
import { isAuth } from '../utils.js';
import FleetVehicle from '../models/FleetVehicleModel.js';
import FleetMaintenancePlan from '../models/FleetMaintenancePlanModel.js';
import FleetOdometerLog from '../models/FleetOdometerLogModel.js';
import FleetFuelLog from '../models/FleetFuelLogModel.js';
import FleetAlert from '../models/FleetAlertModel.js';
import {
  updateVehicleOdometer,
  recordFuelLog,
  getFleetDashboard,
  getFleetReports,
  checkVehicleMaintenancePlans,
} from '../services/fleetService.js';

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
// 7. MOTORISTA - VEÍCULOS ATRIBUÍDOS (SUPORTE A 1 OU MAIS VIATURAS)
// ==========================================
router.get('/driver/assigned-vehicle', isAuth, async (req, res) => {
  try {
    const vehicles = await FleetVehicle.find({ assignedDriver: req.user._id, isDeleted: false }).populate(
      'assignedDriver',
      'name email phoneNumber profileImage status isOnline'
    );
    if (!vehicles || vehicles.length === 0) {
      return res.status(404).send({ message: 'Nenhum veículo atribuído a este motorista.' });
    }
    res.send({
      vehicles,
      vehicle: vehicles[0], // Compatibilidade com chamadas individuais
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

export default router;
