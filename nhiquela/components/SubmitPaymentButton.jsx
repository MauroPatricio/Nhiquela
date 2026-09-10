import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React from 'react'
import {MaterialIcons} from '@expo/vector-icons'
import {useNavigation} from '@react-navigation/native'

const SubmitPaymentButton = ({ Confirmar, selectedPayment, seller, isUserWantDelivery, selectedVehicle, deliveryPrice, totalToPay }) => {
  const navigation = useNavigation();

  const navigateToPage = (payment) => {
    const p = (payment || '').toLowerCase();
    const navParams = { 
      seller, 
      isUserWantDelivery, 
      selectedVehicle, 
      deliveryPrice, 
      totalToPay 
    };

    if (p.includes('mpesa') || p.includes('m-pesa')) {
      navigation.replace('MpesaScreen', { ...navParams, paymentType: 'Mpesa' });
    } else if (p.includes('emola') || p.includes('e-mola')) {
      navigation.replace('MpesaScreen', { ...navParams, paymentType: 'Emola' });
    } else if (p.includes('transfer') || p.includes('banc')) {
      navigation.replace('BankTransferScreen', { ...navParams, paymentType: 'Transferência Bancária' });
    } else if (p.includes('dinheiro') || p.includes('cash')) {
      navigation.replace('BankTransferScreen', { ...navParams, paymentType: 'Dinheiro' });
    } else {
      navigation.replace('MpesaScreen', { ...navParams, paymentType: payment || 'Mpesa' });
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={() => navigateToPage(selectedPayment)}>
      <Text style={styles.text}>{Confirmar + ' '}</Text>
      <MaterialIcons name='check-circle' size={20} color={'white'} />
    </TouchableOpacity>
  );
};

export default SubmitPaymentButton

const styles = StyleSheet.create({
  container: {
    height: 60,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#7F00FF'
  },
  text:{
    fontSize: 16,
    color: '#f9fafb'
  }
})