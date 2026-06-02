// screens/WalletWithdrawScreen.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, Alert, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../hooks/createConnectionApi.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalletWithdrawScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar userData do AsyncStorage
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserData(parsedUser);
          if (parsedUser.phone) {
            setPhone(parsedUser.phone);
          }

          // Buscar saldo no backend usando token do usuário
          const res = await api.get('/wallet/balance', {
            headers: { authorization: `Bearer ${parsedUser.token}` },
          });
          setBalance(res.data.balance || 0);
        } else {
          throw new Error('Usuário não encontrado');
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Erro', 'Não foi possível carregar os dados da carteira.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleWithdraw = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return Alert.alert('Erro', 'Digite um valor válido para levantamento.');
    }

    if (parseFloat(amount) > balance) {
      return Alert.alert('Erro', 'Saldo insuficiente.');
    }

    if (!phone || phone.length < 9) {
      return Alert.alert('Erro', 'Digite um número de telefone válido.');
    }

    try {
      const res = await api.post('/wallet/withdraw', {
        amount: parseFloat(amount),
        phone,
      }, {
        headers: { authorization: `Bearer ${userData.token}` },
      });
      Alert.alert('Sucesso', res.data.message);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.message || 'Erro ao solicitar levantamento');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6600" />
      </View>
    );
  }

  const calculatedFee = amount && !isNaN(amount) && parseFloat(amount) > 0 ? parseFloat(amount) * 0.01 : 0;
  const netAmount = amount && !isNaN(amount) && parseFloat(amount) > 0 ? Math.max(0, parseFloat(amount) - calculatedFee) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.balanceText}>Saldo disponível: {balance.toFixed(2)} MT </Text>


    <Text style={styles.label}>Número M-PESA:</Text>
      <TextInput
        placeholder="25884XXXXXXX"
        value={phone}   
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Valor do Levantamento:</Text>
      <TextInput
        placeholder="Ex: 500"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={styles.input}
      />

      {amount && !isNaN(amount) && parseFloat(amount) > 0 ? (
        <View style={styles.feeContainer}>
          <Text style={styles.feeText}>Taxa de Levantamento (1%): {calculatedFee.toFixed(2)} MT</Text>
          <Text style={styles.netText}>Receberá líquido no celular: {netAmount.toFixed(2)} MT</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={handleWithdraw}>
        <Text style={styles.buttonText}>Solicitar Levantamento</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f7fa',
  },
  balanceText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 25,
    color: '#222',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,

    // Suave animação ao focar
  },
  inputFocused: {
    borderColor: '#FF6600',
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 25,
    // botão com efeito de escala ao toque via TouchableOpacity (usado no JSX)
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  feeContainer: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  feeText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
  },
  netText: {
    fontSize: 15,
    color: '#2E7D32',
    fontWeight: 'bold',
    marginTop: 6,
  },
});


export default WalletWithdrawScreen;
