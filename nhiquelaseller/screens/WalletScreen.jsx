import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  RefreshControl, StatusBar, ActivityIndicator, Modal, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const WalletScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [balance, setBalance] = useState(0);
  const [minRecommendedBalance, setMinRecommendedBalance] = useState(50);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, tripsToday: 0 });
  const [dailyEarnings, setDailyEarnings] = useState([]);
  const [selectedDayStats, setSelectedDayStats] = useState(null);

  const formatCurrency = (val) => `${Number(val || 0).toFixed(2)} MT`;

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (!storedUserData) { navigation.navigate('Login'); return null; }
      const parsedUser = JSON.parse(storedUserData);
      setUserData(parsedUser);
      
      try {
        const { data } = await api.get(`/users/${parsedUser._id}`, {
          headers: { authorization: `Bearer ${parsedUser.token}` }
        });
        const updatedUser = { ...parsedUser, ...data };
        setUserData(updatedUser);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        return updatedUser;
      } catch (apiErr) {
        return parsedUser;
      }
    } catch (err) {
      navigation.navigate('Login');
      return null;
    }
  };

  const loadWallet = async (user) => {
    try {
      const headers = { authorization: `Bearer ${user.token}` };
      const [res1, res2, res3] = await Promise.all([
        api.get('/wallet/balance', { headers }),
        api.get('/wallet/transactions', { headers }),
        api.get('/wallet/seller-earnings', { headers }).catch(e => {
          console.log('Erro ao buscar ganhos diários:', e.message);
          return { data: { today: 0, week: 0, tripsToday: 0, dailyEarnings: [] } };
        }),
      ]);
      setBalance(res1.data.available_balance || res1.data.balance || 0);
      setMinRecommendedBalance(res1.data.minimum_recommended_balance || 50);
      setTransactions(res2.data || []);
      if (res3 && res3.data) {
        setEarnings({
          today: res3.data.today || 0,
          week: res3.data.week || 0,
          tripsToday: res3.data.tripsToday || 0,
        });
        setDailyEarnings(res3.data.dailyEarnings || []);
      }
    } catch (err) {
      console.error('Erro ao carregar carteira:', err.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      const user = await loadUserData();
      if (user) await loadWallet(user);
      setLoading(false);
    };
    init();
  }, []);

  // Listen to realtime socket updates
  const socket = require('../hooks/useSocket').default(userData?._id);
  useEffect(() => {
    if (socket && userData) {
      const handleWalletUpdated = async () => {
        console.log('🔄 Sockets: Recebeu walletUpdated, atualizando carteira...');
        await loadWallet(userData);
      };
      
      socket.on('walletUpdated', handleWalletUpdated);
      
      return () => {
        socket.off('walletUpdated', handleWalletUpdated);
      };
    }
  }, [socket, userData]);

  const onRefresh = async () => {
    setRefreshing(true);
    const user = await loadUserData();
    if (user) await loadWallet(user);
    setRefreshing(false);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const renderTransaction = ({ item }) => {
    const isCredit = item.type === 'credit';
    const isPending = item.status === 'pendente';
    const isFailed = item.status === 'falhado';
    const statusColor = isPending ? '#F59E0B' : (isFailed ? COLORS.error : (isCredit ? COLORS.success : COLORS.text));
    const iconColor = isPending ? '#F59E0B' : (isFailed ? COLORS.error : (isCredit ? COLORS.success : COLORS.error));
    const iconBg = isPending ? '#FEF3C7' : (isFailed ? COLORS.errorBg : (isCredit ? COLORS.successBg : COLORS.errorBg));

    return (
      <View style={styles.txCard}>
        <View style={[styles.txIconBox, { backgroundColor: iconBg }]}>
          <Ionicons
            name={isPending ? 'time-outline' : (isFailed ? 'close-circle' : (isCredit ? 'arrow-down-circle' : 'arrow-up-circle'))}
            size={24}
            color={iconColor}
          />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.txType}>
            {isCredit ? 'Entrada' : 'Saída'}
            {isPending && ' (Pendente)'}
            {isFailed && ' (Rejeitado)'}
          </Text>
          <Text style={styles.txDesc} numberOfLines={1}>{item.description || '—'}</Text>
          <Text style={styles.txDate}>{formatDate(item.date || item.createdAt)}</Text>
        </View>
        <Text style={[styles.txAmount, { color: statusColor, textDecorationLine: isFailed ? 'line-through' : 'none' }]}>
          {isCredit ? '+' : '-'}{Math.abs(item.amount).toFixed(2)} MT
        </Text>
      </View>
    );
  };

  const totalIn = transactions.filter(t => t.type === 'credit' && t.status === 'confirmado').reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = transactions.filter(t => t.type === 'debit' && t.status === 'confirmado').reduce((s, t) => s + (t.amount || 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Carteira</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Saldo Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceGlow} />
              <Text style={styles.balanceLabel}>Saldo Disponível</Text>
              <Text style={styles.balanceValue}>{balance.toFixed(2)} MT</Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceStat}>
                  <Ionicons name="arrow-down-circle" size={16} color={COLORS.success} />
                  <Text style={styles.balanceStatText}>{totalIn.toFixed(2)} MT</Text>
                  <Text style={styles.balanceStatLabel}>Entradas</Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceStat}>
                  <Ionicons name="arrow-up-circle" size={16} color={COLORS.error} />
                  <Text style={styles.balanceStatText}>{totalOut.toFixed(2)} MT</Text>
                  <Text style={styles.balanceStatLabel}>Saídas</Text>
                </View>
              </View>
            </View>

            {/* Status do Saldo */}
            <View style={styles.statusBox}>
              <View style={styles.statusHeader}>
                <Ionicons 
                  name={balance >= minRecommendedBalance ? "checkmark-circle" : "warning"} 
                  size={20} 
                  color={balance >= minRecommendedBalance ? COLORS.success : COLORS.warning} 
                />
                <Text style={[styles.statusTitle, { color: balance >= minRecommendedBalance ? COLORS.success : COLORS.warning }]}>
                  {balance >= minRecommendedBalance ? "Saldo adequado" : "Saldo abaixo do recomendado"}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Saldo mínimo recomendado:</Text>
                <Text style={styles.statusValue}>{minRecommendedBalance.toFixed(2)} MT</Text>
              </View>
              {userData?.seller?.storeStatus === 'CLOSED_LOW_BALANCE' && (
                <View style={styles.alertBox}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                  <Text style={styles.alertText}>
                    Loja fechada por saldo insuficiente. Recarregue a sua carteira para poder reactivar a loja.
                  </Text>
                </View>
              )}
            </View>

            {/* Botão de Recarga */}
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => navigation.navigate('TopUp')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.withdrawBtnText}>Recarregar Carteira</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            {/* Sumário de Ganhos */}
            <Text style={styles.sectionTitle}>Sumário de Ganhos</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Hoje</Text>
                <Text style={styles.statValue}>{formatCurrency(earnings.today)}</Text>
                <Text style={{ fontSize: 13, color: '#34C759', fontWeight: 'bold' }}>{earnings.tripsToday} {earnings.tripsToday === 1 ? 'venda' : 'vendas'}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Esta Semana</Text>
                <Text style={styles.statValue}>{formatCurrency(earnings.week)}</Text>
              </View>
            </View>

            {/* Gráfico de Ganhos Diários (Visualização Nativa Detalhada) */}
            {dailyEarnings.length > 0 && (
              <View style={[styles.chartContainer, { paddingVertical: 20 }]}>
                <Text style={styles.sectionTitle}>Vendas Diárias (Ganhos)</Text>
                
                <View style={{ flexDirection: 'row', height: 220, marginTop: 15, alignItems: 'flex-end' }}>
                  {/* Eixo Y */}
                  {(() => {
                    const maxTrips = Math.max(...dailyEarnings.map(e => e.trips || 0), 1);
                    const scaleTop = Math.ceil(maxTrips / 10) * 10 || 10;
                    return (
                      <View style={{ justifyContent: 'space-between', height: '100%', paddingBottom: 25, paddingRight: 10, borderRightWidth: 1, borderRightColor: '#E0E0E0' }}>
                        <Text style={{ color: '#999', fontSize: 10, fontWeight: 'bold' }}>{scaleTop} V</Text>
                        <Text style={{ color: '#999', fontSize: 10, fontWeight: 'bold' }}>{Math.round(scaleTop / 2)} V</Text>
                        <Text style={{ color: '#999', fontSize: 10, fontWeight: 'bold' }}>0</Text>
                      </View>
                    );
                  })()}

                  {/* Barras do Gráfico */}
                  <View style={[styles.barChartContainer, { flex: 1, height: '100%', paddingLeft: 5 }]}>
                    {dailyEarnings.slice(-7).map((item, index) => {
                      const maxTrips = Math.max(...dailyEarnings.map(e => e.trips || 0), 1);
                      const scaleTop = Math.ceil(maxTrips / 10) * 10 || 10;
                      // Calcula altura em relação ao teto da escala
                      const heightPercent = Math.max(((item.trips || 0) / scaleTop) * 100, 2); 
                      
                      const dateObj = new Date(item.date);
                      const dayLabel = isNaN(dateObj.getTime()) ? item.date.substring(0, 5) : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

                      return (
                        <TouchableOpacity key={index} style={styles.barChartCol} onPress={() => setSelectedDayStats(item)}>
                          <Text style={[styles.barChartValue, { marginBottom: 2, fontSize: 10 }]} numberOfLines={1} adjustsFontSizeToFit>
                            {(item.amount || 0) > 0 ? `${item.amount} MT` : ''}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#34C759', fontWeight: 'bold', marginBottom: 4 }}>
                            {item.trips ? `${item.trips}` : '0'}
                          </Text>
                          <View style={[styles.barChartBarBg, { overflow: 'hidden', backgroundColor: '#F0F0F0', borderRadius: 6 }]}>
                            <View style={[styles.barChartBarFill, { height: `${heightPercent}%`, backgroundColor: COLORS.primary, borderRadius: 6, width: '100%' }]} />
                          </View>
                          <Text style={[styles.barChartLabel, { marginTop: 8, fontSize: 11, fontWeight: '600' }]}>{dayLabel}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>Movimentos</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="swap-vertical-outline" size={50} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
          </View>
        }
      />

      {/* Modal de Detalhes Diários */}
      <Modal visible={!!selectedDayStats} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Detalhes - {selectedDayStats ? (() => {
                  const dateObj = new Date(selectedDayStats.date);
                  return isNaN(dateObj.getTime()) ? selectedDayStats.date : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                })() : ''}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDayStats(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={{ marginBottom: 15, padding: 15, backgroundColor: '#F8F9FA', borderRadius: 12 }}>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>Faturação do dia</Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#34C759' }}>{selectedDayStats ? formatCurrency(selectedDayStats.amount) : ''}</Text>
              <Text style={{ fontSize: 13, color: '#666', marginTop: 5 }}>Total de {selectedDayStats?.trips || 0} vendas</Text>
            </View>
            <ScrollView style={{ flexGrow: 0 }}>
              {selectedDayStats?.tripsList?.length > 0 ? (
                selectedDayStats.tripsList.map((trip, idx) => (
                  <View key={idx} style={{ 
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: '#F3F4F6'
                  }}>
                    {/* Cabeçalho da Viagem: Código e Preço */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '900', fontSize: 18, color: '#1F2937' }}>#{trip.code}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            <Ionicons name="time-outline" size={12} color="#4B5563" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '600' }}>{trip.time}</Text>
                          </View>
                          <View style={{ marginHorizontal: 8 }}>
                            <Text style={{ color: '#D1D5DB' }}>•</Text>
                          </View>
                          <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>{trip.type}</Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                        <Text style={{ fontWeight: '800', fontSize: 18, color: '#059669' }}>{formatCurrency(trip.amount)}</Text>
                      </View>
                    </View>
                    
                    {/* Box de Cliente e Trajeto */}
                    <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16 }}>
                      
                      {/* Cliente */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                        <Image 
                          source={{ uri: trip.clientImage || 'https://via.placeholder.com/60' }} 
                          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB', marginRight: 12 }} 
                        />
                        <View>
                          <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 }}>Cliente</Text>
                          <Text style={{ fontWeight: '700', color: '#111827', fontSize: 16 }}>{trip.clientName}</Text>
                        </View>
                      </View>
                      
                      {/* Trajeto */}
                      <View style={{ paddingLeft: 6 }}>
                        {/* Origem */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                          <View style={{ alignItems: 'center', marginRight: 12 }}>
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, marginTop: 4 }} />
                            <View style={{ width: 2, height: 24, backgroundColor: '#E5E7EB', marginTop: 4 }} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Ponto de Partida</Text>
                            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{trip.origin}</Text>
                          </View>
                        </View>
                        
                        {/* Destino */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                          <View style={{ alignItems: 'center', marginRight: 12 }}>
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', marginTop: 4 }} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Ponto de Chegada</Text>
                            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{trip.destination}</Text>
                          </View>
                        </View>
                      </View>
                      
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={{ color: '#999' }}>Nenhuma venda registada neste dia.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default WalletScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: 24,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.lg,
  },
  balanceGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -80,
    right: -60,
  },
  balanceLabel: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.lg,
    padding: 12,
  },
  balanceStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  balanceStatText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: '#fff',
  },
  balanceStatLabel: {
    fontSize: SIZES.xs,
    color: 'rgba(255,255,255,0.65)',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 12,
    ...SHADOWS.glow,
  },
  withdrawBtnText: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txType: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  txDesc: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginVertical: 2,
  },
  txDate: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
  },
  txAmount: {
    fontSize: SIZES.base,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.lg,
    padding: 16,
    width: '48%',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: 'bold',
  },
  chartContainer: {
    marginBottom: 20,
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
    fontSize: 9,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  barChartBarBg: {
    width: 20,
    height: 130,
    backgroundColor: COLORS.surface2 || '#F0F0F0',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barChartBarFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  barChartLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surfaceCard || '#FFF',
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
    color: COLORS.text,
  },
  statusBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    marginLeft: 8,
    lineHeight: 16,
  },
});
