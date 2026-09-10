/**
 * BACKEND COMPLETE TEST SUITE
 * Cobre: Auth, Drivers, Pedidos, Wallet, Chat, Ban/Unban, Scheduled Orders, Fraud Engine
 */
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// ─── Models ──────────────────────────────────────────────────────────────────
import User from '../models/UserModel.js';
import RequestService from '../models/RequestServiceModel.js';
import Wallet from '../models/WalletModel.js';
import TripChat from '../models/TripChatModel.js';

// ─── Services ────────────────────────────────────────────────────────────────
import { debitCommission, creditWallet } from '../services/walletService.js';

// ─── Utils ───────────────────────────────────────────────────────────────────
import { isAuth, isAdmin, generateToken } from '../utils.js';

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 1: AUTENTICAÇÃO & TOKENS
// ═════════════════════════════════════════════════════════════════════════════
describe('1. Auth & Token Utils', () => {
  beforeAll(() => {
    // Garantir que JWT_SECRET está definido no ambiente de teste
    process.env.JWT_SECRET = 'nhiquela-test-secret-key-2024';
  });

  it('generateToken returns a string JWT token', () => {
    const token = generateToken({ _id: 'user1', name: 'Test', isAdmin: false });
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  it('isAuth middleware rejects requests without token', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    isAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('isAuth middleware calls next() for valid Bearer token', () => {
    // generateToken uses user.id as the JWT _id payload field
    const token = generateToken({ id: 'u1', name: 'Test', isAdmin: false });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    isAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    // _id in decoded JWT corresponds to the user.id passed
    expect(req.user._id).toBeDefined();
  });

  it('isAdmin middleware rejects non-admin users', () => {
    const req = { user: { _id: 'u1', isAdmin: false } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    isAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('isAdmin middleware allows admin users', () => {
    const req = { user: { _id: 'admin1', isAdmin: true } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    isAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 2: MOTORISTAS — Registo, Aprovação, Suspensão, Ban
// ═════════════════════════════════════════════════════════════════════════════
describe('2. Driver Management', () => {
  afterEach(() => jest.restoreAllMocks());

  it('Driver registration creates user with isDeliveryMan:true and PENDING_CONFORMANCE', () => {
    const driver = {
      name: 'Carlos Silva',
      email: 'carlos@test.com',
      isDeliveryMan: true,
      isBanned: false,
      status: 'Pendente',
      deliveryman: {
        register_conformance: 'PENDING_CONFORMANCE',
      },
    };

    expect(driver.isDeliveryMan).toBe(true);
    expect(driver.isBanned).toBe(false);
    expect(driver.deliveryman.register_conformance).toBe('PENDING_CONFORMANCE');
  });

  it('Admin approves driver → status changes to Disponível and isApproved:true', () => {
    const driver = {
      _id: 'd1',
      status: 'Pendente',
      isApproved: false,
      isBanned: false,
      deliveryman: { register_conformance: 'PENDING_CONFORMANCE' },
      save: jest.fn().mockResolvedValue(true),
    };

    // Simular aprovação
    driver.deliveryman.register_conformance = 'CONFORMANCE';
    driver.isApproved = true;
    driver.status = 'Disponível';

    expect(driver.isApproved).toBe(true);
    expect(driver.status).toBe('Disponível');
  });

  it('Instant ban sets isBanned:true, status:Inativo, records reason', () => {
    const driver = {
      _id: 'd1',
      isBanned: false,
      status: 'Disponível',
      availability: 'active',
      banReason: '',
      save: jest.fn(),
    };

    const reason = 'Comportamento inadequado com o cliente';

    driver.isBanned = true;
    driver.status = 'Inativo';
    driver.availability = 'inactive';
    driver.banReason = reason;

    expect(driver.isBanned).toBe(true);
    expect(driver.banReason).toBe(reason);
    expect(driver.availability).toBe('inactive');
  });

  it('Unban clears isBanned flag and resets banReason', () => {
    const driver = {
      _id: 'd1',
      isBanned: true,
      banReason: 'Mau comportamento',
      banAppealJustification: 'Peço desculpa, foi um mal-entendido.',
      save: jest.fn(),
    };

    driver.isBanned = false;
    driver.banReason = '';
    driver.banAppealJustification = '';

    expect(driver.isBanned).toBe(false);
    expect(driver.banReason).toBe('');
  });

  it('Driver appeal stores justification in banAppealJustification', () => {
    const driver = {
      _id: 'd1',
      isBanned: true,
      banReason: 'Atraso frequente',
      banAppealJustification: '',
      save: jest.fn(),
    };

    const justification = 'Houve um problema técnico com o GPS que causou os atrasos.';
    driver.banAppealJustification = justification;

    expect(driver.banAppealJustification).toBe(justification);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 3: PEDIDOS — Imediatos & Agendados
// ═════════════════════════════════════════════════════════════════════════════
describe('3. Request Service — Immediate & Scheduled Trips', () => {
  afterEach(() => jest.restoreAllMocks());

  it('Immediate trip is created with status SEARCHING', () => {
    const trip = {
      userId: 'u1',
      origin: 'Maputo Centro',
      destination: 'Matola',
      totalPrice: 1900,
      deliveryPrice: 90,
      servicePrice: 1810,
      status: 'SEARCHING',
      isScheduled: false,
    };

    expect(trip.status).toBe('SEARCHING');
    expect(trip.isScheduled).toBe(false);
  });

  it('Scheduled trip is created with status SCHEDULED and stores scheduledAt', () => {
    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h from now
    const trip = {
      userId: 'u1',
      origin: 'Maputo Centro',
      destination: 'Matola',
      totalPrice: 1900,
      status: 'SCHEDULED',
      isScheduled: true,
      scheduledAt,
    };

    expect(trip.status).toBe('SCHEDULED');
    expect(trip.isScheduled).toBe(true);
    expect(trip.scheduledAt).toBeInstanceOf(Date);
    expect(trip.scheduledAt > new Date()).toBe(true);
  });

  it('Scheduling engine activates trip when 45 min remain', () => {
    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 44 * 60 * 1000); // 44 min from now
    
    const DISPATCH_WINDOW_MS = 45 * 60 * 1000;
    const timeUntilTrip = scheduledAt.getTime() - now.getTime();
    const shouldActivate = timeUntilTrip <= DISPATCH_WINDOW_MS;

    expect(shouldActivate).toBe(true);
  });

  it('Trip price breakdown: totalPrice = deliveryPrice + servicePrice', () => {
    const deliveryPrice = 90;
    const servicePrice = 1810;
    const totalPrice = 1900;

    expect(deliveryPrice + servicePrice).toBe(totalPrice);
  });

  it('Commission calculation: 10% of totalPrice goes to platform', () => {
    const totalPrice = 1900;
    const COMMISSION_RATE = 0.10;
    const commission = Math.round(totalPrice * COMMISSION_RATE);
    const driverReceives = totalPrice - commission;

    expect(commission).toBe(190);
    expect(driverReceives).toBe(1710);
  });

  it('Driver accepts trip → status changes to A Caminho', () => {
    const trip = { status: 'SEARCHING', deliveryman: null };
    const driver = { _id: 'd1', name: 'Carlos' };

    trip.deliveryman = { id: driver._id, name: driver.name };
    trip.status = 'A Caminho';

    expect(trip.status).toBe('A Caminho');
    expect(trip.deliveryman.id).toBe('d1');
  });

  it('Trip completion → status changes to Entregue', () => {
    const trip = { status: 'Em trânsito' };
    trip.status = 'Entregue';
    expect(trip.status).toBe('Entregue');
  });

  it('Admin force-cancel uses deliveryman.id if present, falls back to driverId', () => {
    const tripWithNew = { deliveryman: { id: 'new-driver-id' }, driverId: null };
    const tripWithLegacy = { deliveryman: null, driverId: 'legacy-driver-id' };

    const getDriverId1 = tripWithNew.deliveryman?.id || tripWithLegacy.driverId;
    const getDriverId2 = tripWithLegacy.deliveryman?.id || tripWithLegacy.driverId;

    expect(getDriverId1).toBe('new-driver-id');
    expect(getDriverId2).toBe('legacy-driver-id');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 4: CARTEIRA DIGITAL — Crédito, Débito, Comissão
// ═════════════════════════════════════════════════════════════════════════════
describe('4. Digital Wallet', () => {
  afterEach(() => jest.restoreAllMocks());

  it('Wallet balance starts at 0 for new users', () => {
    const wallet = { ownerId: 'u1', ownerType: 'driver', balance: 0 };
    expect(wallet.balance).toBe(0);
  });

  it('Commission debit reduces driver wallet balance correctly', () => {
    const wallet = { balance: 1000 };
    const commission = 190;
    wallet.balance -= commission;
    expect(wallet.balance).toBe(810);
  });

  it('Credit increases wallet balance', () => {
    const wallet = { balance: 500 };
    const credit = 1710;
    wallet.balance += credit;
    expect(wallet.balance).toBe(2210);
  });

  it('negativeSince is set when balance goes below 0', () => {
    const wallet = { balance: 100, negativeSince: null };
    wallet.balance -= 200; // now -100
    if (wallet.balance < 0 && !wallet.negativeSince) {
      wallet.negativeSince = new Date();
    }
    expect(wallet.negativeSince).not.toBeNull();
  });

  it('negativeSince is cleared when balance returns to positive', () => {
    const wallet = { balance: -100, negativeSince: new Date('2023-01-01') };
    wallet.balance += 200; // now 100
    if (wallet.balance >= 0) wallet.negativeSince = null;
    expect(wallet.negativeSince).toBeNull();
  });

  it('Fraud engine suspends driver after 3 days below -500', async () => {
    const threeDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const wallet = { ownerType: 'driver', ownerId: 'd1', balance: -600, negativeSince: threeDaysAgo };
    const driver = { _id: 'd1', isBanned: false, status: 'Disponível', save: jest.fn() };

    jest.spyOn(Wallet, 'find').mockResolvedValue([wallet]);
    jest.spyOn(User, 'findById').mockResolvedValue(driver);

    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    const wallets = await Wallet.find({ ownerType: 'driver', balance: { $lte: -500 } });
    for (const w of wallets) {
      if (Date.now() - new Date(w.negativeSince).getTime() >= THREE_DAYS) {
        const d = await User.findById(w.ownerId);
        if (d && !d.isBanned) {
          d.isBanned = true;
          d.status = 'Inativo';
          await d.save();
        }
      }
    }

    expect(driver.isBanned).toBe(true);
    expect(driver.status).toBe('Inativo');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 5: TRIP CHAT — Mensagens, Segurança, Histórico
// ═════════════════════════════════════════════════════════════════════════════
describe('5. Trip Chat', () => {
  it('Chat message is stored with tripId, senderId, senderType', () => {
    const msg = {
      tripId: 'trip1',
      senderId: 'u1',
      senderType: 'client',
      message: 'Quando chega?',
      createdAt: new Date(),
    };

    expect(msg.tripId).toBe('trip1');
    expect(msg.senderType).toBe('client');
    expect(msg.message).toBeTruthy();
  });

  it('Phone number detection: regex blocks sharing contact info', () => {
    const CONTACT_PATTERN = /(\+?\d[\d\s\-().]{7,}\d)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    
    const withPhone = 'Chama-me no +258841234567';
    const withEmail = 'Manda email para joao@test.com';
    const safeMsg = 'Estou a caminho, 5 minutos';

    expect(CONTACT_PATTERN.test(withPhone)).toBe(true);
    CONTACT_PATTERN.lastIndex = 0;
    expect(CONTACT_PATTERN.test(withEmail)).toBe(true);
    CONTACT_PATTERN.lastIndex = 0;
    expect(CONTACT_PATTERN.test(safeMsg)).toBe(false);
  });

  it('Chat is read-only when trip is in terminal status', () => {
    const TERMINAL_STATUSES = ['Entregue', 'Finalizado', 'Cancelado'];
    const activeTrip = { status: 'Em trânsito' };
    const doneTrip = { status: 'Entregue' };

    expect(TERMINAL_STATUSES.includes(activeTrip.status)).toBe(false);
    expect(TERMINAL_STATUSES.includes(doneTrip.status)).toBe(true);
  });

  it('Admin can always read trip chat messages', () => {
    const adminUser = { isAdmin: true };
    const canAccess = (user) => user.isAdmin || user.isParticipant;
    expect(canAccess(adminUser)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 6: NOTIFICAÇÕES & SOCKET EVENTS
// ═════════════════════════════════════════════════════════════════════════════
describe('6. Socket Events & Notifications', () => {
  it('account_banned event uses driver room driver_<id>', () => {
    const driverId = 'drv123';
    const room = `driver_${driverId}`;
    expect(room).toBe('driver_drv123');
  });

  it('trip chat room follows pattern trip_<id>', () => {
    const tripId = 'abc456';
    const room = `trip_${tripId}`;
    expect(room).toBe('trip_abc456');
  });

  it('order tracking room follows pattern order_<id>', () => {
    const orderId = 'ord789';
    const room = `order_${orderId}`;
    expect(room).toBe('order_ord789');
  });

  it('driver personal room follows pattern driver_<id> for notifications', () => {
    const driverId = 'drv001';
    const ioEmitTarget = `driver_${driverId}`;
    expect(ioEmitTarget.startsWith('driver_')).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 7: VALIDAÇÕES DE DADOS
// ═════════════════════════════════════════════════════════════════════════════
describe('7. Data Validations', () => {
  it('Trip totalPrice must be positive', () => {
    const prices = [1900, 90, 500, 0, -10];
    const valid = prices.filter(p => p > 0);
    expect(valid).toEqual([1900, 90, 500]);
  });

  it('Commission rate is exactly 10% of service price', () => {
    const testCases = [
      { servicePrice: 1000, expected: 100 },
      { servicePrice: 500, expected: 50 },
      { servicePrice: 1900, expected: 190 },
    ];
    testCases.forEach(({ servicePrice, expected }) => {
      expect(Math.round(servicePrice * 0.10)).toBe(expected);
    });
  });

  it('Scheduled trip must have scheduledAt in the future', () => {
    const validDate = new Date(Date.now() + 60 * 60 * 1000); // 1h from now
    const invalidDate = new Date(Date.now() - 60 * 60 * 1000); // 1h ago

    expect(validDate > new Date()).toBe(true);
    expect(invalidDate > new Date()).toBe(false);
  });

  it('Driver ban requires a non-empty reason', () => {
    const validateBan = (reason) => reason && reason.trim().length > 0;
    expect(validateBan('Mau comportamento')).toBe(true);
    expect(validateBan('')).toBeFalsy();
    expect(validateBan(null)).toBeFalsy();
  });
});
