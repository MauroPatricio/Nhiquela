import React from 'react';
import { render } from '@testing-library/react-native';
import MapScreen from '../../src/screens/MapScreen';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        tripData: {
          id: 'trip123',
          status: 'Aceite',
          stepStatus: 4,
          pickup: 'Avenida Marginal, Maputo',
          destination: 'Baixa, Maputo',
          paymentMethod: 'Dinheiro',
          goodType: 'Eletrônicos',
          reward: 'MZN 200',
          passenger: 'Cliente Maria',
          passengerPhone: '820000000',
          passengerImage: 'http://test.image',
        }
      }
    }),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = (props) => <View testID="map-view">{props.children}</View>;
  MapView.Marker = (props) => <View testID="marker">{props.children}</View>;
  MapView.Polyline = (props) => <View testID="polyline">{props.children}</View>;
  return MapView;
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 0, longitude: 0 } }),
  watchPositionAsync: jest.fn(),
}));

jest.mock('../../src/components/TripMap', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="trip-map-mock" />;
});

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

jest.mock('../../src/services/driverLocationService', () => ({
  __esModule: true,
  updateDeliverymanLocation: jest.fn().mockResolvedValue({}),
  updateDriverLocation: jest.fn().mockResolvedValue({}),
  getCurrentLocation: jest.fn().mockResolvedValue({ latitude: 0, longitude: 0 }),
}));

jest.mock('../../src/api/apiConfig', () => ({
  API_BASE_URL: 'http://test.url/api',
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  default: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
  }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(JSON.stringify({
    id: 'trip123',
    status: 'Aceite',
    stepStatus: 4,
    pickup: 'Avenida Marginal, Maputo',
    destination: 'Baixa, Maputo',
    paymentMethod: 'Dinheiro',
    goodType: 'Eletrônicos',
    reward: 'MZN 200',
    passenger: 'Cliente Maria',
    passengerPhone: '820000000',
    passengerImage: 'http://test.image',
  })),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('MapScreen', () => {
  it('renders order details card with client and trip info correctly', async () => {
    const { findByText } = render(
      <NavigationContainer>
        <MapScreen />
      </NavigationContainer>
    );

    // Wait for async storage and state updates to render the trip data card
    expect(await findByText('Cliente Maria')).toBeTruthy();
    expect(await findByText('820000000')).toBeTruthy();

    expect(await findByText('Avenida Marginal, Maputo')).toBeTruthy();
    expect(await findByText('Baixa, Maputo')).toBeTruthy();
    
    expect(await findByText('Dinheiro')).toBeTruthy();
    expect(await findByText('Eletrônicos')).toBeTruthy();
    expect(await findByText('200 MT')).toBeTruthy();
  });
});
