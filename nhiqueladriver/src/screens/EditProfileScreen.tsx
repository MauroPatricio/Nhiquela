// @ts-nocheck
import { Picker } from '@react-native-picker/picker';
import { showMessage } from "react-native-flash-message";
// screens/EditProfileScreen.tsx - CÓDIGO COMPLETO COM FOTOS GRANDES
import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
  Switch,
} from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Formik } from "formik";
import * as Yup from "yup";
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from "../styles/colors";
import { useAuth } from "../context/AuthContext";
import SelectField from "../components/SelectField";
import { updateDeliverymanRequest, getProviderSubcategories } from "../services/deliveryService";
import { API_BASE_URL } from "../api/apiConfig";

type Props = {
  navigation: any;
  route: any;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Schema de validação
const validationSchema = Yup.object().shape({
  email: Yup.string().email("Email inválido").required("Email é obrigatório"),
  phoneNumber: Yup.string()
    .matches(/^[0-9]{9}$/, "Número deve ter 9 dígitos")
    .required("Telefone é obrigatório"),
  transport_type: Yup.string(),
  transport_color: Yup.string(),
  transport_registration: Yup.string(),
  assigned_base_fee: Yup.string(),
});

export default function EditProfileScreen({ navigation, route }: Props) {
  const { user, updateUser, updateDeliveryman, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Atualiza os dados do motorista sempre que o ecrã fica em foco
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );
  // --- Preço Personalizado ---
  const [allowCustomPrice, setAllowCustomPrice] = useState<boolean>(user?.deliveryman?.allowCustomPrice || false);
  const [customPriceInput, setCustomPriceInput] = useState<string>(
    user?.deliveryman?.customPrice?.toString() ||
    user?.deliveryman?.assigned_base_fee?.toString() || ''
  );
  const [submittingPrice, setSubmittingPrice] = useState(false);
  const [submittingDocRequest, setSubmittingDocRequest] = useState(false);
  const docUpdateStatus = user?.deliveryman?.docUpdateStatus || 'Nenhum';
  const priceStatus = user?.deliveryman?.priceRequestStatus;
  const pendingPrice = user?.deliveryman?.pendingCustomPrice;
  const rejectionReason = user?.deliveryman?.priceRequestRejectionReason;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // ✅ FUNÇÃO PARA FORMATAR IMAGEM BASE64 OU URL RELATIVA
  const formatBase64Image = (base64String: string | undefined) => {
    if (!base64String) return "";
    
    // Se já é uma URL válida, retorna como está
    if (base64String.startsWith('http')) {
      return base64String;
    }

    // Se é um caminho relativo do servidor backend (ex: /uploads/...)
    if (base64String.startsWith('/')) {
      const baseUrl = API_BASE_URL.replace('/api', '');
      return `${baseUrl}${base64String}`;
    }

    // Se já tem prefixo data:, retorna como está
    if (base64String.startsWith('data:')) {
      return base64String;
    }

    // Se é Base64 puro sem prefixo, adiciona prefixo
    if (base64String.length > 100 && !base64String.startsWith('data:') && !base64String.startsWith('http')) {
      return `data:image/jpeg;base64,${base64String}`;
    }

    return base64String;
  };

  // ✅ ESTADOS PARA IMAGENS - COM FORMATAÇÃO CORRETA
  const [profileImage, setProfileImage] = useState(formatBase64Image(user?.deliveryman?.photo) || "");
  const [vehicleImage, setVehicleImage] = useState(formatBase64Image(user?.deliveryman?.vihicle_picture) || "");
  const [vehicleFrontImage, setVehicleFrontImage] = useState(formatBase64Image(user?.deliveryman?.vihicle_picture_front) || "");
  const [vehicleBackImage, setVehicleBackImage] = useState(formatBase64Image(user?.deliveryman?.vihicle_picture_back) || "");
  const [licenseFrontImage, setLicenseFrontImage] = useState(formatBase64Image(user?.deliveryman?.license_front) || "");
  const [licenseBackImage, setLicenseBackImage] = useState(formatBase64Image(user?.deliveryman?.license_back) || "");
  const [documentFrontImage, setDocumentFrontImage] = useState(formatBase64Image(user?.deliveryman?.document_front) || "");
  const [documentBackImage, setDocumentBackImage] = useState(formatBase64Image(user?.deliveryman?.document_back) || "");
  const [vehicleInspectionImage, setVehicleInspectionImage] = useState(formatBase64Image(user?.deliveryman?.vihicle_inspection) || "");
  const [vehicleInsuranceImage, setVehicleInsuranceImage] = useState(formatBase64Image(user?.deliveryman?.vihicle_Insurance) || "");
  const [proofOfAddressImage, setProofOfAddressImage] = useState(formatBase64Image(user?.deliveryman?.Proof_of_Address) || "");

  // ✅ EFFECT PARçãTUALIZAR IMAGENS QUANDO USER MUDAR
  useEffect(() => {
    setProfileImage(formatBase64Image(user?.deliveryman?.photo) || "");
    setVehicleImage(formatBase64Image(user?.deliveryman?.vihicle_picture) || "");
    setVehicleFrontImage(formatBase64Image(user?.deliveryman?.vihicle_picture_front) || "");
    setVehicleBackImage(formatBase64Image(user?.deliveryman?.vihicle_picture_back) || "");
    setLicenseFrontImage(formatBase64Image(user?.deliveryman?.license_front) || "");
    setLicenseBackImage(formatBase64Image(user?.deliveryman?.license_back) || "");
    setDocumentFrontImage(formatBase64Image(user?.deliveryman?.document_front) || "");
    setDocumentBackImage(formatBase64Image(user?.deliveryman?.document_back) || "");
    setVehicleInspectionImage(formatBase64Image(user?.deliveryman?.vihicle_inspection) || "");
    setVehicleInsuranceImage(formatBase64Image(user?.deliveryman?.vihicle_Insurance) || "");
    setProofOfAddressImage(formatBase64Image(user?.deliveryman?.Proof_of_Address) || "");
  }, [user]);

  const [subcategories, setSubcategories] = useState<{ label: string, value: string, pricingMode?: string, description?: string }[]>([]);

  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const data = await getProviderSubcategories();
        const formatted = data.map((item: any) => ({
          label: item.name,
          value: item._id,
          pricingMode: item.pricingMode,
          description: item.description,
          vehicleTypes: item.vehicleTypes ? item.vehicleTypes.map((v: any) => v.name).join(', ') : ''
        }));
        setSubcategories(formatted);
      } catch (error) {
        console.error("Erro ao carregar subcategorias", error);
      }
    };
    fetchSubcategories();
  }, []);

  // Valores iniciais do formulário
  const initialValues = {
    name: user?.name || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber?.toString() || "",
    transport_type: user?.deliveryman?.transport_type || "",
    transport_color: user?.deliveryman?.transport_color || "",
    transport_registration: user?.deliveryman?.transport_registration || "",
    assigned_base_fee: user?.deliveryman?.assigned_base_fee?.toString() || "",
    document_type: user?.deliveryman?.document_type || "BI",
    Proof_of_Addres_Reason: user?.deliveryman?.Proof_of_Addres_Reason || "",
    hasHelpers: user?.deliveryman?.hasHelpers || false,
    helperCount: user?.deliveryman?.helperCount?.toString() || "0",
    eMolaNumber: user?.deliveryman?.transferPreferences?.eMolaNumber || "",
    mPesaNumber: user?.deliveryman?.transferPreferences?.mPesaNumber || "",
  };

  // ✅ FUNÇÃO PARA VISUALIZAR IMAGEM EM TELA CHEIA
  const openImageFullScreen = (imageUri: string) => {
    if (!imageUri) return;
    setSelectedImage(imageUri);
    setImageModalVisible(true);
  };

  // ✅ FUNÇÃO PARA SELECIONAR IMAGEM
  const pickImage = async (setImageFunction: (uri: string) => void) => {
    try {
      setUploadingImage(true);
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showMessage({
        message: "Permissão necessária",
        description: "Precisa de permitir acesso às fotos!",
        type: "info",
        icon: "auto",
        duration: 3000,
      });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImageFunction(base64Image);
      }
    } catch (error) {
      console.error("❌ Erro ao selecionar imagem:", error);
      showMessage({
        message: "Erro",
        description: "Não foi possível selecionar a imagem",
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // ✅ FUNÇÃO PARA TIRAR FOTO
  const takePhoto = async (setImageFunction: (uri: string) => void) => {
    try {
      setUploadingImage(true);
      
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        showMessage({
        message: "Permissão necessária",
        description: "Precisa de permitir acesso à câmera!",
        type: "info",
        icon: "auto",
        duration: 3000,
      });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImageFunction(base64Image);
      }
    } catch (error) {
      console.error("❌ Erro ao tirar foto:", error);
      showMessage({
        message: "Erro",
        description: "Não foi possível tirar a foto",
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // ✅ FUNÇÃO PARA REMOVER IMAGEM
  const removeImage = (setImageFunction: (uri: string) => void) => {
    Alert.alert(
      "Remover Imagem",
      "Tem certeza que deseja remover esta imagem?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => setImageFunction("")
        },
      ]
    );
  };

  // ✅ FUNÇÃO PARA SALVAR ALTERAÇÕES (VERSÃO ATUALIZADA)
const handleSave = async (values: any) => {
    try {
      setLoading(true);
  
      // Atualizar dados básicos do user (sem aprovação necessária)
      await updateUser({
        email: values.email,
        phoneNumber: parseInt(values.phoneNumber),
      });
  
      // Se for motorista, enviar solicitação de atualização
      if (user?.isDeliveryMan) {
        const deliverymanData = {
          phoneNumber: parseInt(values.phoneNumber),
          transport_type: values.transport_type,
          transport_color: values.transport_color,
          transport_registration: values.transport_registration,
          assigned_base_fee: values.assigned_base_fee ? parseFloat(values.assigned_base_fee) : null,
          document_type: values.document_type,
          Proof_of_Addres_Reason: values.Proof_of_Addres_Reason,
          // Imagens
          photo: profileImage,
          vihicle_picture: vehicleImage,
          vihicle_picture_front: vehicleFrontImage,
          vihicle_picture_back: vehicleBackImage,
          license_front: licenseFrontImage,
          license_back: licenseBackImage,
          document_front: documentFrontImage,
          document_back: documentBackImage,
          vihicle_inspection: vehicleInspectionImage,
          vihicle_Insurance: vehicleInsuranceImage,
          Proof_of_Address: proofOfAddressImage,
          userId: user._id,
          isDeliveryMan: true,
          hasHelpers: values.hasHelpers,
          helperCount: parseInt(values.helperCount) || 0,
          mPesaNumber: values.mPesaNumber,
          eMolaNumber: values.eMolaNumber,
        };
  
    
  
        // ✅ OPÇÃO 1: Enviar com objeto user completo do contexto
        const userData = await updateDeliverymanRequest(deliverymanData, user);
        
        // ✅ OPÇÃO 2: Enviar apenas o necessário
        // const userData = await updateDeliverymanRequestSimple(deliverymanData, user);
          
        const isTransportTypeChanging = values.transport_type && values.transport_type !== user?.deliveryman?.transport_type;
        if (isTransportTypeChanging) {
          Alert.alert(
            "✅ Sucesso", 
            `O seu perfil foi atualizado. A alteração da categoria de serviço foi enviada para aprovação do administrador.`
          );
        } else {
          Alert.alert(
            "✅ Sucesso", 
            `O seu perfil e/ou documentos foram atualizados com sucesso.`
          );
        }
  
        // ✅ ATUALIZAR CONTEXTO LOCALMENTE (opcional)
        // Isso mantém a UI atualizada enquanto aguarda aprovação
        updateDeliveryman(deliverymanData);
        
      } else {
        showMessage({
        message: "✅ Sucesso",
        description: "Perfil atualizado com sucesso!",
        type: "success",
        icon: "auto",
        duration: 3000,
      });
      }
      
      navigation.goBack();
      
    } catch (error: any) {
      console.error("❌ Erro ao salvar:", error);
      
      // ✅ MELHOR TRATAMENTO DE ERRO
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          "Não foi possível enviar a solicitação de atualização";
      
      showMessage({
        message: "❌ Erro",
        description: errorMessage,
        type: "danger",
        icon: "auto",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ COMPONENTE DE UPLOAD DE IMAGEM LADO A LADO COM FOTOS GRANDES
  const ImageUploadRow = ({ 
    leftTitle, 
    leftImage, 
    onLeftPickImage, 
    onLeftTakePhoto,
    rightTitle, 
    rightImage, 
    onRightPickImage, 
    onRightTakePhoto,
    required = false
  }: any) => (
    <View style={styles.imageRow}>
      {/* Imagem da Esquerda */}
      <View style={styles.imageColumn}>
        <Text style={styles.imageUploadTitle}>
          {leftTitle} {required && <Text style={styles.required}>*</Text>}
        </Text>
        
        <TouchableOpacity 
          style={styles.largeImageContainer}
          onPress={() => leftImage && openImageFullScreen(leftImage)}
          onLongPress={() => removeImage(onLeftPickImage)}
        >
          {leftImage ? (
            <View style={styles.imageWithActions}>
              <Image 
                source={{ uri: leftImage }} 
                style={styles.largePreviewImage}
              />
              <View style={styles.imageOverlay}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => openImageFullScreen(leftImage)}
                >
                  <Ionicons name="expand" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => removeImage(onLeftPickImage)}
                >
                  <Ionicons name="trash" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noImageLargeContainer}>
              <Ionicons name="image-outline" size={40} color="#CCCCCC" />
              <Text style={styles.imagePlaceholder}>Sem imagem</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.imageActionButtons}>
          <TouchableOpacity 
            style={styles.imageActionButton}
            onPress={() => onLeftPickImage()}
            disabled={uploadingImage}
          >
            <Ionicons name="image-outline" size={16} color={COLORS.primary} />
            <Text style={styles.imageActionButtonText}>Galeria</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.imageActionButton}
            onPress={() => onLeftTakePhoto()}
            disabled={uploadingImage}
          >
            <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
            <Text style={styles.imageActionButtonText}>Câmera</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Imagem da Direita */}
      <View style={styles.imageColumn}>
        <Text style={styles.imageUploadTitle}>
          {rightTitle} {required && <Text style={styles.required}>*</Text>}
        </Text>
        
        <TouchableOpacity 
          style={styles.largeImageContainer}
          onPress={() => rightImage && openImageFullScreen(rightImage)}
          onLongPress={() => removeImage(onRightPickImage)}
        >
          {rightImage ? (
            <View style={styles.imageWithActions}>
              <Image 
                source={{ uri: rightImage }} 
                style={styles.largePreviewImage}
              />
              <View style={styles.imageOverlay}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => openImageFullScreen(rightImage)}
                >
                  <Ionicons name="expand" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => removeImage(onRightPickImage)}
                >
                  <Ionicons name="trash" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noImageLargeContainer}>
              <Ionicons name="image-outline" size={40} color="#CCCCCC" />
              <Text style={styles.imagePlaceholder}>Sem imagem</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.imageActionButtons}>
          <TouchableOpacity 
            style={styles.imageActionButton}
            onPress={() => onRightPickImage()}
            disabled={uploadingImage}
          >
            <Ionicons name="image-outline" size={16} color={COLORS.primary} />
            <Text style={styles.imageActionButtonText}>Galeria</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.imageActionButton}
            onPress={() => onRightTakePhoto()}
            disabled={uploadingImage}
          >
            <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
            <Text style={styles.imageActionButtonText}>Câmera</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ✅ COMPONENTE DE UPLOAD SIMPLES COM FOTO GRANDE
  const ImageUpload = ({ 
    title, 
    image, 
    onPickImage, 
    onTakePhoto,
    required = false
  }: any) => (
    <View style={styles.imageUploadContainer}>
      <Text style={styles.imageUploadTitle}>
        {title} {required && <Text style={styles.required}>*</Text>}
      </Text>
      
      <TouchableOpacity 
        style={styles.largeImageContainer}
        onPress={() => image && openImageFullScreen(image)}
        onLongPress={() => removeImage(onPickImage)}
      >
        {image ? (
          <View style={styles.imageWithActions}>
            <Image 
              source={{ uri: image }} 
              style={styles.largePreviewImage}
            />
            <View style={styles.imageOverlay}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => openImageFullScreen(image)}
              >
                <Ionicons name="expand" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => removeImage(onPickImage)}
              >
                <Ionicons name="trash" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noImageLargeContainer}>
            <Ionicons name="image-outline" size={50} color="#CCCCCC" />
            <Text style={styles.imagePlaceholder}>Nenhuma imagem selecionada</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.imageActionButtons}>
        <TouchableOpacity 
          style={styles.imageActionButton}
          onPress={() => onPickImage()}
          disabled={uploadingImage}
        >
          <Ionicons name="image-outline" size={16} color={COLORS.primary} />
          <Text style={styles.imageActionButtonText}>Galeria</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.imageActionButton}
          onPress={() => onTakePhoto()}
          disabled={uploadingImage}
        >
          <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
          <Text style={styles.imageActionButtonText}>Câmera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ✅ MODAL PARA VISUALIZAÇÃO DE IMAGEM EM TELA CHEIA
  const ImageFullScreenModal = () => (
    <Modal
      visible={imageModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setImageModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity 
          style={styles.modalCloseButton}
          onPress={() => setImageModalVisible(false)}
        >
          <Ionicons name="close" size={30} color="#FFF" />
        </TouchableOpacity>
        
        {selectedImage && (
          <Image 
            source={{ uri: selectedImage }} 
            style={styles.fullScreenImage}
            contentFit="contain"
          />
        )}
        
        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={styles.modalActionButton}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close-circle" size={24} color="#FFF" />
            <Text style={styles.modalActionText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAwareScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSave}
      >
        {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
          <View style={styles.form}>
            {/* Informações Pessoais */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informações Pessoais</Text>
              
              {/* NOME - APENAS LEITURA */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Completo</Text>
                <View style={styles.readOnlyInput}>
                  <Text style={styles.readOnlyText}>{values.name}</Text>
                  <Ionicons name="lock-closed" size={16} color="#999" />
                </View>
                <Text style={styles.readOnlyNote}>O nome não pode ser alterado</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.email && touched.email && styles.inputError
                  ]}
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                />
                {errors.email && touched.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefone *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.phoneNumber && touched.phoneNumber && styles.inputError
                  ]}
                  placeholder="841234567"
                  keyboardType="phone-pad"
                  maxLength={9}
                  value={values.phoneNumber}
                  onChangeText={handleChange('phoneNumber')}
                  onBlur={handleBlur('phoneNumber')}
                />
                {errors.phoneNumber && touched.phoneNumber && (
                  <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                )}
              </View>

              {/* Foto de Perfil GRANDE */}
              <ImageUpload
                title="Foto de Perfil"
                image={profileImage}
                onPickImage={() => pickImage(setProfileImage)}
                onTakePhoto={() => takePhoto(setProfileImage)}
              />
            </View>

            {/* ✅ SECÇÃO APENAS PARA MOTORISTAS */}
            {user?.isDeliveryMan && (
              <>
                {/* Preferências de Transferência */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Preferências de Transferência (Opcional)</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Número M-Pesa</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: 84..."
                      keyboardType="phone-pad"
                      value={values.mPesaNumber}
                      onChangeText={handleChange('mPesaNumber')}
                      onBlur={handleBlur('mPesaNumber')}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Número e-Mola</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: 86..."
                      keyboardType="phone-pad"
                      value={values.eMolaNumber}
                      onChangeText={handleChange('eMolaNumber')}
                      onBlur={handleBlur('eMolaNumber')}
                    />
                  </View>
                </View>

                {/* Informações do Veículo */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Informações do Veículo</Text>
                  
                  <SelectField
                    label="Tipo de Veículo / Serviço"
                    field="transport_type"
                    value={values.transport_type}
                    options={subcategories.length > 0 ? subcategories : [{ label: values.transport_type || 'N/A', value: values.transport_type }]}
                    onChange={(field, val) => setFieldValue('transport_type', val)}
                  />
                  
                  {values.transport_type && subcategories.find(s => s.value === values.transport_type)?.description && (
                      <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                          <Text style={{ fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginBottom: 4 }}>
                              {subcategories.find(s => s.value === values.transport_type)?.description}
                          </Text>
                          {(subcategories as any).find((s: any) => s.value === values.transport_type)?.vehicleTypes ? (
                              <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: 'bold' }}>
                                  Tipos de Viatura Associados: <Text style={{ fontWeight: 'normal' }}>{(subcategories as any).find((s: any) => s.value === values.transport_type)?.vehicleTypes}</Text>
                              </Text>
                          ) : null}
                      </View>
                  )}

                  {/* Preço Base do Serviço (Se aplicável) */}
                  {subcategories.find(s => s.label === values.transport_type || s.value === values.transport_type)?.pricingMode === 'PROVIDER_DEFINED' && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Valor do serviço que presta (MZN)</Text>
                      <View style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}>
                        <MaterialCommunityIcons name="cash-multiple" size={20} color="#9ca3af" style={{ marginRight: 10 }} />
                        <TextInput
                          style={{ flex: 1, fontSize: 15 }}
                          placeholder="Ex: 500"
                          keyboardType="numeric"
                          onChangeText={handleChange('assigned_base_fee')}
                          onBlur={handleBlur('assigned_base_fee')}
                          value={values.assigned_base_fee}
                        />
                      </View>
                    </View>
                  )}

                  {/* Preço Personalizado */}
                  <View style={styles.inputGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
                      <Text style={[styles.label, { marginBottom: 0 }]}>Definir o meu próprio preço</Text>
                      <Switch
                        value={allowCustomPrice}
                        disabled={subcategories.find(s => s.label === values.transport_type || s.value === values.transport_type)?.pricingMode !== 'PROVIDER_DEFINED'}
                        onValueChange={async (val) => {
                          setAllowCustomPrice(val);
                          try {
                            const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken');
                            await fetch(`${API_BASE_URL}/drivers/price-request/toggle`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ allowCustomPrice: val }),
                            });
                            if (updateUser) updateUser({ ...user, deliveryman: { ...user.deliveryman, allowCustomPrice: val } });
                          } catch (e) { /* ignore */ }
                        }}
                        trackColor={{ false: '#E5E7EB', true: COLORS.primary }}
                        thumbColor="#fff"
                      />
                    </View>

                    {allowCustomPrice && subcategories.find(s => s.label === values.transport_type || s.value === values.transport_type)?.pricingMode === 'PROVIDER_DEFINED' ? (
                      <View>
                        {/* Estado do pedido */}
                        {priceStatus === 'Pendente' && (
                          <View style={{ backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                            <Text style={{ color: '#92400E', fontWeight: '600', fontSize: 13 }}>🕐 Aguardando aprovação: {pendingPrice} MT</Text>
                          </View>
                        )}
                        {priceStatus === 'Aprovado' && (
                          <View style={{ backgroundColor: '#D1FAE5', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                            <Text style={{ color: '#065F46', fontWeight: '600', fontSize: 13 }}>✅ Preço aprovado: {user?.deliveryman?.customPrice} MT</Text>
                          </View>
                        )}
                        {priceStatus === 'Rejeitado' && (
                          <View style={{ backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                            <Text style={{ color: '#991B1B', fontWeight: '600', fontSize: 13 }}>❌ Rejeitado</Text>
                            {rejectionReason ? <Text style={{ color: '#7F1D1D', fontSize: 12, marginTop: 2 }}>Motivo: {rejectionReason}</Text> : null}
                          </View>
                        )}

                        {/* Input + botão de submissão */}
                        <Text style={[styles.label, { marginBottom: 6 }]}>Novo Preço (MT)</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Ex: 500"
                            keyboardType="numeric"
                            value={customPriceInput}
                            onChangeText={setCustomPriceInput}
                            editable={priceStatus !== 'Pendente'}
                          />
                          <TouchableOpacity
                            style={{
                              backgroundColor: COLORS.primary,
                              borderRadius: 8,
                              paddingHorizontal: 16,
                              justifyContent: 'center',
                              opacity: submittingPrice || !customPriceInput || priceStatus === 'Pendente' ? 0.5 : 1,
                            }}
                            disabled={submittingPrice || !customPriceInput || priceStatus === 'Pendente'}
                            onPress={async () => {
                              const price = parseFloat(customPriceInput);
                              if (!price || price <= 0) return;
                              setSubmittingPrice(true);
                              try {
                                const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken');
                                const res = await fetch(`${API_BASE_URL}/drivers/price-request`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ requestedPrice: price }),
                                });
                                if (res.ok) {
                                  if (updateUser) updateUser({ ...user, deliveryman: { ...user.deliveryman, priceRequestStatus: 'Pendente', pendingCustomPrice: price } });
                                  showMessage({ message: '✅ Pedido enviado!', description: 'Aguardando aprovação do admin.', type: 'success', duration: 3500 });
                                } else {
                                  const d = await res.json();
                                  showMessage({ message: 'Erro', description: d.message || 'Erro ao submeter pedido.', type: 'danger', duration: 3500 });
                                }
                              } catch (e) {
                                showMessage({ message: 'Erro', description: 'Sem conexão.', type: 'danger', duration: 3000 });
                              } finally {
                                setSubmittingPrice(false);
                              }
                            }}
                          >
                            {submittingPrice
                              ? <ActivityIndicator size="small" color="#fff" />
                              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Solicitar</Text>}
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>O preço fica ativo após aprovação do administrador.</Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
                        <Text style={{ color: '#6B7280', fontSize: 13 }}>💡 Preço calculado automaticamente pela plataforma com base na distância e tarifas vigentes.</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Cor</Text>
                    <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, overflow: 'hidden', backgroundColor: '#F8FAFC' }}>
                      <Picker
                        selectedValue={values.transport_color}
                        onValueChange={handleChange('transport_color')}
                        style={{ height: 50, width: '100%', color: '#0F172A' }}
                        dropdownIconColor="#0F172A"
                      >
                        <Picker.Item label="Selecione a cor" value="" />
                        <Picker.Item label="Branco" value="Branco" />
                        <Picker.Item label="Preto" value="Preto" />
                        <Picker.Item label="Cinza" value="Cinza" />
                        <Picker.Item label="Prata" value="Prata" />
                        <Picker.Item label="Vermelho" value="Vermelho" />
                        <Picker.Item label="Azul" value="Azul" />
                        <Picker.Item label="Amarelo" value="Amarelo" />
                        <Picker.Item label="Verde" value="Verde" />
                        <Picker.Item label="Laranja" value="Laranja" />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Matrícula</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: AB-123-CD"
                      value={values.transport_registration}
                      onChangeText={handleChange('transport_registration')}
                      onBlur={handleBlur('transport_registration')}
                    />
                  </View>

                  {/* Foto do Veículo GRANDE */}
                  {docUpdateStatus !== 'Aprovado' ? (
                     <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginTop: 10 }}>
                       <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>Desbloqueie a edição de documentos abaixo para alterar a foto do veículo.</Text>
                     </View>
                  ) : (
                    <View>
                      <ImageUpload
                        title="Foto do Veículo"
                        image={vehicleImage}
                        onPickImage={() => pickImage(setVehicleImage)}
                        onTakePhoto={() => takePhoto(setVehicleImage)}
                      />
                      <ImageUpload
                        title="Frente (C/ Matrícula)"
                        image={vehicleFrontImage}
                        onPickImage={() => pickImage(setVehicleFrontImage)}
                        onTakePhoto={() => takePhoto(setVehicleFrontImage)}
                      />
                      <ImageUpload
                        title="Trás (C/ Matrícula)"
                        image={vehicleBackImage}
                        onPickImage={() => pickImage(setVehicleBackImage)}
                        onTakePhoto={() => takePhoto(setVehicleBackImage)}
                      />
                    </View>
                  )}
                </View>

                {/* Informações Adicionais */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Informações Adicionais</Text>

                  <View style={[styles.inputGroup, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={[styles.label, { marginBottom: 0 }]}>Possui Ajudantes? (Ex: Para Mudanças)</Text>
                    <Switch
                      value={values.hasHelpers}
                      onValueChange={(val) => setFieldValue('hasHelpers', val)}
                      trackColor={{ false: "#ccc", true: COLORS.primary }}
                      thumbColor="#fff"
                    />
                  </View>

                  {values.hasHelpers && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Número de Ajudantes</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: 2"
                        keyboardType="numeric"
                        value={values.helperCount}
                        onChangeText={handleChange('helperCount')}
                        onBlur={handleBlur('helperCount')}
                      />
                    </View>
                  )}
                </View>

                {/* Documentação - LADO A LADO COM FOTOS GRANDES */}
                <View style={styles.section}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Documentação</Text>
                    {docUpdateStatus === 'Pendente' && (
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: '#92400E', fontSize: 11, fontWeight: 'bold' }}>Aguardando Aprovação</Text>
                      </View>
                    )}
                    {docUpdateStatus === 'Aprovado' && (
                      <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: '#065F46', fontSize: 11, fontWeight: 'bold' }}>Edição Liberada</Text>
                      </View>
                    )}
                  </View>

                  {docUpdateStatus !== 'Aprovado' ? (
                    <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 8, alignItems: 'center' }}>
                      <Ionicons name="lock-closed-outline" size={32} color="#6B7280" style={{ marginBottom: 8 }} />
                      <Text style={{ color: '#4B5563', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
                        Sua documentação já foi enviada. Para alterar os seus documentos de identificação ou da viatura, é necessário pedir permissão.
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, opacity: submittingDocRequest || docUpdateStatus === 'Pendente' ? 0.6 : 1 }}
                        disabled={submittingDocRequest || docUpdateStatus === 'Pendente'}
                        onPress={async () => {
                          setSubmittingDocRequest(true);
                          try {
                            const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken');
                            const res = await fetch(`${API_BASE_URL}/drivers/doc-update-request`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            });
                            if (res.ok) {
                              if (updateUser) updateUser({ ...user, deliveryman: { ...user.deliveryman, docUpdateStatus: 'Pendente' } });
                              showMessage({ message: '✅ Pedido enviado!', description: 'Aguardando aprovação do admin para desbloquear os campos.', type: 'success', duration: 4000 });
                            } else {
                              const d = await res.json();
                              showMessage({ message: 'Erro', description: d.message || 'Erro ao pedir.', type: 'danger' });
                            }
                          } catch (e) {
                            showMessage({ message: 'Erro', description: 'Sem conexão.', type: 'danger' });
                          } finally {
                            setSubmittingDocRequest(false);
                          }
                        }}
                      >
                        {submittingDocRequest ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Solicitar Atualização</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={{ backgroundColor: '#E0F2FE', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                        <Text style={{ color: '#0284C7', fontSize: 13, textAlign: 'center' }}>Você tem permissão para anexar os seus novos documentos. Ao salvar as alterações, a permissão será consumida e seus novos documentos serão submetidos para revisão.</Text>
                      </View>
                      
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tipo de Documento</Text>
                        <View style={styles.radioGroup}>
                          {['BI', 'Passaporte', 'Cédula Pessoal'].map((docType) => (
                            <TouchableOpacity
                              key={docType}
                              style={styles.radioOption}
                              onPress={() => handleChange('document_type')(docType)}
                            >
                              <View style={[
                                styles.radioCircle,
                                values.document_type === docType && styles.radioCircleSelected
                              ]}>
                                {values.document_type === docType && (
                                  <View style={styles.radioInnerCircle} />
                                )}
                              </View>
                              <Text style={styles.radioText}>{docType}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Carta de Condução - LADO A LADO COM FOTOS GRANDES */}
                      <ImageUploadRow
                        leftTitle="Carta Condução (Frente)"
                        leftImage={licenseFrontImage}
                        onLeftPickImage={() => pickImage(setLicenseFrontImage)}
                        onLeftTakePhoto={() => takePhoto(setLicenseFrontImage)}
                        rightTitle="Carta Condução (Verso)"
                        rightImage={licenseBackImage}
                        onRightPickImage={() => pickImage(setLicenseBackImage)}
                        onRightTakePhoto={() => takePhoto(setLicenseBackImage)}
                        required
                      />

                      {/* Documento - LADO A LADO COM FOTOS GRANDES */}
                      <ImageUploadRow
                        leftTitle={`${values.document_type || 'BI'} (Frente)`}
                        leftImage={documentFrontImage}
                        onLeftPickImage={() => pickImage(setDocumentFrontImage)}
                        onLeftTakePhoto={() => takePhoto(setDocumentFrontImage)}
                        rightTitle={`${values.document_type || 'BI'} (Verso)`}
                        rightImage={documentBackImage}
                        onRightPickImage={() => pickImage(setDocumentBackImage)}
                        onRightTakePhoto={() => takePhoto(setDocumentBackImage)}
                        required
                      />
                    </>
                  )}
                </View>

                {/* Seguros e Inspeções - LADO A LADO COM FOTOS GRANDES */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Seguros e Inspeções</Text>
                  
                  {docUpdateStatus !== 'Aprovado' ? (
                     <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
                       <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>Desbloqueie a edição de documentos acima para alterar estes anexos.</Text>
                     </View>
                  ) : (
                    <ImageUploadRow
                      leftTitle="Inspeção do Veículo"
                      leftImage={vehicleInspectionImage}
                      onLeftPickImage={() => pickImage(setVehicleInspectionImage)}
                      onLeftTakePhoto={() => takePhoto(setVehicleInspectionImage)}
                      rightTitle="Seguro do Veículo"
                      rightImage={vehicleInsuranceImage}
                      onRightPickImage={() => pickImage(setVehicleInsuranceImage)}
                      onRightTakePhoto={() => takePhoto(setVehicleInsuranceImage)}
                    />
                  )}
                </View>

                {/* Comprovativo de Morada */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Comprovativo de Morada</Text>
                  
                  {docUpdateStatus !== 'Aprovado' ? (
                     <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
                       <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>Desbloqueie a edição de documentos acima para alterar o comprovativo de morada.</Text>
                     </View>
                  ) : (
                    <>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tipo de Comprovativo</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: Fatura de luz, água, etc."
                          value={values.Proof_of_Addres_Reason}
                          onChangeText={handleChange('Proof_of_Addres_Reason')}
                          onBlur={handleBlur('Proof_of_Addres_Reason')}
                        />
                      </View>

                      <ImageUpload
                        title="Comprovativo de Morada"
                        image={proofOfAddressImage}
                        onPickImage={() => pickImage(setProofOfAddressImage)}
                        onTakePhoto={() => takePhoto(setProofOfAddressImage)}
                      />
                    </>
                  )}
                </View>
              </>
            )}

            {/* Botões */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar Alterações</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Formik>

      {/* Modal para visualização de imagem em tela cheia */}
      <ImageFullScreenModal />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 40, // Assuming SafeArea context
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 8,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.5,
  },
  headerPlaceholder: {
    width: 44,
  },
  form: {
    padding: 16,
  },
  section: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    gap: 16,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
  },
  readOnlyInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#F1F5F9",
  },
  readOnlyText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: '500',
  },
  readOnlyNote: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: 6,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  required: {
    color: "#EF4444",
  },
  imageRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  imageColumn: {
    flex: 1,
  },
  imageUploadContainer: {
    marginBottom: 24,
  },
  imageUploadTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  largeImageContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  largePreviewImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  imageWithActions: {
    position: "relative",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 12,
    opacity: 0,
  },
  actionButton: {
    padding: 10,
    marginLeft: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  noImageLargeContainer: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  imagePlaceholder: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: '500',
    textAlign: "center",
    marginTop: 12,
  },
  imageActionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: '#F3F0FF',
    borderRadius: 12,
    gap: 8,
  },
  imageActionButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  radioGroup: {
    flexDirection: "row",
    gap: 20,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#FFF',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: "#334155",
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
    marginBottom: 90,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cancelButton: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 0,
    shadowOpacity: 0,
  },
  cancelButtonText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  }
});
