import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WalletScreen from '../screens/WalletScreen';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

jest.mock('../hooks/createConnectionApi', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

describe('WalletScreen', () => {
  const mockWallet = {
    balance: 5000,
    status: 'active',
  };

  const mockTransactions = [
    { _id: 'tx1', type: 'credit', amount: 1000, description: 'Venda de Produto', createdAt: new Date().toISOString() },
    { _id: 'tx2', type: 'debit', amount: 500, description: 'Levantamento', createdAt: new Date().toISOString() }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ 
      token: 'mock_token',
      _id: 'seller_id'
    }));

    api.get.mockImplementation((url) => {
      if (url === '/wallet') {
        return Promise.resolve({ data: mockWallet });
      }
      if (url === '/wallet/transactions') {
        return Promise.resolve({ data: mockTransactions });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders wallet balance correctly', async () => {
    const { getByText } = render(<WalletScreen />);
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/wallet', expect.any(Object));
      expect(api.get).toHaveBeenCalledWith('/wallet/transactions', expect.any(Object));
      // Assuming it renders "5000" and "MT" or similar
      expect(getByText(/5000/)).toBeTruthy();
      expect(getByText(/Venda de Produto/i)).toBeTruthy();
      expect(getByText(/Levantamento/i)).toBeTruthy();
    });
  });

  it('navigates to withdrawal screen on request withdrawal', async () => {
    const mockNavigate = jest.fn();
    useNavigation.mockReturnValue({ navigate: mockNavigate });

    const { getByText } = render(<WalletScreen />);
    
    await waitFor(() => {
      expect(getByText(/Levantar/i)).toBeTruthy();
    });
    
    fireEvent.press(getByText(/Levantar/i));
    
    expect(mockNavigate).toHaveBeenCalledWith('WalletWithdrawScreen');
  });
});
