import { showMessage } from "react-native-flash-message";
import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../hooks/createConnectionApi.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const WalletWithdrawScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserData(parsedUser);
          if (parsedUser.phoneNumber) {
            setPhone(parsedUser.phoneNumber);
          } else if (parsedUser.phone) {
            setPhone(parsedUser.phone);
          }

          const res = await api.get('/wallet/balance', {
            headers: { authorization: `Bearer ${parsedUser.token}` },
          });
          setBalance(res.data.available_balance || res.data.balance || 0);
        } else {
          throw new Error('Usuário não encontrado');
        }
      } catch (err) {
        console.error(err);
        showMessage({
          message: 'Erro',
          description: 'Não foi possível carregar os dados da carteira.',
          type: "danger",
          icon: "auto",
          duration: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleWithdraw = async () => {
    const parsedAmount = parseFloat(amount);
    
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return showMessage({
        message: 'Aviso',
        description: 'Digite um valor válido para levantamento.',
        type: "warning",
        icon: "auto",
        duration: 3000,
      });
    }

    if (parsedAmount > balance) {
      return showMessage({
        message: 'Saldo Insuficiente',
        description: `Só tem ${balance.toFixed(2)} MT disponível.`,
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
    }

    if (!phone || phone.length < 9) {
      return showMessage({
        message: 'Aviso',
        description: 'Digite um número de telefone válido (ex: 84XXXXXXX).',
        type: "warning",
        icon: "auto",
        duration: 3000,
      });
    }

    setProcessing(true);
    try {
      const res = await api.post('/wallet/withdraw', {
        amount: parsedAmount,
        phone,
      }, {
        headers: { authorization: `Bearer ${userData.token}` },
      });
      
      showMessage({
        message: 'Levantamento Solicitado',
        description: res.data.message || 'O seu pedido está pendente de aprovação.',
        type: "success",
        icon: "auto",
        duration: 4000,
      });
      navigation.goBack();
    } catch (err) {
      showMessage({
        message: 'Erro',
        description: err.response?.data?.message || 'Erro ao solicitar levantamento',
        type: "danger",
        icon: "auto",
        duration: 4000,
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>A carregar dados...</Text>
      </View>
    );
  }

  const parsedAmount = parseFloat(amount);
  const calculatedFee = amount && !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount * 0.01 : 0;
  const netAmount = amount && !isNaN(parsedAmount) && parsedAmount > 0 ? Math.max(0, parsedAmount - calculatedFee) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Levantar Fundos</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          
          <View style={styles.balanceCard}>
            <View style={styles.balanceGlow} />
            <Text style={styles.balanceLabel}>Saldo Disponível</Text>
            <Text style={styles.balanceValue}>{balance.toFixed(2)} <Text style={styles.currencyCode}>MT</Text></Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Número M-PESA</Text>
            <View style={styles.inputRow}>
              <Ionicons name="phone-portrait-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
              <Text style={styles.prefix}>+258</Text>
              <TextInput
                placeholder="84XXXXXXX"
                placeholderTextColor={COLORS.textMuted}
                value={phone}   
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
                maxLength={9}
              />
            </View>

            <Text style={styles.label}>Valor do Levantamento (MT)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="cash-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                placeholder="Ex: 500"
                placeholderTextColor={COLORS.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            {amount && !isNaN(parsedAmount) && parsedAmount > 0 ? (
              <View style={styles.feeContainer}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Levantamento</Text>
                  <Text style={styles.feeValue}>{parsedAmount.toFixed(2)} MT</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Taxa (1%)</Text>
                  <Text style={styles.feeValueLoss}>- {calculatedFee.toFixed(2)} MT</Text>
                </View>
                <View style={styles.feeDivider} />
                <View style={styles.feeRow}>
                  <Text style={styles.netLabel}>Receberá líquido</Text>
                  <Text style={styles.netValue}>{netAmount.toFixed(2)} MT</Text>
                </View>
              </View>
            ) : null}
          </View>

          <TouchableOpacity 
            style={[styles.button, (processing || !amount) && { opacity: 0.6 }]} 
            onPress={handleWithdraw}
            disabled={processing || !amount}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Solicitar Levantamento</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
    padding: 20,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: 24,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  balanceGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: COLORS.primaryGlow,
    top: -100,
    right: -80,
  },
  balanceLabel: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  currencyCode: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  formCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.md,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  label: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prefix: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: SIZES.base,
    color: COLORS.text,
    fontWeight: '500',
  },
  feeContainer: {
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderRadius: RADIUS.sm,
    padding: 16,
    marginTop: 4,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  feeLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  feeValue: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  feeValueLoss: {
    fontSize: SIZES.sm,
    color: COLORS.error,
    fontWeight: '500',
  },
  feeDivider: {
    height: 1,
    backgroundColor: COLORS.primary + '30',
    marginVertical: 8,
  },
  netLabel: {
    fontSize: SIZES.base,
    color: COLORS.text,
    fontWeight: '700',
  },
  netValue: {
    fontSize: SIZES.base,
    color: COLORS.success,
    fontWeight: '800',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default WalletWithdrawScreen;
