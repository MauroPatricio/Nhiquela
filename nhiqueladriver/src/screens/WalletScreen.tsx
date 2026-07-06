// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import api, { API_BASE_URL } from '../api/apiConfig';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { getProviderSubcategories } from '../services/deliveryService';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at?: string;
  createdAt?: string;
  status?: string;
  receiptImage?: string;
}

export default function WalletScreen({ navigation, route }: any) {
  // Usa o user do AuthContext — evita ler do AsyncStorage com chave errada
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [balanceSummary, setBalanceSummary] = useState({
    saldo_atual: 0,
    limite_credito: 0,
    saldo_operacional_minimo: 0,
    saldo_disponivel: 0,
    estado_atual: 'Ativo',
    total_recarregado: 0,
    total_comissoes: 0,
    bloqueio_automatico: true,
    taxa_base_veículo: 0,
    taxa_minima_recarga: 0,
    nome_veiculo: '',
    nome_categoria: '',
  });
  const [earnings, setEarnings] = useState({ today: 0, week: 0, tripsToday: 0 });
  const [dailyEarnings, setDailyEarnings] = useState<Array<{ date: string, amount: number }>>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [invalidValueModalVisible, setInvalidValueModalVisible] = useState(false);
  const [invalidValueMessage, setInvalidValueMessage] = useState("Por favor, introduza um montante numérico válido e maior que zero para efetuar o recarregamento.");
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [missingReceiptModalVisible, setMissingReceiptModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transportTypeName, setTransportTypeName] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransportTypeName = async () => {
      const typeId = user?.deliveryman?.transport_type;
      if (!typeId) return;
      try {
        const subcategories = await getProviderSubcategories();
        const found = subcategories.find((sub: any) => sub._id === typeId || sub.id === typeId);
        if (found) {
          setTransportTypeName(found.name);
        }
      } catch (err) {
        // silently fallback
      }
    };
    fetchTransportTypeName();
  }, [user?.deliveryman?.transport_type]);

  const fetchWalletData = async (silent = false) => {
    if (!user || !user.token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    if (!silent) setLoading(true);

    try {
      const headers = { authorization: `Bearer ${user.token}` };

      const [summaryRes, balanceRes, transactionsRes, earningsRes] = await Promise.allSettled([
        api.get('/wallet/driver-summary', { headers }),
        api.get('/wallet/balance', { headers }),
        api.get('/wallet/transactions', { headers }),
        api.get('/wallet/driver-earnings', { headers })
      ]);

      if (summaryRes.status === 'fulfilled') {
        setBalanceSummary(summaryRes.value.data);
      }

      if (balanceRes.status === 'fulfilled') {
        setBalance({
          available: balanceRes.value.data.available_balance || 0,
          pending: balanceRes.value.data.pending_balance || 0,
        });
      }

      if (transactionsRes.status === 'fulfilled') {
        setTransactions(transactionsRes.value.data || []);
      }

      if (earningsRes.status === 'fulfilled') {
        setEarnings({
          today: earningsRes.value.data.today || 0,
          week: earningsRes.value.data.week || 0,
          tripsToday: earningsRes.value.data.tripsToday || 0,
        });
        setDailyEarnings(earningsRes.value.data.dailyEarnings || []);
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados da carteira:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchWalletData();
      return () => {};
    }, [user?.token])
  );

  // Global socket listener for Wallet updates
  useEffect(() => {
    let socket: any;
    if (user && user._id) {
      const socketUrl = API_BASE_URL.replace('/api', '');
      socket = io(socketUrl);

      socket.on('walletUpdated', (data: any) => {
        // When a recharge is approved, refresh the wallet immediately
        fetchWalletData(true); // silent refresh
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user?._id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleWithdrawPress = () => {
    if (balance.available <= 0) {
      Alert.alert('Saldo Insuficiente', 'Não tem saldo disponível para efetuar um levantamento.');
      return;
    }
    Alert.alert(
      'Solicitar Levantamento',
      `Deseja levantar o valor total de ${formatCurrency(balance.available)} para sua conta M-Pesa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.post('/wallet/withdraw', {
                amount: balance.available,
                phone: user?.phoneNumber || user?.deliveryman?.phoneNumber,
              }, {
                headers: { authorization: `Bearer ${user?.token}` },
              });
              Alert.alert('Sucesso', res.data.message || 'Levantamento solicitado com sucesso!');
              fetchWalletData();
            } catch (err: any) {
              Alert.alert('Erro', err.response?.data?.message || 'Falha ao solicitar levantamento.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handlePickReceipt = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setReceiptImage(manipResult.uri);
      } catch (err) {
        setReceiptImage(result.assets[0].uri); // Fallback
      }
    }
  };

  const handleTopUpSubmit = async () => {
    const amountNum = Number(topUpAmount);
    const taxaMinima = balanceSummary.taxa_minima_recarga || 0;

    if (!topUpAmount || isNaN(amountNum) || amountNum <= 0) {
      setInvalidValueMessage("Por favor, introduza um montante numérico válido e maior que zero para efetuar o recarregamento.");
      setInvalidValueModalVisible(true);
      return;
    }

    if (amountNum < taxaMinima) {
      const vName = balanceSummary.nome_categoria || balanceSummary.nome_veiculo || transportTypeName || user?.deliveryman?.transport_type || 'registado';
      setInvalidValueMessage(`Atenção: O valor mínimo de recarga para a sua categoria (${vName}) é de ${taxaMinima} MT (Taxa Mínima).`);
      setInvalidValueModalVisible(true);
      return;
    }
    
    try {
      setLoading(true);
      if (!receiptImage) {
        setMissingReceiptModalVisible(true);
        setLoading(false);
        return;
      }

      // Upload image
      const formData = new FormData();
      const filename = receiptImage.split('/').pop() || 'receipt.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('file', { uri: receiptImage, name: filename, type } as any);
      const uploadRes = await api.post('/upload', formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
      });
      const description = `Recarga Manual. Comprovativo: ${uploadRes.data.secure_url || uploadRes.data.url}`;

      const res = await api.post('/wallet/topup', {
        amount: Number(topUpAmount),
        method: 'Depósito Manual',
        description,
        receiptImage: uploadRes.data.secure_url || uploadRes.data.url
      }, {
        headers: { authorization: `Bearer ${user?.token}` },
      });
      
      setSuccessMessage(res.data.message || 'Pedido de recarga submetido com sucesso!');
      setSuccessModalVisible(true);
      
      setTopUpModalVisible(false);
      setTopUpAmount('');
      setReceiptImage(null);
      fetchWalletData();
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.message || 'Falha ao solicitar recarga.');
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return '#34C759'; // Verde
      case 'Aviso': return '#FFCC00'; // Amarelo
      case 'Crédito Controlado': return '#FF9500'; // Laranja
      case 'Suspenso': return '#FF3B30'; // Vermelho
      default: return '#34C759';
    }
  };

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`;
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isCredit = item.type === 'credit';
    const dateStr = item.createdAt || item.created_at;
    const date = dateStr ? new Date(dateStr) : new Date();
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} às ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return (
      <TouchableOpacity 
        style={styles.transactionCard}
        onPress={() => setSelectedTransaction(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: isCredit ? '#E8F5E9' : '#FFEBEE' }]}>
          <Ionicons
            name={isCredit ? 'arrow-up' : 'arrow-down'}
            size={20}
            color={isCredit ? '#2E7D32' : '#C62828'}
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDesc}>{isCredit ? 'Recarga' : 'Levantamento'}</Text>
          <Text style={styles.transactionDate}>
            {formattedDate}
            {item.status === 'pendente' && <Text style={{color: '#FF9800', fontWeight: 'bold'}}> (Pendente)</Text>}
            {item.status === 'falhado' && <Text style={{color: '#C62828', fontWeight: 'bold'}}> (Rejeitado)</Text>}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { 
          color: item.status === 'falhado' ? '#C62828' : (isCredit ? '#2E7D32' : '#C62828'),
          textDecorationLine: item.status === 'falhado' ? 'line-through' : 'none'
        }]}>
          {isCredit ? '+' : '-'}{item.amount.toFixed(0)} MT
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>A carregar carteira...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header — estilo Tab (sem botão Fechar) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="wallet" size={24} color="#7F00FF" />
          <Text style={styles.headerTitle}>Minha Carteira</Text>
        </View>
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => Alert.alert('Informação', 'O saldo disponível pode ser retirado a qualquer momento. O saldo pendente corresponde a entregas em processamento.')}
        >
          <Ionicons name="information-circle-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderTransactionItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {/* Cards de Saldo Principal (Motor Financeiro) */}
            <View style={styles.balanceContainer}>
              <View style={[styles.mainCard, { borderTopWidth: 4, borderTopColor: getStatusColor(balanceSummary.estado_atual) }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={styles.cardLabel}>Saldo da Conta</Text>
                  <View style={{ backgroundColor: getStatusColor(balanceSummary.estado_atual) + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: getStatusColor(balanceSummary.estado_atual), fontWeight: 'bold', fontSize: 12 }}>
                      {balanceSummary.estado_atual}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardValue}>{formatCurrency(balanceSummary.saldo_atual)}</Text>
                


                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity style={styles.topUpBtn} onPress={() => { setTopUpModalVisible(true); }}>
                    <Ionicons name="add-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.topUpText}>Recarregar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Saldo Pendente Box */}
              {balance.pending > 0 && (
                <View style={styles.pendingBox}>
                  <Ionicons name="time-outline" size={18} color="#FF9800" style={{ marginRight: 6 }} />
                  <Text style={styles.pendingText}>
                    Saldo Pendente: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(balance.pending)}</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Sumário de Ganhos */}
            <Text style={styles.sectionTitle}>Sumário de Ganhos</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Hoje</Text>
                <Text style={styles.statValue}>{formatCurrency(earnings.today)}</Text>
                <Text style={{ fontSize: 13, color: '#34C759', fontWeight: 'bold' }}>{earnings.tripsToday} {earnings.tripsToday === 1 ? 'viagem' : 'viagens'}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Esta Semana</Text>
                <Text style={styles.statValue}>{formatCurrency(earnings.week)}</Text>
              </View>
            </View>

            {/* Gráfico de Ganhos Diários (Visualização Nativa Simples) */}
            {dailyEarnings.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>Trabalhos Diários (Viagens)</Text>
                <View style={styles.barChartContainer}>
                  {dailyEarnings.slice(-7).map((item, index) => {
                    // Calcula a altura da barra relativa ao número máximo de viagens
                    const maxTrips = Math.max(...dailyEarnings.map(e => e.trips || 0), 1); // Evita divisão por zero
                    const heightPercent = Math.max(((item.trips || 0) / maxTrips) * 100, 5); // Mínimo de 5% de altura

                    // Formata a data (ex: "15/06")
                    const dateObj = new Date(item.date);
                    const dayLabel = isNaN(dateObj.getTime()) ? item.date.substring(0, 5) : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

                    return (
                      <View key={index} style={styles.barChartCol}>
                        <Text style={styles.barChartValue} numberOfLines={1} adjustsFontSizeToFit>
                          {(item.trips || 0) > 0 ? `${item.trips}` : ''}
                        </Text>
                        <View style={styles.barChartBarBg}>
                          <View style={[styles.barChartBarFill, { height: `${heightPercent}%` }]} />
                        </View>
                        <Text style={styles.barChartLabel}>{dayLabel}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Título Histórico */}
            <Text style={styles.sectionTitle}>Últimos Movimentos</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>Nenhum movimento registado.</Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      />

      {/* Modal de Recarga */}
      <Modal visible={topUpModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recarregar Carteira</Text>
              <TouchableOpacity onPress={() => setTopUpModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.bankInfoBox}>
              <Text style={styles.bankInfoTitle}>Paga aqui com M-Pesa</Text>
              <Text style={styles.bankInfoText}>1) Digita <Text style={{fontWeight: 'bold'}}>*150#;</Text></Text>
              <Text style={styles.bankInfoText}>2) Escolha a opção <Text style={{fontWeight: 'bold'}}>6. Pagamentos;</Text></Text>
              <Text style={styles.bankInfoText}>3) Escolha a opção <Text style={{fontWeight: 'bold'}}>7. Digita o código do serviço;</Text></Text>
              <Text style={styles.bankInfoText}>4) Digita <Text style={{fontWeight: 'bold'}}>901811</Text> (código de serviço);</Text>
              <Text style={styles.bankInfoText}>5) Digita a referência <Text style={{fontWeight: 'bold'}}>(Opcional);</Text></Text>
              <Text style={styles.bankInfoText}>6) Digita o valor a pagar (Ex: 100);</Text>
              <Text style={styles.bankInfoText}>7) Digita o teu PIN;</Text>
              <Text style={styles.bankInfoText}>8) Confirma a transação.</Text>
            </View>

            <Text style={styles.inputLabel}>Valor Depositado (MT)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Ex: 500"
              keyboardType="numeric"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
            />

            <Text style={styles.inputLabel}>Comprovativo</Text>
            {receiptImage ? (
              <View style={styles.receiptPreviewContainer}>
                <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
                <TouchableOpacity style={styles.removeReceiptBtn} onPress={() => setReceiptImage(null)}>
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.pickReceiptBtn} onPress={handlePickReceipt}>
                <Ionicons name="cloud-upload-outline" size={24} color="#7F00FF" style={{ marginBottom: 4 }} />
                <Text style={styles.pickReceiptText}>Anexar Comprovativo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.confirmTopUpBtn, loading && { opacity: 0.7 }]} 
              onPress={handleTopUpSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmTopUpText}>Solicitar recarga</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Premium de Valor Inválido */}
      <Modal visible={invalidValueModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.premiumAlertCard}>
            <View style={styles.iconCircleWarning}>
              <Ionicons name="alert-circle" size={40} color="#FF9800" />
            </View>
            <Text style={styles.premiumAlertTitle}>Valor Inválido</Text>
            <Text style={styles.premiumAlertMessage}>
              {invalidValueMessage}
            </Text>
            <TouchableOpacity
              style={styles.premiumAlertBtn}
              onPress={() => setInvalidValueModalVisible(false)}
            >
              <Text style={styles.premiumAlertBtnText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal de Sucesso Customizado (Premium) */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.premiumAlertCard}>
            <View style={[styles.iconCircleWarning, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
              <Ionicons name="checkmark-circle" size={40} color="#34C759" />
            </View>
            <Text style={styles.premiumAlertTitle}>Sucesso!</Text>
            <Text style={styles.premiumAlertMessage}>{successMessage}</Text>
            <TouchableOpacity 
              style={[styles.premiumAlertButton, { backgroundColor: '#34C759' }]}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.premiumAlertButtonText}>Ok, Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Premium de Falta de Comprovativo */}
      <Modal visible={missingReceiptModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.premiumAlertCard}>
            <View style={styles.iconCircleWarning}>
              <Ionicons name="document-text-outline" size={40} color="#FF9800" />
            </View>
            <Text style={styles.premiumAlertTitle}>Atenção</Text>
            <Text style={styles.premiumAlertMessage}>
              Por favor, anexe o comprovativo de depósito. É obrigatório para prosseguirmos com a sua recarga.
            </Text>
            <TouchableOpacity 
              style={styles.premiumAlertBtn}
              onPress={() => setMissingReceiptModalVisible(false)}
            >
              <Text style={styles.premiumAlertBtnText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Detalhes da Transação */}
      <Modal visible={!!selectedTransaction} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.premiumAlertCard}>
            <TouchableOpacity 
              style={{ position: 'absolute', top: 15, right: 15, zIndex: 10 }} 
              onPress={() => setSelectedTransaction(null)}
            >
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
            
            <View style={[styles.iconCircleWarning, { backgroundColor: selectedTransaction?.type === 'credit' ? '#E8F5E9' : '#FFEBEE', width: 60, height: 60, borderRadius: 30, marginBottom: 10 }]}>
              <Ionicons 
                name={selectedTransaction?.type === 'credit' ? 'arrow-up' : 'arrow-down'} 
                size={30} 
                color={selectedTransaction?.type === 'credit' ? '#2E7D32' : '#C62828'} 
              />
            </View>

            <Text style={styles.premiumAlertTitle}>
              {selectedTransaction?.type === 'credit' ? 'Recarga' : 'Levantamento'}
            </Text>
            
            <Text style={{ 
              fontSize: 28, 
              fontWeight: 'bold', 
              color: selectedTransaction?.status === 'falhado' ? '#C62828' : (selectedTransaction?.type === 'credit' ? '#2E7D32' : '#C62828'), 
              marginBottom: 20,
              textDecorationLine: selectedTransaction?.status === 'falhado' ? 'line-through' : 'none'
            }}>
              {selectedTransaction?.type === 'credit' ? '+' : '-'}{selectedTransaction?.amount.toFixed(2)} MT
            </Text>

            <View style={{ width: '100%', alignItems: 'flex-start', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, marginBottom: 15 }}>
              <Text style={{ fontSize: 12, color: '#888', marginBottom: 2, textTransform: 'uppercase', fontWeight: 'bold' }}>Estado</Text>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: selectedTransaction?.status === 'pendente' ? '#FF9800' : (selectedTransaction?.status === 'falhado' ? '#C62828' : '#4CAF50'), 
                marginBottom: 15, 
                textTransform: 'capitalize' 
              }}>
                {selectedTransaction?.status === 'falhado' ? 'Rejeitado' : (selectedTransaction?.status || 'Confirmado')}
              </Text>

              <Text style={{ fontSize: 12, color: '#888', marginBottom: 2, textTransform: 'uppercase', fontWeight: 'bold' }}>Data e Hora</Text>
              <Text style={{ fontSize: 15, color: '#333', marginBottom: 15 }}>
                {selectedTransaction ? (() => {
                  const dStr = selectedTransaction.createdAt || selectedTransaction.created_at;
                  const d = dStr ? new Date(dStr) : new Date();
                  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                })() : ''}
              </Text>

              <Text style={{ fontSize: 12, color: '#888', marginBottom: 2, textTransform: 'uppercase', fontWeight: 'bold' }}>Descrição</Text>
              <Text style={{ fontSize: 15, color: '#333', marginBottom: (selectedTransaction?.receiptImage || (selectedTransaction?.description?.includes('http'))) ? 15 : 0 }}>
                {selectedTransaction?.description?.includes('Recarga Manual. Comprovativo:') 
                  ? 'Recarga Manual (Saldo). Comprovativo' 
                  : selectedTransaction?.description?.replace(/https?:\/\/[^\s]+/, '')}
              </Text>

              {(() => {
                const extractedUrl = selectedTransaction?.receiptImage || 
                  (selectedTransaction?.description?.includes('http') ? selectedTransaction.description.match(/https?:\/\/[^\s]+/)?.[0] : null);
                
                if (extractedUrl) {
                  return (
                    <>
                      <Text style={{ fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', fontWeight: 'bold' }}>Comprovativo Anexado</Text>
                      <Image 
                        source={{ uri: extractedUrl }} 
                        style={{ width: '100%', height: 200, borderRadius: 8, contentFit: 'contain', backgroundColor: '#EFEFEF' }} 
                      />
                    </>
                  );
                }
                return null;
              })()}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFC',
  },
  loaderText: {
    marginTop: 12,
    color: '#7F00FF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#EAEAEA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  infoBtn: {
    padding: 4,
  },
  balanceContainer: {
    marginTop: 20,
    marginBottom: 25,
  },
  mainCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  topUpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 10,
  },
  topUpText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  withdrawBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderRadius: 10,
  },
  withdrawText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  pendingText: {
    fontSize: 14,
    color: '#FF8F00',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#33334F',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 0,
  },
  statLabel: {
    color: '#666',
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    borderWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  transactionDate: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 3,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputField: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  confirmTopUpBtn: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmTopUpText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabBtnText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#7F00FF',
    fontWeight: 'bold',
  },
  bankInfoBox: {
    backgroundColor: '#F5F3FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAE1FF',
  },
  bankInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7F00FF',
    marginBottom: 8,
  },
  bankInfoText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  pickReceiptBtn: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#7F00FF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  pickReceiptText: {
    color: '#7F00FF',
    fontSize: 14,
    fontWeight: '600',
  },
  receiptPreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  receiptPreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    contentFit: 'cover',
  },
  removeReceiptBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 6,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumAlertCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  iconCircleWarning: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumAlertTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  premiumAlertMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  premiumAlertBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  premiumAlertBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  invalidValueText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  invalidValueCloseBtn: {
    backgroundColor: '#7F00FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  invalidValueCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Premium Success Modal Styles
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumModalContent: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  premiumIconContainer: {
    marginBottom: 20,
    shadowColor: '#4CD964',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  premiumModalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A1A1A',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  premiumModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  premiumModalBtn: {
    backgroundColor: '#7F00FF',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumModalBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  barChartCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 40,
    height: '100%',
  },
  barChartValue: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  barChartBarBg: {
    width: 20,
    height: 130, // Altura máxima da barra
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barChartBarFill: {
    width: '100%',
    backgroundColor: '#7F00FF',
    borderRadius: 10,
  },
  barChartLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 6,
  },
  premiumAlertButton: {
    backgroundColor: '#34C759',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginTop: 10,
  },
  premiumAlertButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  }
});

