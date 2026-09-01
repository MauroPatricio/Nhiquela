import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Profile from '../../screens/Profile'; // Assuming it's in screens/Profile.jsx

// Mock hooks
jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector({
    user: {
      userData: {
        id: '1',
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '+258841234567',
        rating: 4.8,
        tripsCount: 15
      }
    }
  })),
  useDispatch: () => jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => {
    if (key === 'userData') {
      return Promise.resolve(JSON.stringify({ 
        _id: '1',
        id: '1', 
        name: 'João Silva', 
        email: 'joao@example.com', 
        phone: '+258841234567',
        phoneNumber: '+258841234567',
        token: 'mock-token' 
      }));
    }
    if (key === 'id') {
      return Promise.resolve('1');
    }
    return Promise.resolve(null);
  }),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('Profile Screen', () => {
  it('renders correctly with user data', async () => {
    const { getByText } = render(<Profile />);
    
    await waitFor(() => {
      expect(getByText('João Silva')).toBeTruthy();
      expect(getByText('joao@example.com')).toBeTruthy();
      expect(getByText('+258841234567')).toBeTruthy();
    });
  });

  it('shows logout modal when logout button is pressed', async () => {
    const { getByText, queryByText } = render(<Profile />);
    
    // Procura e clica no botão de Terminar Sessão
    await waitFor(() => {
      const logoutButton = getByText('Sair da Conta');
      fireEvent.press(logoutButton);
    });
    
    // Verifica se o modal premium aparece
    await waitFor(() => {
      expect(getByText('Tem a certeza que deseja sair da sua conta? Terá de fazer login novamente para usar a aplicação.')).toBeTruthy();
      expect(getByText('Terminar Sessão')).toBeTruthy();
      expect(getByText('Cancelar')).toBeTruthy();
    });
  });

  it('shows delete account modal when delete account is pressed', async () => {
    const { getByText } = render(<Profile />);
    
    // Procura e clica em Apagar Conta
    await waitFor(() => {
      const deleteButton = getByText('Apagar Conta Permanentemente');
      fireEvent.press(deleteButton);
    });
    
    // Verifica se o modal premium aparece
    await waitFor(() => {
      expect(getByText('Apagar Conta?')).toBeTruthy();
      expect(getByText('Apagar')).toBeTruthy();
      expect(getByText('Cancelar')).toBeTruthy();
    });
  });
});
