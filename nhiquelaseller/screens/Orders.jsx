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
      const response = await api.get(`orders/sellerview?seller=${userData._id}`, {
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
              <View style={[styles.statusBar, { backgroundColor: getStatusColor(order?.status) }]} />
              <View style={[styles.iconBox, { backgroundColor: getStatusBg(order?.status) }]}>
                <Ionicons name={getStatusIcon(order?.status)} size={22} color={getStatusColor(order?.status)} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardRow}>
                  <Text style={styles.code}>#{order?.code}</Text>
                  <Text style={styles.price}>{order?.totalPrice} MT</Text>
                </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: SIZES.sm,
  },
  scroll: {
    padding: 16,
  },
  filterRow: {
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  chipActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  chipTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statusBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  cardContent: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  code: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
  },
  price: {
    fontSize: SIZES.base,
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  date: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: SIZES.base,
    fontWeight: '500',
  },
});
