import { showMessage } from "react-native-flash-message";
import React, { useEffect, useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, 
  RefreshControl, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, 
  Keyboard, ActivityIndicator, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import api from '../hooks/createConnectionApi';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import * as Yup from 'yup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

const validationSchema = Yup.object().shape({
  nome: Yup.string().required('Nome (PT) é obrigatório'),
  name: Yup.string().required('Nome (EN) é obrigatório'),
  image: Yup.string().required('A imagem é obrigatória'),
  price: Yup.number().required('O preço é obrigatório'),
  category: Yup.string().required('A categoria é obrigatória'),
  province: Yup.string().required('A província é obrigatória'),
  brand: Yup.string().required('A marca/sabor é obrigatória'),
  countInStock: Yup.number().required('Quantidade é obrigatória'),
});

const NewProduct = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  
  const [userData, setUserData] = useState(null);
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
        if (storedUser) setUserData(JSON.parse(storedUser));
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
      }
    };
    loadUserData();
  }, []);

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
        navigation.navigate('ProductListSeller');
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
        navigation.navigate('ProductListSeller');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Erro ao guardar o produto.';
      Toast.show({ type: 'error', text1: 'Erro', text2: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = (icon, placeholder, value, onChangeText, onBlur, error, keyboardType = 'default') => (
    <View style={styles.inputGroup}>
      <View style={[styles.inputWrapper, error && { borderColor: COLORS.error }]}>
        <Ionicons name={icon} size={20} color={COLORS.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType={keyboardType}
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          >

            {userData && userData?.isApproved ? (
              <Formik
                enableReinitialize
                initialValues={{
                  nome: nome,
                  name: name,
                  image: image || '',
                  price: price,
                  category: category,
                  province: province,
                  brand: brand,
                  countInStock: countInStock,
                  description: description,
                  onSale: editingProduct?.onSale || false,
                  onSalePercentage: editingProduct?.onSalePercentage || 0,
                  orderPeriod: editingProduct?.orderPeriod || 0,
                  isGuaranteed: editingProduct?.isGuaranteed || false,
                  guaranteedPeriod: editingProduct?.guaranteedPeriod || 0,
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

                    <Text style={styles.sectionTitle}>Informações Básicas</Text>

                    {renderInput("text-outline", "Nome do produto (PT) *", values.nome, (t) => { handleChange('nome')(t); setNome(t); }, handleBlur('nome'), touched.nome && errors.nome)}
                    {renderInput("text-outline", "Nome do produto (Inglês) *", values.name, (t) => { handleChange('name')(t); setName(t); }, handleBlur('name'), touched.name && errors.name)}
                    {renderInput("information-circle-outline", "Descrição detalhada", values.description, (t) => { handleChange('description')(t); setDescription(t); }, handleBlur('description'), touched.description && errors.description)}
                    
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

                    {/* Categoria */}
                    <View style={styles.inputGroup}>
                      <View style={[styles.pickerContainer, touched.category && errors.category && { borderColor: COLORS.error }]}>
                        <Picker
                          selectedValue={values.category}
                          onValueChange={(val) => { setFieldValue('category', val); setCategory(val); }}
                          style={styles.picker}
                          dropdownIconColor={COLORS.text}
                        >
                          <Picker.Item label="Selecione a Categoria *" value="" color={COLORS.textMuted} />
                          {categories.map(c => <Picker.Item key={c._id} label={c.nome} value={c._id} color="#000" />)}
                        </Picker>
                      </View>
                      {touched.category && errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
                    </View>

                    {/* Provincia */}
                    <View style={styles.inputGroup}>
                      <View style={[styles.pickerContainer, touched.province && errors.province && { borderColor: COLORS.error }]}>
                        <Picker
                          selectedValue={values.province}
                          onValueChange={(val) => { setFieldValue('province', val); setProvince(val); }}
                          style={styles.picker}
                          dropdownIconColor={COLORS.text}
                        >
                          <Picker.Item label="Localização do Produto *" value="" color={COLORS.textMuted} />
                          {provinces.map(p => <Picker.Item key={p._id} label={p.name} value={p._id} color="#000" />)}
                        </Picker>
                      </View>
                      {touched.province && errors.province && <Text style={styles.errorText}>{errors.province}</Text>}
                    </View>

                    {/* Cores */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Cores Disponíveis *</Text>
                      <View style={[styles.pickerContainer, errorColor && { borderColor: COLORS.error }]}>
                        <Picker
                          selectedValue=""
                          onValueChange={(val) => handleColorSelect(val)}
                          style={styles.picker}
                          dropdownIconColor={COLORS.text}
                        >
                          <Picker.Item label="Adicionar uma cor" value="" color={COLORS.textMuted} />
                          {colors.map(c => <Picker.Item key={c._id} label={c.nome} value={c} color="#000" />)}
                        </Picker>
                      </View>
                      <View style={styles.chipRow}>
                        {selectedColors.map(c => (
                          <TouchableOpacity key={c._id} style={styles.chip} onPress={() => removeColor(c._id)}>
                            <Text style={styles.chipText}>{c.nome}</Text>
                            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                      {errorColor && <Text style={styles.errorText}>{errorColor}</Text>}
                    </View>

                    {/* Tamanhos */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Tamanhos Disponíveis *</Text>
                      <View style={[styles.pickerContainer, errorSize && { borderColor: COLORS.error }]}>
                        <Picker
                          selectedValue=""
                          onValueChange={(val) => handleSizeSelect(val)}
                          style={styles.picker}
                          dropdownIconColor={COLORS.text}
                        >
                          <Picker.Item label="Adicionar um tamanho" value="" color={COLORS.textMuted} />
                          {sizes.map(s => <Picker.Item key={s._id} label={s.nome} value={s} color="#000" />)}
                        </Picker>
                      </View>
                      <View style={styles.chipRow}>
                        {selectedSizes.map(s => (
                          <TouchableOpacity key={s._id} style={styles.chip} onPress={() => removeSize(s._id)}>
                            <Text style={styles.chipText}>{s.nome}</Text>
                            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                          </TouchableOpacity>
                        ))}
                      </View>
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
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={values.onSalePercentage}
                            onValueChange={(val) => setFieldValue('onSalePercentage', val)}
                            style={styles.picker}
                            dropdownIconColor={COLORS.text}
                          >
                            <Picker.Item label="Desconto (%)" value={0} color={COLORS.textMuted} />
                            {[10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(p => (
                              <Picker.Item key={p} label={`${p}% OFF`} value={p} color="#000" />
                            ))}
                          </Picker>
                        </View>
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
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={values.orderPeriod}
                            onValueChange={(val) => setFieldValue('orderPeriod', val)}
                            style={styles.picker}
                            dropdownIconColor={COLORS.text}
                          >
                            <Picker.Item label="Prazo de entrega" value="" color={COLORS.textMuted} />
                            {['1 dia', '2 dias', '5 dias', '7 dias', '15 dias', '30 dias'].map(d => (
                              <Picker.Item key={d} label={d} value={d} color="#000" />
                            ))}
                          </Picker>
                        </View>
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
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={values.guaranteedPeriod}
                            onValueChange={(val) => setFieldValue('guaranteedPeriod', val)}
                            style={styles.picker}
                            dropdownIconColor={COLORS.text}
                          >
                            <Picker.Item label="Período de garantia" value="" color={COLORS.textMuted} />
                            {['1 mês', '3 meses', '6 meses', '12 meses'].map(m => (
                              <Picker.Item key={m} label={m} value={m} color="#000" />
                            ))}
                          </Picker>
                        </View>
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
              <View style={styles.notApprovedCard}>
                <View style={styles.notApprovedIconBox}>
                  <Ionicons name="time-outline" size={40} color={COLORS.warning} />
                </View>
                <Text style={styles.notApprovedTitle}>Conta em Análise</Text>
                <Text style={styles.notApprovedText}>
                  Para começar a publicar os seus produtos, precisamos de finalizar a ativação da sua conta de parceiro.
                </Text>
                <View style={styles.contactBox}>
                  <Text style={styles.contactLabel}>Precisa de ajuda urgente?</Text>
                  <Text style={styles.contactValue}>WhatsApp: 85 360 0036</Text>
                  <Text style={styles.contactValue}>nhiquelaservicosconsultoria@gmail.com</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
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
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
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
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
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
  pickerContainer: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderRadius: RADIUS.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderColor: COLORS.border,
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
    borderRadius: RADIUS.sm,
    marginTop: 20,
    ...SHADOWS.md,
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
    borderRadius: RADIUS.md,
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
});