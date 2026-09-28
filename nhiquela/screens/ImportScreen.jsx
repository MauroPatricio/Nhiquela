import io from 'socket.io-client';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../hooks/createConnectionApi';
import { useToast } from 'react-native-toast-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ImportScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [shippingMethod, setShippingMethod] = useState('AIR');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'

  const [showModal, setShowModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [paymentProofUri, setPaymentProofUri] = useState(null);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [quotationReadyCount, setQuotationReadyCount] = useState(0);

  // Modal de detalhes do pedido (qualquer estado)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailQuotation, setDetailQuotation] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    let socket;
    try {
      const socketUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : '';
      if (socketUrl) {
        socket = io(socketUrl, { transports: ['polling', 'websocket'] });
        socket.on('import_request_updated', () => fetchHistory());
        socket.on('import_request_created', () => fetchHistory());
      }
    } catch (e) {}

    return () => { if (socket) socket.disconnect(); };
  }, []);

  useEffect(() => {
    api.get('/payment-accounts').then(res => setPaymentAccounts(res.data)).catch(() => {});
    // Pre-load history count to show badge
    api.get('/import/requests').then(res => {
      const count = res.data.filter(r => r.status === 'QUOTATION_READY' || r.status === 'QUOTATION_SENT').length;
      setQuotationReadyCount(count);
    }).catch(() => {});
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/import/requests');
      setMyRequests(res.data);
      // Update badge count based on latest data
      const count = res.data.filter(r => r.status === 'QUOTATION_READY' || r.status === 'QUOTATION_SENT').length;
      setQuotationReadyCount(count);
    } catch (error) {
      console.log('Error fetching history:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'Precisamos de acesso à galeria para enviar a foto do produto.');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType?.Images || ImagePicker.MediaTypeOptions?.Images || 'images',
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickPaymentProof = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'Precisamos de acesso à galeria para enviar o comprovativo.');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType?.Images || ImagePicker.MediaTypeOptions?.Images || 'images',
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPaymentProofUri(result.assets[0].uri);
    }
  };

  const submitRequest = async () => {
    if (!productName || !imageUri || !quantity) {
      toast.show('Preencha o nome, quantidade e anexe uma foto.', { type: 'warning' });
      return;
    }
    
    setLoading(true);
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      const userInfo = userInfoStr ? JSON.parse(userInfoStr) : {};
      
      let uploadedImageUrl = null;
      if (imageUri) {
        const formData = new FormData();
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        formData.append('image', {
          uri: imageUri,
          name: filename,
          type
        });

        // Tentar usar o endpoint de upload genérico
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(err => api.post('/upload/local', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }));
        
        if (uploadRes && uploadRes.data) {
           uploadedImageUrl = uploadRes.data.url || uploadRes.data.secure_url || uploadRes.data;
        }
      }

      const payload = {
        customerId: userInfo._id || '64e3c1f2b3b3a2a1a1a1a1a1', // fallback
        productName,
        quantity: Number(quantity),
        description,
        productUrl,
        productImage: typeof uploadedImageUrl === 'string' ? uploadedImageUrl : null,
        preferredOriginCountry: 'China',
        shippingMethod
      };

      await api.post('/import/requests', payload);
      
      toast.show('Pedido de importação submetido com sucesso!', { type: 'success' });
      
      // Reset form
      setProductName('');
      setQuantity('1');
      setDescription('');
      setProductUrl('');
      setImageUri(null);
      setShippingMethod('AIR');
      
      setActiveTab('history');
    } catch (error) {
      toast.show('Erro ao enviar pedido.', { type: 'danger' });
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = async (item) => {
    setShowModal(true);
    setLoadingQuote(true);
    setSelectedQuotation(null);
    setSelectedRequest(item);
    try {
      const res = await api.get(`/import/quotations/request/${item._id}`);
      if (res.data) {
        setSelectedQuotation(res.data);
      } else {
        toast.show('Cotação não encontrada.', { type: 'warning' });
        setShowModal(false);
      }
    } catch (error) {
      console.log('Erro ao buscar cotação', error);
      toast.show('Erro ao buscar cotação.', { type: 'danger' });
      setShowModal(false);
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleOpenDetail = async (item) => {
    setDetailItem(item);
    setDetailQuotation(null);
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/import/quotations/request/${item._id}`);
      if (res.data) setDetailQuotation(res.data);
    } catch (_) { /* sem cotação ainda — ok */ }
    finally { setLoadingDetail(false); }
  };

  // Inicia pagamento directamente a partir do modal de detalhes
  // (evita re-fetch e race conditions com o modal de cotação)
  const handlePayFromDetail = () => {
    if (!detailItem || !detailQuotation) return;
    // Pré-popula o estado do modal de pagamento
    setSelectedRequest(detailItem);
    setSelectedQuotation(detailQuotation);
    setPaymentProofUri(null);
    setLoadingQuote(false); // já temos os dados — não é necessário loading
    // Fecha o detalhe e abre o pagamento
    setShowDetailModal(false);
    setShowModal(true);
  };

  const handleRejectQuotation = (quotationId, itemName) => {
    Alert.alert(
      'Rejeitar Cotação',
      `Tem a certeza que quer rejeitar a cotação para "${itemName}"?\n\nPode submeter um novo pedido com diferentes especificações.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/import/quotations/${quotationId}/reject`);
              toast.show('Cotação rejeitada.', { type: 'warning' });
              setShowDetailModal(false);
              setShowModal(false);
              fetchHistory();
            } catch (err) {
              console.error('[RejectQuotation]', err);
              toast.show('Erro ao rejeitar cotação.', { type: 'danger' });
            }
          }
        }
      ]
    );
  };

  const handleAcceptQuotation = async () => {
    if (!selectedQuotation) {
      toast.show('Cotação não disponível. Tente novamente.', { type: 'danger' });
      return;
    }
    if (!paymentProofUri) {
      Alert.alert('Atenção', 'Por favor, anexe o comprovativo de pagamento.');
      return;
    }

    setLoadingQuote(true);
    try {
      // 1. Upload do comprovativo
      let uploadedProofUrl = null;
      try {
        const formData = new FormData();
        const filename = paymentProofUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', { uri: paymentProofUri, name: filename, type });

        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(() => api.post('/upload/local', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }));

        if (uploadRes?.data) {
          uploadedProofUrl = uploadRes.data.url || uploadRes.data.secure_url
            || (typeof uploadRes.data === 'string' ? uploadRes.data : null);
        }
      } catch (uploadErr) {
        console.warn('[Upload comprovativo falhou — continua sem URL]', uploadErr?.message);
      }

      // 2. Aceitar a cotação
      const rawCustomer = selectedRequest?.customerId
        || selectedQuotation?.customerId
        || null;

      const customerId = typeof rawCustomer === 'object'
        ? (rawCustomer?._id || rawCustomer?.id || null)
        : rawCustomer;

      const payload = {
        paymentProof: typeof uploadedProofUrl === 'string' ? uploadedProofUrl : null,
        customerId, // id limpo (string)
      };

      console.log('[AcceptQuotation] payload:', JSON.stringify(payload));
      console.log('[AcceptQuotation] quotationId:', selectedQuotation._id);

      const res = await api.post(`/import/quotations/${selectedQuotation._id}/accept`, payload);
      console.log('[AcceptQuotation] success:', res.data);

      toast.show('Cotação aceite! O seu pedido está a ser processado.', { type: 'success' });
      setShowModal(false);
      setPaymentProofUri(null);
      fetchHistory();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Erro desconhecido';
      console.error('[AcceptQuotation] ERRO:', msg, error?.response?.status);
      Alert.alert('Erro ao aceitar cotação', msg);
    } finally {
      setLoadingQuote(false);
    }
  };

  const statusTranslations = {
    REQUESTED: 'Aguardando Cotação',
    UNDER_REVIEW: 'Em Análise',
    SOURCING: 'Em Busca de Fornecedor',
    QUOTATION_READY: 'Cotação Pronta',
    QUOTATION_SENT: 'Cotação Enviada',
    ACCEPTED: 'Aceite / Pagamento Enviado',
    PURCHASED: 'Comprado na Origem',
    PROCESSING: 'Em Processamento',
    CREATED: 'Carga Criada',
    SHIPPED: 'Em Trânsito Internacional',
    IN_TRANSIT: 'Em Trânsito Internacional',
    ARRIVED_AT_CUSTOMS: 'Na Alfândega',
    CUSTOMS_CLEARANCE: 'Na Alfândega',
    CUSTOMS_CLEARED: 'Desalfandegado',
    RELEASED: 'Desalfandegado',
    READY_FOR_DELIVERY: 'Pronto para Entrega',
    IN_DELIVERY: 'Em Entrega Local',
    DELIVERED: 'Entregue no Destino',
    REJECTED: 'Rejeitado',
    CANCELLED: 'Cancelado'
  };

  const renderHistoryItem = (item) => {
    const serverBaseUrl = api.defaults.baseURL.replace('/api', '');
    const imageUrl = item.productImage && item.productImage.startsWith('http') 
      ? item.productImage 
      : (item.productImage ? `${serverBaseUrl}${item.productImage}` : null);

    const hasDates = item.estimatedDeliveryDays || item.estimatedArrivalDate || item.quotationValidUntil;

    return (
      <TouchableOpacity
        key={item._id}
        style={styles.historyCard}
        activeOpacity={0.88}
        onPress={() => handleOpenDetail(item)}
      >
        <View style={styles.cardRow}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.historyImage} />
          ) : (
            <View style={styles.historyImagePlaceholder}>
              <Ionicons name="image-outline" size={24} color="#9CA3AF" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.productName}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
            <Text style={styles.cardText}>Qtd: {item.quantity}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{statusTranslations[item.status] || item.status}</Text>
            </View>
          </View>
        </View>

        {/* Linha de datas */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
          <View>
            <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pedido em</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937', marginTop: 2 }}>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Prazo / Chegada</Text>
            {item.estimatedDeliveryDays ? (
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937', marginTop: 2 }}>
                {item.estimatedDeliveryDays} dias
              </Text>
            ) : (
              <Text style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 }}>A calcular</Text>
            )}
            {item.estimatedArrivalDate && (
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#7C3AED', marginTop: 1 }}>
                📅 {new Date(item.estimatedArrivalDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            )}
            {item.quotationValidUntil && (
              <Text style={{ fontSize: 10, color: '#D97706', marginTop: 1 }}>
                Válida até {new Date(item.quotationValidUntil).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
              </Text>
            )}
          </View>
        </View>

        {(item.status === 'QUOTATION_READY' || item.status === 'QUOTATION_SENT' || item.status === 'SENT') && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.acceptButton, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
              onPress={(e) => { e.stopPropagation?.(); handleOpenDetail(item); }}
            >
              <Ionicons name="card-outline" size={15} color="#FFF" style={{ marginRight: 5 }} />
              <Text style={styles.acceptButtonText}>Ver e Pagar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 8, paddingVertical: 10 }}
              onPress={(e) => {
                e.stopPropagation?.();
                // Abre os detalhes para obter o ID da cotação e depois rejeitar
                handleOpenDetail(item);
              }}
            >
              <Ionicons name="close-circle-outline" size={15} color="#EF4444" style={{ marginRight: 5 }} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>Rejeitar</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhiquela Import</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>Novo Pedido</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Meus Pedidos</Text>
            {quotationReadyCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{quotationReadyCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'new' ? (
          <View>
            <Text style={styles.label}>O que deseja importar da China?</Text>
            <TextInput 
              style={styles.input}
              placeholder="Ex: iPhone 15 Pro, Máquina de costura..."
              value={productName}
              onChangeText={setProductName}
            />

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Quantidade</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="1"
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.label}>País de Origem</Text>
                <View style={[styles.input, { justifyContent: 'center', backgroundColor: '#F3F4F6' }]}>
                  <Text style={{ color: '#374151' }}>🇨🇳 China</Text>
                </View>
              </View>
            </View>

            <Text style={styles.label}>Detalhes (Cores, Voltagem, Tamanho)</Text>
            <TextInput 
              style={[styles.input, styles.textArea]}
              placeholder="Descreva ao máximo..."
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.label}>Link de Referência (Opcional)</Text>
            <TextInput 
              style={styles.input}
              placeholder="https://alibaba.com/..."
              value={productUrl}
              onChangeText={setProductUrl}
            />

            <Text style={styles.label}>Tipo de Envio</Text>
            <View style={styles.shippingMethodContainer}>
              <TouchableOpacity 
                style={[styles.shippingOption, shippingMethod === 'AIR' && styles.shippingOptionSelected]} 
                onPress={() => setShippingMethod('AIR')}
              >
                <Ionicons name="airplane" size={22} color={shippingMethod === 'AIR' ? '#8B5CF6' : '#9CA3AF'} />
                <View>
                  <Text style={[styles.shippingOptionText, shippingMethod === 'AIR' && styles.shippingOptionTextSelected]}>Aéreo</Text>
                  <Text style={styles.shippingEta}>5 a 7 dias</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.shippingOption, shippingMethod === 'SEA' && styles.shippingOptionSelected]} 
                onPress={() => setShippingMethod('SEA')}
              >
                <Ionicons name="boat" size={22} color={shippingMethod === 'SEA' ? '#8B5CF6' : '#9CA3AF'} />
                <View>
                  <Text style={[styles.shippingOptionText, shippingMethod === 'SEA' && styles.shippingOptionTextSelected]}>Marítimo</Text>
                  <Text style={styles.shippingEta}>35 a 45 dias</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Fotografia do Produto *</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                  <Text style={styles.imagePlaceholderText}>Toque para adicionar foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
              onPress={submitRequest}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>{loading ? 'A enviar...' : 'Solicitar Cotação'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {myRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={60} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>Não tem pedidos de importação.</Text>
              </View>
            ) : (
              myRequests.map(renderHistoryItem)
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da Cotação</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {loadingQuote ? (
              <ActivityIndicator size="large" color="#8B5CF6" style={{ padding: 40 }} />
            ) : selectedQuotation ? (
              <ScrollView style={styles.modalBody}>
                {selectedRequest && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    {selectedRequest.productImage ? (
                      <Image 
                        source={{ 
                          uri: selectedRequest.productImage.startsWith('http') 
                            ? selectedRequest.productImage 
                            : `${api.defaults.baseURL.replace('/api', '')}${selectedRequest.productImage}` 
                        }} 
                        style={{ width: 54, height: 54, borderRadius: 8, marginRight: 12 }} 
                      />
                    ) : (
                      <View style={{ width: 54, height: 54, borderRadius: 8, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1F2937' }} numberOfLines={1}>{selectedRequest.productName}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Qtd: {selectedRequest.quantity}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons 
                          name={selectedRequest.shippingMethod === 'SEA' ? 'boat-outline' : 'airplane-outline'} 
                          size={14} 
                          color="#8B5CF6" 
                          style={{ marginRight: 4 }} 
                        />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#8B5CF6' }}>
                          {selectedRequest.shippingMethod === 'SEA' ? 'Marítimo (Barato) • 35-45 dias' : 'Aéreo (Rápido) • 5-7 dias'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Custo do Produto:</Text>
                  <Text style={styles.quoteValue}>{selectedQuotation.productCost.toFixed(2)} {selectedQuotation.currency}</Text>
                </View>
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Frete Internacional:</Text>
                  <Text style={styles.quoteValue}>{selectedQuotation.internationalShipping.toFixed(2)} {selectedQuotation.currency}</Text>
                </View>
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Despacho Aduaneiro:</Text>
                  <Text style={styles.quoteValue}>{selectedQuotation.customsEstimated.toFixed(2)} {selectedQuotation.currency}</Text>
                </View>
                {selectedQuotation.nhiquelaServiceFee > 0 && (
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Comissão Nhiquela:</Text>
                    <Text style={styles.quoteValue}>{selectedQuotation.nhiquelaServiceFee.toFixed(2)} {selectedQuotation.currency}</Text>
                  </View>
                )}
                <View style={[styles.quoteRow, styles.quoteTotalRow]}>
                  <Text style={styles.quoteTotalLabel}>Total a Pagar:</Text>
                  <Text style={styles.quoteTotalValue}>{selectedQuotation.totalCost.toFixed(2)} {selectedQuotation.currency}</Text>
                </View>
                {/* Bloco de Datas e Prazos */}
                <View style={{ marginTop: 12, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#BFDBFE' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D4ED8' }}>📅  Datas e Prazos</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>Prazo de Entrega:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>
                      {selectedQuotation.estimatedDeliveryDays ? `${selectedQuotation.estimatedDeliveryDays} dias` : 'A calcular'}
                    </Text>
                  </View>
                  {selectedQuotation.estimatedArrivalDate && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>Data Prevista de Chegada:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#7C3AED' }}>
                        {new Date(selectedQuotation.estimatedArrivalDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  )}
                  {selectedQuotation.quotationValidUntil && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>Cotação Válida Até:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#D97706' }}>
                        {new Date(selectedQuotation.quotationValidUntil).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ marginTop: 20, marginBottom: 15, backgroundColor: '#F3F4F6', padding: 15, borderRadius: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 }}>
                    Dados para Pagamento (Nhiquela Lda)
                  </Text>
                  {paymentAccounts.length > 0 ? paymentAccounts.map((acc, i) => (
                    <View key={acc._id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: i < paymentAccounts.length - 1 ? 6 : 0 }}>
                      <Text style={{ fontSize: 13, color: '#6B7280', flex: 1 }}>{acc.icon} {acc.name}:</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F2937' }}>{acc.accountNumber}</Text>
                        {acc.accountName ? <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{acc.accountName}</Text> : null}
                        {acc.notes ? <Text style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>{acc.notes}</Text> : null}
                      </View>
                    </View>
                  )) : (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: '#6B7280' }}>M-Pesa:</Text>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F2937' }}>84 123 4567</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: '#6B7280' }}>Millennium BIM:</Text>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F2937' }}>123456789</Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Anexar Comprovativo
                  </Text>
                  <TouchableOpacity 
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderWidth: 1, 
                      borderColor: '#D1D5DB',
                      borderStyle: 'dashed',
                      borderRadius: 8, 
                      padding: 15,
                      backgroundColor: '#F9FAFB'
                    }} 
                    onPress={pickPaymentProof}
                  >
                    <Ionicons name="cloud-upload-outline" size={24} color="#6B7280" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#4B5563', fontSize: 14 }}>
                      {paymentProofUri ? 'Alterar Comprovativo' : 'Anexar Comprovativo (.jpg, .png)'}
                    </Text>
                  </TouchableOpacity>
                  {paymentProofUri && (
                    <Image 
                      source={{ uri: paymentProofUri }} 
                      style={{ width: '100%', height: 120, borderRadius: 8, marginTop: 10 }} 
                      resizeMode="cover" 
                    />
                  )}
                </View>

                <TouchableOpacity style={styles.payButton} onPress={handleAcceptQuotation}>
                  <Ionicons name="card-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.payButtonText}>Pagar {selectedQuotation.totalCost.toFixed(2)} {selectedQuotation.currency}</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>Cotação não disponível.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ──────── MODAL: DETALHES DO PEDIDO ──────── */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Pedido</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {loadingDetail ? (
              <ActivityIndicator size="large" color="#8B5CF6" style={{ padding: 40 }} />
            ) : detailItem ? (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

                {/* Foto e dados principais */}
                <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  {detailItem.productImage ? (
                    <Image
                      source={{ uri: detailItem.productImage.startsWith('http') ? detailItem.productImage : `${api.defaults.baseURL.replace('/api', '')}${detailItem.productImage}` }}
                      style={{ width: 80, height: 80, borderRadius: 10, marginRight: 14 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ width: 80, height: 80, borderRadius: 10, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                      <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }} numberOfLines={2}>
                      {detailItem.productName}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Qtd: {detailItem.quantity}</Text>
                    {detailItem.preferredOriginCountry && (
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>🇨🇳 {detailItem.preferredOriginCountry}</Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <Ionicons
                        name={detailItem.shippingMethod === 'SEA' ? 'boat-outline' : 'airplane-outline'}
                        size={13} color="#8B5CF6" style={{ marginRight: 4 }}
                      />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#8B5CF6' }}>
                        {detailItem.shippingMethod === 'SEA' ? 'Marítimo (Barato) • 35-45 dias' : 'Aéreo (Rapido) • 5-7 dias'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Estado actual e Stepper */}
                <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Estado Actual</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: (() => {
                      const s = detailItem.status;
                      if (['DELIVERED'].includes(s)) return '#10B981';
                      if (['REJECTED','CANCELLED'].includes(s)) return '#EF4444';
                      if (['QUOTATION_READY','QUOTATION_SENT'].includes(s)) return '#F59E0B';
                      return '#8B5CF6';
                    })(), marginRight: 8 }} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>
                      {statusTranslations[detailItem.status] || detailItem.status}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                    Pedido criado em {detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                  </Text>

                  {/* Stepper Horizontal */}
                  <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 10 }}>📍 Progresso do Pedido</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2 }}>
                      {[
                        { label: 'Pedido', icon: 'document-text-outline' },
                        { label: 'Cotação', icon: 'calculator-outline' },
                        { label: 'Pago', icon: 'card-outline' },
                        { label: 'Comprado', icon: 'bag-handle-outline' },
                        { label: 'Trânsito', icon: 'airplane-outline' },
                        { label: 'Alfândega', icon: 'shield-checkmark-outline' },
                        { label: 'Entrega', icon: 'bicycle-outline' },
                        { label: 'Entregue', icon: 'home-outline' },
                      ].map((step, idx) => {
                        const getStepIdx = (s) => {
                          const st = (s || '').toUpperCase();
                          if (['REQUESTED', 'UNDER_REVIEW', 'SOURCING'].includes(st)) return 0;
                          if (['QUOTATION_READY', 'QUOTATION_SENT', 'SENT'].includes(st)) return 1;
                          if (['ACCEPTED', 'PAYMENT_CONFIRMED', 'PAID'].includes(st)) return 2;
                          if (['PURCHASED', 'PROCESSING'].includes(st)) return 3;
                          if (['SHIPPED', 'IN_TRANSIT'].includes(st)) return 4;
                          if (['ARRIVED_AT_CUSTOMS', 'CUSTOMS_CLEARANCE', 'CUSTOMS_CLEARED', 'RELEASED'].includes(st)) return 5;
                          if (['READY_FOR_DELIVERY', 'IN_DELIVERY'].includes(st)) return 6;
                          if (['DELIVERED'].includes(st)) return 7;
                          return 0;
                        };
                        const currentIdx = getStepIdx(detailItem.status);
                        const isDone = currentIdx > idx;
                        const isCurrent = currentIdx === idx;

                        return (
                          <View key={idx} style={{ alignItems: 'center', width: 68, marginRight: idx < 7 ? 6 : 0 }}>
                            <View style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: isDone ? '#10B981' : (isCurrent ? '#8B5CF6' : '#E5E7EB'),
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginBottom: 4,
                              borderWidth: isCurrent ? 2 : 0,
                              borderColor: '#C4B5FD'
                            }}>
                              <Ionicons name={isDone ? 'checkmark' : step.icon} size={15} color={isDone || isCurrent ? '#FFF' : '#6B7280'} />
                            </View>
                            <Text style={{
                              fontSize: 10,
                              fontWeight: isCurrent ? '700' : (isDone ? '600' : '400'),
                              color: isCurrent ? '#8B5CF6' : (isDone ? '#10B981' : '#6B7280'),
                              textAlign: 'center'
                            }}>
                              {step.label}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Descrição */}
                {detailItem.description ? (
                  <View style={{ backgroundColor: '#FFFBEB', borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' }}>
                    <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600', marginBottom: 4 }}>📝 Descrição / Especificações</Text>
                    <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>{detailItem.description}</Text>
                  </View>
                ) : null}

                {/* Link */}
                {detailItem.productUrl ? (
                  <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' }}>
                    <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '600', marginBottom: 2 }}>🔗 Link de Referência</Text>
                    <Text style={{ fontSize: 12, color: '#3B82F6' }} numberOfLines={2}>{detailItem.productUrl}</Text>
                  </View>
                ) : null}

                {/* Datas e prazos (do request + cotação) */}
                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' }}>
                  <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '700', marginBottom: 10 }}>📅  Datas e Prazos</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>Data do Pedido:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>
                      {detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>Prazo de Entrega:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>
                      {detailItem.estimatedDeliveryDays ? `${detailItem.estimatedDeliveryDays} dias` : (detailQuotation?.estimatedDeliveryDays ? `${detailQuotation.estimatedDeliveryDays} dias` : 'A calcular')}
                    </Text>
                  </View>
                  {(detailItem.estimatedArrivalDate || detailQuotation?.estimatedArrivalDate) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>Chegada Prevista:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#7C3AED' }}>
                        {new Date(detailItem.estimatedArrivalDate || detailQuotation.estimatedArrivalDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  )}
                  {(detailItem.quotationValidUntil || detailQuotation?.quotationValidUntil) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>Cotação Válida Até:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#D97706' }}>
                        {new Date(detailItem.quotationValidUntil || detailQuotation.quotationValidUntil).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Cotação resumida */}
                {detailQuotation ? (
                  <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#BBF7D0' }}>
                    <Text style={{ fontSize: 12, color: '#166534', fontWeight: '700', marginBottom: 10 }}>💰  Cotação</Text>
                    {[
                      { label: 'Custo do Produto', val: detailQuotation.productCost },
                      { label: 'Frete Internacional', val: detailQuotation.internationalShipping },
                      { label: 'Despacho Aduaneiro', val: detailQuotation.customsEstimated },
                      { label: 'Comissão Nhiquela', val: detailQuotation.nhiquelaServiceFee },
                    ].filter(r => r.val > 0).map((row, i) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: '#6B7280' }}>{row.label}:</Text>
                        <Text style={{ fontSize: 13, color: '#1F2937' }}>{row.val.toFixed(2)} {detailQuotation.currency}</Text>
                      </View>
                    ))}
                    <View style={{ borderTopWidth: 1, borderTopColor: '#BBF7D0', marginTop: 8, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#166534' }}>Total:</Text>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#166534' }}>{detailQuotation.totalCost.toFixed(2)} {detailQuotation.currency}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#FFF7ED', borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FED7AA', alignItems: 'center' }}>
                    <Ionicons name="time-outline" size={28} color="#F97316" style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#C2410C' }}>Cotação ainda não disponível</Text>
                    <Text style={{ fontSize: 12, color: '#9A3412', marginTop: 4, textAlign: 'center' }}>A nossa equipa está a preparar a cotação. Receberá uma notificação em breve.</Text>
                  </View>
                )}

                {/* Botões: Pagar / Rejeitar */}
                {(detailItem.status === 'QUOTATION_READY' || detailItem.status === 'QUOTATION_SENT' || detailItem.status === 'SENT') && detailQuotation && (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 24 }}>
                    {/* Aceitar e pagar */}
                    <TouchableOpacity
                      style={[styles.acceptButton, { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                      onPress={handlePayFromDetail}
                    >
                      <Ionicons name="card-outline" size={17} color="#FFF" style={{ marginRight: 7 }} />
                      <View>
                        <Text style={[styles.acceptButtonText, { fontSize: 13 }]}>Pagar</Text>
                        <Text style={{ color: '#FFF', fontSize: 11, opacity: 0.85 }}>{detailQuotation.totalCost.toFixed(2)} {detailQuotation.currency}</Text>
                      </View>
                    </TouchableOpacity>
                    {/* Rejeitar */}
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 8, paddingVertical: 12 }}
                      onPress={() => handleRejectQuotation(detailQuotation._id, detailItem.productName)}
                    >
                      <Ionicons name="close-circle-outline" size={17} color="#EF4444" style={{ marginRight: 5 }} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>Rejeitar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  tabBadge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    flexDirection: 'column',
  },
  imagePicker: {
    height: 150,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    color: '#9CA3AF',
    fontSize: 16,
  },
  historyCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
  },
  historyImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  historyImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shippingMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  shippingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFF',
    gap: 8,
  },
  shippingOptionSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  shippingOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  shippingOptionTextSelected: {
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  shippingEta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  badge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardText: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 4,
  },
  acceptButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  acceptButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalBody: {
    flex: 1,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quoteLabel: {
    color: '#6B7280',
    fontSize: 15,
  },
  quoteValue: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '500',
  },
  quoteTotalRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  quoteTotalLabel: {
    color: '#111827',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quoteTotalValue: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quoteEta: {
    color: '#059669',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  },
  payButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
