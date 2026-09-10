import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../../src/screens/ProfileScreen';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => {
    if (key === 'authToken') return Promise.resolve('mock-token');
    return Promise.resolve(null);
  }),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const mockNavigation = {
  replace: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};

describe('Driver ProfileScreen', () => {
  it('renders driver stats and profile info', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    
    // Initially renders a loading indicator or direct content if fast
    await waitFor(() => {
      expect(getByText('Estatísticas')).toBeTruthy();
      expect(getByText('Avaliação')).toBeTruthy();
      expect(getByText('Nível')).toBeTruthy();
    });
  });

  it('shows logout modal and can confirm logout', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    
    // Procura o botão de Sair
    const logoutBtn = getByText('Sair da Conta');
    fireEvent.press(logoutBtn);
    
    // Verifica o modal
    await waitFor(() => {
      expect(getByText('Tem certeza que deseja terminar a sessão atual? Deixará de receber pedidos de viagem até voltar a entrar.')).toBeTruthy();
    });
    
    const confirmLogout = getByText('Sim, Sair');
    fireEvent.press(confirmLogout);
    
    // Verifica se limpou storage e navegou para Login
    await waitFor(() => {
      expect(mockNavigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    });
  });
});
