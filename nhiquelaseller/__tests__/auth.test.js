import React from 'react';
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react-native';
import LoginPage from '../screens/LoginPage';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useToast } from 'react-native-toast-notifications';

// Mock the API connection
jest.mock('../hooks/createConnectionApi', () => ({
  post: jest.fn(),
}));

describe('LoginPage', () => {
  let mockToast;
  let mockNavigate;
  let mockReset;

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast = jest.fn();
    useToast.mockReturnValue({ show: mockToast });
    
    mockNavigate = jest.fn();
    mockReset = jest.fn();
    useNavigation.mockReturnValue({ navigate: mockNavigate, reset: mockReset });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders login form correctly', async () => {
    await render(<LoginPage />);
    expect(screen.getByText('Entrar na sua conta')).toBeTruthy();
    expect(screen.getByPlaceholderText('84 123 4567')).toBeTruthy();
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeTruthy();
  });

  it('shows error if phone is invalid', async () => {
    await render(<LoginPage />);
    
    // Type invalid phone
    fireEvent.changeText(screen.getByPlaceholderText('84 123 4567'), '123');
    
    // Press login
    fireEvent.press(screen.getByText('Entrar'));
    
    expect(mockToast).toHaveBeenCalledWith("O telefone deve ter exatamente 9 dígitos", expect.any(Object));
  });

  it('shows error if password is too short', async () => {
    await render(<LoginPage />);
    screen.debug();
    
    fireEvent.changeText(screen.getByPlaceholderText('84 123 4567'), '841234567');
    fireEvent.changeText(screen.getByPlaceholderText('Mínimo 6 caracteres'), '123');
    
    fireEvent.press(screen.getByText('Entrar'));
    
    expect(mockToast).toHaveBeenCalledWith("A senha deve ter no mínimo 6 caracteres", expect.any(Object));
  });

  it('successfully logs in and navigates', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        _id: '123',
        phoneNumber: '841234567',
        name: 'Test Seller'
      }
    });

    await render(<LoginPage />);
    
    fireEvent.changeText(screen.getByPlaceholderText('84 123 4567'), '841234567');
    fireEvent.changeText(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'password123');
    
    fireEvent.press(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users/signinseller', {
        phoneNumber: '841234567',
        password: 'password123'
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('id', 'mock_user_id');
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'BottomNavigation' }]
      });
    });
  });

  it('shows error on failed login API call', async () => {
    const mockToast = jest.fn();
    useToast.mockReturnValue({ show: mockToast });

    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Senha inválida' } }
    });

    await render(<LoginPage />);
    
    fireEvent.changeText(screen.getByPlaceholderText('84 123 4567'), '841234567');
    fireEvent.changeText(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'wrongpass');
    
    fireEvent.press(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Senha inválida', expect.any(Object));
    });
  });
});
