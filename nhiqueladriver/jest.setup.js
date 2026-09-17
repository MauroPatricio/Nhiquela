import { jest } from '@jest/globals';

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { playAsync: jest.fn(), unloadAsync: jest.fn() } })),
    }
  }
}));

jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      addListener: jest.fn(),
      replace: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: jest.fn(() => true),
  };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const MapView = (props) => React.createElement('View', props, props.children);
  const Marker = (props) => React.createElement('View', props, props.children);
  const Polyline = (props) => React.createElement('View', props, props.children);
  const Callout = (props) => React.createElement('View', props, props.children);
  return {
    __esModule: true,
    default: MapView,
    Marker,
    Polyline,
    Callout,
  };
});

jest.mock('react-native-maps-directions', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) => React.createElement('View', props, props.children),
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: {
      latitude: -25.9667,
      longitude: 32.5833,
    }
  })),
  watchPositionAsync: jest.fn(),
  Accuracy: { High: 5, Balanced: 3 },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    getItem: jest.fn((key) => {
      if (key === 'driverData') {
        return Promise.resolve(JSON.stringify({ 
          _id: '1',
          id: '1', 
          name: 'Motorista Teste', 
          email: 'motorista@example.com', 
          token: 'mock-token',
          status: 'Online'
        }));
      }
      return Promise.resolve(null);
    }),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(),
  }
}));

jest.mock('react-native-flash-message', () => {
  const React = require('react');
  const FlashMessage = (props) => React.createElement('View', props, props.children);
  return {
    __esModule: true,
    default: FlashMessage,
    showMessage: jest.fn(),
    hideMessage: jest.fn(),
  };
});

// Socket.io mock
jest.mock('socket.io-client', () => {
  const mSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
  };
  return {
    __esModule: true,
    default: jest.fn(() => mSocket)
  };
});
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn(), isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)) }));
