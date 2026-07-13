import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const WalletScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (!storedUserData) { navigation.navigate('Login'); return null; }
      const parsedUser = JSON.parse(storedUserData);
      setUserData(parsedUser);
      return parsedUser;
    } catch (err) {
      navigation.navigate('Login');
      return null;
    }
  };

  const loadWallet = async (user) => {
    try {
      const headers = { authorization: `Bearer ${user.token}` };
      const [res1, res2] = await Promise.all([
        api.get('/wallet/balance', { headers }),
        api.get('/wallet/transactions', { headers }),
      ]);
      setBalance(res1.data.available_balance || res1.data.balance || 0);
      setTransactions(res2.data || []);
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
    return (
      <View style={styles.txCard}>
        <View style={[styles.txIconBox, { backgroundColor: isCredit ? COLORS.successBg : COLORS.errorBg }]}>
          <Ionicons
            name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'}
            size={24}
            color={isCredit ? COLORS.success : COLORS.error}
          />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.txType}>{isCredit ? 'Entrada' : 'Saída'}</Text>
          <Text style={styles.txDesc} numberOfLines={1}>{item.description || '—'}</Text>
          <Text style={styles.txDate}>{formatDate(item.date || item.createdAt)}</Text>
        </View>
        <Text style={[styles.txAmount, { color: isCredit ? COLORS.success : COLORS.error }]}>
          {isCredit ? '+' : '-'}{Math.abs(item.amount).toFixed(2)} MT
        </Text>
      </View>
    );
  };

  const totalIn = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);

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

            {/* Botão de Levantamento */}
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => navigation.navigate('withdraw')}
              activeOpacity={0.85}
            >
              <Ionicons name="cash-outline" size={20} color="#fff" />
              <Text style={styles.withdrawBtnText}>Solicitar Levantamento</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

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
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
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
    borderRadius: RADIUS.sm,
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
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 12,
    ...SHADOWS.sm,
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
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
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
});
