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
      Alert.alert('Sucesso', response.data.message);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível recarregar');
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
