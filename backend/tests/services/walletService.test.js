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
    findOne: jest.fn().mockImplementation(async (query) => {
      if (query.key === 'driver_commission_rate') {
        return { key: 'driver_commission_rate', value: '15' };
      }
      if (query.key === 'enable_global_commission') {
        return { key: 'enable_global_commission', value: 'true' };
      }
      return null;
    })
  }
}));

jest.unstable_mockModule('../../models/ProviderSubcategoryModel.js', () => ({
  default: {
    findById: jest.fn().mockImplementation((id) => {
      if (id === 'sub_with_commission') {
        return Promise.resolve({ serviceCommission: 10 }); // 10% (defaults to AUTO_PLUS_PROVIDER fallback)
      }
      if (id === 'sub_auto') {
        return Promise.resolve({ serviceCommission: 10, pricingMode: 'AUTO' }); // 10% of distance only
      }
      if (id === 'sub_provider') {
        return Promise.resolve({ serviceCommission: 10, pricingMode: 'PROVIDER_DEFINED' }); // 10% of service only
      }
      if (id === 'sub_auto_plus_provider') {
        return Promise.resolve({ serviceCommission: 10, pricingMode: 'AUTO_PLUS_PROVIDER' }); // 10% of total
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

  it('deve calcular a comissao dinâmica corretamente aplicando a percentagem do serviço ao total (prestacao + deslocacao)', async () => {
    const order = {
      serviceId: 'sub_with_commission',
      pricing: {
        costServico: 1500,
        costDeslocacao: 80
      }
    };

    // Total = 1500 + 80 = 1580
    // Comissao = 1580 * 10% = 158
    const commission = await calculateDynamicCommission(order);
    expect(commission).toBeCloseTo(158);
  });

  it('deve calcular a comissao dinâmica apenas sobre o valor da deslocacao no modo AUTO', async () => {
    const order = {
      serviceId: 'sub_auto',
      pricing: {
        costServico: 1500,
        costDeslocacao: 80
      }
    };

    // Comissao = 80 * 10% = 8
    const commission = await calculateDynamicCommission(order);
    expect(commission).toBeCloseTo(8);
  });

  it('deve calcular a comissao dinâmica apenas sobre o valor do prestador no modo PROVIDER_DEFINED', async () => {
    const order = {
      serviceId: 'sub_provider',
      pricing: {
        costServico: 1500,
        costDeslocacao: 80
      }
    };

    // Comissao = 1500 * 10% = 150
    const commission = await calculateDynamicCommission(order);
    expect(commission).toBeCloseTo(150);
  });

  it('deve calcular a comissao dinâmica sobre o total (prestacao + deslocacao) no modo AUTO_PLUS_PROVIDER', async () => {
    const order = {
      serviceId: 'sub_auto_plus_provider',
      pricing: {
        costServico: 1500,
        costDeslocacao: 80
      }
    };

    // Comissao = (1500 + 80) * 10% = 158
    const commission = await calculateDynamicCommission(order);
    expect(commission).toBeCloseTo(158);
  });
});
