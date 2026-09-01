import { StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator, Alert, Image, Clipboard, Modal } from 'react-native';
import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../hooks/createConnectionApi';
import Radio from '../components/Radio';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from 'react-native-toast-notifications';

import { useDispatch, useSelector } from 'react-redux';
import { 
  selectSellers, 
  selectBasketItems,
  selectBasketTotal,
  selectTotalToPay,
  selectIva,
  selectDeliverPrice,
  clearBasket,
  selectSellerEarningsAfterDiscount,
  selectAddress
} from '../features/basketSlice';
import { sendOrderNotificationToUser } from '../utils/notificationUtils';

const PaymentMethod = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const toast = useToast();

  const { 
    tipoEstabelecimentoId, 
    seller: passedSeller,
    isUserWantDelivery: passedDelivery,
    selectedVehicle: passedVehicle,
    deliveryPrice: passedDeliveryPrice,
    distanceKm: passedDistanceKm,
    totalToPay: passedTotalToPay
  } = route.params || {};

  const [selectedPayment, setSelectedPayment] = useState("");
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sellerData, setSellerData] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadedProofUrl, setUploadedProofUrl] = useState("");
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [digitalRecipientEmail, setDigitalRecipientEmail] = useState("");
  const [digitalRecipientPhone, setDigitalRecipientPhone] = useState("");
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertDesc, setAlertDesc] = useState("");
  const [alertOnConfirm, setAlertOnConfirm] = useState(null);
  const [alertConfirmText, setAlertConfirmText] = useState("OK");
  const [alertShowCancel, setAlertShowCancel] = useState(false);

  const showPremiumAlert = (title, desc, onConfirm = null, confirmText = "OK", showCancel = false) => {
    setAlertTitle(title);
    setAlertDesc(desc);
    setAlertOnConfirm(() => onConfirm);
    setAlertConfirmText(confirmText);
    setAlertShowCancel(showCancel);
    setAlertModalVisible(true);
  };

  const sellers = useSelector(selectSellers);
  const items = useSelector(selectBasketItems);
  const itemsPrice = useSelector(selectBasketTotal);
  const totalToPay = useSelector(selectTotalToPay) || passedTotalToPay || 0;
  const iva = useSelector(selectIva) || 0;
  const deliveryPrice = useSelector(selectDeliverPrice) || passedDeliveryPrice || 0;
  const totalSellerEarningsAfterDiscount = useSelector(selectSellerEarningsAfterDiscount) || 0;
  const rawAddress = useSelector(selectAddress);
  // address pode vir como string ou como objeto { address, latitude, longitude }
  const address = typeof rawAddress === 'string'
    ? rawAddress
    : (rawAddress?.address ?? rawAddress?.fullAddress ?? '');
  const selectedVehicle = passedVehicle || null;

  const activeSeller = passedSeller || sellers[0] || items[0]?.seller || null;
  const hasDigitalItems = useMemo(() => {
    return items && items.some(i => i.productType === 'DIGITAL' || i.isDigital);
  }, [items]);

  const isUserWantDelivery = hasDigitalItems ? false : (passedDelivery !== undefined ? passedDelivery : true);
  const distanceKm = hasDigitalItems ? 0 : (passedDistanceKm || 0);
  const estimatedDeliveryFee = hasDigitalItems ? 0 : (deliveryPrice || 0);

  const filterMethodsBySeller = (methodsList, sData) => {
    if (!methodsList || methodsList.length === 0) return [];
    if (!sData) return methodsList;

    const sellerObj = sData?.seller || sData;
    const hasMpesa = !!(sellerObj?.phoneNumberAccount || sData?.phoneNumber || sData?.transferPreferences?.mPesaNumber);
    const hasEmola = !!(sellerObj?.alternativePhoneNumberAccount || sData?.transferPreferences?.eMolaNumber);
    const hasBank = !!(sellerObj?.bankAccount || sellerObj?.accountNumber || sData?.bankAccount);

    const filtered = methodsList.filter(pm => {
      const name = (pm.name || pm.shortName || '').toLowerCase();
      // Match mobile transfer methods
      if (name.includes('móvel') || name.includes('movel') || name.includes('mpesa') || name.includes('m-pesa') || name.includes('emola') || name.includes('e-mola')) {
        return hasMpesa || hasEmola;
      }
      // Match bank transfer methods
      if (name.includes('banc') || name.includes('transfer')) {
        return hasBank;
      }
      return true; // Dinheiro ou outros
    });

    return filtered.length > 0 ? filtered : methodsList;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let fullSeller = activeSeller;
      // activeSeller pode ser um Provider (com userId) ou um User directamente.
      // Precisamos do documento User para aceder às contas de pagamento.

      // Fast-path: já é um documento User (tem seller.phoneNumberAccount ou isSeller)
      if (activeSeller?.seller?.phoneNumberAccount || activeSeller?.isSeller) {
        setSellerData(activeSeller);
      } else {
        // Extrair userId: pode ser string ID ou objecto populado { _id, name, ... }
        const rawUserId = activeSeller?.userId?._id || activeSeller?.userId;
        const tryUserId = rawUserId && typeof rawUserId === 'object' ? rawUserId._id?.toString() : rawUserId?.toString?.();
        const tryProviderId = !tryUserId && (activeSeller?._id?.toString?.() || (typeof activeSeller === 'string' ? activeSeller : null));

        if (tryUserId && /^[0-9a-fA-F]{24}$/.test(tryUserId)) {
          // Temos User ID directamente — buscar o User
          try {
            const sellerRes = await api.get(`/users/${tryUserId}`);
            if (sellerRes.data?._id) { fullSeller = sellerRes.data; setSellerData(fullSeller); }
            else setSellerData(activeSeller);
          } catch (e) {
            console.log('Error fetching seller user:', e.message);
            setSellerData(activeSeller);
          }
        } else if (tryProviderId && /^[0-9a-fA-F]{24}$/.test(tryProviderId)) {
          // Tentativa 1: é um Provider ID → buscar Provider → obter userId → buscar User
          // Tentativa 2 (fallback): é um User ID legado → buscar User directamente
          let resolvedFromProvider = false;
          try {
            const provRes = await api.get(`/providers/${tryProviderId}`);
            // A resposta é { provider: { userId: { _id, ... } } }
            const providerDoc = provRes.data?.provider || provRes.data;
            const userId = providerDoc?.userId?._id || providerDoc?.userId;
            if (userId) {
              const sellerRes = await api.get(`/users/${userId}`);
              if (sellerRes.data?._id) { fullSeller = sellerRes.data; setSellerData(fullSeller); resolvedFromProvider = true; }
            }
          } catch (provErr) {
            // Provider não encontrado (404) ou erro — pode ser um ID de User legado
            console.log('Provider lookup failed, trying as User ID:', provErr.message);
          }

          if (!resolvedFromProvider) {
            // Fallback: tentar directamente como User ID (produtos legados com seller = User._id)
            try {
              const sellerRes = await api.get(`/users/${tryProviderId}`);
              if (sellerRes.data?._id) { fullSeller = sellerRes.data; setSellerData(fullSeller); }
              else setSellerData(activeSeller);
            } catch (userErr) {
              console.log('User fallback also failed:', userErr.message);
              setSellerData(activeSeller);
            }
          }
        } else {
          setSellerData(activeSeller);
        }
      }

      let rawMethods = [];
      const isValidObjectId = (idVal) => /^[0-9a-fA-F]{24}$/.test(idVal);

      if (tipoEstabelecimentoId && isValidObjectId(tipoEstabelecimentoId)) {
        try {
          const response = await api.get(`tipo-estabelecimento/${tipoEstabelecimentoId}`);
          if (response.status === 200 && response.data?.paymentMethods?.length > 0) {
            rawMethods = response.data.paymentMethods.map(pm => ({
               ...pm,
               shortName: pm.name 
            }));
          }
        } catch (err) {
          console.log('Skipping tipo-estabelecimento fetch due to request failure:', err.message);
        }
      }
      
      if (rawMethods.length === 0) {
        const response = await api.get(`payment-methods`);
        if (response.status === 200 && response.data) {
          const methodsList = Array.isArray(response.data) ? response.data : (response.data.paymentMethods || []);
          rawMethods = methodsList.map(pm => ({
             ...pm,
             shortName: pm.name
          }));
        }
      }

      // Filter out inactive payment methods
      const activeMethodsOnly = rawMethods.filter(pm => pm.status !== 'Inativo');

      const filteredMethods = filterMethodsBySeller(activeMethodsOnly, fullSeller);
      setPayments(filteredMethods);
      loadPreferredPayment(filteredMethods);

    } catch (error) {
      console.log('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferredPayment = async (paymentsList) => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        if (parsed.preferredPaymentMethod) {
          const pref = paymentsList.find(p => p._id === parsed.preferredPaymentMethod);
          if (pref) {
            setSelectedPayment(pref.shortName);
            return;
          }
        }
      }
      const mpesaMethod = paymentsList.find(p => p.shortName.toLowerCase().includes('mpesa'));
      if (mpesaMethod) {
        setSelectedPayment(mpesaMethod.shortName);
      } else if (paymentsList.length > 0) {
        setSelectedPayment(paymentsList[0].shortName);
      }
    } catch (e) {
      console.log('Error loading preferred payment', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isTransferMethod = useMemo(() => {
    const p = selectedPayment.toLowerCase();
    return p.includes('mpesa') || p.includes('m-pesa') || p.includes('emola') || p.includes('e-mola') || p.includes('transfer') || p.includes('banc') || p.includes('móvel') || p.includes('movel');
  }, [selectedPayment]);

  const sellerAccounts = useMemo(() => {
    // sellerData pode ser: User doc (tem .seller) ou Provider doc ou objecto parcial
    const sObj = sellerData?.seller || sellerData || {};
    const mpesa = sObj.phoneNumberAccount
      || sObj.transferPreferences?.mPesaNumber
      || sellerData?.phoneNumber
      || null;
    const emola = sObj.alternativePhoneNumberAccount
      || sObj.transferPreferences?.eMolaNumber
      || null;
    const bankAcc = sObj.accountNumber
      || sObj.bankAccount
      || null;
    return {
      mpesa:         mpesa ? String(mpesa)   : 'Não configurado',
      emola:         emola ? String(emola)   : 'Não configurado',
      bankName:      sObj.accountType        || 'Banco comercial',
      bankAccount:   bankAcc ? String(bankAcc) : 'Não configurado',
      altBankName:   sObj.alternativeAccountType    || '',
      altBankAccount: sObj.alternativeAccountNumber ? String(sObj.alternativeAccountNumber) : ''
    };
  }, [sellerData]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Acesso negado', 'Precisamos de permissão para aceder à sua galeria.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setProofImage(selectedAsset);
        setUploadingProof(true);
        setUploadedProofUrl("");
        try {
          const imageUri = selectedAsset.uri;

          // Extrair nome e tipo de forma robusta
          const uriParts = imageUri.split('/');
          const rawFilename = uriParts[uriParts.length - 1] || ('proof_' + Date.now() + '.jpg');
          const extMatch = /\.(\w+)$/.exec(rawFilename);
          const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
          // React Native em Android pode devolver HEIC — converter para jpg
          const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
          const filename = `proof_${Date.now()}.${safeExt}`;
          const mimeType = safeExt === 'jpg' || safeExt === 'jpeg' ? 'image/jpeg' : `image/${safeExt}`;

          console.log('[Upload] filename:', filename, '| type:', mimeType);
          console.log('[Upload] URI:', imageUri);

          const formData = new FormData();
          formData.append('file', {
            uri: imageUri,
            name: filename,
            type: mimeType,
          });

          // Usar axios (mesma instância com baseURL e token) — mais fiável em React Native
          const uploadResponse = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          });

          const uploadData = uploadResponse.data;
          const url = uploadData.secure_url || uploadData.url || '';
          if (!url) throw new Error('Upload bem sucedido mas URL não retornada');
          setUploadedProofUrl(url);
          toast.show("Comprovativo carregado com sucesso!", { type: 'success', placement: 'top' });
        } catch (uploadErr) {
          console.warn('Upload falhou:', uploadErr);
          setProofImage(null);
          setUploadedProofUrl("");
          showPremiumAlert('Falha no Upload', `Não foi possível enviar o comprovativo: ${uploadErr.message || 'Erro de rede'}. Verifique a ligação e tente novamente.`);
        } finally {
          setUploadingProof(false);
        }
      }
    } catch (e) {
      console.log('Error picking image:', e);
    }
  };

  const handleCopy = (text, label) => {
    Clipboard.setString(String(text));
    toast.show(`${label} copiado para a área de transferência!`, { type: 'success', placement: 'top' });
  };

  const isSubmitting = React.useRef(false);

  const handleConfirmOrder = async () => {
    // Evitar submissões múltiplas
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (!storedUserData) {
        isSubmitting.current = false;
        showPremiumAlert(
          'Autenticação Necessária', 
          'Usuário não autenticado. Faça login para continuar.',
          () => {
            setAlertModalVisible(false);
            navigation.navigate('Login');
          },
          'Fazer Login',
          true
        );
        return;
      }
      const userData = JSON.parse(storedUserData);

      if (!userData.name || !userData.name.trim()) {
        showPremiumAlert('Perfil Incompleto', 'Por favor, certifique-se de que o seu perfil tem o nome preenchido nas configurações.');
        return;
      }

      if (!userData.phoneNumber) {
        showPremiumAlert('Perfil Incompleto', 'Por favor, certifique-se de que o seu perfil tem o número de telefone preenchido.');
        return;
      }

      const addressStr = typeof address === 'string' ? address : (address?.address ?? address?.fullAddress ?? '');
      // Só validar endereço se o utilizador quer entrega
      if (isUserWantDelivery && (!addressStr || !addressStr.trim() || addressStr.trim() === 'Endereço não informado')) {
        showPremiumAlert('Endereço em Falta', 'Por favor, defina um endereço de entrega válido antes de concluir o pedido.');
        return;
      }

      if (isTransferMethod && !uploadedProofUrl) {
        showPremiumAlert('Comprovativo Obrigatório', 'Por favor, aguarde o upload do comprovativo terminar ou carregue-o novamente.');
        return;
      }

      setProcessing(true);
      const proofUrl = uploadedProofUrl;

      // Payload limpo — apenas dados serializáveis
      // Origem = morada do fornecedor; Destino = morada de entrega do cliente
      const sellerObj = sellerData?.seller || sellerData || {};
      const originAddress = sellerObj?.address || sellerObj?.name || 'Fornecedor';
      const originLat = parseFloat(sellerObj?.latitude || sellerObj?.lat || 0);
      const originLng = parseFloat(sellerObj?.longitude || sellerObj?.lng || 0);

      const orderPayload = {
        orderItems: items.map(item => ({
          _id: item._id,
          name: item.name,
          quantity: item.quantity || 1,
          price: item.price,
          image: item.image,
          seller: item.seller?._id || item.seller,
          onSale: item.onSale,
          discount: item.discount,
          priceFromSeller: item.priceFromSeller,
          sellerEarningsAfterDiscount: item.sellerEarningsAfterDiscount,
        })),
        address: addressStr || 'Levantamento na loja',
        deliveryAddress: {
          fullName: userData.name || 'Cliente',
          address: addressStr || 'Levantamento na loja',
          phoneNumber: String(userData.phoneNumber || ''),
          alternativePhoneNumber: String(userData.alternativePhoneNumber || '')
        },
        // Origem (fornecedor) e destino (cliente) para o Trajeto do Serviço
        origin: originAddress,
        destination: addressStr || 'Levantamento na loja',
        originDetails: { address: originAddress, lat: originLat, lng: originLng },
        destinationDetails: { address: addressStr || 'Levantamento na loja', lat: 0, lng: 0 },
        paymentMethod: selectedPayment || 'Dinheiro',
        totalPrice: parseFloat(totalToPay.toFixed(2)),
        itemsPrice: parseFloat((itemsPrice || 0).toFixed(2)),
        ivaTax: parseFloat((iva || 0).toFixed(2)),
        addressPrice: hasDigitalItems ? 0 : parseFloat((deliveryPrice || 0).toFixed(2)),
        itemsPriceForSeller: parseFloat((totalSellerEarningsAfterDiscount || 0).toFixed(2)),
        isPaid: false,
        user: { _id: userData._id, name: userData.name, phoneNumber: userData.phoneNumber },
        customerId: userData._id,
        isUserWantDelivery,
        stepStatus: 1,
        transportTypeId: selectedVehicle?._id || null,
        transportType: selectedVehicle?.name || null,
        paymentProof: proofUrl || undefined,
        digitalRecipientEmail: digitalRecipientEmail.trim() || undefined,
        digitalRecipientPhone: digitalRecipientPhone.trim() || undefined
      };

      const { data } = await api.post('/orders', orderPayload, { 
        headers: { authorization: `Bearer ${userData.token}` } 
      });

      const sellerId = data.order?.seller?._id || data.order?.seller || sellerData?._id;
      if (sellerId) {
        await sendOrderNotificationToUser({
          userId: sellerId,
          orderId: data.order._id,
          orderCode: data.order.code,
          title: '📦 Novo Pedido Pendente!',
          body: `Aceda à aba de Pedidos no Nhiquela Seller para aceitar ou rejeitar o pedido nº ${data.order.code}.`,
          status: 'Pendente',
        });
      }

      dispatch(clearBasket());
      toast.show("Pedido criado com sucesso!", { type: 'success' });
      
      navigation.replace('OrderWaitingScreen', { 
        orderId: data.order._id, 
        orderCode: data.order.code, 
        seller: data.order.seller || sellerData,
        initialOrder: data.order 
      });

    } catch (error) {
      console.error('Error confirming order:', error?.message, error?.response?.data);
      const msg = error?.response?.data?.message || error?.message || 'Erro inesperado. Tente novamente.';
      showPremiumAlert('Erro ao criar pedido', msg);
    } finally {
      setProcessing(false);
      setProcessingText('');
      isSubmitting.current = false;
    }
  };

  const handleReject = () => {
    setCancelModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Premium Cancel Confirmation Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContent}>
            <View style={styles.premiumIconContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.premiumModalTitle}>Cancelar Pagamento?</Text>
            <Text style={styles.premiumModalDesc}>
              Tem a certeza que deseja cancelar o pagamento e voltar? Todos os dados preenchidos serão perdidos.
            </Text>
            <View style={styles.premiumModalButtons}>
              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.premiumCancelBtn} 
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.premiumCancelBtnText}>Não, Continuar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.premiumConfirmBtn} 
                onPress={() => {
                  setCancelModalVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.premiumConfirmBtnText}>Sim, Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Premium Custom Alert Modal */}
      <Modal visible={alertModalVisible} transparent animationType="fade">
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContent}>
            <View style={[styles.premiumIconContainer, { backgroundColor: alertTitle?.includes('Autentica') ? '#E0F2FE' : '#FEE2E2' }]}>
              <Ionicons 
                name={alertTitle?.includes('Autentica') ? 'lock-closed-outline' : 'warning-outline'} 
                size={40} 
                color={alertTitle?.includes('Autentica') ? '#0284C7' : '#EF4444'} 
              />
            </View>
            <Text style={styles.premiumModalTitle}>{alertTitle}</Text>
            <Text style={styles.premiumModalDesc}>{alertDesc}</Text>
            <View style={styles.premiumModalButtons}>
              {alertShowCancel && (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={styles.premiumCancelBtn} 
                  onPress={() => setAlertModalVisible(false)}
                >
                  <Text style={styles.premiumCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                activeOpacity={0.8}
                style={[styles.premiumConfirmBtn, { backgroundColor: '#9333EA', shadowColor: '#9333EA' }]} 
                onPress={() => {
                  if (alertOnConfirm) {
                    alertOnConfirm();
                  } else {
                    setAlertModalVisible(false);
                  }
                }}
              >
                <Text style={styles.premiumConfirmBtnText}>{alertConfirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Processing Modal Overlay */}
      {processing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color="#9333EA" />
            <Text style={styles.processingText}>{processingText}</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleReject} style={styles.backBtn}>
          <Ionicons name='chevron-back-circle' size={35} color="#9333EA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forma de Pagamento</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Step Indicator */}
        <View style={styles.stepContainer}>
          <View style={styles.stepLine} />
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepDotText}>✓</Text></View>
            <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepDotText}>2</Text></View>
            <View style={styles.stepDot}><Text style={styles.stepDotText}>3</Text></View>
          </View>
          <View style={styles.stepLabelRow}>
            <Text style={styles.stepLabelActive}>Carrinho</Text>
            <Text style={styles.stepLabelActive}>Pagamento</Text>
            <Text style={styles.stepLabel}>Confirmação</Text>
          </View>
        </View>

        {/* Delivery Estimate Banner */}
        {isUserWantDelivery && estimatedDeliveryFee > 0 && (
          <View style={styles.deliveryBanner}>
            <View style={styles.deliveryBannerHeader}>
              <View style={styles.deliveryBannerIconWrap}>
                <MaterialCommunityIcons name="moped" size={22} color="#D97706" />
              </View>
              <Text style={styles.deliveryBannerTitle}>Estimativa de Entrega</Text>
            </View>

            <View style={styles.deliveryBannerRow}>
              <View style={styles.deliveryBannerStat}>
                <Ionicons name="navigate-outline" size={16} color="#92400E" />
                <Text style={styles.deliveryBannerStatLabel}>Distância</Text>
                <Text style={styles.deliveryBannerStatVal}>{distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : '—'}</Text>
              </View>
              <View style={styles.deliveryBannerDivider} />
              <View style={styles.deliveryBannerStat}>
                <Ionicons name="cash-outline" size={16} color="#92400E" />
                <Text style={styles.deliveryBannerStatLabel}>Taxa de Entrega</Text>
                <Text style={styles.deliveryBannerStatValHighlight}>{estimatedDeliveryFee.toFixed(2)} MT</Text>
              </View>
            </View>

            <View style={styles.deliveryBannerNote}>
              <Ionicons name="information-circle-outline" size={15} color="#92400E" />
              <Text style={styles.deliveryBannerNoteText}>
                Este valor é apenas uma <Text style={{ fontWeight: '700' }}>estimativa informativa</Text>. Não está incluído no total a pagar agora. O valor da entrega é pago <Text style={{ fontWeight: '700' }}>diretamente ao estafeta</Text> no momento da chegada da encomenda.
              </Text>
            </View>
          </View>
        )}

        {/* Digital Product Recipient Contact Card */}
        {hasDigitalItems && (
          <View style={styles.digitalCard}>
            <View style={styles.digitalCardHeader}>
              <Ionicons name="mail-unread-outline" size={22} color="#16A34A" />
              <Text style={styles.digitalCardTitle}>Destinatário do Produto Digital</Text>
            </View>
            <Text style={styles.digitalCardDesc}>
              Indique o e-mail ou contacto telefónico alternativo para receber a chave/acesso. Se deixar em branco, o envio será feito para o seu e-mail de conta.
            </Text>

            <View style={styles.digitalInputWrap}>
              <Text style={styles.digitalInputLabel}>E-mail do Destinatário (Opcional)</Text>
              <TextInput
                style={styles.digitalInput}
                placeholder="ex: amigo@email.com"
                placeholderTextColor="#94A3B8"
                value={digitalRecipientEmail}
                onChangeText={setDigitalRecipientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.digitalInputWrap}>
              <Text style={styles.digitalInputLabel}>Contacto Telefónico / WhatsApp (Opcional)</Text>
              <TextInput
                style={styles.digitalInput}
                placeholder="ex: 841234567"
                placeholderTextColor="#94A3B8"
                value={digitalRecipientPhone}
                onChangeText={setDigitalRecipientPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Selecione um método:</Text>
        
        {loading ? (
          <ActivityIndicator size="small" color="#9333EA" style={{ marginVertical: 15 }} />
        ) : null}

        <View style={styles.radioGroup}>
          {payments && payments.map((payment) => (
            <View key={payment._id} style={[
              styles.radioCard, 
              selectedPayment === payment.shortName && styles.radioCardSelected
            ]}>
              <Radio
                key={payment._id}
                options={[{ label: payment.shortName, value: payment.shortName }]}
                checkedValue={selectedPayment}
                onChange={setSelectedPayment}
              />
              <Text style={styles.radioDesc}>{payment.description}</Text>
            </View>
          ))}
        </View>

        {isTransferMethod && (
          <View style={styles.transferSection}>
            {/* Seller Account Details Card */}
            <View style={styles.accountsCard}>
              <Text style={styles.accountsHeader}>
                <FontAwesome5 name="university" size={16} color="#9333EA" /> Contas para Transferência
              </Text>
              <Text style={styles.accountsDesc}>
                Efetue o pagamento do valor exato de <Text style={styles.totalPriceHighlight}>{totalToPay.toFixed(2)} MT</Text> para uma das seguintes contas:
              </Text>

              {/* Mpesa account */}
              {(selectedPayment.toLowerCase().includes('mpesa') || selectedPayment.toLowerCase().includes('m-pesa') || selectedPayment.toLowerCase().includes('móvel') || selectedPayment.toLowerCase().includes('movel')) && (
                <View style={styles.accountRow}>
                  <View style={styles.accountCol}>
                    <Text style={styles.accountLabel}>📞 M-Pesa Fornecedor</Text>
                    <Text style={styles.accountVal}>{sellerAccounts.mpesa}</Text>
                  </View>
                  {sellerAccounts.mpesa !== 'Não configurado' && (
                    <TouchableOpacity onPress={() => handleCopy(sellerAccounts.mpesa, 'M-Pesa')} style={styles.copyBtn}>
                      <Ionicons name="copy-outline" size={18} color="#9333EA" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* eMola account */}
              {(selectedPayment.toLowerCase().includes('emola') || selectedPayment.toLowerCase().includes('e-mola') || selectedPayment.toLowerCase().includes('móvel') || selectedPayment.toLowerCase().includes('movel')) && (
                <View style={styles.accountRow}>
                  <View style={styles.accountCol}>
                    <Text style={styles.accountLabel}>📱 e-Mola Fornecedor</Text>
                    <Text style={styles.accountVal}>{sellerAccounts.emola}</Text>
                  </View>
                  {sellerAccounts.emola !== 'Não configurado' && (
                    <TouchableOpacity onPress={() => handleCopy(sellerAccounts.emola, 'e-Mola')} style={styles.copyBtn}>
                      <Ionicons name="copy-outline" size={18} color="#9333EA" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Bank accounts */}
              {(selectedPayment.toLowerCase().includes('banc') || (selectedPayment.toLowerCase().includes('transfer') && !selectedPayment.toLowerCase().includes('móvel') && !selectedPayment.toLowerCase().includes('movel'))) && (
                <>
                  <View style={styles.accountRow}>
                    <View style={styles.accountCol}>
                      <Text style={styles.accountLabel}>🏦 {sellerAccounts.bankName}</Text>
                      <Text style={styles.accountVal}>{sellerAccounts.bankAccount}</Text>
                    </View>
                    {sellerAccounts.bankAccount !== 'Não configurado' && (
                      <TouchableOpacity onPress={() => handleCopy(sellerAccounts.bankAccount, 'Conta Bancária')} style={styles.copyBtn}>
                        <Ionicons name="copy-outline" size={18} color="#9333EA" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {sellerAccounts.altBankAccount !== '' && (
                    <View style={styles.accountRow}>
                      <View style={styles.accountCol}>
                        <Text style={styles.accountLabel}>🏦 {sellerAccounts.altBankName || 'Outra Conta'}</Text>
                        <Text style={styles.accountVal}>{sellerAccounts.altBankAccount}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleCopy(sellerAccounts.altBankAccount, 'Conta Bancária Secundária')} style={styles.copyBtn}>
                        <Ionicons name="copy-outline" size={18} color="#9333EA" />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Proof Upload Card */}
            <View style={styles.uploadCard}>
              <Text style={styles.uploadHeader}>
                <Ionicons name="cloud-upload" size={18} color="#9333EA" /> Enviar Comprovativo
              </Text>
              
              {!proofImage ? (
                <TouchableOpacity style={styles.uploadTrigger} onPress={handlePickImage}>
                  <Ionicons name="images-outline" size={36} color="#9CA3AF" />
                  <Text style={styles.uploadTriggerText}>Escolher Imagem na Galeria</Text>
                  <Text style={styles.uploadTriggerSub}>Formatos aceites: JPG, PNG</Text>
                </TouchableOpacity>
              ) : uploadingProof ? (
                <View style={[styles.uploadTrigger, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator size="large" color="#8a2be2" style={{ marginBottom: 10 }} />
                  <Text style={styles.uploadTriggerText}>A enviar comprovativo...</Text>
                </View>
              ) : (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: proofImage.uri }} style={styles.previewImage} />
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewName} numberOfLines={1}>
                      {proofImage.fileName || 'comprovativo.jpg'}
                    </Text>
                    <Text style={styles.previewSize}>
                      {(proofImage.fileSize ? (proofImage.fileSize / 1024).toFixed(0) : '0')} KB
                    </Text>
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => { setProofImage(null); setUploadedProofUrl(""); }}>
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      <Text style={styles.removeImageText}>Remover</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Buttons section */}
        <View style={styles.buttonRow}>
          {(() => {
            const needsProof = isTransferMethod;
            const hasProof = !!uploadedProofUrl;
            const isDisabled = processing || uploadingProof || (needsProof && !hasProof);
            const btnLabel = uploadingProof
              ? 'A aguardar upload do comprovativo...'
              : needsProof && !hasProof
              ? 'Envie o comprovativo para ativar'
              : 'Submeter pagamento';
            return (
              <TouchableOpacity
                style={[styles.acceptBtn, isDisabled && { opacity: 0.5 }]}
                onPress={handleConfirmOrder}
                disabled={isDisabled}
              >
                <Ionicons name={isDisabled && !processing && !uploadingProof ? 'cloud-upload-outline' : 'checkmark-circle-outline'} size={20} color="#FFFFFF" />
                <Text style={styles.acceptBtnText}>{btnLabel}</Text>
              </TouchableOpacity>
            );
          })()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentMethod;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 12,
    color: "#1E293B",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  stepContainer: {
    marginVertical: 20,
    position: 'relative',
    alignItems: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: 15,
    left: '15%',
    right: '15%',
    height: 3,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '75%',
    zIndex: 2,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  stepActive: {
    backgroundColor: '#9333EA',
    borderColor: '#9333EA',
  },
  stepDotText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  stepLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  stepLabel: {
    fontSize: 12,
    color: '#94A3B8',
    width: 80,
    textAlign: 'center',
  },
  stepLabelActive: {
    fontSize: 12,
    color: '#9333EA',
    fontWeight: '600',
    width: 80,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
    marginTop: 10,
  },
  // ─── Delivery Estimate Banner ─────────────────────────────
  deliveryBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    padding: 16,
    marginBottom: 18,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  deliveryBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  deliveryBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deliveryBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.2,
  },
  deliveryBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9EC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  deliveryBannerStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  deliveryBannerDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#FCD34D',
    marginHorizontal: 8,
  },
  deliveryBannerStatLabel: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  deliveryBannerStatVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78350F',
  },
  deliveryBannerStatValHighlight: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D97706',
  },
  deliveryBannerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
  },
  deliveryBannerNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  // ─── Radio ────────────────────────────────────────────────
  radioGroup: {
    marginBottom: 15,
  },
  radioCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  radioCardSelected: {
    borderColor: '#9333EA',
    borderWidth: 1.5,
  },
  radioDesc: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 32,
    marginTop: 4,
  },
  transferSection: {
    marginTop: 5,
  },
  timerCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerInfo: {
    marginLeft: 12,
  },
  timerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  timerValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#D97706',
    marginTop: 2,
  },
  accountsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  accountsHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },
  accountsDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  totalPriceHighlight: {
    fontWeight: '800',
    color: '#9333EA',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  accountCol: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  accountVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  copyBtn: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 25,
  },
  uploadHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  uploadTrigger: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  uploadTriggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
  },
  uploadTriggerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: 65,
    height: 65,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  previewSize: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  removeImageText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  rejectBtn: {
    flex: 0.45,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 14,
  },
  rejectBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  acceptBtn: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333EA',
    borderRadius: 14,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  processingContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: 200,
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  premiumModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  premiumIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  premiumModalDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  premiumModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  premiumCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  premiumConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  digitalCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  digitalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  digitalCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  digitalCardDesc: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 18,
    marginBottom: 14,
  },
  digitalInputWrap: {
    marginBottom: 12,
  },
  digitalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  digitalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
});
