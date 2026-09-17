import React from 'react';
import { render } from '@testing-library/react-native';
import OrderList from '../OrderList';
import { NavigationContainer } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('OrderList', () => {
  it('renders correctly with empty data', () => {
    const component = render(
      <NavigationContainer>
        <OrderList data={[]} />
      </NavigationContainer>
    );
    expect(component).toBeTruthy();
  });
});
