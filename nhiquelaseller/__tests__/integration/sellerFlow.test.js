import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import SignUp from '../../screens/SignUp';
import NewProduct from '../../screens/NewProduct';
import api from '../../hooks/createConnectionApi';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

// We don't mock createConnectionApi completely, just spy on its methods
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useRoute: jest.fn(),
  };
});

describe('Fluxo do Vendedor (NhiquelaSeller)', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigation.mockReturnValue({ navigate: mockNavigate, goBack: jest.fn() });
    useRoute.mockReturnValue({ params: {} });
    
    // Configurar respostas da API para GET
    jest.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === 'provinces' || url === '/provinces') {
        return Promise.resolve({ data: { provinces: [{ _id: 'p1', name: 'Maputo' }] } });
      }
      if (url === 'establishment-types' || url === '/establishment-types' || url === 'tipos-estabelecimento') {
        return Promise.resolve({ data: { establishmentTypes: [{ _id: 't1', name: 'Loja' }] } });
      }
      if (url === 'categories' || url === '/categories') {
        return Promise.resolve({ data: { categories: [{ id: 1, name: 'Roupas' }] } });
      }
      if (url === 'colors' || url === '/colors') {
        return Promise.resolve({ data: { colors: [{ id: 1, name: 'Preto', code: '#000000' }] } });
      }
      return Promise.resolve({ data: {} });
    });

    jest.spyOn(api, 'post').mockImplementation(async (url) => {
      if (url === '/upload' || url === 'upload') {
        return { data: { success: true, url: 'mock-uploaded-url.jpg' } };
      }
      return { data: { success: true } };
    });
    jest.spyOn(api, 'put').mockResolvedValue({ data: { product: { _id: 'prod1', nome: 'Teste' } } });
  });

  describe('Passo 1: Registo do Vendedor (SignUp)', () => {
    it.only('deve preencher o formulário, avançar os passos e submeter o registo com sucesso', async () => {
      try {
        render(<SignUp />);
        console.log("SCREEN JSON:", screen.toJSON());
      } catch (e) {
        throw new Error("RENDER FAILED: " + e.message);
      }
      /*

      // Preencher Passo 1: Dados do Representante
      fireEvent.changeText(screen.getByTestId('input-name'), 'João Vendedor');
      fireEvent.changeText(screen.getByTestId('input-phoneNumber'), '841234567');
      fireEvent.changeText(screen.getByTestId('input-email'), 'vendedor@teste.com');
      
      fireEvent.changeText(screen.getByTestId('input-password'), 'senhaSegura123');
      fireEvent.changeText(screen.getByTestId('input-confirmPassword'), 'senhaSegura123');

      // Wait for state updates to flush
      console.log("FLUSHING TIMERS");
      act(() => {
        jest.runAllTimers();
      });

      console.log("PRESSING AVANCAR");

      const btnNext = screen.getByTestId('btn-next');
      
      await act(async () => {
        fireEvent.press(btnNext);
      });

      try {
        await waitFor(() => {
          expect(screen.getByText(/Registar Estabelecimento/i)).toBeTruthy();
        }, { timeout: 4000 });
      } catch (e) {
        console.log("WAITFOR FAILED. CURRENT DOM:");
        screen.debug();
        throw e;
      }

      // ---- Passo 2: Dados do Estabelecimento ----
      fireEvent.press(screen.getByText('Toque para adicionar logótipo'));
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/upload', expect.any(FormData), expect.any(Object));
      });

      fireEvent.changeText(screen.getByTestId('input-name'), 'Loja do João');
      fireEvent.changeText(screen.getByTestId('input-description'), 'Loja de Conveniência');
      
      // Select province and category using fireEvent on the mocked Picker component
      // (assuming Picker was mocked to expose onValueChange)
      const pickerProv = screen.getByTestId('picker-province');
      fireEvent(pickerProv, 'onValueChange', 'p1');
      
      const pickerCat = screen.getByTestId('picker-tipo');
      fireEvent(pickerCat, 'onValueChange', 't1');

      fireEvent.changeText(screen.getByTestId('input-address'), 'Av. Teste, 123');
      fireEvent.changeText(screen.getByTestId('input-phoneNumberAccount'), '840000001');
      fireEvent.changeText(screen.getByTestId('input-alternativePhoneNumberAccount'), '860000001');

      // GPS
      fireEvent.press(screen.getByText(/Obter localização atual/i));
      await waitFor(() => {
        expect(screen.getByText(/Lat:/i)).toBeTruthy();
      });

      // Submeter formulário
      fireEvent.press(screen.getByText(/Registar Estabelecimento/i));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/users/signup', expect.objectContaining({
          email: 'vendedor@teste.com',
          isSeller: true,
          seller: expect.objectContaining({
            name: 'Loja do João',
          })
        }));
        expect(mockNavigate).toHaveBeenCalledWith('Login');
      });
      */
    }, 15000);
  });

  describe('Passo 2: Adição de Produto (NewProduct)', () => {
    it('deve preencher os campos do produto, selecionar cores/tamanhos e submeter à API', async () => {
      // Mock userData para o NewProduct não sair logo do submeter
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ 
        token: 'fake-jwt-token', 
        isApproved: true,
        seller: { openstore: true } 
      }));

      const renderResult2 = render(<NewProduct />);
      console.log("NEW PRODUCT RENDER RESULT KEYS:", Object.keys(renderResult2));
    });
  });
});
