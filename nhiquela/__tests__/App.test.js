import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Mock dependencies
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token' }),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const MapView = (props) => React.createElement('MapView', props, props.children);
  MapView.Marker = (props) => React.createElement('Marker', props, props.children);
  return MapView;
});

describe('App', () => {
  it('renders correctly without crashing', () => {
    // Basic smoke test
    const component = render(<App />);
    expect(component).toBeTruthy();
  });
});
