import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const FailedPayment = () => {
  const { params: { paymentInfo } = {} } = useRoute();
  const navigation = useNavigation();
  const [errorMessage, setErrorMessage] = useState('Ocorreu um erro desconhecido.');

  useEffect(() => {
    if (paymentInfo?.code === 'INS-4') {
      setErrorMessage('A sua conta está inativa.');
    } else if (paymentInfo?.code === 'INS-9') {
      setErrorMessage('Demora na resposta do pagamento.');
    } else if (paymentInfo?.code === 'INS-2006') {
      setErrorMessage('Saldo insuficiente na conta.');
    } else if (paymentInfo?.code === 'INS-2051') {
      setErrorMessage('O número de telefone é inválido.');
    } else if (paymentInfo?.code) {
      setErrorMessage(`Erro: ${paymentInfo.code}`);
    }
  }, [paymentInfo]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="close" size={60} color={COLORS.error} />
          </View>
        </View>

        <Text style={styles.title}>Falha no Pagamento</Text>
        <Text style={styles.subTitle}>Infelizmente, a transação não pôde ser concluída.</Text>

        <View style={styles.errorBox}>
          <Text style={styles.errorLabel}>Motivo:</Text>
          <Text style={styles.errorValue}>{errorMessage}</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.btnText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default FailedPayment;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.error,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  errorBox: {
    backgroundColor: COLORS.surface2,
    padding: 20,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  errorValue: {
    fontSize: SIZES.base,
    color: COLORS.error,
    fontWeight: '700',
    textAlign: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: RADIUS.full,
    width: '100%',
    gap: 8,
    ...SHADOWS.md,
  },
  btnText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
  },
});