import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import api from '../hooks/createConnectionApi';
import Radio from '../components/Radio';
import SubmitPaymentButton from '../components/SubmitPaymentButton';
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

const PaymentMethod = () => {
  const navigation = useNavigation();

  const [selectedPayment, setSelectedPayment] = useState("");
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(false);

  const fechtData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`payments`);
      if (response.status == 200) {
        setPayments(response.data)
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fechtData()
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Botão voltar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name='chevron-back-circle' size={35} color="#7F00FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento</Text>
      </View>

      <View style={styles.container}>
        <Ionicons name='card' size={100} style={styles.cardIcon} />
        <Ionicons
          name='checkmark-circle'
          size={50}
      
          style={styles.checkIcon}
        />

        <Text style={styles.mainHeader}>Seleccione a forma de pagamento</Text>

        {payments && payments.map((payment) => (
          <View key={payment._id} style={{ backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Radio
              key={payment._id}
              options={[{ label: payment.shortName, value: payment.shortName }]}
              checkedValue={selectedPayment}
              onChange={setSelectedPayment}
            />
          </View>
        ))}

        <SubmitPaymentButton Confirmar='Confirmar' selectedPayment={selectedPayment} />
      </View>
    </SafeAreaView>
  )
}

export default PaymentMethod

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginLeft: 12,
    color: "#1F2937",
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: 'flex-start',
    marginTop: 20,
  },
  cardIcon: {
    textAlign: 'center',
    marginBottom: 5,
    color: "#9333EA",
    textShadowColor: 'rgba(147, 51, 234, 0.2)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  checkIcon: {
    textAlign: 'center',
    color: '#10B981',
    position: 'absolute',
    top: -10,
    right: 120,
    backgroundColor: '#FFF',
    borderRadius: 25,
    overflow: 'hidden',
  },
  mainHeader: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 30,
    color: '#374151',
    marginTop: 10,
  },
})
