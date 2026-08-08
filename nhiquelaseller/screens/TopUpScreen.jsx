import { showMessage } from "react-native-flash-message";
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

const TopUpScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ✅ Verifica se o utilizador está autenticado ao entrar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        const storedId = await AsyncStorage.getItem('id');

        if (!storedUser || !storedId) {
          // Não está logado — redirecionar para login
          Alert.alert(
            'Sessão expirada',
            'Precisa de estar logado para recarregar a carteira.',
            [{ text: 'Entrar', onPress: () => navigation.replace('Login') }]
          );
          return;
        }

        const parsed = JSON.parse(storedUser);
        if (!parsed.token) {
          Alert.alert(
            'Sessão inválida',
            'Por favor faça login novamente.',
            [{ text: 'OK', onPress: () => navigation.replace('Login') }]
          );
          return;
        }

        setUserData(parsed);
      } catch (err) {
        navigation.replace('Login');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleTopUp = async () => {
    // Garantia extra: nunca permite recarga sem sessão
    if (!userData || !userData.token) {
      Alert.alert('Sem sessão', 'Faça login para recarregar a carteira.');
      navigation.replace('Login');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showMessage({ message: 'Valor inválido', description: 'Introduza um valor positivo.', type: 'warning', icon: 'auto' });
      return;
    }
    if (parsedAmount < 50) {
      showMessage({ message: 'Valor mínimo', description: 'O valor mínimo de recarga é 50 MT.', type: 'warning', icon: 'auto' });
      return;
    }

    setLoading(true);
    try {
      // ✅ Token enviado no header — backend associa a recarga ao user logado
      const response = await api.post(
        '/wallet/topup',
        {
          amount: parsedAmount,
          method: 'Pagamento recebido',
          description: `Recarga de ${parsedAmount} MT via app`,
        },
        {
          headers: { Authorization: `Bearer ${userData.token}` },
        }
      );

      showMessage({
        message: '✅ Recarga efectuada!',
        description: `Novo saldo: ${response.data.balance?.toFixed(2)} MT`,
        type: 'success',
        icon: 'auto',
        duration: 4000,
      });

      setAmount('');
      navigation.goBack();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Não foi possível recarregar. Tente novamente.';
      showMessage({ message: 'Erro na recarga', description: msg, type: 'danger', icon: 'auto', duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  // Enquanto verifica a sessão
  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>A verificar sessão...</Text>
      </View>
    );
  }

  // Se não há user (não deveria chegar aqui, mas segurança extra)
  if (!userData) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recarregar Carteira</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Info da conta */}
          <View style={styles.accountCard}>
            <View style={styles.accountIconBox}>
              <MaterialCommunityIcons name="account-circle-outline" size={32} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.accountLabel}>Recarregar conta de</Text>
              <Text style={styles.accountName}>{userData.name}</Text>
              <Text style={styles.accountPhone}>+258 {userData.phoneNumber}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.verifiedText}>Logado</Text>
            </View>
          </View>

          {/* Valor */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Valor da Recarga</Text>
            <Text style={styles.cardSubtitle}>Mínimo: 50 MT</Text>

            <View style={styles.inputRow}>
              <Text style={styles.currency}>MT</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                maxLength={8}
              />
            </View>

            {/* Valores rápidos */}
            <View style={styles.quickGrid}>
              {QUICK_AMOUNTS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.quickBtn, amount === String(val) && styles.quickBtnActive]}
                  onPress={() => setAmount(String(val))}
                >
                  <Text style={[styles.quickBtnText, amount === String(val) && styles.quickBtnTextActive]}>
                    {val} MT
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Aviso de segurança */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primaryLight} style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              A recarga será creditada directamente na conta de <Text style={{ color: COLORS.primaryLight, fontWeight: '700' }}>{userData.name}</Text>.
            </Text>
          </View>

          {/* Botão */}
          <TouchableOpacity
            style={[styles.confirmBtn, (loading || !amount) && { opacity: 0.6 }]}
            onPress={handleTopUp}
            disabled={loading || !amount}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={styles.confirmBtnText}>
                  Confirmar Recarga {amount ? `de ${amount} MT` : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default TopUpScreen;

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
    gap: 16,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
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
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  // Conta
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 14,
    ...SHADOWS.sm,
  },
  accountIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  accountName: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
  },
  accountPhone: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: SIZES.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  // Card
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.md,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  currency: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.primaryLight,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    paddingVertical: 14,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickBtnActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary,
  },
  quickBtnText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  quickBtnTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  // Info
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.sm,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  // Botão
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    height: 56,
    gap: 10,
    ...SHADOWS.md,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
  },
});
