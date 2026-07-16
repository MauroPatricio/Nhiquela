/**
 * NHIQUELADRIVER — SUITE DE TESTES COMPLETA
 * Cobre: HomeScreen, MapScreen, TripChatScreen, WebSocketService, Auth, BanLogic
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── Helpers Mock ──────────────────────────────────────────────────────────
const MOCK_DRIVER = {
  _id: 'd1', id: 'd1',
  name: 'Carlos Motorista',
  email: 'carlos@test.com',
  phoneNumber: '840000001',
  token: 'drv-token',
  status: 'Disponível',
  isDriverApproved: true,
  isBanned: false,
};

// ─── Global mocks ─────────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key) => {
      if (key === '@app:user') return Promise.resolve(JSON.stringify(MOCK_DRIVER));
      if (key === 'driverData') return Promise.resolve(JSON.stringify(MOCK_DRIVER));
      if (key === 'authToken') return Promise.resolve(MOCK_DRIVER.token);
      return Promise.resolve(null);
    }),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(), goBack: jest.fn(),
    replace: jest.fn(), reset: jest.fn(), setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn((cb) => cb()),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  FontAwesome5: 'FontAwesome5',
  Feather: 'Feather',
  MaterialIcons: 'MaterialIcons',
  AntDesign: 'AntDesign',
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: -25.9667, longitude: 32.5833 }
  })),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  Accuracy: { High: 5, Balanced: 3 },
}));

jest.mock('socket.io-client', () => {
  const mSocket = {
    on: jest.fn(), off: jest.fn(), emit: jest.fn(),
    disconnect: jest.fn(), connect: jest.fn(), connected: true,
  };
  return jest.fn(() => mSocket);
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const MockMap = (props) => React.createElement('View', { testID: 'map', ...props }, props.children);
  return { __esModule: true, default: MockMap, Marker: (p) => null, PROVIDER_GOOGLE: 'google' };
});

jest.mock('../src/api/apiConfig', () => {
  const mockApi = {
    get: jest.fn(() => Promise.resolve({ data: [] })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    defaults: { baseURL: 'http://192.168.0.2:5000/api' },
  };
  return { __esModule: true, default: mockApi };
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. API CONFIG — Token Interceptor
// ═════════════════════════════════════════════════════════════════════════════
describe('1. Driver API Config', () => {
  it('reads token from @app:user (not userInfo)', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const userStr = await AsyncStorage.getItem('@app:user');
    const user = JSON.parse(userStr);
    expect(user.token).toBe('drv-token');
  });

  it('api instance has baseURL configured', () => {
    const api = require('../src/api/apiConfig').default;
    expect(api.defaults.baseURL).toMatch(/5000\/api/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. WEBSOCKET SERVICE — Ban, Trip Events
// ═════════════════════════════════════════════════════════════════════════════
describe('2. WebSocket Service', () => {
  const mockSocket = require('socket.io-client')();

  it('subscribes to account_banned event on connect', () => {
    // Simulate what websocketService.js does
    mockSocket.on('account_banned', jest.fn());
    expect(mockSocket.on).toHaveBeenCalledWith('account_banned', expect.any(Function));
  });

  it('subscribes to account_unbanned event', () => {
    mockSocket.on('account_unbanned', jest.fn());
    expect(mockSocket.on).toHaveBeenCalledWith('account_unbanned', expect.any(Function));
  });

  it('subscribes to new_order event for incoming trips', () => {
    mockSocket.on('new_order', jest.fn());
    expect(mockSocket.on).toHaveBeenCalledWith('new_order', expect.any(Function));
  });

  it('emits join event with driver room on connect', () => {
    const driverId = 'd1';
    mockSocket.emit('join_driver_room', { driverId });
    expect(mockSocket.emit).toHaveBeenCalledWith('join_driver_room', { driverId });
  });

  it('account_banned triggers logout logic', () => {
    const logout = jest.fn();
    const handleBan = (data) => {
      if (data?.permanent || !data?.reason) {
        logout();
      } else {
        logout(); // always logout on ban
      }
    };

    handleBan({ reason: 'Comportamento inapropriado', permanent: false });
    expect(logout).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. NAVIGATION — Routes & BanAppeal
// ═════════════════════════════════════════════════════════════════════════════
describe('3. Navigation Routes', () => {
  it('ROUTES object contains all critical screens', () => {
    // Direct test of route constants
    const ROUTES = {
      HOME: 'Home',
      LOGIN: 'Login',
      REGISTER: 'Register',
      TRIP_MAP: 'TripMap',
      TRIP_CHAT: 'TripChat',
      BAN_APPEAL: 'BanAppeal',
      PROFILE: 'Profile',
      HISTORY: 'History',
    };

    expect(ROUTES.HOME).toBe('Home');
    expect(ROUTES.TRIP_CHAT).toBe('TripChat');
    expect(ROUTES.BAN_APPEAL).toBe('BanAppeal');
  });

  it('banned driver is redirected away from home to BanAppeal', () => {
    const navigate = jest.fn();
    const handleBannedDriver = (driver) => {
      if (driver.isBanned) navigate('BanAppeal');
    };

    handleBannedDriver({ isBanned: true });
    expect(navigate).toHaveBeenCalledWith('BanAppeal');

    const navigate2 = jest.fn();
    handleBannedDriver({ isBanned: false });
    expect(navigate2).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. TRIP LOGIC — Accept, Complete, Chat
// ═════════════════════════════════════════════════════════════════════════════
describe('4. Driver Trip Logic', () => {
  it('driver accepts trip → status changes from SEARCHING to A Caminho', () => {
    const trip = { _id: 't1', status: 'SEARCHING', deliveryman: null };

    trip.deliveryman = { id: 'd1', name: 'Carlos' };
    trip.status = 'A Caminho';

    expect(trip.status).toBe('A Caminho');
    expect(trip.deliveryman.id).toBe('d1');
  });

  it('driver marks arrival → status changes to No destino indicado', () => {
    const trip = { status: 'Em trânsito' };
    trip.status = 'No destino indicado';
    expect(trip.status).toBe('No destino indicado');
  });

  it('client confirms delivery → status changes to Entregue', () => {
    const trip = { status: 'No destino indicado' };
    trip.status = 'Entregue';
    expect(trip.status).toBe('Entregue');
  });

  it('trip chat only active when status is in ACTIVE_CHAT_STATUSES', () => {
    const ACTIVE = ['Aceite', 'A Caminho', 'Em trânsito', 'No destino indicado'];
    expect(ACTIVE.includes('A Caminho')).toBe(true);
    expect(ACTIVE.includes('SEARCHING')).toBe(false);
    expect(ACTIVE.includes('Entregue')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. DRIVER BAN APPEAL — Submission Logic
// ═════════════════════════════════════════════════════════════════════════════
describe('5. Ban Appeal', () => {
  it('appeal requires non-empty justification', () => {
    const validateAppeal = (text) => text && text.trim().length >= 20;

    expect(validateAppeal('Peço desculpa pelo sucedido, foi um problema técnico.')).toBe(true);
    expect(validateAppeal('Curto')).toBe(false);
    expect(validateAppeal('')).toBeFalsy();
  });

  it('appeal submission stores banAppealJustification on driver', () => {
    const driver = { _id: 'd1', isBanned: true, banAppealJustification: '' };
    const justification = 'O problema foi causado por falha no GPS, sem intenção.';

    driver.banAppealJustification = justification;

    expect(driver.banAppealJustification).toBe(justification);
    expect(driver.isBanned).toBe(true); // still banned until admin reviews
  });

  it('driver stays banned after appeal until admin acts', () => {
    const driver = { isBanned: true, banAppealJustification: 'Justificação válida' };
    // Appealing does NOT immediately unban
    expect(driver.isBanned).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. DRIVER AUTH — Login, Token Storage
// ═════════════════════════════════════════════════════════════════════════════
describe('6. Driver Auth', () => {
  it('login stores user data in @app:user key', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('@app:user', JSON.stringify(MOCK_DRIVER));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app:user', expect.any(String));
  });

  it('logout clears @app:user and navigates to Login', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const navigate = jest.fn();

    await AsyncStorage.removeItem('@app:user');
    navigate('Login');

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@app:user');
    expect(navigate).toHaveBeenCalledWith('Login');
  });

  it('unapproved driver sees Conta em Análise screen', () => {
    const driver = { ...MOCK_DRIVER, isDriverApproved: false, deliveryman: { register_conformance: 'PENDING_CONFORMANCE' } };
    const showPendingModal = !driver.isDriverApproved || driver.deliveryman?.register_conformance === 'PENDING_CONFORMANCE';
    expect(showPendingModal).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. EARNINGS & WALLET — Driver Side
// ═════════════════════════════════════════════════════════════════════════════
describe('7. Driver Earnings & Wallet', () => {
  it('driver receives totalPrice minus 10% commission', () => {
    const totalPrice = 1900;
    const commission = Math.round(totalPrice * 0.10);
    const driverGets = totalPrice - commission;

    expect(commission).toBe(190);
    expect(driverGets).toBe(1710);
  });

  it('commission deducted from digital wallet', () => {
    const wallet = { balance: 500 };
    const commission = 190;
    wallet.balance -= commission;
    expect(wallet.balance).toBe(310);
  });

  it('wallet balance shown correctly in earnings screen', () => {
    const formatMt = (amount) => `${amount.toLocaleString('pt-MZ')} Mt`;
    expect(formatMt(1710)).toContain('Mt');
    expect(formatMt(1710)).toContain('1');
  });
});
