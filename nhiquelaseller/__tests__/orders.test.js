import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OrderDetail from '../screens/OrderDetail';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

jest.mock('../hooks/createConnectionApi', () => ({
  get: jest.fn(),
  put: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

describe('OrderDetail Screen', () => {
  const mockOrder = {
    _id: 'mock_order_id',
    code: 'ORD123',
    user: { name: 'Customer Name', phoneNumber: 841234567 },
    deliveryAddress: { city: 'Maputo', address: 'Av. Mao Tse Tung' },
    paymentMethod: 'm-pesa',
    isPaid: true,
    totalPrice: 1500,
    itemsPriceForSeller: 1200,
    deliveryPrice: 300,
    status: 'Pendente',
    stepStatus: 1,
    orderItems: [
      {
        product: { _id: 'prod1', nome: 'Sapatilhas Nike' },
        quantity: 2,
        priceFromSeller: 600,
      }
    ],
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ 
      token: 'mock_token',
      _id: 'seller_id'
    }));
    
    useRoute.mockReturnValue({ params: { item: mockOrder } });
    
    api.get.mockImplementation((url) => {
      if (url.includes('/orders/mock_order_id')) {
        return Promise.resolve({ data: mockOrder });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders order details correctly', async () => {
    const { getByText } = render(<OrderDetail />);
    
    await waitFor(() => {
      expect(getByText('ORD123')).toBeTruthy();
      expect(getByText('Customer Name')).toBeTruthy();
      expect(getByText('Av. Mao Tse Tung')).toBeTruthy();
      // Wait, depending on how OrderDetail renders these texts, it could be slightly different,
      // but it definitely should contain these. We use regex for safety:
      expect(getByText(/Sapatilhas Nike/i)).toBeTruthy();
    });
  });

  it('allows seller to accept order if status is Pendente', async () => {
    api.put.mockResolvedValueOnce({ data: { message: 'Success' } });

    const { getByText } = render(<OrderDetail />);
    
    await waitFor(() => {
      expect(getByText(/Aceitar Pedido/i)).toBeTruthy();
    });
    
    fireEvent.press(getByText(/Aceitar Pedido/i));
    
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/orders/mock_order_id/accept',
        {},
        { headers: { Authorization: 'Bearer mock_token' } }
      );
      expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    });
  });
});
