import 'react-native-gesture-handler/jestSetup';
import { jest } from '@jest/globals';

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      addListener: jest.fn(),
      replace: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: jest.fn(() => true),
  };
});

// Mock Bottom Sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const react = require('react');
  const BottomSheet = react.forwardRef((props, ref) => {
    react.useImperativeHandle(ref, () => ({
      expand: jest.fn(),
      collapse: jest.fn(),
      close: jest.fn(),
      snapToIndex: jest.fn(),
    }));
    return react.createElement('View', props, props.children);
  });
  const BottomSheetScrollView = (props) => react.createElement('ScrollView', props, props.children);
  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetScrollView,
  };
});

// Mock Maps
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

// Mock Map Directions
jest.mock('react-native-maps-directions', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) => React.createElement('View', props, props.children),
  };
});

// Mock Location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: {
      latitude: -25.9667,
      longitude: 32.5833,
    }
  })),
  watchPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([{
    name: 'Rua Teste',
    street: 'Rua Teste',
    city: 'Maputo',
    region: 'Maputo',
    country: 'Mozambique'
  }])),
  Accuracy: { High: 5, Balanced: 3 },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => {
    if (key === 'userData') {
      return Promise.resolve(JSON.stringify({ 
        _id: '1',
        id: '1', 
        name: 'João Silva', 
        email: 'joao@example.com', 
        phone: '+258841234567',
        token: 'mock-token' 
      }));
    }
    if (key === 'id') {
      return Promise.resolve('1');
    }
    return Promise.resolve(null);
  }),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock Flash Message
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
