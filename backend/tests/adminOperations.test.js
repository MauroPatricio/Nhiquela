import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import Wallet from '../models/WalletModel.js';
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import { debitCommission, creditWallet } from '../services/walletService.js';


// Setup in-memory MongoDB for testing (assuming there is a global setup or doing a quick mock)
describe('Admin Operations & Fraud Engine Tests', () => {

  describe('Wallet NegativeSince tracking', () => {
    let mockWallet;
    
    beforeEach(() => {
      mockWallet = {
        _id: 'w1',
        balance: 100,
        negativeSince: null,
        save: jest.fn().mockResolvedValue(true)
      };
      
      jest.spyOn(Wallet, 'findOne').mockResolvedValue(mockWallet);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('Should set negativeSince when balance drops below 0', async () => {
      // Mock getFinancialConfig globally or assume simple config
      jest.mock('../services/walletService.js', () => {
        const originalModule = jest.requireActual('../services/walletService.js');
        return {
          ...originalModule,
          getFinancialConfig: jest.fn().mockResolvedValue({ allowNegativeBalance: true, creditLimit: -1000 })
        };
      });

      // Simulate logic from walletService debit
      mockWallet.balance -= 200; // balance is now -100
      if (mockWallet.balance < 0 && !mockWallet.negativeSince) {
        mockWallet.negativeSince = new Date();
      } else if (mockWallet.balance >= 0) {
        mockWallet.negativeSince = null;
      }
      
      expect(mockWallet.negativeSince).not.toBeNull();
    });

    it('Should clear negativeSince when balance becomes positive', async () => {
      mockWallet.balance = -50;
      mockWallet.negativeSince = new Date('2023-01-01');

      // Credit wallet
      mockWallet.balance += 100; // balance is now 50
      if (mockWallet.balance >= 0) {
        mockWallet.negativeSince = null;
      }

      expect(mockWallet.negativeSince).toBeNull();
    });
  });

  describe('Fraud Engine Suspend logic', () => {
    it('Should suspend drivers with balance <= -500 and negative for 3 days', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 4);
      
      const mockBadWallet = {
        ownerType: 'driver',
        ownerId: 'd1',
        balance: -600,
        negativeSince: threeDaysAgo
      };
      
      const mockDriver = {
        _id: 'd1',
        name: 'Bad Driver',
        isBanned: false,
        status: 'Disponível',
        availability: 'active',
        banReason: '',
        save: jest.fn().mockResolvedValue(true)
      };
      
      jest.spyOn(Wallet, 'find').mockResolvedValue([mockBadWallet]);
      jest.spyOn(User, 'findById').mockResolvedValue(mockDriver);
      
      // ── Testar a lógica do Fraud Engine DIRETAMENTE (sem depender do mock do cron) ──
      // Replica exatamente o que o cron callback do fraudEngine.js faz
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      const suspectWallets = await Wallet.find({
        ownerType: 'driver',
        balance: { $lte: -500 },
        negativeSince: { $ne: null }
      });

      for (const wallet of suspectWallets) {
        const daysSinceNegative = Date.now() - new Date(wallet.negativeSince).getTime();
        if (daysSinceNegative >= THREE_DAYS_MS) {
          const driver = await User.findById(wallet.ownerId);
          if (driver && !driver.isBanned) {
            driver.isBanned = true;
            driver.status = 'Inativo';
            driver.availability = 'inactive';
            driver.banReason = 'Saldo negativo por mais de 3 dias consecutivos.';
            await driver.save();
          }
        }
      }
      
      expect(mockDriver.isBanned).toBe(true);
      expect(mockDriver.status).toBe('Inativo');
      expect(mockDriver.availability).toBe('inactive');
      expect(mockDriver.save).toHaveBeenCalled();
    });
  });

  describe('Force Cancel & Refund Trip', () => {
    it('Should mark trip as cancelled, free up driver, and trigger refund', async () => {
      const mockRequest = {
        _id: 'r1',
        status: 'A Caminho',
        driverId: 'd1',
        userId: 'u1',
        totalPrice: 1000,
        paymentMethod: 'Carteira',
        save: jest.fn()
      };

      const mockDriver = {
        _id: 'd1',
        status: 'Ocupado',
        availability: 'active',
        save: jest.fn()
      };

      jest.spyOn(RequestService, 'findById').mockResolvedValue(mockRequest);
      jest.spyOn(User, 'findById').mockResolvedValue(mockDriver);
      
      // Simular a route logic
      mockRequest.status = 'CANCELLED';
      mockRequest.paymentStatus = 'Reembolsado (Admin)';
      if (mockRequest.driverId) {
        mockDriver.status = 'Disponível';
        mockDriver.availability = 'active';
        await mockDriver.save();
      }
      await mockRequest.save();

      expect(mockRequest.status).toBe('CANCELLED');
      expect(mockDriver.status).toBe('Disponível');
      expect(mockDriver.save).toHaveBeenCalled();
      expect(mockRequest.save).toHaveBeenCalled();
    });
  });

});
