import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, RADIUS, SHADOWS, getStatusColor, getStatusBg } from '../constants/theme';

const Orders = () => {
  const [userData, setUserData] = useState(null);
  const [ordersHistory, setOrdersHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const navigation = useNavigation();
  const [userLogin, setUserLogin] = useState(false);

  useEffect(() => { checkIfUserExist(); }, []);

  useEffect(() => {
    if (userData) fetchData();
  }, [userData]);

  useFocusEffect(
    useCallback(() => {
      if (userData) fetchData();
    }, [userData])
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pendente': return 'time-outline';
      case 'Aceite': return 'checkmark-circle-outline';
      case 'Em trânsito': return 'car-outline';
      case 'Entregue': return 'checkmark-done-outline';
      case 'Cancelado': return 'close-circle-outline';
      default: return 'cart-outline';
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`orders/sellerordersview?seller=${userData._id}`, {
        headers: { authorization: `Bearer ${userData?.token}` },
      });
      if (response?.status === 200) {
        setOrdersHistory(response?.data?.orders);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');
      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
          setUserLogin(true);
        } else {
          setIsLoading(false);
          navigation.navigate('Login');
        }
      } else {
        setIsLoading(false);
        navigation.navigate('Login');
      }
    } catch (error) {
      setIsLoading(false);
      navigation.navigate('Login');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const onRefresh = useCallback(async () => {
    if (userData) await fetchData();
  }, [userData]);

  const availableStatuses = [...new Set(ordersHistory.map(o => o.status))];
  const filtered = selectedStatus ? ordersHistory.filter(o => o.status === selectedStatus) : ordersHistory;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico de Pedidos</Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>A carregar pedidos...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Filtros de Status */}
          {availableStatuses.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.chip, !selectedStatus && styles.chipActive]}
                onPress={() => setSelectedStatus(null)}
              >
                <Text style={[styles.chipText, !selectedStatus && styles.chipTextActive]}>
                  Todos ({ordersHistory.length})
                </Text>
              </TouchableOpacity>
              {availableStatuses.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, selectedStatus === s && { backgroundColor: getStatusBg(s), borderColor: getStatusColor(s) }]}
                  onPress={() => setSelectedStatus(selectedStatus === s ? null : s)}
                >
                  <View style={[styles.dot, { backgroundColor: getStatusColor(s) }]} />
                  <Text style={[styles.chipText, selectedStatus === s && { color: getStatusColor(s), fontWeight: '700' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Cards */}
          {filtered.length > 0 ? filtered.map((order) => (
            <TouchableOpacity
              key={order._id}
              style={styles.card}
              onPress={() => navigation.navigate('OrderDetail', { order })}
              activeOpacity={0.85}
            >
              <View style={[styles.iconBox, { backgroundColor: getStatusBg(order?.status) }]}>
                <Ionicons name={getStatusIcon(order?.status)} size={22} color={getStatusColor(order?.status)} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardRow}>
                  <Text style={styles.code}>#{order?.code}</Text>
                  <Text style={styles.price}>{order?.totalPrice} MT</Text>
                </View>
                <Text style={styles.clientName}>
                  <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} /> {order?.user?.name || 'Cliente Desconhecido'}
                </Text>
                <Text style={styles.date}>{formatDate(order?.createdAt)}</Text>
                <View style={[styles.statusPill, { backgroundColor: getStatusBg(order?.status), borderColor: getStatusColor(order?.status) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order?.status) }]}>{order?.status}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )) : (
            <View style={styles.empty}>
              <Ionicons name="cart-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nenhum pedido encontrado.</Text>
            </View>
          )}
          <View style={{ paddingBottom: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default Orders;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    ...SHADOWS.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  scroll: {
    padding: 16,
    paddingTop: 20,
  },
  filterRow: {
    marginBottom: 20,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary,
    ...SHADOWS.glow,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '800',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.xl,
    marginBottom: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.lg,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  code: {
    fontSize: SIZES.base,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  price: {
    fontSize: SIZES.base,
    color: COLORS.primaryLight,
    fontWeight: '800',
  },
  date: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: 20,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
});
