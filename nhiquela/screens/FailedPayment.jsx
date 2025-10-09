import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import { Ionicons } from "@expo/vector-icons"
import { MaterialCommunityIcons } from '@expo/vector-icons'

const FailedPayment = () => {
  const { params: { errorData } } = useRoute();
  const navigation = useNavigation();
  const [errorMessage, setErrorMessage] = useState('Ocorreu uma falha no pagamento.');

  useEffect(() => {
    if (!errorData) {
      setErrorMessage('Falha no processamento do pagamento');
      return;
    }

    switch (errorData?.code) {
      case 'INS-4':
        setErrorMessage('Conta inactiva');
        break;
      case 'INS-9':
        setErrorMessage('Demora na resposta do pagamento');
        break;
      case 'INS-2006':
        setErrorMessage('Saldo insuficiente');
        break;
      case 'INS-2051':
        setErrorMessage('Número de telefone inválido');
        break;
      default:
        setErrorMessage('Erro desconhecido. Tente novamente.');
    }
  }, [errorData]);

  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backIcon} onPress={() => navigation.goBack()}>
        <Ionicons name='chevron-back-circle' size={36} color="#7F00FF" />
      </TouchableOpacity>

      <View style={styles.container}>
        <MaterialCommunityIcons
          name='close-circle-outline'
          size={120}
          color="#FF4D4D"
          style={styles.iconStyle}
        />

        <Text style={styles.title}>Falha no pagamento</Text>
        <Text style={styles.subTitle}>Motivo:</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default FailedPayment;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  backIcon: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
    marginHorizontal: 10,
  },
  iconStyle: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginTop: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#FF4D4D',
    marginVertical: 10,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#7F00FF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
