import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';

const WalletScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (!storedUserData) throw new Error("Usuário não encontrado");
      const parsedUser = JSON.parse(storedUserData);
      setUserData(parsedUser);
      return parsedUser;
    } catch (err) {
      console.error("Erro ao carregar dados do usuário:", err.message);
      navigation.navigate('Login');
      return null;
    }
  };

  const loadWallet = async (user) => {
    try {
      const res1 = await api.get('/wallet/balance', {
        headers: { authorization: `Bearer ${user.token}` },
      });
      const res2 = await api.get('/wallet/transactions', {
        headers: { authorization: `Bearer ${user.token}` },
      });

      setBalance(res1.data.balance || 0);
      setTransactions(res2.data || []);
    } catch (err) {
      console.error('Erro ao carregar carteira:', err.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      const user = await loadUserData();
      if (user) {
        loadWallet(user);
      }
    };
    init();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const user = await loadUserData();
    if (user) {
      await loadWallet(user);
    }
    setRefreshing(false);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const renderTransaction = ({ item }) => {
    const isCredit = item.amount > 0;
    return (
      <View style={styles.transactionCard}>
        <Ionicons
          name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'}
          size={28}
          color={isCredit ? '#4CAF50' : '#E53935'}
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.transactionType}>{item.type?.toUpperCase()}</Text>
          <Text style={styles.transactionDesc}>{item.description}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        </View>
        <Text style={[styles.transactionAmount, { color: isCredit ? '#4CAF50' : '#E53935' }]}>
          {isCredit ? '+' : '-'}{item.amount} MT
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minha Carteira</Text>

      {/* Card de saldo */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo disponível</Text>
        <Text style={styles.balanceValue}>{balance.toFixed(2)} MT</Text>
      </View>

      {/* Botão estilizado */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('withdraw')}
      >
        <Text style={styles.buttonText}>Solicitar levantamento</Text>
      </TouchableOpacity>

      {/* Lista de transações */}
      <Text style={styles.sectionTitle}>Movimentos</Text>
      <FlatList
        data={transactions}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderTransaction}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma transação encontrada</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  balanceCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLabel: {
    color: '#E8F5E9',
    fontSize: 16,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDesc: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
  },
});

export default WalletScreen;
