import React from 'react';
import renderer, { act } from 'react-test-renderer';
import LocationConsentModal from '../LocationConsentModal';
import { Text, TouchableOpacity } from 'react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    Modal: ({ children, visible }: any) => {
      if (!visible) return null;
      return <>{children}</>;
    },
    StyleSheet: { create: (s: any) => s },
  };
});

describe('LocationConsentModal', () => {
  it('renders correctly when visible is true', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <LocationConsentModal visible={true} onAccept={jest.fn()} onDecline={jest.fn()} />
      );
    });

    const root = tree.root;
    // Should find the text
    const texts = root.findAllByType('Text');
    const hasTitle = texts.some((node: any) => node.props.children === 'Usamos a sua localização');
    expect(hasTitle).toBe(true);

    // Should find buttons
    const buttons = root.findAllByType('TouchableOpacity');
    expect(buttons.length).toBe(2);
  });

  it('does not render content when visible is false', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <LocationConsentModal visible={false} onAccept={jest.fn()} onDecline={jest.fn()} />
      );
    });
    expect(tree.toJSON()).toBeNull();
  });

  it('calls onAccept when accept button is pressed', () => {
    const onAcceptMock = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <LocationConsentModal visible={true} onAccept={onAcceptMock} onDecline={jest.fn()} />
      );
    });

    const buttons = tree.root.findAllByType('TouchableOpacity');
    const acceptButton = buttons.find((b: any) => b.props.testID === 'accept-button');
    
    act(() => {
      acceptButton.props.onPress();
    });

    expect(onAcceptMock).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when decline button is pressed', () => {
    const onDeclineMock = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <LocationConsentModal visible={true} onAccept={jest.fn()} onDecline={onDeclineMock} />
      );
    });

    const buttons = tree.root.findAllByType('TouchableOpacity');
    const declineButton = buttons.find((b: any) => b.props.testID === 'decline-button');
    
    act(() => {
      declineButton.props.onPress();
    });

    expect(onDeclineMock).toHaveBeenCalledTimes(1);
  });
});
