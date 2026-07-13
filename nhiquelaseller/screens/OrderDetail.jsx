import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Alert, Modal, TextInput, StatusBar, ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../hooks/createConnectionApi';
import { useToast } from 'react-native-toast-notifications';
import { sendOrderNotificationToUser } from '../utils/notificationUtils';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, RADIUS, SHADOWS, getStatusColor, getStatusBg } from '../constants/theme';

const InfoRow = ({ label, value, highlight }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, highlight && { color: COLORS.primaryLight, fontWeight: '700' }]}>
      {value || '—'}
    </Text>
  </View>
);

const OrderDetail = ({ navigation }) => {
  const toast = useToast();
  const [userData, setUserData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { params: { order } } = useRoute();
  const [currentOrder, setCurrentOrder] = useState(order);
  const [userLogin, setUserLogin] = useState(false);

  useEffect(() => { checkIfUserExist(); }, []);

  const checkIfUserExist = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserId = await AsyncStorage.getItem('id');
      if (storedUserData && storedUserId) {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData._id === storedUserId) {
          setUserData(parsedUserData);
          setUserLogin(true);
        } else {
          navigation.navigate('Login');
        }
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      navigation.navigate('Login');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const withLoading = async (fn) => {
    setIsLoading(true);
    try { await fn(); }
    finally { setIsLoading(false); }
  };

  const acceptOrder = async (orderId) => withLoading(async () => {
    if (!userData) throw new Error('User is not logged in');
    const { data } = await api.put(`/orders/${orderId}/accept`, {}, { headers: { Authorization: `Bearer ${userData.token}` } });
    setCurrentOrder(data.order);
    await sendOrderNotificationToUser({
      userId: data.order.user._id, orderId: data.order._id,
      orderCode: data.order.code, title: 'Seu pedido foi aceito!',
      body: `O pedido nº ${data.order.code} foi aceito pelo fornecedor.`,
      status: 'Aceito',
    });
    toast.show('Pedido aceito! O cliente será notificado.', { type: 'success', duration: 4000, placement: 'top' });
  });

  const availableToDelivOrder = async (orderId) => withLoading(async () => {
    if (!userData) return;
    const { data } = await api.put(`/orders/${orderId}/toDeliv`, {}, { headers: { Authorization: `Bearer ${userData.token}` } });
    setCurrentOrder(data.order);
    await api.post('/notifications/send-to-user', {
      userId: data.order.user, title: 'Pedido disponível para entrega',
      body: `Seu pedido ${data.order.code} está disponível para entrega.`,
      data: { orderId: data.order._id, type: 'order', status: 'Disponível' },
    });
    toast.show('Pedido marcado como disponível para entrega!', { type: 'success', duration: 4000, placement: 'top' });
  });

  const orderInTransit = async (orderId) => withLoading(async () => {
    if (!userData) return;
    const { data } = await api.put(`/orders/${orderId}/intransit`, {}, { headers: { Authorization: `Bearer ${userData.token}` } });
    setCurrentOrder(data.order);
    await api.post('/notifications/send-to-user', {
      userId: data.order.user, title: 'Pedido a caminho!',
      body: `Seu pedido ${data.order.code} está a caminho.`,
      data: { orderId: data.order._id, type: 'order', status: 'A Caminho' },
    });
    toast.show('Pedido em trânsito! Cliente notificado.', { type: 'success', duration: 4000, placement: 'top' });
  });

  const cancelOrderPop = async (orderId) => {
    try {
      if (!userData) return;
      if (!message?.trim()) {
        toast.show('Indique o motivo do cancelamento.', { type: 'warning', placement: 'top' });
        return;
      }
      const { data } = await api.put(`/orders/${orderId}/cancel`, { message }, { headers: { Authorization: `Bearer ${userData.token}` } });
      setCurrentOrder(data.order);
      await api.post('/notifications/send-to-user', {
        userId: data.order.user, title: 'Pedido cancelado',
        body: `O seu pedido ${data.order.code} foi cancelado pelo fornecedor.`,
        data: { orderId: data.order._id, type: 'order', status: 'Cancelado' },
      });
      toast.show('Pedido cancelado. Cliente foi notificado.', { type: 'success', duration: 4000, placement: 'top' });
    } catch (error) {
      toast.show('Erro ao cancelar o pedido. Tente novamente.', { type: 'danger', duration: 4000, placement: 'top' });
    } finally {
      setModalVisible(false);
      setMessage('');
    }
  };

  const deleteOrderPop = (orderId) => {
    Alert.alert("Apagar Pedido", "Tem a certeza que deseja apagar este pedido?", [
      { text: "Cancelar" },
      { text: "Apagar", style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/orders/${orderId}`, { headers: { Authorization: `Bearer ${userData.token}` } });
          toast.show('Pedido removido com sucesso.', { type: 'success', placement: 'top' });
          navigation.goBack();
        } catch (err) {
          toast.show('Erro ao remover o pedido.', { type: 'danger', placement: 'top' });
        }
      }},
    ]);
  };

  const groupedItems = currentOrder.orderItems.reduce((acc, item) => {
    const itemId = item._id;
    const quantity = Number(item.quantity) || 0;
    if (acc[itemId]) {
      acc[itemId].quantity += quantity;
    } else {
      acc[itemId] = { ...item, quantity };
    }
    return acc;
  }, {});

  const groupedItemsArray = Object.values(groupedItems);
  const statusColor = getStatusColor(currentOrder.status);
  const statusBg = getStatusBg(currentOrder.status);

  const stepLabels = ['Pendente', 'Aceite', 'Disponível p/ entrega', 'Em trânsito', 'Entregue'];
  const currentStep = currentOrder.stepStatus || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Pedido</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteOrderPop(currentOrder._id)}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

        {/* Status Card */}
        <View style={[styles.statusCard, { borderColor: statusColor, backgroundColor: statusBg }]}>
          <View>
            <Text style={styles.statusLabel}>Estado do Pedido</Text>
            <Text style={[styles.statusValue, { color: statusColor }]}>{currentOrder.status}</Text>
          </View>
          <View style={[styles.statusIcon, { backgroundColor: statusColor + '30' }]}>
            <MaterialCommunityIcons name="package-variant" size={26} color={statusColor} />
          </View>
        </View>

        {/* Timeline */}
        {currentOrder.stepStatus < 7 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Progresso</Text>
            <View style={styles.timeline}>
              {stepLabels.map((label, idx) => {
                const done = idx <= (currentStep - 1);
                const active = idx === (currentStep - 1);
                return (
                  <View key={idx} style={styles.timelineStep}>
                    <View style={[styles.timelineDot, done && styles.timelineDotDone, active && styles.timelineDotActive]}>
                      {done && <Ionicons name="checkmark" size={10} color="#fff" />}
                    </View>
                    {idx < stepLabels.length - 1 && (
                      <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                    )}
                    <Text style={[styles.timelineLabel, done && { color: COLORS.text }, active && { color: COLORS.primary, fontWeight: '700' }]}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Info do Pedido */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações do Pedido</Text>
          <InfoRow label="Código" value={`#${currentOrder.code}`} highlight />
          <InfoRow label="Método de pagamento" value={currentOrder.paymentMethod} />
          <InfoRow label="Pagamento efectuado" value={currentOrder.isPaid ? '✅ Sim' : '❌ Não'} />
          {currentOrder.isPaid && <InfoRow label="Data de pagamento" value={formatDate(currentOrder.paidAt)} />}
          <InfoRow label="Taxa de entrega" value={`${currentOrder.addressPrice} MT`} />
          <InfoRow label="Valor recebido" value={`${currentOrder.itemsPriceForSeller} MT`} highlight />
          {currentOrder.stepStatus === 7 && currentOrder.canceledReason && (
            <InfoRow label="Motivo de cancelamento" value={currentOrder.canceledReason} />
          )}
        </View>

        {/* Info do Cliente */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cliente</Text>
          <InfoRow label="Nome" value={currentOrder?.user?.name} />
          <InfoRow label="Contacto" value={currentOrder.user?.phoneNumber} />
          <InfoRow label="Endereço de entrega" value={currentOrder.address} />
        </View>

        {/* Produtos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Produtos ({groupedItemsArray.length})</Text>
          {groupedItemsArray.map(item => (
            <View key={item._id} style={styles.productRow}>
              <Image source={{ uri: item.image }} style={styles.productImage} />
              <View style={{ flex: 1 }}>
                <View style={styles.productTitleRow}>
                  <Text style={styles.productName}>{item.name}</Text>
                  {item.onSale && (
                    <View style={styles.saleBadge}><Text style={styles.saleBadgeText}>Promoção</Text></View>
                  )}
                </View>
                {item.brand && <Text style={styles.productMeta}>Marca: {item.brand}</Text>}
                {item.onSale ? (
                  <>
                    <Text style={[styles.productMeta, { textDecorationLine: 'line-through', color: COLORS.textMuted }]}>
                      {item.priceFromSeller} MT
                    </Text>
                    <Text style={[styles.productMeta, { color: COLORS.success, fontWeight: '700' }]}>
                      {item.discount} MT (com desconto)
                    </Text>
                  </>
                ) : (
                  <Text style={styles.productMeta}>Preço: {item.price} MT</Text>
                )}
                <Text style={[styles.productMeta, { color: COLORS.primaryLight, fontWeight: '600' }]}>
                  Qtd: {item.quantity} unid.
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Botões de Ação */}
        {currentOrder.status === 'Pendente' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => acceptOrder(currentOrder._id)}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Aceitar</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setModalVisible(true)}>
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Rejeitar</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentOrder.status === 'Aceite' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => availableToDelivOrder(currentOrder._id)}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="bag-check-outline" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Disponível p/ entrega</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setModalVisible(true)}>
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentOrder.status === 'Disponível para entrega' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn, { flex: 1 }]}
              onPress={() => orderInTransit(currentOrder._id)}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="car-outline" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Marcar Em Trânsito</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal de cancelamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Motivo do Cancelamento</Text>
            <Text style={styles.modalSubtitle}>Este texto será enviado ao cliente.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Produto esgotado..."
              placeholderTextColor={COLORS.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn, { flex: 1 }]}
                onPress={() => cancelOrderPop(currentOrder._id)}
              >
                <Text style={styles.actionBtnText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border }]}
                onPress={() => { setModalVisible(false); setMessage(''); }}
              >
                <Text style={[styles.actionBtnText, { color: COLORS.textSecondary }]}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: SIZES.xl,
    fontWeight: '800',
  },
  statusIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '80',
  },
  infoLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  timelineDotDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineDotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  timelineLine: {
    position: 'absolute',
    top: 9,
    left: '60%',
    right: '-60%',
    height: 2,
    backgroundColor: COLORS.border,
    zIndex: -1,
  },
  timelineLineDone: {
    backgroundColor: COLORS.primary,
  },
  timelineLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '60',
    alignItems: 'flex-start',
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  productName: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  productMeta: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  saleBadge: {
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  saleBadgeText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    gap: 8,
    ...SHADOWS.sm,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: SIZES.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.surfaceCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.sm,
    padding: 14,
    color: COLORS.text,
    fontSize: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default OrderDetail;