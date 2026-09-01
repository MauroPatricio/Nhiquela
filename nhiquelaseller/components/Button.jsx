// components/Button.js
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

const Button = ({ loader, title, onPress, isValid }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: isValid ? '#7F00FF' : 'red' } // cor condicional
      ]}
      onPress={onPress}
      disabled={loader || !isValid} // desabilita se carregando ou inválido
    >
      {loader ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
