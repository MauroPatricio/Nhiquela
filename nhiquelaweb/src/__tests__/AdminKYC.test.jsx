import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminKYC from '../screens/admin/AdminKYC';

jest.mock('../../api', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

describe('AdminKYC UI Tests', () => {
  it('Renders empty state when no drivers are pending', async () => {
    const api = require('../../api');
    api.get.mockResolvedValueOnce({ data: [] });

    render(<AdminKYC />);

    expect(await screen.findByText('Validação KYC (Novos Motoristas)')).toBeInTheDocument();
    expect(await screen.findByText('Nenhum motorista pendente de aprovação.')).toBeInTheDocument();
  });

  it('Renders a driver for approval with document images', async () => {
    const api = require('../../api');
    const mockDriver = {
      _id: 'd1',
      name: 'João Motorista',
      email: 'joao@mail.com',
      phoneNumber: '841112222',
      deliveryman: {
        license_front: 'http://img1.com',
        document_front: 'http://img2.com',
        photo: 'http://img3.com'
      }
    };

    api.get.mockResolvedValueOnce({ data: [mockDriver] });

    render(<AdminKYC />);

    expect(await screen.findByText('João Motorista')).toBeInTheDocument();
    expect(await screen.findByText('joao@mail.com | 841112222')).toBeInTheDocument();
    
    // Check if the three images are rendered
    const images = await screen.findAllByRole('img');
    expect(images.length).toBe(3);
    
    // Check buttons
    expect(await screen.findByText('Aprovar Documentos')).toBeInTheDocument();
    expect(await screen.findByText('Rejeitar')).toBeInTheDocument();
  });
});
