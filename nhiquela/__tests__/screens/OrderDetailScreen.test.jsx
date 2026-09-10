import React from 'react';
import { render } from '@testing-library/react-native';
import OrderDetailsScreen from '../../screens/OrderDetailScreen';
import { NavigationContainer } from '@react-navigation/native';
import { act } from '@testing-library/react-native';

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
        item: {
          _id: 'trip123',
          status: 'Pendente',
          origin: 'Rua A, Maputo',
          destination: 'Rua B, Maputo',
          paymentMethod: 'M-Pesa',
          goodType: 'Documentos',
          deliveryPrice: 150,
          deliveryman: {
            name: 'Carlos Motorista',
            phone: '840000000'
          }
        }
      }
    }),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const BottomSheet = ({ children }) => <>{children}</>;
  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetView: ({ children }) => <>{children}</>,
    BottomSheetScrollView: ({ children }) => <>{children}</>,
  };
});

jest.mock('axios', () => {
  const mockAxios = {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      response: { use: jest.fn() },
      request: { use: jest.fn() }
    }
  };
  return {
    __esModule: true,
    default: {
      ...mockAxios,
      create: jest.fn(() => mockAxios),
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(JSON.stringify({
    _id: 'user123',
    name: 'Test User'
  })),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../components/TrackingMap', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="tracking-map-mock" />;
});

describe('OrderDetailScreen', () => {
  it('renders order details correctly including newly added fields', async () => {
    let queries;
    
    await act(async () => {
      queries = render(
        <NavigationContainer>
          <OrderDetailsScreen />
        </NavigationContainer>
      );
    });

    const { getByText, getAllByText } = queries;

    // Verify driver info
    expect(getByText('Carlos Motorista')).toBeTruthy();

    // Verify trip details section
    expect(getAllByText('Detalhes do Serviço').length).toBeGreaterThan(0);
    expect(getByText('Rua A, Maputo')).toBeTruthy();
    expect(getByText('Rua B, Maputo')).toBeTruthy();
    
    // Verify payment method
    expect(getByText('M-Pesa')).toBeTruthy();
  });
});
