// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/apiConfig';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
}

export default function WalletScreen({ navigation, route }: any) {
  // Usa o user do AuthContext — evita ler do AsyncStorage com chave errada
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [earnings, setEarnings] = useState({ today: 0, week: 0 });
  const [dailyEarnings, setDailyEarnings] = useState<Array<{date:string, amount:number}>>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpPhone, setTopUpPhone] = useState('');
  const [invalidValueModalVisible, setInvalidValueModalVisible] = useState(false);

  const fetchWalletData = async () => {
    // Usa o token do user do contexto — não faz logout se a wallet falhar
    if (!user?.token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const headers = { authorization: `Bearer ${user.token}` };

      const [balanceRes, transactionsRes, earningsRes] = await Promise.allSettled([
        api.get('/wallet/balance', { headers }),
        api.get('/wallet/transactions', { headers }),
        api.get('/wallet/driver-earnings', { headers })
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [user?.token]);

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
                phone: user?.phoneNumber || user?.deliveryman?.phoneNumber,
              }, {
                headers: { authorization: `Bearer ${user?.token}` },
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

  const handleTopUpSubmit = async () => {
    if (!topUpAmount || isNaN(Number(topUpAmount)) || Number(topUpAmount) <= 0) {
      setInvalidValueModalVisible(true);
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/wallet/topup', {
        amount: Number(topUpAmount),
        method: 'M-Pesa/e-Mola',
        description: `Recarga de carteira: ${topUpPhone}`
      }, {
        headers: { authorization: `Bearer ${user?.token}` },
      });
      Alert.alert('Sucesso', res.data.message || 'Carteira recarregada com sucesso!');
      setTopUpModalVisible(false);
      setTopUpAmount('');
      fetchWalletData();
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.message || 'Falha ao recarregar carteira.');
      setLoading(false);
    }
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
        <Text style={styles.loaderText}>A carregar carteira...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header — estilo Tab (sem botão Fechar) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="wallet" size={24} color="#7F00FF" />
          <Text style={styles.headerTitle}>Minha Carteira</Text>
        </View>
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => Alert.alert('Informação', 'O saldo disponível pode ser retirado a qualquer momento. O saldo pendente corresponde a entregas em processamento.')}
        >
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

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity style={styles.topUpBtn} onPress={() => { setTopUpPhone(user?.phoneNumber?.toString() || ''); setTopUpModalVisible(true); }}>
                    <Ionicons name="add-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.topUpText}>Recarregar</Text>
                  </TouchableOpacity>
                </View>
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

            {/* Gráfico de Ganhos Diários (Visualização Nativa Simples) */}
            {dailyEarnings.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>Ganhos Diários</Text>
                <View style={styles.barChartContainer}>
                  {dailyEarnings.slice(-7).map((item, index) => {
                    // Calcula a altura da barra relativa ao valor máximo
                    const maxAmount = Math.max(...dailyEarnings.map(e => e.amount), 1); // Evita divisão por zero
                    const heightPercent = Math.max((item.amount / maxAmount) * 100, 5); // Mínimo de 5% de altura
                    
                    // Formata a data (ex: "15/06")
                    const dateObj = new Date(item.date);
                    const dayLabel = isNaN(dateObj.getTime()) ? item.date.substring(0, 5) : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

                    return (
                      <View key={index} style={styles.barChartCol}>
                        <Text style={styles.barChartValue} numberOfLines={1} adjustsFontSizeToFit>
                          {item.amount > 0 ? `${item.amount}` : ''}
                        </Text>
                        <View style={styles.barChartBarBg}>
                          <View style={[styles.barChartBarFill, { height: `${heightPercent}%` }]} />
                        </View>
                        <Text style={styles.barChartLabel}>{dayLabel}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      />

      {/* Modal de Recarga */}
      <Modal visible={topUpModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recarregar Carteira</Text>
              <TouchableOpacity onPress={() => setTopUpModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Valor (MT)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Ex: 500"
              keyboardType="numeric"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
            />

            <Text style={styles.inputLabel}>Nº de Telemóvel</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Ex: 84xxxxxxx"
              keyboardType="phone-pad"
              value={topUpPhone}
              onChangeText={setTopUpPhone}
            />

            <TouchableOpacity style={styles.confirmTopUpBtn} onPress={handleTopUpSubmit}>
              <Text style={styles.confirmTopUpText}>Confirmar Recarga</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Premium de Valor Inválido */}
      <Modal visible={invalidValueModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.premiumAlertCard}>
            <View style={styles.iconCircleWarning}>
              <Ionicons name="alert-circle" size={40} color="#FF9800" />
            </View>
            <Text style={styles.premiumAlertTitle}>Valor Inválido</Text>
            <Text style={styles.premiumAlertMessage}>
              Por favor, introduza um montante numérico válido e maior que zero para efetuar o recarregamento.
            </Text>
            <TouchableOpacity 
              style={styles.premiumAlertBtn} 
              onPress={() => setInvalidValueModalVisible(false)}
            >
              <Text style={styles.premiumAlertBtnText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loaderText: {
    marginTop: 12,
    color: '#7F00FF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#EAEAEA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginLeft: 8,
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
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  topUpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 10,
  },
  topUpText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  withdrawBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderRadius: 10,
  },
  withdrawText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputField: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  confirmTopUpBtn: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmTopUpText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumAlertCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  iconCircleWarning: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumAlertTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  premiumAlertMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  premiumAlertBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  premiumAlertBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  barChartCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 40,
    height: '100%',
  },
  barChartValue: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  barChartBarBg: {
    width: 20,
    height: 130, // Altura máxima da barra
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barChartBarFill: {
    width: '100%',
    backgroundColor: '#7F00FF',
    borderRadius: 10,
  },
  barChartLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 6,
  }
});
