import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/apiConfig';
import { COLORS } from '../styles/colors';
import { LineChart, Grid } from 'react-native-svg-charts';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
}

export default function WalletScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [earnings, setEarnings] = useState({ today: 0, week: 0 });
  const [dailyEarnings, setDailyEarnings] = useState<Array<{date:string, amount:number}>>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userData, setUserData] = useState<any>(null);

  const fetchWalletData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      if (!storedUser) {
        navigation.navigate('Login');
        return;
      }
      const user = JSON.parse(storedUser);
      setUserData(user);

      const [balanceRes, transactionsRes, earningsRes] = await Promise.allSettled([
        api.get('/wallet/balance', { headers: { authorization: `Bearer ${user.token}` } }),
        api.get('/wallet/transactions', { headers: { authorization: `Bearer ${user.token}` } }),
        api.get('/wallet/driver-earnings', { headers: { authorization: `Bearer ${user.token}` } })
      ]);

      if (balanceRes.status === 'fulfilled') {
        setBalance({
          available: balanceRes.value.data.available_balance || 0,
          pending: balanceRes.value.data.pending_balance || 0,
        });
      }

      if (transactionsRes.status === 'fulfilled') {
        setTransactions(transactionsRes.value.data || []);
      }

      if (earningsRes.status === 'fulfilled') {
        setEarnings({
          today: earningsRes.value.data.today || 0,
          week: earningsRes.value.data.week || 0,
        });
        setDailyEarnings(earningsRes.value.data.dailyEarnings || []);
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados da carteira:', error.message);
      Alert.alert('Erro', 'Não foi possível atualizar a carteira.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleWithdrawPress = () => {
    if (balance.available <= 0) {
      Alert.alert('Saldo Insuficiente', 'Não tem saldo disponível para efetuar um levantamento.');
      return;
    }
    Alert.alert(
      'Solicitar Levantamento',
      `Deseja levantar o valor total de ${formatCurrency(balance.available)} para sua conta M-Pesa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.post('/wallet/withdraw', {
                amount: balance.available,
                phone: userData?.phone || userData?.deliveryman?.phone,
              }, {
                headers: { authorization: `Bearer ${userData.token}` },
              });
              Alert.alert('Sucesso', res.data.message || 'Levantamento solicitado com sucesso!');
              fetchWalletData();
            } catch (err: any) {
              Alert.alert('Erro', err.response?.data?.message || 'Falha ao solicitar levantamento.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`;
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isCredit = item.type === 'credit';
    const date = new Date(item.created_at);
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} às ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return (
      <View style={styles.transactionCard}>
        <View style={[styles.iconContainer, { backgroundColor: isCredit ? '#E8F5E9' : '#FFEBEE' }]}>
          <Ionicons
            name={isCredit ? 'arrow-up' : 'arrow-down'}
            size={20}
            color={isCredit ? '#2E7D32' : '#C62828'}
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDesc}>{item.description}</Text>
          <Text style={styles.transactionDate}>{formattedDate}</Text>
        </View>
        <Text style={[styles.transactionAmount, { color: isCredit ? '#2E7D32' : '#C62828' }]}>
          {isCredit ? '+' : '-'}{item.amount.toFixed(0)} MT
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Carteira</Text>
        <TouchableOpacity style={styles.infoBtn} onPress={() => Alert.alert('Informação', 'O saldo disponível pode ser retirado a qualquer momento. O saldo pendente corresponde a entregas em processamento.')}>
          <Ionicons name="information-circle-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderTransactionItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {/* Cards de Saldo Principal */}
            <View style={styles.balanceContainer}>
              <View style={styles.mainCard}>
                <Text style={styles.cardLabel}>Saldo Disponível</Text>
                <Text style={styles.cardValue}>{formatCurrency(balance.available)}</Text>

                <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdrawPress}>
                  <Ionicons name="cash-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.withdrawText}>Levantar Fundos</Text>
                </TouchableOpacity>
              </View>

              {/* Saldo Pendente Box */}
              {balance.pending > 0 && (
                <View style={styles.pendingBox}>
                  <Ionicons name="time-outline" size={18} color="#FF9800" style={{ marginRight: 6 }} />
                  <Text style={styles.pendingText}>
                    Saldo Pendente: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(balance.pending)}</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Sumário de Ganhos */}
            <Text style={styles.sectionTitle}>Sumário de Ganhos</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Hoje</Text>
                <Text style={styles.statValue}>{formatCurrency(earnings.today)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Esta Semana</Text>
                <Text style={styles.statValue}>{formatCurrency(earnings.week)}</Text>
              </View>
            </View>

            {/* Gráfico de Ganhos Diários */}
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Ganhos Diários</Text>
              <LineChart
                style={{ height: 200 }}
                data={dailyEarnings.map(e => e.amount)}
                svg={{ stroke: COLORS.primary, strokeWidth: 2 }}
                contentInset={{ top: 20, bottom: 20 }}
              >
                <Grid />
              </LineChart>
            </View>

            {/* Título Histórico */}
            <Text style={styles.sectionTitle}>Últimos Movimentos</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>Nenhum movimento registado.</Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#EAEAEA',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  infoBtn: {
    padding: 4,
  },
  balanceContainer: {
    marginTop: 20,
    marginBottom: 25,
  },
  mainCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardLabel: {
    color: '#A0A0B0',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  withdrawBtn: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  withdrawText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  pendingText: {
    fontSize: 14,
    color: '#FF8F00',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#33334F',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 0,
  },
  statLabel: {
    color: '#666',
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    borderWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  transactionDate: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 3,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
    fontSize: 14,
  },
});
