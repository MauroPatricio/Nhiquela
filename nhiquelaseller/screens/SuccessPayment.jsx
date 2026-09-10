import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const SuccessPayment = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="check" size={70} color={COLORS.success} />
          </View>
        </View>

        <Text style={styles.title}>Pagamento Efetuado!</Text>
        <Text style={styles.subTitle}>
          A sua transação foi concluída com sucesso. O seu pedido está agora a ser processado.
        </Text>

        <TouchableOpacity 
          style={styles.btn} 
          onPress={() => navigation.navigate('Home')} 
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>Voltar à Página Principal</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SuccessPayment;

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
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.success,
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
    marginBottom: 48,
    paddingHorizontal: 20,
    lineHeight: 22,
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
    gap: 10,
    ...SHADOWS.md,
  },
  btnText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
  },
});