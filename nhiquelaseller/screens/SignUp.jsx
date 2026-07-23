import { showMessage } from "react-native-flash-message";
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Image,
  TouchableOpacity, TouchableWithoutFeedback, KeyboardAvoidingView,
  Platform, Keyboard, ActivityIndicator, Animated, StatusBar
} from 'react-native';
import api from '../hooks/createConnectionApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, RADIUS, SHADOWS } from '../constants/theme';

export default function SignUp() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [step, setStep] = useState(0);

  // Data Sources
  const [provinces, setProvinces] = useState([]);
  const [tiposEstabelecimentos, setTiposEstabelecimentos] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    seller: {
      name: '',
      logo: '',
      description: '',
      address: '',
      phoneNumberAccount: '',
      alternativePhoneNumberAccount: '',
      province: '',
      tipoEstabelecimento: '',
      latitude: null,
      longitude: null,
    }
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const { data } = await api.get('provinces');
        setProvinces(data.provinces);
      } catch (error) {
        console.error('Erro ao buscar províncias:', error);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    const fetchTipos = async () => {
      try {
        const { data } = await api.get('establishment-types');
        setTiposEstabelecimentos(data.establishmentTypes);
      } catch (error) {
        console.error('Erro ao buscar tipos de estabelecimento:', error);
      }
    };
    fetchTipos();
  }, []);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permissão negada' });
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      setForm(prev => ({
        ...prev,
        seller: {
          ...prev.seller,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        }
      }));
      Toast.show({ type: 'success', text1: 'Localização atualizada' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Erro ao obter localização' });
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleChange = (field, value, isSeller = false) => {
    if (isSeller) {
      setForm(prev => ({ ...prev, seller: { ...prev.seller, [field]: value } }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permissão necessária' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) return;

      const imageUri = result.assets[0].uri;
      setImageUploading(true);

      const fileName = imageUri.split('/').pop();
      const fileType = fileName.split('.').pop();
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        name: fileName,
        type: `image/${fileType}`,
      });

      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const imageUrl = response.data?.secure_url || response.data?.url || null;
      if (imageUrl) {
        handleChange('logo', imageUrl, true);
        Toast.show({ type: 'success', text1: 'Logo carregada com sucesso!' });
      }
    } catch (err) {
      console.error('Erro ao escolher imagem:', err);
      Toast.show({ type: 'error', text1: 'Erro no upload da imagem' });
    } finally {
      setImageUploading(false);
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Obrigatório';
    if (!form.phoneNumber.trim() || !/^8[2-7][0-9]{7}$/.test(form.phoneNumber)) {
      newErrors.phoneNumber = 'Número inválido (8x xxx xxxx)';
    }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!form.password || form.password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }
    if (!form.confirmPassword || form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showMessage({ message: "Preencha todos os campos corretamente", type: "warning" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!form.seller.logo) newErrors.logo = 'A logo é obrigatória';
    if (!form.seller.name.trim()) newErrors.sellerName = 'Obrigatório';
    if (!form.seller.description.trim()) newErrors.description = 'Obrigatório';
    if (!form.seller.province) newErrors.province = 'Obrigatório';
    if (!form.seller.address.trim()) newErrors.address = 'Obrigatório';
    if (!form.seller.tipoEstabelecimento) newErrors.tipoEstabelecimento = 'Obrigatório';
    if (!form.seller.phoneNumberAccount || !/^8[4-5][0-9]{7}$/.test(form.seller.phoneNumberAccount)) {
      newErrors.phoneNumberAccount = 'Número inválido (Comece por 84 ou 85)';
    }
    if (!form.seller.alternativePhoneNumberAccount || !/^8[6-7][0-9]{7}$/.test(form.seller.alternativePhoneNumberAccount)) {
      newErrors.alternativePhoneNumberAccount = 'Número inválido (Comece por 86 ou 87)';
    }
    if (!form.seller.latitude || !form.seller.longitude) {
      newErrors.location = 'A localização GPS é obrigatória';
      Toast.show({ type: 'error', text1: 'Atualize a sua localização GPS.' });
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showMessage({ message: "Preencha os campos do estabelecimento", type: "warning" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep1()) return;

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
    ]).start();

    setTimeout(() => setStep(1), 150);
  };

  const handleBack = () => {
    if (step === 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
      setTimeout(() => setStep(0), 150);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const payload = { ...form, isSeller: true };
      await api.post('/users/signup', payload);

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Permissão de notificações não concedida.');
      }

      Toast.show({
        type: 'success',
        text1: 'Perfil criado com sucesso!',
        text2: 'Agora podes iniciar sessão.',
      });
      navigation.navigate('Login');

    } catch (error) {
      console.error('Erro no cadastro:', error.response?.data || error);
      let backendMessage = error.response?.data?.message || 'Erro ao criar conta. Tente novamente.';
      Toast.show({ type: 'error', text1: 'Erro', text2: backendMessage });
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, field, icon, isSeller, props) => {
    const value = isSeller ? form.seller[field] : form[field];
    const hasError = errors[isSeller ? (field === 'name' ? 'sellerName' : field) : field];

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={[styles.inputWrapper, hasError && { borderColor: COLORS.error }]}>
          <Ionicons name={icon} size={20} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(v) => handleChange(field, v, isSeller)}
            placeholderTextColor={COLORS.textMuted}
            {...props}
          />
        </View>
        {hasError && <Text style={styles.errorText}>{hasError}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Novo Parceiro</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Stepper */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, step >= 0 && styles.stepDotActive]} />
              <View style={[styles.stepLine, step >= 1 && styles.stepLineActive]} />
              <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            </View>
            <Text style={styles.stepTitle}>
              {step === 0 ? "1. Dados do Representante" : "2. O Estabelecimento"}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
              
              {/* PASSO 1: DADOS PESSOAIS */}
              {step === 0 && (
                <View style={styles.stepContent}>
                  {renderInput("Nome e Apelido *", "name", "person-outline", false, { placeholder: "Ex: João Silva" })}
                  {renderInput("Número de Telefone *", "phoneNumber", "call-outline", false, { placeholder: "84...", keyboardType: "phone-pad", maxLength: 9 })}
                  {renderInput("Email *", "email", "mail-outline", false, { placeholder: "email@exemplo.com", keyboardType: "email-address", autoCapitalize: "none" })}
                  
                  {/* Password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Senha (mín. 6) *</Text>
                    <View style={[styles.inputWrapper, errors.password && { borderColor: COLORS.error }]}>
                      <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={form.password}
                        onChangeText={(v) => handleChange('password', v, false)}
                        placeholder="******"
                        placeholderTextColor={COLORS.textMuted}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                        <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                    {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirmar Senha *</Text>
                    <View style={[styles.inputWrapper, errors.confirmPassword && { borderColor: COLORS.error }]}>
                      <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={form.confirmPassword}
                        onChangeText={(v) => handleChange('confirmPassword', v, false)}
                        placeholder="******"
                        placeholderTextColor={COLORS.textMuted}
                        secureTextEntry={!showConfirmPassword}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                        <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                  </View>
                </View>
              )}

              {/* PASSO 2: ESTABELECIMENTO */}
              {step === 1 && (
                <View style={styles.stepContent}>
                  
                  {/* Upload Logo */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Logótipo do Estabelecimento *</Text>
                    <TouchableOpacity 
                      style={[styles.uploadBox, errors.logo && { borderColor: COLORS.error }]} 
                      onPress={handleImagePicker}
                      disabled={imageUploading}
                    >
                      {imageUploading ? (
                        <ActivityIndicator color={COLORS.primaryLight} />
                      ) : form.seller.logo ? (
                        <Image source={{ uri: form.seller.logo }} style={styles.previewImage} />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="storefront-outline" size={32} color={COLORS.textMuted} />
                          <Text style={styles.uploadText}>Toque para adicionar logótipo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    {errors.logo && <Text style={styles.errorText}>{errors.logo}</Text>}
                  </View>

                  {/* Tipo de Estabelecimento */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Categoria Principal *</Text>
                    <View style={[styles.pickerContainer, errors.tipoEstabelecimento && { borderColor: COLORS.error }]}>
                      <Picker 
                        selectedValue={form.seller.tipoEstabelecimento} 
                        onValueChange={(v) => handleChange('tipoEstabelecimento', v, true)}
                        style={styles.picker}
                        dropdownIconColor={COLORS.text}
                      >
                        <Picker.Item label="Selecione a categoria" value="" color={COLORS.textMuted} />
                        {tiposEstabelecimentos.map((tipo) => (
                          <Picker.Item key={tipo._id} label={tipo.name} value={tipo._id} color="#000" />
                        ))}
                      </Picker>
                    </View>
                    {errors.tipoEstabelecimento && <Text style={styles.errorText}>{errors.tipoEstabelecimento}</Text>}
                  </View>

                  {renderInput("Nome do Estabelecimento *", "name", "business-outline", true, { placeholder: "A minha loja" })}
                  {renderInput("Descrição / Especialidade *", "description", "information-circle-outline", true, { placeholder: "Restaurante, Mercearia..." })}
                  
                  {/* Província */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Localização *</Text>
                    <View style={[styles.pickerContainer, errors.province && { borderColor: COLORS.error }]}>
                      <Picker 
                        selectedValue={form.seller.province} 
                        onValueChange={(v) => handleChange('province', v, true)}
                        style={styles.picker}
                        dropdownIconColor={COLORS.text}
                      >
                        <Picker.Item label="Selecione a província" value="" color={COLORS.textMuted} />
                        {provinces.map((prov) => (
                          <Picker.Item key={prov._id} label={prov.name} value={prov._id} color="#000" />
                        ))}
                      </Picker>
                    </View>
                    {errors.province && <Text style={styles.errorText}>{errors.province}</Text>}
                  </View>

                  {renderInput("Morada (Rua/Avenida) *", "address", "location-outline", true, { placeholder: "Av. principal..." })}

                  {renderInput("Telefone de Pagamentos (M-PESA) *", "phoneNumberAccount", "cash-outline", true, { placeholder: "84 ou 85...", keyboardType: "numeric", maxLength: 9 })}
                  {renderInput("Telefone de Pagamentos (E-MOLA) *", "alternativePhoneNumberAccount", "wallet-outline", true, { placeholder: "86 ou 87...", keyboardType: "numeric", maxLength: 9 })}

                  {/* GPS */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Coordenadas GPS *</Text>
                    <TouchableOpacity 
                      style={[styles.secondaryButton, locationLoading && { opacity: 0.7 }]} 
                      onPress={getCurrentLocation} 
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <ActivityIndicator color={COLORS.primaryLight} />
                      ) : (
                        <>
                          <Ionicons name="location-outline" size={20} color={COLORS.primaryLight} />
                          <Text style={styles.secondaryButtonText}>Atualizar Localização</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    {form.seller.latitude ? (
                      <Text style={styles.locationText}>Lat: {form.seller.latitude.toFixed(6)} | Lng: {form.seller.longitude.toFixed(6)}</Text>
                    ) : (
                      <Text style={[styles.locationText, { color: COLORS.error }]}>Aguardando localização...</Text>
                    )}
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.disabledButton]} 
              onPress={step === 1 ? handleSubmit : handleNext}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>{step === 1 ? "Registar Estabelecimento" : "Avançar"}</Text>
                  {step === 0 && <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />}
                </>
              )}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  backButton: { 
    width: 38, height: 38, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface2, 
    alignItems: 'center', justifyContent: 'center' 
  },
  headerTitle: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.text },
  stepperContainer: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.surfaceCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border },
  stepDotActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryLight },
  stepLine: { width: 60, height: 2, backgroundColor: COLORS.surface2, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: COLORS.primaryLight },
  stepTitle: { textAlign: 'center', fontSize: SIZES.sm, fontWeight: '700', color: COLORS.text },
  scrollContent: { padding: 20, paddingBottom: 40 },
  stepContent: { flex: 1 },
  
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, 
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, 
    height: 56, paddingHorizontal: 16 
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: SIZES.base, color: COLORS.text, fontWeight: '500' },
  errorText: { color: COLORS.error, fontSize: SIZES.xs, marginTop: 4, marginLeft: 4, fontWeight: '600' },
  
  eyeButton: { padding: 5 },

  uploadBox: { 
    height: 120, backgroundColor: COLORS.surface2, borderWidth: 1.5, borderColor: COLORS.border, 
    borderStyle: 'dashed', borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' 
  },
  uploadText: { marginTop: 8, fontSize: SIZES.sm, color: COLORS.textMuted },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  pickerContainer: { backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, overflow: 'hidden' },
  picker: { height: 56, color: COLORS.text },

  secondaryButton: { 
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.sm, height: 52, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.primary + '40'
  },
  secondaryButtonText: { color: COLORS.primaryLight, fontSize: SIZES.sm, fontWeight: '700', marginLeft: 8 },
  locationText: { fontSize: SIZES.xs, color: COLORS.textSecondary, textAlign: 'center' },

  footer: { padding: 20, backgroundColor: COLORS.surfaceCard, borderTopWidth: 1, borderTopColor: COLORS.border },
  primaryButton: { 
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, height: 56, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...SHADOWS.md 
  },
  disabledButton: { opacity: 0.6 },
  primaryButtonText: { color: '#FFF', fontSize: SIZES.base, fontWeight: '700' }
});