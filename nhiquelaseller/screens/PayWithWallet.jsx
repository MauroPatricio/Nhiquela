import { showMessage } from "react-native-flash-message";
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import api from '../hooks/createConnectionApi';

const PayWithWallet = ({ navigation }) => {
  const [amount, setAmount] = useState('');

  const handlePay = async () => {
    try {
      const response = await api.post('/wallet/pay', {
        amount: parseFloat(amount),
        description: 'Pagamento de pedido',
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
        description: error.response?.data?.message || 'Falha ao pagar',
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        keyboardType="numeric"
        placeholder="Valor a pagar"
        value={amount}
        onChangeText={setAmount}
        style={{ borderWidth: 1, marginVertical: 10, padding: 5 }}
      />
      <Button title="Confirmar Pagamento" onPress={handlePay} />
    </View>
  );
};

export default PayWithWallet;
