import { showMessage } from "react-native-flash-message";
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, Alert, Switch, ActivityIndicator, Modal, StatusBar,
} from 'react-native';
import React, { useState, useCallback } from 'react';
import { Ionicons, MaterialCommunityIcons, AntDesign } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const Profile = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [userLogin, setUserLogin] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStore, setUpdatingStore] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchPendingWithdrawals = async (user) => {
    if (!user?.token) return;
    try {
      const response = await api.get('/wallet/pending', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setPendingCount(response.data.length || 0);
    } catch (error) {
      console.error("Erro ao buscar solicitações pendentes:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadUserAndPending = async () => {
        const user = await checkIfUserExist();
        if (user?.isAdmin) fetchPendingWithdrawals(user);
      };
      loadUserAndPending();
    }, [])
  );

  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');
      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
          setIsStoreOpen(parsedUserData.seller?.openstore || false);
          setUserLogin(true);
          setIsAdmin(parsedUserData.isAdmin);
          return parsedUserData;
        } else {
          navigation.navigate('Login');
        }
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      navigation.navigate('Login');
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const userLogout = async () => {
    setIsLoading(true);
    await AsyncStorage.removeItem('id');
    await AsyncStorage.removeItem('userData');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    setIsLoading(false);
  };

  const logout = () => {
    Alert.alert("Sair", "Tem a certeza que deseja sair?", [
      { text: "Cancelar" },
      { text: "Sair", style: 'destructive', onPress: () => userLogout() },
    ]);
  };

  const toggleStoreStatus = async () => {
    setUpdatingStore(true);
    try {
      const id = await AsyncStorage.getItem('id');
      const newStatus = !isStoreOpen;
      const response = await api.patch(
        `/users/seller-status/${id}`,
        { isOpenStore: newStatus },
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      if (response?.status === 200) {
        setIsStoreOpen(newStatus);
        const updatedUser = { ...userData, seller: { ...userData.seller, openstore: newStatus } };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        showMessage({
          message: newStatus ? '✅ Loja aberta!' : '🔴 Loja fechada',
          type: newStatus ? 'success' : 'info',
          icon: 'auto',
          duration: 2500,
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar estado da loja:', error);
      showMessage({ message: 'Erro', description: 'Não foi possível atualizar o estado da loja.', type: "danger", icon: "auto" });
    } finally {
      setUpdatingStore(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>A carregar...</Text>
      </View>
    );
  }

  const MenuItem = ({ icon, iconType = 'material', label, onPress, right, danger }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconBox, danger && styles.menuIconBoxDanger]}>
        {iconType === 'ionicons'
          ? <Ionicons name={icon} size={20} color={danger ? COLORS.error : COLORS.primary} />
          : iconType === 'antdesign'
            ? <AntDesign name={icon} size={20} color={danger ? COLORS.error : COLORS.primary} />
            : <MaterialCommunityIcons name={icon} size={20} color={danger ? COLORS.error : COLORS.primary} />
        }
      </View>
      <Text style={[styles.menuLabel, danger && { color: COLORS.error }]}>{label}</Text>
      <View style={styles.menuRight}>
        {right}
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerGlow} />
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image source={require('../assets/default1.jpg')} style={styles.avatar} />
              <View style={[styles.storeBadge, { backgroundColor: isStoreOpen ? COLORS.success : COLORS.error }]}>
                <View style={styles.storeDot} />
              </View>
            </View>
            <Text style={styles.name}>{userLogin ? userData.name : "Por favor faça login"}</Text>
            {userLogin && (
              <View style={styles.phonePill}>
                <Ionicons name="call-outline" size={14} color={COLORS.primaryLight} />
                <Text style={styles.phoneText}>{userData?.phoneNumber}</Text>
              </View>
            )}
            {userData?.seller?.name && (
              <View style={styles.storePill}>
                <MaterialCommunityIcons name="storefront-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.storeText}>{userData.seller.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Store Toggle */}
        {userLogin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loja</Text>
            <View style={styles.card}>
              <View style={styles.storeRow}>
                <View style={[styles.menuIconBox, { backgroundColor: isStoreOpen ? COLORS.successBg : COLORS.errorBg }]}>
                  <MaterialCommunityIcons name="store" size={20} color={isStoreOpen ? COLORS.success : COLORS.error} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.menuLabel}>Estado da Loja</Text>
                  <Text style={[styles.storeStatus, { color: isStoreOpen ? COLORS.success : COLORS.error }]}>
                    {isStoreOpen ? '🟢 Aberta — A receber pedidos' : '🔴 Fechada — Não recebe pedidos'}
                  </Text>
                </View>
                <Switch
                  value={isStoreOpen}
                  onValueChange={toggleStoreStatus}
                  trackColor={{ false: COLORS.surface2, true: COLORS.primary }}
                  thumbColor={isStoreOpen ? '#fff' : COLORS.textMuted}
                  disabled={updatingStore}
                />
              </View>
            </View>
          </View>
        )}

        {/* Menu */}
        {userLogin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conta</Text>
            <View style={styles.card}>
              <MenuItem icon="wallet" label="Minha Carteira" onPress={() => navigation.navigate('Wallet')} />
              {isAdmin && (
                <MenuItem
                  icon="bank-transfer"
                  label="Autorizar Levantamentos"
                  onPress={() => navigation.navigate('WithdrawalRequests')}
                  right={pendingCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingCount}</Text>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        )}

        {userLogin && (
          <View style={styles.section}>
            <View style={styles.card}>
              <MenuItem icon="logout" iconType="antdesign" label="Terminar Sessão" onPress={logout} danger />
            </View>
          </View>
        )}

        {!userLogin && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.loginBtnText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ marginBottom: 100 }} />
      </ScrollView>

      {/* Overlay de actualização */}
      <Modal transparent visible={updatingStore}>
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.overlayText}>A actualizar estado da loja...</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default React.memo(Profile);

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
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: SIZES.sm,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingBottom: 30,
    marginBottom: 20,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primaryGlow,
    top: -150,
    alignSelf: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 40,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  storeBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  name: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 6,
    marginBottom: 8,
  },
  phoneText: {
    color: COLORS.primaryLight,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  storeStatus: {
    fontSize: SIZES.sm,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconBoxDanger: {
    backgroundColor: COLORS.errorBg,
  },
  menuLabel: {
    flex: 1,
    marginLeft: 14,
    fontSize: SIZES.base,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    height: 54,
    gap: 10,
    ...SHADOWS.md,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBox: {
    backgroundColor: COLORS.surfaceCard,
    padding: 30,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.lg,
  },
  overlayText: {
    color: COLORS.textSecondary,
    marginTop: 14,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
});
