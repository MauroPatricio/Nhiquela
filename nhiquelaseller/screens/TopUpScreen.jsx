import { showMessage } from "react-native-flash-message";
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import api from '../hooks/createConnectionApi';

const TopUpScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');

  const handleTopUp = async () => {
    try {
      const response = await api.post('/wallet/topup', {
        amount: parseFloat(amount),
        method: 'mpesa',
        description: 'Recarga via app',
      });
      showMessage({
        message: 'Sucesso',
        description: response.data.message,
        type: "success",
        icon: "auto",
        duration: 3000,
      });
      navigation.goBack();
    } catch (error) {
      showMessage({
        message: 'Erro',
        description: 'Não foi possível recarregar',
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Digite o valor da recarga:</Text>
      <TextInput
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={{ borderWidth: 1, marginVertical: 10, padding: 5 }}
      />
      <Button title="Confirmar Recarga" onPress={handleTopUp} />
    </View>
  );
};

export default TopUpScreen;
