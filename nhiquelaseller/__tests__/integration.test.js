import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginPage from '../screens/LoginPage';
import Profile from '../screens/Profile';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

jest.mock('../hooks/createConnectionApi', () => ({
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
}));

describe('Integration Flow: Login to Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'userData') {
        return Promise.resolve(JSON.stringify({ 
          _id: 'mock_user_id', 
          name: 'João Silva', 
          phoneNumber: 841234567,
          isAdmin: false,
          token: 'mock_token',
          seller: { name: 'A Minha Loja', openstore: false }
        }));
      }
      if (key === 'id') {
        return Promise.resolve('mock_user_id');
      }
      return Promise.resolve(null);
    });
  });

  it('navigates from Login to Profile and toggles store', async () => {
    // 1. Simulate successful login
    const mockNavigate = jest.fn();
    const mockReset = jest.fn();
    useNavigation.mockReturnValue({ navigate: mockNavigate, reset: mockReset });

    api.post.mockResolvedValueOnce({
      data: {
        _id: 'mock_user_id',
        name: 'João Silva',
        token: 'mock_token',
        seller: { name: 'A Minha Loja', openstore: false }
      }
    });

    const { getByText: getLoginText, getByPlaceholderText } = render(<LoginPage />);
    
    fireEvent.changeText(getByPlaceholderText('84 123 4567'), '841234567');
    fireEvent.changeText(getByPlaceholderText('Mínimo 6 caracteres'), 'password123');
    fireEvent.press(getLoginText('Entrar'));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'BottomNavigation' }] });
    });

    // 2. Render Profile which uses AsyncStorage
    api.patch.mockResolvedValueOnce({ status: 200 }); // mock toggle status
    
    const { getByText: getProfileText, getByRole } = render(<Profile />);
    
    await waitFor(() => {
      expect(getProfileText('João Silva')).toBeTruthy();
      expect(getProfileText('A Minha Loja')).toBeTruthy();
    });

    // Toggle switch
    const toggle = getByRole('switch');
    fireEvent(toggle, 'valueChange', true);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/users/seller-status/mock_user_id',
        { isOpenStore: true },
        expect.any(Object)
      );
    });
  });
});
