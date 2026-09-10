import { calculateDynamicCommission } from '../services/walletService.js';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// Mock dependencies to isolate the formula test
jest.mock('../services/walletService.js', () => {
  const original = jest.requireActual('../services/walletService.js');
  return {
    ...original,
    getFinancialConfig: jest.fn().mockResolvedValue({
      driverCommissionRate: 0.15
    })
  };
});

import ProviderSubcategoryModel from '../models/ProviderSubcategoryModel.js';
import { connectTestDB, disconnectTestDB } from './setup.js';
import PricingEngine from '../models/PricingEngineModel.js';

describe('Commission Engine (Service vs Distance)', () => {
  let findByIdSpy;

  beforeAll(async () => {
    await connectTestDB();
    findByIdSpy = jest.spyOn(ProviderSubcategoryModel, 'findById');
    
    // Config global financeira para fallback
    await PricingEngine.create({
      financialEngine: {
        driverCommissionRate: 0.15
      }
    });
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Deve calcular comissão corretamente com taxas distintas para Serviço (10%) e Deslocação (15%)', async () => {
    // Cenário fornecido pelo utilizador:
    // Serviço: 1200 MT (10% de comissão = 120 MT)
    // Deslocação: 100 MT (15% de comissão = 15 MT)
    // Total comissão = 135 MT

    findByIdSpy.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      name: 'Reboque',
      serviceCommission: 10
    });

    const mockOrder = {
      subcategoryId: new mongoose.Types.ObjectId(),
      pricing: {
        breakdown: {
          servicePrice: 1200,
          distancePrice: 100
        },
        totalPrice: 1300
      }
    };

    const commission = await calculateDynamicCommission(mockOrder);

    // Verificações passo a passo
    expect(commission).toBe(135);
  });

  it('Deve usar a taxa global caso as comissões específicas não estejam definidas', async () => {
    // Se a subcategoria estiver sem taxas explícitas (null ou undefined),
    // o engine deve usar o getFinancialConfig (0.15 = 15%)
    
    findByIdSpy.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      name: 'Categoria Sem Taxa',
      serviceCommission: null
    });

    const mockOrder = {
      subcategoryId: new mongoose.Types.ObjectId(),
      pricing: {
        breakdown: {
          servicePrice: 1000,
          distancePrice: 200
        }
      }
    };

    // 1000 * 15% = 150
    // 200 * 15% = 30
    // Total = 180
    const commission = await calculateDynamicCommission(mockOrder);
    expect(commission).toBe(180);
  });
});
