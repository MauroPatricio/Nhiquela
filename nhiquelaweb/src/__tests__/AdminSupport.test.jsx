import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import AdminSupport from '../screens/admin/AdminSupport';

// Mock dependencies
jest.mock('../../api', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

const mockStore = configureStore([]);

describe('AdminSupport UI Tests', () => {
  let store;
  
  beforeEach(() => {
    store = mockStore({
      user: {
        userInfo: { _id: 'admin123', name: 'Admin', isAdmin: true }
      }
    });
  });

  it('Renders the support page properly with empty state', async () => {
    const api = require('../../api');
    api.get.mockResolvedValueOnce({ data: [] });

    render(
      <Provider store={store}>
        <AdminSupport />
      </Provider>
    );

    expect(await screen.findByText('Suporte & Resolução de Conflitos')).toBeInTheDocument();
    expect(await screen.findByText('Nenhum ticket encontrado.')).toBeInTheDocument();
    expect(await screen.findByText('Selecione um ticket para ver os detalhes e responder.')).toBeInTheDocument();
  });

  it('Renders tickets and selects one to reply', async () => {
    const api = require('../../api');
    const mockTickets = [
      {
        _id: 'ticket1',
        subject: 'Problema com pagamento',
        message: 'O pagamento falhou e descontou.',
        status: 'open',
        user: { name: 'João' },
        replies: []
      }
    ];

    api.get.mockResolvedValueOnce({ data: mockTickets });

    render(
      <Provider store={store}>
        <AdminSupport />
      </Provider>
    );

    // Should list the ticket
    const ticketEl = await screen.findByText('Problema com pagamento');
    expect(ticketEl).toBeInTheDocument();
    
    // Select the ticket
    fireEvent.click(ticketEl);
    
    // The details should now be visible
    expect(await screen.findByText('O pagamento falhou e descontou.')).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Escreva a sua resposta...')).toBeInTheDocument();
  });
});
