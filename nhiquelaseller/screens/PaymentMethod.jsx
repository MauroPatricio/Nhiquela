import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../hooks/createConnectionApi';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const PaymentMethod = () => {
  const navigation = useNavigation();
  const [selectedPayment, setSelectedPayment] = useState("");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payments`);
      if (response.status === 200) {
        setPayments(response.data);
      }
    } catch (error) {
      console.error("Erro ao carregar métodos de pagamento:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirm = () => {
    if (!selectedPayment) return;
    if (selectedPayment.toLowerCase().includes('mpesa') || selectedPayment.toLowerCase().includes('m-pesa')) {
      navigation.navigate('MpesaScreen');
    } else {
      // Outros métodos
      console.log('Selecionado:', selectedPayment);
    }
  };

  const renderIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('mpesa') || n.includes('m-pesa')) return <MaterialCommunityIcons name="cellphone-nfc" size={28} color={COLORS.primaryLight} />;
    if (n.includes('cartão') || n.includes('card')) return <Ionicons name="card-outline" size={28} color={COLORS.primaryLight} />;
    if (n.includes('dinheiro') || n.includes('cash')) return <Ionicons name="cash-outline" size={28} color={COLORS.primaryLight} />;
    return <Ionicons name="wallet-outline" size={28} color={COLORS.primaryLight} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Método de Pagamento</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="card" size={50} color={COLORS.primary} />
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          </View>
        </View>

        <Text style={styles.mainTitle}>Como prefere pagar?</Text>
        <Text style={styles.subTitle}>Selecione o método de pagamento pretendido para concluir a transação.</Text>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.methodsList}>
            {payments && payments.map((payment) => (
              <TouchableOpacity
                key={payment._id}
                style={[
                  styles.methodCard,
                  selectedPayment === payment.shortName && styles.methodCardActive
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedPayment(payment.shortName)}
              >
                <View style={styles.methodIconBox}>
                  {renderIcon(payment.shortName)}
                </View>
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodName, selectedPayment === payment.shortName && styles.methodNameActive]}>
                    {payment.shortName}
                  </Text>
                </View>
                <View style={[styles.radioOuter, selectedPayment === payment.shortName && styles.radioOuterActive]}>
                  {selectedPayment === payment.shortName && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.confirmBtn, !selectedPayment && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!selectedPayment}
        >
          <Text style={styles.confirmBtnText}>Confirmar</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PaymentMethod;

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
  content: {
    flex: 1,
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  mainTitle: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  loaderBox: {
    padding: 40,
    alignItems: 'center',
  },
  methodsList: {
    gap: 16,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  methodCardActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary,
  },
  methodIconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  methodNameActive: {
    color: COLORS.primaryLight,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    height: 56,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...SHADOWS.md,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
  }
});