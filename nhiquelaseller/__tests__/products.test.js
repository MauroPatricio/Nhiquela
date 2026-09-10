import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import NewProduct from '../screens/NewProduct';
import api from '../hooks/createConnectionApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

// Mock API
jest.mock('../hooks/createConnectionApi', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

describe('NewProduct Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default API responses for loadInitialData
    api.get.mockImplementation((url) => {
      if (url === '/categories') return Promise.resolve({ data: { categories: [{ _id: 'cat1', name: 'Eletrônicos' }] } });
      if (url === '/provinces') return Promise.resolve({ data: { provinces: [{ _id: 'prov1', name: 'Maputo' }] } });
      if (url === '/colors') return Promise.resolve({ data: { colors: [{ _id: 'col1', name: 'Preto' }] } });
      if (url === '/sizes') return Promise.resolve({ data: { sizes: [{ _id: 'siz1', name: 'M' }] } });
      return Promise.resolve({ data: {} });
    });

    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ 
      token: 'mock_token',
      seller: { openstore: true }
    }));
    
    useRoute.mockReturnValue({ params: {} });
  });

  it('loads initial data on mount', async () => {
    render(<NewProduct />);
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/categories');
      expect(api.get).toHaveBeenCalledWith('/provinces');
      expect(api.get).toHaveBeenCalledWith('/colors');
      expect(api.get).toHaveBeenCalledWith('/sizes');
    });
  });

  // Note: the component uses Formik but doesn't have standard placeholdes for all fields in the snippet provided.
  // We'll write basic rendering tests.
  it('renders correctly', async () => {
    const { getByText } = render(<NewProduct />);
    
    // We expect header text "Novo Produto" or similar
    // The exact text will depend on the full file, let's assume it renders basic layout
    expect(getByText(/Registar Produto|Guardar Alterações/i)).toBeTruthy();
  });
});
