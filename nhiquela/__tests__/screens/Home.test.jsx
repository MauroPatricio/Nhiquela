import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Home from '../../screens/Home';

const mockState = {
  user: {
    userData: { id: '1', name: 'João Silva', isActive: true },
    tempRoute: null,
  },
  map: {
    origin: { location: { lat: -25.9667, lng: 32.5833 }, description: 'Maputo' },
    destination: null,
  },
  location: {
    userCoords: { latitude: -25.9667, longitude: 32.5833 },
  },
  ride: {
    rideInfo: null,
  }
};

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector(mockState)),
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
        token: 'mock-token' 
      }));
    }
    if (key === 'id') {
      return Promise.resolve('1');
    }
    return Promise.resolve(null);
  }),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  openDrawer: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => ({ params: {} }),
    useFocusEffect: jest.fn((callback) => callback()),
  };
});

describe('Home Screen', () => {
  it('renders Map and BottomSheet', async () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(<Home navigation={mockNavigation} />);
    
    await waitFor(() => {
      expect(getByText('João Silva')).toBeTruthy();
      expect(getByPlaceholderText('O que deseja para hoje?')).toBeTruthy();
    });
  });

  it('navigates to RequestService when search input is tapped', async () => {
    const { getByPlaceholderText } = render(<Home navigation={mockNavigation} />);
    
    await waitFor(() => {
      const searchInput = getByPlaceholderText('O que deseja para hoje?');
      fireEvent(searchInput, 'pressIn');
    });
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Pesquisa');
  });
});
