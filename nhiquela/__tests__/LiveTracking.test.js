import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import TrackingMap from '../components/TrackingMap';
import io from 'socket.io-client';

// Mock dependências globais
jest.mock('socket.io-client');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../hooks/createConnectionApi', () => ({
  get: jest.fn(() => Promise.resolve({ data: { routes: [] } })),
}));
jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: (props) => <div testID="view">{props.children}</div>,
    Text: (props) => <div testID="text">{props.children}</div>,
    ActivityIndicator: () => <div testID="activity-indicator" />,
    StyleSheet: { create: jest.fn(x => x), absoluteFillObject: {} },
    Image: (props) => <img {...props} />,
  };
});
jest.mock('react-native-maps', () => {
  const React = require('react');
  const MapView = (props) => <div testID="map-view">{props.children}</div>;
  MapView.Marker = (props) => <div testID="marker">{props.children}</div>;
  MapView.Polyline = (props) => <div testID="polyline">{props.children}</div>;
  return {
    __esModule: true,
    default: MapView,
    Marker: MapView.Marker,
    Polyline: MapView.Polyline,
    PROVIDER_DEFAULT: 'default',
  };
});
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

describe('Live Tracking WebSocket Observation', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    io.mockReturnValue(mockSocket);
    jest.clearAllMocks();
  });

  it('deve observar e processar atualizações "driver_location_update" em tempo real', async () => {
    const onUpdateTrackingMock = jest.fn();

    // Renderiza o componente
    await act(async () => {
      TestRenderer.create(
        <TrackingMap
          orderId="test-order-123"
          destination={{ latitude: -25.0, longitude: 32.0 }}
          origin={{ latitude: -25.1, longitude: 32.1 }}
          onUpdateTracking={onUpdateTrackingMock}
        />
      );
    });

    // Verifica se juntou à room
    expect(mockSocket.emit).toHaveBeenCalledWith('joinRoom', { orderId: 'test-order-123' });

    // Localiza o handler do evento 'driver_location_update'
    const locationUpdateCall = mockSocket.on.mock.calls.find(call => call[0] === 'driver_location_update');
    expect(locationUpdateCall).toBeDefined();

    const locationUpdateHandler = locationUpdateCall[1];

    // Simula a receção de um evento de localização em tempo real do socket
    const mockPayload = {
      latitude: -25.05,
      longitude: 32.05,
      speed: 10 // em m/s
    };

    act(() => {
      locationUpdateHandler(mockPayload);
    });

    // Verifica se o onUpdateTracking foi invocado corretamente convertendo a velocidade para km/h
    expect(onUpdateTrackingMock).toHaveBeenCalledWith({
      latitude: -25.05,
      longitude: 32.05,
      speed: 36 // 10 m/s * 3.6 = 36 km/h
    });
  });
});
