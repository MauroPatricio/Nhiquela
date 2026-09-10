import { showMessage } from "react-native-flash-message";
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, KeyboardAvoidingView,
  Platform, ScrollView, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import api from '../hooks/createConnectionApi';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const QUICK_AMOUNTS = [200, 250, 500, 1000, 2000, 5000];

const TopUpScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [receiptImage, setReceiptImage] = useState(null);
  const [countdown, setCountdown] = useState(0); // in seconds
  const [isWaiting, setIsWaiting] = useState(false);

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

  useEffect(() => {
    let timer;
    if (isWaiting && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isWaiting, countdown]);

  // Listen to realtime socket updates
  const socket = require('../hooks/useSocket').default(userData?._id);
  useEffect(() => {
    if (socket && isWaiting) {
      const handleWalletUpdated = async () => {
        console.log('🔄 Sockets: TopUp processado (walletUpdated). Removendo aviso...');
        await AsyncStorage.removeItem('topup_timestamp');
        setIsWaiting(false);
        setCountdown(0);
        // Opcional: Navegar de volta ou apenas limpar o form
        navigation.goBack();
      };
      
      socket.on('walletUpdated', handleWalletUpdated);
      
      return () => {
        socket.off('walletUpdated', handleWalletUpdated);
      };
    }
  }, [socket, isWaiting, navigation]);

  const handlePickReceipt = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const notifyFinance = async () => {
    try {
      setLoading(true);
      await api.post('/wallet/notify-finance', {}, {
        headers: { Authorization: `Bearer ${userData.token}` },
      });
      showMessage({ message: 'Equipa notificada!', description: 'Enviámos um novo aviso aos administradores.', type: 'success' });
      // Reset countdown for another 15 minutes
      const now = Date.now();
      await AsyncStorage.setItem('topup_timestamp', now.toString());
      setCountdown(900);
    } catch (error) {
      showMessage({ message: 'Erro', description: 'Não foi possível notificar a equipa.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

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
    if (parsedAmount < 200) {
      showMessage({ message: 'Valor mínimo', description: 'O valor mínimo de recarga é 200 MT.', type: 'warning', icon: 'auto' });
      return;
    }
    if (!receiptImage) {
      showMessage({ message: 'Falta o comprovativo', description: 'Por favor anexe o comprovativo de pagamento.', type: 'warning', icon: 'auto' });
      return;
    }

    setLoading(true);
    try {
      // 1. Upload receipt
      const bodyFormData = new FormData();
      bodyFormData.append('file', { uri: receiptImage, name: 'receipt.jpg', type: 'image/jpeg' });
      const uploadRes = await api.post('/upload', bodyFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const receiptUrl = uploadRes.data.secure_url;

      // 2. Enviar recarga
      const response = await api.post(
        '/wallet/topup',
        {
          amount: parsedAmount,
          method: 'Depósito Manual',
          description: `Recarga de ${parsedAmount} MT via app (Comprovativo: ${receiptUrl})`,
          receiptImage: receiptUrl
        },
        {
          headers: { Authorization: `Bearer ${userData.token}` },
        }
      );

      showMessage({
        message: '✅ Pedido recebido!',
        description: 'O seu pedido de recarga está pendente de aprovação pela nossa equipa.',
        type: 'success',
        icon: 'auto',
        duration: 4000,
      });

      // Start countdown
      const now = Date.now();
      await AsyncStorage.setItem('topup_timestamp', now.toString());
      setIsWaiting(true);
      setCountdown(900);
      
      setAmount('');
      setReceiptImage(null);
    } catch (error) {
      const msg = error?.response?.data?.message || 'Não foi possível solicitar recarga. Tente novamente.';
      showMessage({ message: 'Erro no pedido', description: msg, type: 'danger', icon: 'auto', duration: 4000 });
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
            <Text style={styles.cardSubtitle}>Mínimo: 200 MT</Text>

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

          {/* Aviso de segurança e Countdown */}
          {isWaiting ? (
            <View style={styles.countdownBox}>
              <Ionicons name="time-outline" size={32} color={COLORS.primary} style={{ marginBottom: 10 }} />
              <Text style={styles.countdownTitle}>Pedido em Análise</Text>
              <Text style={styles.countdownText}>
                O seu comprovativo está a ser validado. Por favor aguarde...
              </Text>
              <Text style={styles.timerText}>
                {Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}
              </Text>

              {countdown === 0 && (
                <TouchableOpacity style={styles.notifyBtn} onPress={notifyFinance} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.notifyBtnText}>Notificar Equipa Financeira</Text>}
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={{ marginTop: 20 }}
                onPress={() => {
                  setIsWaiting(false);
                  AsyncStorage.removeItem('topup_timestamp');
                }}
              >
                <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Fazer outro pedido de recarga</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Instruções de Pagamento */}
              <View style={styles.bankInfoBox}>
                <Text style={styles.bankInfoTitle}>Pague aqui com M-Pesa</Text>
                <Text style={styles.bankInfoText}>1) Digita <Text style={{fontWeight: 'bold'}}>*150#;</Text></Text>
                <Text style={styles.bankInfoText}>2) Escolha a opção <Text style={{fontWeight: 'bold'}}>6. Pagamentos;</Text></Text>
                <Text style={styles.bankInfoText}>3) Escolha a opção <Text style={{fontWeight: 'bold'}}>7. Digita o código do serviço;</Text></Text>
                <Text style={styles.bankInfoText}>4) Digita <Text style={{fontWeight: 'bold'}}>901811</Text> (código de serviço);</Text>
                <Text style={styles.bankInfoText}>5) Digita a referência <Text style={{fontWeight: 'bold'}}>(Opcional);</Text></Text>
                <Text style={styles.bankInfoText}>6) Digita o valor a pagar (Ex: 200);</Text>
                <Text style={styles.bankInfoText}>7) Digita o teu PIN;</Text>
                <Text style={styles.bankInfoText}>8) Confirma a transação.</Text>
              </View>

              {/* Comprovativo */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Comprovativo</Text>
                {receiptImage ? (
                  <View style={styles.receiptPreviewContainer}>
                    <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
                    <TouchableOpacity style={styles.removeReceiptBtn} onPress={() => setReceiptImage(null)}>
                      <Ionicons name="trash" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.pickReceiptBtn} onPress={handlePickReceipt}>
                    <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} style={{ marginBottom: 4 }} />
                    <Text style={styles.pickReceiptText}>Anexar Comprovativo (Screenshot)</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Aviso de segurança */}
              <View style={styles.infoBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primaryLight} style={{ marginRight: 8 }} />
                <Text style={styles.infoText}>
                  Após submeter, aguarde a validação da nossa equipa.
                </Text>
              </View>

              {/* Botão */}
              <TouchableOpacity
                style={[styles.confirmBtn, (loading || !amount || !receiptImage) && { opacity: 0.6 }]}
                onPress={handleTopUp}
                disabled={loading || !amount || !receiptImage}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={22} color="#fff" />
                    <Text style={styles.confirmBtnText}>
                      Submeter Recarga {amount ? `de ${amount} MT` : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

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
    fontSize: SIZES.md,
    fontWeight: '700',
    marginLeft: 8,
  },
  bankInfoBox: {
    backgroundColor: COLORS.surface2,
    padding: 16,
    borderRadius: RADIUS.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bankInfoTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  bankInfoText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginBottom: 4,
  },
  pickReceiptBtn: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pickReceiptText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginTop: 8,
  },
  receiptPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: 10,
  },
  receiptPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeReceiptBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  countdownBox: {
    backgroundColor: COLORS.surface,
    padding: 30,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    ...SHADOWS.sm,
  },
  countdownTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  countdownText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 30,
    fontVariant: ['tabular-nums'],
  },
  notifyBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
  },
  notifyBtnText: {
    color: '#fff',
    fontSize: SIZES.md,
    fontWeight: 'bold',
  }
});
