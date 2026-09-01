import { showMessage } from "react-native-flash-message";
import React, { useEffect, useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, 
  RefreshControl, Platform, TouchableWithoutFeedback, 
  Keyboard, ActivityIndicator, StatusBar, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import api from '../hooks/createConnectionApi';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import * as Yup from 'yup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const PremiumSelect = ({ icon, label, selectedValue, onValueChange, items, error }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedItem = items.find(i => String(i.value) === String(selectedValue));

  return (
    <View style={{ width: '100%', marginBottom: 16 }}>
      <TouchableOpacity 
        style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceCard || '#fafafa', borderWidth: 1, borderColor: COLORS.borderLight || '#e0e0e0', borderRadius: RADIUS.md, paddingHorizontal: 16, height: 56, ...SHADOWS.sm }, error && { borderColor: '#d32f2f' }]} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={20} color={COLORS.primary} style={{ marginRight: 12, opacity: 0.8 }} />
        <Text style={{ flex: 1, color: selectedItem && selectedItem.value !== "" ? COLORS.text : '#9e9e9e', fontSize: 14 }}>
          {selectedItem && selectedItem.value !== "" ? selectedItem.label : label}
        </Text>
        <Ionicons name="chevron-down" size={20} color={'#9e9e9e'} />
      </TouchableOpacity>

      {modalVisible && (
        <Modal visible={modalVisible} animationType="fade" transparent={true} onRequestClose={() => setModalVisible(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20, maxHeight: '70%', elevation: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>{label}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close-circle" size={28} color={'#e0e0e0'} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={items}
                keyExtractor={(item, index) => String(item.value) + index}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = String(selectedValue) === String(item.value);
                  return (
                    <TouchableOpacity
                      style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 15, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: isSelected ? COLORS.primary : '#f5f5f5' }, isSelected && { backgroundColor: COLORS.primaryLight ? COLORS.primaryLight + '15' : '#e0f2f1' }]}
                      onPress={() => { onValueChange(item.value); setModalVisible(false); }}
                    >
                      <Text style={[{ fontSize: 16, color: COLORS.text, fontWeight: isSelected ? '700' : '500' }, isSelected && { color: COLORS.primary }]}>{item.label}</Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const validationSchema = Yup.object().shape({
  nome: Yup.string().required('Nome (PT) é obrigatório'),
  name: Yup.string().required('Nome (EN) é obrigatório'),
  image: Yup.string().required('A imagem é obrigatória'),
  price: Yup.number().required('O preço é obrigatório'),
  category: Yup.string().required('A categoria é obrigatória'),
  productType: Yup.string(),
  province: Yup.string().when('productType', {
    is: 'DIGITAL',
    then: (schema) => schema.optional().nullable(),
    otherwise: (schema) => schema.required('A província é obrigatória'),
  }),
  brand: Yup.string().required('A marca/sabor é obrigatória'),
  countInStock: Yup.number().required('Quantidade é obrigatória'),
});

const NewProduct = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [userData, setUserData] = useState(null);
  const [timerEndDate, setTimerEndDate] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showNotifyBtn, setShowNotifyBtn] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Imagem
  const [image, setImage] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Arrays de cor/tamanho selecionados
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  
  // Erros customizados para arrays
  const [errorColor, setErrorColor] = useState(null);
  const [errorSize, setErrorSize] = useState(null);

  // Estados locais dos campos do formulário
  const [name, setName] = useState('');
  const [nome, setNome] = useState('');
  const [productType, setProductType] = useState('PHYSICAL');
  const [digitalInstructions, setDigitalInstructions] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [province, setProvince] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [countInStock, setCountInStock] = useState('');

  // 1. Carregar Sessão
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          let parsed = JSON.parse(storedUser);
          
          // Refresh user profile quietly to check if approval status changed
          try {
            const { data } = await api.get(`/users/${parsed._id}`, {
              headers: { authorization: `Bearer ${parsed.token}` }
            });
            if (data && (data.isApproved !== parsed.isApproved || data.status !== parsed.status)) {
               parsed = { ...parsed, isApproved: data.isApproved, status: data.status };
               await AsyncStorage.setItem('userData', JSON.stringify(parsed));
            }
          } catch (apiErr) {
            console.log('Erro ao actualizar perfil no NewProduct:', apiErr);
          }
          
          setUserData(parsed);
          
          if (!parsed.isApproved) {
            const storedEnd = await AsyncStorage.getItem('@approval_timer_end');
            if (storedEnd) {
              const end = parseInt(storedEnd, 10);
              if (Date.now() < end) {
                setTimerEndDate(end);
                setShowNotifyBtn(false);
              } else {
                setShowNotifyBtn(true);
              }
            } else {
              const end = Date.now() + 3600000;
              await AsyncStorage.setItem('@approval_timer_end', end.toString());
              setTimerEndDate(end);
              setShowNotifyBtn(false);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (!timerEndDate || showNotifyBtn) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= timerEndDate) {
        clearInterval(interval);
        setShowNotifyBtn(true);
        setTimeRemaining(0);
      } else {
        setTimeRemaining(Math.floor((timerEndDate - now) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerEndDate, showNotifyBtn]);

  const handleNotifyAdmin = async () => {
    setIsNotifying(true);
    try {
      await api.post('/users/notify-approval', {}, {
        headers: { authorization: `Bearer ${userData?.token}` }
      });
      showMessage({
        message: 'Sucesso',
        description: 'A administração foi notificada com sucesso.',
        type: 'success',
      });
      const end = Date.now() + 900000;
      await AsyncStorage.setItem('@approval_timer_end', end.toString());
      setTimerEndDate(end);
      setShowNotifyBtn(false);
    } catch (error) {
      showMessage({
        message: 'Erro',
        description: 'Não foi possível notificar a administração.',
        type: 'danger',
      });
    } finally {
      setIsNotifying(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 2. Carregar Dados de Dropdowns
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [catRes, provRes, colRes, sizRes] = await Promise.all([
        api.get('/categories'),
        api.get('/provinces'),
        api.get('/colors'),
        api.get('/sizes')
      ]);
      setCategories(catRes.data?.categories || []);
      setProvinces(provRes.data?.provinces || []);
      setColors(colRes.data?.colors || []);
      setSizes(sizRes.data?.sizes || []);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  // 3. Verifica se é edição (via params)
  useEffect(() => {
    const productToEdit = route.params?.productToEdit;
    if (productToEdit) {
      setEditingProduct(productToEdit);
    } else {
      resetLocalState();
    }
  }, [route.params]);

  // 4. Preencher formulário se for edição
  useEffect(() => {
    if (editingProduct) {
      setNome(editingProduct.nome || '');
      setName(editingProduct.name || '');
      setProductType(editingProduct.productType || 'PHYSICAL');
      setDigitalInstructions(editingProduct.digitalInstructions || '');
      setPrice(editingProduct.price?.toString() || '');
      setCategory(editingProduct.category?._id || '');
      setProvince(editingProduct.province?._id || '');
      setBrand(editingProduct.brand || '');
      setDescription(editingProduct.description || '');
      setCountInStock(editingProduct.countInStock?.toString() || '');
      setImage(editingProduct.image || null);
      setSelectedColors(editingProduct.color || []);
      setSelectedSizes(editingProduct.size || []);
    }
  }, [editingProduct]);

  const resetLocalState = () => {
    setEditingProduct(null);
    setProductType('PHYSICAL');
    setDigitalInstructions('');
    setSelectedColors([]);
    setSelectedSizes([]);
    setImage(null);
    setNome('');
    setName('');
    setPrice('');
    setCategory('');
    setProvince('');
    setBrand('');
    setDescription('');
    setCountInStock('');
  };

  const handleImagePicker = async (setFieldValue) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showMessage({ message: 'Permissão negada', description: 'É necessário aceder à galeria.', type: "danger", icon: "auto" });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImageUploading(true);
      const uri = result.assets[0].uri;
      setImage(uri); // preview otimista

      try {
        const formData = new FormData();
        const fileName = uri.split('/').pop();
        const fileType = fileName.split('.').pop();
        
        formData.append('file', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: fileName,
          type: `image/${fileType}`,
        });

        const { data } = await api.post('upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const finalUrl = data.secure_url || data.url;
        setImage(finalUrl);
        setFieldValue('image', finalUrl);
      } catch (error) {
        showMessage({ message: 'Erro', description: 'Falha no upload da imagem.', type: "danger", icon: "auto" });
        setImage(null);
      } finally {
        setImageUploading(false);
      }
    }
  };

  const handleColorSelect = (item) => {
    if (item && !selectedColors.find(c => c._id === item._id)) {
      setSelectedColors(prev => [...prev, item]);
      setErrorColor(null);
    }
  };

  const removeColor = (id) => {
    setSelectedColors(prev => prev.filter(c => c._id !== id));
  };

  const handleSizeSelect = (item) => {
    if (item && !selectedSizes.find(s => s._id === item._id)) {
      setSelectedSizes(prev => [...prev, item]);
      setErrorSize(null);
    }
  };

  const removeSize = (id) => {
    setSelectedSizes(prev => prev.filter(s => s._id !== id));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleSubmit = async (values, { resetForm }) => {
    if (!userData) return;

    if (selectedColors.length === 0) {
      setErrorColor('Adicione as cores disponíveis');
      Toast.show({ type: 'error', text1: 'Faltam Cores', text2: 'Adicione pelo menos uma cor.' });
      return;
    }
    if (selectedSizes.length === 0) {
      setErrorSize('Adicione os tamanhos disponíveis');
      Toast.show({ type: 'error', text1: 'Faltam Tamanhos', text2: 'Adicione pelo menos um tamanho.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        province: (values.province && values.province.trim() !== '') ? values.province : null,
        color: selectedColors,
        size: selectedSizes,
        isSellerOpen: userData?.seller?.openstore || false
      };

      const headers = { Authorization: `Bearer ${userData.token}` };

      if (editingProduct) {
        const response = await api.put(`products/${editingProduct._id}`, payload, { headers });
        setEditingProduct(response.data.product);

        // Notificação de Atualização
        await api.post('notifications/broadcast', { 
          title: 'Produto actualizado', 
          body: `O produto ${response.data.product.nome} foi actualizado. Confira!`, 
          data: response.data.product 
        }, { headers }).catch(e => console.log('Erro broadcast:', e.message));

        Toast.show({ type: 'success', text1: 'Sucesso', text2: 'Produto atualizado!' });
        navigation.navigate('ProductListSeller', { updatedProduct: response.data.product, timestamp: Date.now() });
      } else {
        const response = await api.post('products/', payload, { headers });

        // Notificação de Criação
        await api.post('notifications/broadcast', { 
          title: 'Novo produto!', 
          body: `O produto ${response.data.product.nome} já está disponível.`, 
          data: response.data.product 
        }, { headers }).catch(e => console.log('Erro broadcast:', e.message));

        Toast.show({ type: 'success', text1: 'Sucesso', text2: 'Produto criado!' });
        
        resetForm();
        resetLocalState();
        navigation.navigate('ProductListSeller', { newProduct: response.data.product, timestamp: Date.now() });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Erro ao guardar o produto.';
      Toast.show({ type: 'error', text1: 'Erro', text2: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = (icon, placeholder, value, onChangeText, onBlur, error, keyboardType = 'default', isTextArea = false) => (
    <View style={styles.inputGroup}>
      <View style={[styles.inputWrapper, error && { borderColor: COLORS.error }, isTextArea && { height: 120, alignItems: 'flex-start', paddingTop: 12 }]}>
        <Ionicons name={icon} size={20} color={COLORS.textMuted} style={[styles.inputIcon, isTextArea && { marginTop: 4 }]} />
        <TextInput
          style={[styles.input, isTextArea && { height: 100, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType={keyboardType}
          multiline={isTextArea}
          numberOfLines={isTextArea ? 4 : 1}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</Text>
        <View style={{ width: 38 }} />
      </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAwareScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            enableOnAndroid={true}
            keyboardOpeningTime={0}
            extraHeight={100}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          >

            {userData && userData?.isApproved ? (
              <Formik
                enableReinitialize
                initialValues={{
                  nome: nome,
                  name: name,
                  productType: productType,
                  digitalInstructions: digitalInstructions,
                  image: image || '',
                  price: price,
                  category: category,
                  province: province,
                  brand: brand,
                  countInStock: countInStock,
                  description: description,
                  onSale: editingProduct?.onSale || false,
                  onSalePercentage: editingProduct?.onSalePercentage || 0,
                  orderPeriod: editingProduct?.orderPeriod || '',
                  isGuaranteed: editingProduct?.isGuaranteed || false,
                  guaranteedPeriod: editingProduct?.guaranteedPeriod || '',
                  isOrdered: editingProduct?.isOrdered || false,
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {({ handleChange, handleBlur, handleSubmit, values, setFieldValue, touched, errors }) => (
                  <View style={styles.formContainer}>
                    
                    {/* Imagem do Produto */}
                    <View style={styles.imageSection}>
                      <TouchableOpacity 
                        style={[styles.imageUploadBox, (touched.image && errors.image) && { borderColor: COLORS.error }]} 
                        onPress={() => handleImagePicker(setFieldValue)}
                        disabled={imageUploading}
                      >
                        {imageUploading ? (
                          <ActivityIndicator color={COLORS.primaryLight} size="large" />
                        ) : image ? (
                          <Image source={{ uri: image }} style={styles.previewImage} />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="camera-plus-outline" size={40} color={COLORS.textMuted} />
                            <Text style={styles.imageUploadText}>Adicionar Foto do Produto *</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      {touched.image && errors.image && <Text style={styles.errorTextCenter}>{errors.image}</Text>}
                    </View>

                    {/* Tipo de Produto (Físico vs Digital) */}
                    <Text style={styles.sectionTitle}>Tipo de Produto</Text>
                    <View style={styles.productTypeContainer}>
                      <TouchableOpacity
                        style={[
                          styles.productTypeTile,
                          values.productType === 'PHYSICAL' && styles.productTypeTileActive
                        ]}
                        onPress={() => {
                          setFieldValue('productType', 'PHYSICAL');
                          setProductType('PHYSICAL');
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[styles.productTypeIconBg, values.productType === 'PHYSICAL' && styles.productTypeIconBgActive]}>
                            <Ionicons
                              name="cube-outline"
                              size={18}
                              color={values.productType === 'PHYSICAL' ? '#FFF' : COLORS.textMuted}
                            />
                          </View>
                          <View style={{ marginLeft: 8, flex: 1 }}>
                            <Text style={[styles.productTypeTitle, values.productType === 'PHYSICAL' && { color: COLORS.primary, fontWeight: '700' }]}>
                              Físico
                            </Text>
                            <Text style={styles.productTypeSub}>Com entrega</Text>
                          </View>
                        </View>
                        <View style={[styles.radioCircle, values.productType === 'PHYSICAL' && styles.radioCircleActive]}>
                          {values.productType === 'PHYSICAL' && <View style={styles.radioInnerCircle} />}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.productTypeTile,
                          values.productType === 'DIGITAL' && styles.productTypeTileActive
                        ]}
                        onPress={() => {
                          setFieldValue('productType', 'DIGITAL');
                          setProductType('DIGITAL');
                          setFieldValue('province', '');
                          setProvince('');
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[styles.productTypeIconBg, values.productType === 'DIGITAL' && styles.productTypeIconBgActive]}>
                            <Ionicons
                              name="key-outline"
                              size={18}
                              color={values.productType === 'DIGITAL' ? '#FFF' : COLORS.textMuted}
                            />
                          </View>
                          <View style={{ marginLeft: 8, flex: 1 }}>
                            <Text style={[styles.productTypeTitle, values.productType === 'DIGITAL' && { color: COLORS.primary, fontWeight: '700' }]}>
                              Digital
                            </Text>
                            <Text style={styles.productTypeSub}>Licença / Código</Text>
                          </View>
                        </View>
                        <View style={[styles.radioCircle, values.productType === 'DIGITAL' && styles.radioCircleActive]}>
                          {values.productType === 'DIGITAL' && <View style={styles.radioInnerCircle} />}
                        </View>
                      </TouchableOpacity>
                    </View>

                    {values.productType === 'DIGITAL' && (
                      <View style={{ marginBottom: 12 }}>
                        {renderInput(
                          "information-circle-outline",
                          "Instruções de resgate/ativação (opcional)",
                          values.digitalInstructions,
                          (t) => {
                            setFieldValue('digitalInstructions', t);
                            setDigitalInstructions(t);
                          },
                          handleBlur('digitalInstructions'),
                          null,
                          "default",
                          true
                        )}
                      </View>
                    )}

                    <Text style={styles.sectionTitle}>Informações Básicas</Text>

                    {renderInput("text-outline", "Nome do produto (PT) *", values.nome, (t) => { handleChange('nome')(t); setNome(t); }, handleBlur('nome'), touched.nome && errors.nome)}
                    {renderInput("text-outline", "Nome do produto (Inglês) *", values.name, (t) => { handleChange('name')(t); setName(t); }, handleBlur('name'), touched.name && errors.name)}
                    {renderInput("information-circle-outline", "Descrição detalhada", values.description, (t) => { handleChange('description')(t); setDescription(t); }, handleBlur('description'), touched.description && errors.description, "default", true)}
                    
                    <View style={styles.rowGrid}>
                      <View style={{ flex: 1 }}>
                        {renderInput("cash-outline", "Preço (MT) *", values.price, (t) => { const f = t.replace(/[^0-9]/g, ''); handleChange('price')(f); setPrice(f); }, handleBlur('price'), touched.price && errors.price, "numeric")}
                      </View>
                      <View style={{ flex: 1 }}>
                        {renderInput("layers-outline", "Stock *", values.countInStock, (t) => { const f = t.replace(/[^0-9]/g, ''); handleChange('countInStock')(f); setCountInStock(f); }, handleBlur('countInStock'), touched.countInStock && errors.countInStock, "numeric")}
                      </View>
                    </View>

                    {renderInput("star-outline", "Marca / Sabor *", values.brand, (t) => { handleChange('brand')(t); setBrand(t); }, handleBlur('brand'), touched.brand && errors.brand)}

                    <Text style={styles.sectionTitle}>Classificação e Filtros</Text>

                    <PremiumSelect
                      icon="grid-outline"
                      label="Selecione a Categoria *"
                      selectedValue={values.category}
                      onValueChange={(val) => { setFieldValue('category', val); setCategory(val); }}
                      items={[
                        { label: 'Selecione a Categoria *', value: '' },
                        ...categories.map(c => ({ label: c.nome, value: c._id }))
                      ]}
                      error={touched.category && errors.category ? errors.category : null}
                    />

                    {values.productType === 'DIGITAL' ? (
                      <View style={{ width: '100%', marginBottom: 16 }}>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: COLORS.surfaceCard || '#fafafa',
                          borderWidth: 1,
                          borderColor: COLORS.borderLight || '#e0e0e0',
                          borderRadius: RADIUS.md || 12,
                          paddingHorizontal: 16,
                          height: 56,
                          ...SHADOWS.sm
                        }}>
                          <Ionicons name="location-outline" size={20} color={COLORS.primary} style={{ marginRight: 12, opacity: 0.8 }} />
                          <Text style={{ flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600' }}>
                            Localização do Produto: Não aplicável
                          </Text>
                          <Ionicons name="lock-closed" size={18} color="#9e9e9e" />
                        </View>
                      </View>
                    ) : (
                      <PremiumSelect
                        icon="location-outline"
                        label="Localização do Produto *"
                        selectedValue={values.province}
                        onValueChange={(val) => { setFieldValue('province', val); setProvince(val); }}
                        items={[
                          { label: 'Localização do Produto *', value: '' },
                          ...provinces.map(p => ({ label: p.name, value: p._id }))
                        ]}
                        error={touched.province && errors.province ? errors.province : null}
                      />
                    )}

                    {/* Cores */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Cores Disponíveis *</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                        {colors.map(c => {
                          const isSelected = selectedColors.some(sc => sc._id === c._id);
                          return (
                            <TouchableOpacity
                              key={c._id}
                              style={[styles.optionPill, isSelected && styles.optionPillActive]}
                              onPress={() => isSelected ? removeColor(c._id) : handleColorSelect(c)}
                            >
                              <Text style={[styles.optionPillText, isSelected && styles.optionPillTextActive]}>{c.nome}</Text>
                              {isSelected && <Ionicons name="checkmark-circle" size={16} color={COLORS.primaryLight} style={{ marginLeft: 4 }} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      {errorColor && <Text style={styles.errorText}>{errorColor}</Text>}
                    </View>

                    {/* Tamanhos */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Tamanhos Disponíveis *</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
                        {sizes.map(s => {
                          const isSelected = selectedSizes.some(ss => ss._id === s._id);
                          return (
                            <TouchableOpacity
                              key={s._id}
                              style={[styles.optionPill, isSelected && styles.optionPillActive]}
                              onPress={() => isSelected ? removeSize(s._id) : handleSizeSelect(s)}
                            >
                              <Text style={[styles.optionPillText, isSelected && styles.optionPillTextActive]}>{s.nome}</Text>
                              {isSelected && <Ionicons name="checkmark-circle" size={16} color={COLORS.primaryLight} style={{ marginLeft: 4 }} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      {errorSize && <Text style={styles.errorText}>{errorSize}</Text>}
                    </View>

                    <Text style={styles.sectionTitle}>Configurações de Venda</Text>

                    {/* Promoção */}
                    <View style={styles.switchRow}>
                      <View>
                        <Text style={styles.switchLabel}>Produto em Promoção?</Text>
                        <Text style={styles.switchSubLabel}>Ativar para mostrar preço riscado</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setFieldValue('onSale', !values.onSale)}
                        style={[styles.toggleBtn, values.onSale && styles.toggleBtnActive]}
                      >
                        <Text style={[styles.toggleText, values.onSale && styles.toggleTextActive]}>
                          {values.onSale ? 'SIM' : 'NÃO'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {values.onSale && (
                      <View style={styles.inputGroup}>
                        <PremiumSelect
                          icon="pricetag-outline"
                          label="Desconto (%)"
                          selectedValue={values.onSalePercentage}
                          onValueChange={(val) => setFieldValue('onSalePercentage', val)}
                          items={[
                            { label: 'Desconto (%)', value: 0 },
                            ...[10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(p => ({ label: `${p}% OFF`, value: p }))
                          ]}
                        />
                      </View>
                    )}

                    {/* Sob Encomenda */}
                    <View style={styles.switchRow}>
                      <View>
                        <Text style={styles.switchLabel}>Sob Encomenda?</Text>
                        <Text style={styles.switchSubLabel}>Produto não tem entrega imediata</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setFieldValue('isOrdered', !values.isOrdered)}
                        style={[styles.toggleBtn, values.isOrdered && styles.toggleBtnActive]}
                      >
                        <Text style={[styles.toggleText, values.isOrdered && styles.toggleTextActive]}>
                          {values.isOrdered ? 'SIM' : 'NÃO'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {values.isOrdered && (
                      <View style={styles.inputGroup}>
                        <PremiumSelect
                          icon="time-outline"
                          label="Prazo de entrega"
                          selectedValue={values.orderPeriod}
                          onValueChange={(val) => setFieldValue('orderPeriod', val)}
                          items={[
                            { label: 'Prazo de entrega', value: '' },
                            ...['1 dia', '2 dias', '5 dias', '7 dias', '15 dias', '30 dias'].map(d => ({ label: d, value: d }))
                          ]}
                        />
                      </View>
                    )}

                    {/* Garantia */}
                    <View style={styles.switchRow}>
                      <View>
                        <Text style={styles.switchLabel}>Possui Garantia?</Text>
                        <Text style={styles.switchSubLabel}>O cliente tem período de devolução/troca</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setFieldValue('isGuaranteed', !values.isGuaranteed)}
                        style={[styles.toggleBtn, values.isGuaranteed && styles.toggleBtnActive]}
                      >
                        <Text style={[styles.toggleText, values.isGuaranteed && styles.toggleTextActive]}>
                          {values.isGuaranteed ? 'SIM' : 'NÃO'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {values.isGuaranteed && (
                      <View style={styles.inputGroup}>
                        <PremiumSelect
                          icon="shield-checkmark-outline"
                          label="Período de garantia"
                          selectedValue={values.guaranteedPeriod}
                          onValueChange={(val) => setFieldValue('guaranteedPeriod', val)}
                          items={[
                            { label: 'Período de garantia', value: '' },
                            ...['1 mês', '3 meses', '6 meses', '12 meses'].map(m => ({ label: m, value: m }))
                          ]}
                        />
                      </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={22} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.submitBtnText}>
                            {editingProduct ? 'Salvar Alterações' : 'Publicar Produto'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                  </View>
                )}
              </Formik>
            ) : (
              <LinearGradient
                colors={['#1E1E1E', '#2D2D2D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.notApprovedCard, { backgroundColor: 'transparent', borderColor: '#D4AF37', borderWidth: 1 }]}
              >
                <View style={[styles.notApprovedIconBox, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
                  <Ionicons name="shield-checkmark" size={44} color="#D4AF37" />
                </View>
                <Text style={[styles.notApprovedTitle, { color: '#D4AF37', letterSpacing: 0.5 }]}>Conta em Análise</Text>
                <Text style={[styles.notApprovedText, { color: '#E0E0E0', opacity: 0.9 }]}>
                  Para começar a publicar os seus produtos, precisamos de finalizar a ativação da sua conta de parceiro. A nossa equipa já está a rever os seus dados.
                </Text>
                <View style={styles.contactBox}>
                  {showNotifyBtn ? (
                    <TouchableOpacity 
                      style={[styles.notifyBtn, isNotifying && { opacity: 0.7 }]} 
                      onPress={handleNotifyAdmin}
                      disabled={isNotifying}
                    >
                      {isNotifying ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.notifyBtnText}>Notificar Administração</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.timerBox}>
                      <Ionicons name="timer-outline" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.timerText}>
                        Notificar novamente em: {formatTime(timeRemaining)}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            )}
          </KeyboardAwareScrollView>
        </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default NewProduct;

const styles = StyleSheet.create({
  safeArea: {
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
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formContainer: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.primaryLight,
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Upload Imagem
  imageSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  imageUploadBox: {
    width: 140,
    height: 140,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageUploadText: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    height: 54,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: SIZES.base,
    color: COLORS.text,
    fontWeight: '500',
    height: '100%',
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  // Erros
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.xs,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  errorTextCenter: {
    color: COLORS.error,
    fontSize: SIZES.xs,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  // Pickers e Chips
  label: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  premiumPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '80', // semi-transparent primary
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  pickerIcon: {
    marginRight: 4,
  },
  pickerContainer: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  picker: {
    height: 54,
    color: COLORS.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  optionsScroll: {
    marginTop: 4,
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    marginRight: 8,
    marginBottom: 8,
  },
  optionPillActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary,
  },
  optionPillText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  optionPillTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  chipText: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  // Switches Modernos
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  switchLabel: {
    fontSize: SIZES.base,
    color: COLORS.text,
    fontWeight: '600',
  },
  switchSubLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  toggleBtn: {
    backgroundColor: COLORS.surface2,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary,
  },
  toggleText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.primaryLight,
  },
  // Botão Submeter
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: RADIUS.full,
    marginTop: 20,
    ...SHADOWS.glow,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  // Conta não aprovada
  notApprovedCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    ...SHADOWS.md,
  },
  notApprovedIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notApprovedTitle: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  notApprovedText: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  contactBox: {
    backgroundColor: COLORS.surface2,
    padding: 16,
    borderRadius: RADIUS.lg,
    width: '100%',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  contactValue: {
    fontSize: SIZES.base,
    color: COLORS.primaryLight,
    fontWeight: '700',
    marginBottom: 4,
  },
  notifyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.full,
    width: '100%',
    alignItems: 'center',
  },
  notifyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: SIZES.sm,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
  },
  timerText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: SIZES.sm,
  },
  productTypeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  productTypeTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceCard || '#FAFAFA',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight || '#E0E0E0',
    borderRadius: RADIUS.md || 12,
    padding: 12,
  },
  productTypeTileActive: {
    borderColor: COLORS.primary || '#7F00FF',
    backgroundColor: '#F5F0FF',
  },
  productTypeIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productTypeIconBgActive: {
    backgroundColor: COLORS.primary || '#7F00FF',
  },
  productTypeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text || '#1E293B',
  },
  productTypeSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  radioCircle: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  radioCircleActive: {
    borderColor: COLORS.primary || '#7F00FF',
  },
  radioInnerCircle: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary || '#7F00FF',
  },
});
