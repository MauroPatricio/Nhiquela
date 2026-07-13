import { jest } from '@jest/globals';

global.window = global || {};

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-expo-push-token' }),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
}));

// Mock Expo and related modules
jest.mock('@expo/vector-icons', () => {
  return {
    Ionicons: 'Ionicons',
    MaterialCommunityIcons: 'MaterialCommunityIcons',
    MaterialIcons: 'MaterialIcons',
    FontAwesome: 'FontAwesome',
  };
});

jest.mock('expo-font', () => ({
  isLoaded: jest.fn(),
  loadAsync: jest.fn(),
}));


jest.mock('expo-modules-core', () => {
  return {
    NativeModulesProxy: {},
    EventEmitter: function () {
      this.addListener = jest.fn();
      this.removeListeners = jest.fn();
    },
    requireNativeModule: jest.fn(),
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
    })),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn((cb) => cb()),
  };
});

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: -25.9692,
      longitude: 32.5732,
    },
  }),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'mock-image-uri.jpg' }],
  }),
}));

// Mock toast packages
jest.mock('react-native-toast-notifications', () => ({
  useToast: () => ({
    show: jest.fn(),
    hide: jest.fn(),
    hideAll: jest.fn(),
  }),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}));

jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
  hideMessage: jest.fn(),
}));

// Mock React Native Reanimated (often causes issues in tests)
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

jest.mock('react-native-toast-notifications', () => ({
  useToast: jest.fn(() => ({
    show: jest.fn(),
    hide: jest.fn(),
    hideAll: jest.fn()
  }))
}));