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
          <View key={payment._id}>
            <Radio
              key={payment._id}
              options={[{ label: payment.shortName, value: payment.shortName }]}
              checkedValue={selectedPayment}
              onChange={setSelectedPayment}
              style={{ marginBottom: 15 }}
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
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#333",
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: 'flex-start',
    marginTop: 40,
  },
  cardIcon: {
    textAlign: 'center',
    marginBottom: 10,
    color: "#7F00FF",
  },
  checkIcon: {
    textAlign: 'center',
    color: 'green',
    position: 'absolute',
    top: 0,
    right: 115,
  },
  mainHeader: {
    marginBottom: 15,
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
})
