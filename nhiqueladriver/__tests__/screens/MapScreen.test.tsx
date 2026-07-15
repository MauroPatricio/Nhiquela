import React from 'react';
import { render } from '@testing-library/react-native';
import MapScreen from '../../../src/screens/MapScreen';
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
          origin: 'Avenida Marginal, Maputo',
          destination: 'Baixa, Maputo',
          paymentMethod: 'Dinheiro',
          goodType: 'Eletrônicos',
          deliveryPrice: 200,
          user: {
            name: 'Cliente Maria',
            phone: '820000000'
          }
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

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(JSON.stringify({
    id: 'trip123',
    status: 'Aceite',
    stepStatus: 4,
    origin: 'Avenida Marginal, Maputo',
    destination: 'Baixa, Maputo',
    paymentMethod: 'Dinheiro',
    goodType: 'Eletrônicos',
    deliveryPrice: 200,
    user: {
      name: 'Cliente Maria',
      phone: '820000000'
    }
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
    expect(await findByText('200 Mt')).toBeTruthy();
  });
});
