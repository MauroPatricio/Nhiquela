import { StyleSheet, Text, View, TouchableOpacity, Modal, ActivityIndicator, Dimensions, ScrollView, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Button from '../components/Button';
import api from '../hooks/createConnectionApi';
import {
  selectBasketItems,
  selectBasketTotal,
  selectTotalToPay,
  selectIva,
  selectDeliverPrice,
  clearBasket,
  selectSellerEarningsAfterDiscount,
  selectAddress,
  selectSellers,
  selectSelectedVehicle,
} from '../features/basketSlice';
import { sendOrderNotificationToUser } from '../utils/notificationUtils';

const BankTransferScreen = () => {
  const route = useRoute();
  const { 
    seller: passedSeller, 
    paymentType = 'Transferência Bancária', 
    isUserWantDelivery: passedDelivery 
  } = route.params || {};

  const [userData, setUserData] = useState(null);
  const [loader, setLoader] = useState(false);
  const [sellerData, setSellerData] = useState(passedSeller || null);

  const isUserWantDelivery = passedDelivery !== undefined ? passedDelivery : true;
  const totalToPay = useSelector(selectTotalToPay);
  const address = useSelector(selectAddress);
  const items = useSelector(selectBasketItems);
  const itemsPrice = useSelector(selectBasketTotal);
  const totalSellerEarningsAfterDiscount = useSelector(selectSellerEarningsAfterDiscount);
  const iva = useSelector(selectIva);
  const deliveryPrice = useSelector(selectDeliverPrice);
  const selectedVehicle = useSelector(selectSelectedVehicle);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserAndSeller = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          setUserData(JSON.parse(storedUserData));
        }

        if (!sellerData && items && items.length > 0) {
          const sellerId = items[0].seller._id || items[0].seller;
          const { data } = await api.get(`/users/${sellerId}`);
          setSellerData(data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchUserAndSeller();
  }, [items, sellerData]);

  const showAlert = (title, message, onConfirm) => {
    Alert.alert(title, message, [
      { text: 'OK', onPress: onConfirm ? onConfirm : () => {}, style: 'default' }
    ], { cancelable: false });
  };

  const confirmOrder = async () => {
    if (!userData) {
      Alert.alert(
        '⚠️ Usuário não autenticado',
        'Para realizar o pagamento, você precisa estar logado.',
        [
          { text: 'Sim', onPress: () => navigation.replace('Login') },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }

    setLoader(true);

    try {
      const orderPayload = {
        orderItems: items,
        address,
        paymentMethod: paymentType || 'Transferência Bancária',
        totalPrice: totalToPay,
        itemsPrice,
        ivaTax: iva,
        addressPrice: deliveryPrice,
        itemsPriceForSeller: totalSellerEarningsAfterDiscount + deliveryPrice,
        isPaid: false,
        user: userData,
        customerId: userData,
        isUserWantDelivery,
        stepStatus: 1,
        transportTypeId: selectedVehicle?._id || null,
        transportType: selectedVehicle?.name || null,
      };

      const { data } = await api.post('orders', orderPayload, { headers: { authorization: `Bearer ${userData.token}` } });

      const sellerId = data.order?.seller?._id || data.order?.seller || sellerData?._id;
      if (sellerId) {
        await sendOrderNotificationToUser({
          userId: sellerId,
          orderId: data.order._id,
          orderCode: data.order.code,
          title: '📦 Novo pedido!',
          body: `Pedido nº ${data.order.code} criado. Aguardando aceitação do vendedor.`,
          status: 'Pendente',
        });
      }

      dispatch(clearBasket());
      // Redireciona para OrderWaitingScreen
      navigation.replace('OrderWaitingScreen', { 
        orderId: data.order._id, 
        orderCode: data.order.code, 
        seller: data.order.seller || sellerData,
        initialOrder: data.order 
      });

    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      showAlert('❌ Erro inesperado', `Erro: ${error.message || 'Desconhecido'}`);
    } finally {
      setLoader(false);
    }
  };

  const isCash = paymentType.toLowerCase().includes('dinheiro');

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal visible={loader} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#7F00FF" />
            <Text style={styles.loadingText}>A criar pedido...</Text>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Ionicons name="chevron-back-circle" size={35} color="#9333EA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isCash ? 'Pagamento em Dinheiro' : 'Transferência Bancária'}</Text>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons 
            name={isCash ? 'cash-multiple' : 'bank-transfer'} 
            size={50} 
            color="#9333EA" 
            style={{ alignSelf: 'center', marginBottom: 10 }} 
          />
          <Text style={styles.instructions}>
            {isCash 
              ? 'O pagamento será efetuado em dinheiro no momento da entrega ou retirada no estabelecimento.' 
              : 'Faça a transferência do valor total para uma das contas do fornecedor indicadas abaixo.'}
          </Text>
          <Text style={styles.instructionsStrong}>
            {isCash 
              ? 'Após confirmar, o fornecedor terá 15 minutos para aceitar e começar a preparar o pedido.' 
              : 'Após confirmar, poderá enviar o comprovativo diretamente no chat do pedido com o vendedor.'}
          </Text>
        </View>

        <Text style={styles.label}>TOTAL A PAGAR</Text>
        <Text style={styles.amount}>
          {isUserWantDelivery ? totalToPay.toFixed(2) : (totalToPay - deliveryPrice).toFixed(2)} MT
        </Text>

        {!isCash && (
          <>
            <Text style={styles.label}>CONTAS DO FORNECEDOR</Text>
            {sellerData ? (
              <View style={styles.accountsContainer}>
                <Text style={styles.sellerName}>{sellerData.name || sellerData.seller?.name || 'Fornecedor'}</Text>
                
                {sellerData.seller?.bankAccount || sellerData.seller?.accountNumber || sellerData.accountNumber ? (
                  <View style={styles.accountBox}>
                    <Text style={styles.bankName}>{sellerData.seller?.accountType || sellerData.accountType || 'Conta Bancária'}</Text>
                    <View style={styles.accountDetailRow}>
                      <Text style={styles.accountLabel}>Titular:</Text>
                      <Text style={styles.accountValue}>{sellerData.name || 'Fornecedor'}</Text>
                    </View>
                    <View style={styles.accountDetailRow}>
                      <Text style={styles.accountLabel}>Conta/NIB:</Text>
                      <Text style={styles.accountValue}>{sellerData.seller?.bankAccount || sellerData.seller?.accountNumber || sellerData.accountNumber}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.accountBox}>
                    <Text style={styles.bankName}>Conta Padrão do Fornecedor</Text>
                    <View style={styles.accountDetailRow}>
                      <Text style={styles.accountLabel}>Contacto:</Text>
                      <Text style={styles.accountValue}>{sellerData.seller?.phoneNumberAccount || sellerData.phoneNumber || 'Registado'}</Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <ActivityIndicator size="small" color="#9333EA" />
            )}
          </>
        )}

        <View style={{ marginTop: 30 }}>
          <Button loader={loader} title="Confirmar Pedido" onPress={confirmOrder} isValid={true} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BankTransferScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  container: {
    padding: 20,
    paddingBottom: 50,
  },
  infoCard: {
    backgroundColor: '#F3E8FF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  instructions: {
    fontSize: 15,
    color: '#4C1D95',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  instructionsStrong: {
    fontSize: 15,
    color: '#4C1D95',
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 22,
  },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  amount: { fontSize: 32, fontWeight: '900', color: '#10B981', marginBottom: 25 },
  accountsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  accountBox: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bankName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  accountDetailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  accountLabel: {
    width: 60,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  accountValue: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '700',
  },
  noAccountText: {
    fontSize: 14,
    color: '#EF4444',
    fontStyle: 'italic',
  },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: Dimensions.get('window').width * 0.85, backgroundColor: 'white', padding: 35, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  loadingText: { marginTop: 24, fontSize: 16, fontWeight: '800', color: '#9333EA' },
});
