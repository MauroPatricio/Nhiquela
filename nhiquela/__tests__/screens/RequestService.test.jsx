import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import RequestService from '../../screens/RequestService';

const initialState = {
  user: {
    userData: { 
      id: '1', 
      _id: '1',
      name: 'João Silva', 
      token: 'mock-token' 
    },
    tempRoute: null,
  },
  map: {
    origin: { location: { lat: -25.9667, lng: 32.5833 }, description: 'Maputo' },
    destination: null,
  },
  location: {
    userCoords: { latitude: -25.9667, longitude: 32.5833 },
  },
  ride: {
    rideInfo: null,
  },
  appConfigs: {
    data: {
      mapStyle: '[]'
    }
  },
  settings: {
    data: {
      baseFare: 10,
      pricePerKm: 5
    }
  }
};

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector(initialState)),
  useDispatch: () => jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => {
    if (key === 'userData') {
      return Promise.resolve(JSON.stringify(initialState.user.userData));
    }
    return Promise.resolve(null);
  }),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => ({ params: { selectedService: { name: 'Nhiquela', baseFare: 10 } } }),
    useFocusEffect: jest.fn((callback) => callback()),
    useIsFocused: jest.fn(() => true),
  };
});

// Mock hooks
jest.mock('../../hooks/createConnectionApi', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: [] })),
    post: jest.fn(() => Promise.resolve({ data: {} }))
  }
}));

// Mock socket.io-client for ride request
jest.mock('socket.io-client', () => {
  const mSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
  };
  return jest.fn(() => mSocket);
});

describe('RequestService Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and shows address inputs (Step 1)', async () => {
    const { getByPlaceholderText } = render(<RequestService navigation={mockNavigation} />);

    await waitFor(() => {
      // Step 1: Origin and Destination inputs should be visible
      expect(getByPlaceholderText('De onde partimos?')).toBeTruthy();
      expect(getByPlaceholderText('Para onde vamos?')).toBeTruthy();
    });
  });
});
