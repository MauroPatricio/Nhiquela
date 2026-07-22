import { jest } from '@jest/globals';

// Mock mongoose models before importing the service
jest.unstable_mockModule('../../models/PricingEngineModel.js', () => ({
  default: {
    findOne: jest.fn().mockResolvedValue({
      financialEngine: { driverCommissionRate: 0.15 }
    })
  }
}));

jest.unstable_mockModule('../../models/SettingsModel.js', () => ({
  default: {
    findOne: jest.fn().mockResolvedValue({ key: 'driver_commission_rate', value: '15' })
  }
}));

jest.unstable_mockModule('../../models/ProviderSubcategoryModel.js', () => ({
  default: {
    findById: jest.fn().mockImplementation((id) => {
      if (id === 'sub_with_commission') {
        return Promise.resolve({ serviceCommission: 10 }); // 10%
      }
      return Promise.resolve(null);
    })
  }
}));

jest.unstable_mockModule('../../models/WalletModel.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/UserModel.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/PartnerModel.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/VehicleTypeModel.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/TransactionModel.js', () => ({ default: {} }));

// Dynamic import for walletService after mocking
const { calculateDynamicCommission } = await import('../../services/walletService.js');

describe('walletService - calculateDynamicCommission', () => {
  it('deve calcular a comissao usando o fallback global se nao houver subcategoria (15% total)', async () => {
    const order = {
      pricing: {
        costServico: 1500,
        costDeslocacao: 80
      }
    };
    
    // (1500 + 80) * 0.15 = 1580 * 0.15 = 237
    const commission = await calculateDynamicCommission(order);
    expect(commission).toBeCloseTo(237);
  });

  it('deve calcular a comissao dinâmica corretamente (serviço a 10% e deslocacao a 15%)', async () => {
    const order = {
      serviceId: 'sub_with_commission',
      pricing: {
        costServico: 1500,
        costDeslocacao: 80
      }
    };

    // Servico: 1500 * 10% = 150
    // Deslocacao: 80 * 15% = 12
    // Total esperado: 162
    const commission = await calculateDynamicCommission(order);
    expect(commission).toBeCloseTo(162);
  });
});
