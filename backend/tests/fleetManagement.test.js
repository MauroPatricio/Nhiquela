import mongoose from 'mongoose';
import FleetVehicle from '../models/FleetVehicleModel.js';
import FleetMaintenancePlan from '../models/FleetMaintenancePlanModel.js';
import FleetOdometerLog from '../models/FleetOdometerLogModel.js';
import FleetFuelLog from '../models/FleetFuelLogModel.js';
import FleetAlert from '../models/FleetAlertModel.js';
import User from '../models/UserModel.js';
import {
  updateVehicleOdometer,
  recordFuelLog,
  checkVehicleMaintenancePlans,
  getFleetDashboard,
  getFleetReports,
} from '../services/fleetService.js';

import { connectTestDB, disconnectTestDB } from './setup.js';

// Jest test suite para Gestão de Frota
describe('Gestão de Frota - Regras Críticas e Serviços', () => {
  let partnerId;
  let driverId;
  let vehicle;

  beforeAll(async () => {
    await connectTestDB();
    partnerId = new mongoose.Types.ObjectId();
    driverId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    // Limpar colecções de teste
    await FleetVehicle.deleteMany({});
    await FleetMaintenancePlan.deleteMany({});
    await FleetOdometerLog.deleteMany({});
    await FleetFuelLog.deleteMany({});
    await FleetAlert.deleteMany({});

    // Criar um veículo padrão
    vehicle = await FleetVehicle.create({
      plateNumber: `ABC-${Math.floor(Math.random() * 899 + 100)}-MP`,
      brand: 'Toyota',
      model: 'Hilux',
      year: 2022,
      type: 'Ligeiro',
      capacityKg: 1000,
      fuelType: 'Gasóleo',
      fuelTankCapacityLiters: 80,
      targetConsumptionL100km: 10.0,
      currentOdometer: 50000,
      status: 'Operacional',
      assignedDriver: driverId,
      partner: partnerId,
    });
  });

  test('1. Deve atualizar o odómetro e prevenir leituras regressivas sem crashar (gerando alerta)', async () => {
    // Atualização normal crescente
    const resNormal = await updateVehicleOdometer(vehicle._id, driverId, 50500, partnerId, 'MANUAL_DRIVER');
    expect(resNormal.currentOdometer).toBe(50500);
    expect(resNormal.isRegressive).toBe(false);

    const vehicleAfter = await FleetVehicle.findById(vehicle._id);
    expect(vehicleAfter.currentOdometer).toBe(50500);

    // Submissão de odómetro regressivo (50000 < 50500)
    const resRegressivo = await updateVehicleOdometer(vehicle._id, driverId, 50000, partnerId, 'MANUAL_DRIVER');
    expect(resRegressivo.isRegressive).toBe(true);

    // O odómetro actual no veículo não deve recuar
    const vehicleRegressivo = await FleetVehicle.findById(vehicle._id);
    expect(vehicleRegressivo.currentOdometer).toBe(50500);

    // Deve ter sido criado um alerta ODOMETER_INCONSISTENT
    const alert = await FleetAlert.findOne({ vehicle: vehicle._id, type: 'ODOMETER_INCONSISTENT' });
    expect(alert).not.toBeNull();
    expect(alert.severity).toBe('HIGH');
  });

  test('2. Deve registar abastecimento e calcular métricas de combustível corretamente (km/l, l/100km, custo/km)', async () => {
    // Abastecimento 1 a 50000 km
    await recordFuelLog(vehicle._id, driverId, partnerId, {
      date: new Date('2026-01-01'),
      gasStation: 'Total Moçambique',
      odometer: 50000,
      liters: 50,
      pricePerLiter: 85,
      totalCost: 4250,
    });

    // Abastecimento 2 a 50500 km (500 km percorridos, 50L consumidos = 10 km/l, 10 L/100km, 8.5 MZN/km)
    const log2 = await recordFuelLog(vehicle._id, driverId, partnerId, {
      date: new Date('2026-01-05'),
      gasStation: 'Petromoc',
      odometer: 50500,
      liters: 50,
      pricePerLiter: 85,
      totalCost: 4250,
    });

    expect(log2.calculatedKmDriven).toBe(500);
    expect(log2.calculatedKmL).toBe(10);
    expect(log2.calculatedL100km).toBe(10);
    expect(log2.calculatedCostPerKm).toBe(8.5);
  });

  test('3. Deve detectar anomalia de abastecimento acima da capacidade do depósito', async () => {
    // Depósito do veículo é 80L. Vamos simular abastecimento de 100L.
    await recordFuelLog(vehicle._id, driverId, partnerId, {
      date: new Date(),
      gasStation: 'Engen',
      odometer: 51000,
      liters: 100,
      pricePerLiter: 85,
      totalCost: 8500,
    });

    const alert = await FleetAlert.findOne({ vehicle: vehicle._id, type: 'FUEL_CAPACITY_EXCEEDED' });
    expect(alert).not.toBeNull();
    expect(alert.metadata.liters).toBe(100);
  });

  test('4. Deve avaliar o estado dos planos de manutenção (EM_DIA -> PROXIMA -> VENCIDA)', async () => {
    // Criar plano de manutenção para troca de óleo a cada 5000 km (Última: 50000 km -> Próxima: 55000 km, Alerta a 54500 km)
    const plan = await FleetMaintenancePlan.create({
      vehicle: vehicle._id,
      partner: partnerId,
      serviceType: 'troca_oleo',
      intervalKm: 5000,
      intervalDays: 180,
      lastMaintenanceKm: 50000,
      lastMaintenanceDate: new Date(),
      nextMaintenanceKm: 55000,
      nextMaintenanceDate: new Date(Date.now() + 180 * 86400000),
      advanceNoticeKm: 500,
      status: 'EM_DIA',
    });

    // 1. Veículo a 50000 km -> EM_DIA
    await checkVehicleMaintenancePlans(vehicle._id);
    let updatedPlan = await FleetMaintenancePlan.findById(plan._id);
    expect(updatedPlan.status).toBe('EM_DIA');

    // 2. Veículo atinge 54600 km (dentro da janela de alerta antecipado de 500 km) -> PROXIMA
    await updateVehicleOdometer(vehicle._id, driverId, 54600, partnerId, 'MANUAL_DRIVER');
    updatedPlan = await FleetMaintenancePlan.findById(plan._id);
    expect(updatedPlan.status).toBe('PROXIMA');

    const alertSoon = await FleetAlert.findOne({ vehicle: vehicle._id, type: 'MAINTENANCE_DUE_SOON_KM' });
    expect(alertSoon).not.toBeNull();

    // 3. Veículo atinge 55100 km (ultrapassou 55000 km) -> VENCIDA
    await updateVehicleOdometer(vehicle._id, driverId, 55100, partnerId, 'MANUAL_DRIVER');
    updatedPlan = await FleetMaintenancePlan.findById(plan._id);
    expect(updatedPlan.status).toBe('VENCIDA');

    const alertOverdue = await FleetAlert.findOne({ vehicle: vehicle._id, type: 'MAINTENANCE_OVERDUE' });
    expect(alertOverdue).not.toBeNull();
  });

  test('5. Deve agregar relatórios e métricas do dashboard de frota', async () => {
    const dashboard = await getFleetDashboard(partnerId);
    expect(dashboard.summary.totalVehicles).toBe(1);
    expect(dashboard.summary.operationalVehicles).toBe(1);

    const reports = await getFleetReports(partnerId, {});
    expect(reports).toHaveProperty('fuelByVehicle');
    expect(reports).toHaveProperty('fuelByDriver');
    expect(reports).toHaveProperty('maintenanceHistory');
    expect(reports).toHaveProperty('summaryCosts');
  });
});
