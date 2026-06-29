// @ts-nocheck
import { showMessage } from "react-native-flash-message";
// screens/EditProfileScreen.tsx - CÓDIGO COMPLETO COM FOTOS GRANDES
import React, { useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { Formik } from "formik";
import * as Yup from "yup";
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from "../styles/colors";
import { useAuth } from "../context/AuthContext";
import { updateDeliverymanRequest } from "../services/deliveryService";
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
  const { user, updateUser, updateDeliveryman } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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
  const [licenseFrontImage, setLicenseFrontImage] = useState(formatBase64Image(user?.deliveryman?.license_front) || "");
  const [licenseBackImage, setLicenseBackImage] = useState(formatBase64Image(user?.deliveryman?.license_back) || "");
  const [documentFrontImage, setDocumentFrontImage] = useState(formatBase64Image(user?.deliveryman?.document_front) || "");
  const [documentBackImage, setDocumentBackImage] = useState(formatBase64Image(user?.deliveryman?.document_back) || "");
  const [vehicleInspectionImage, setVehicleInspectionImage] = useState(formatBase64Image(user?.deliveryman?.vihicle_inspection) || "");
  const [vehicleInsuranceImage, setVehicleInsuranceImage] = useState(formatBase64Image(user?.deliveryman?.vihicle_Insurance) || "");
  const [proofOfAddressImage, setProofOfAddressImage] = useState(formatBase64Image(user?.deliveryman?.Proof_of_Address) || "");

  // ✅ EFFECT PARA ATUALIZAR IMAGENS QUANDO USER MUDAR
  useEffect(() => {
    setProfileImage(formatBase64Image(user?.deliveryman?.photo) || "");
    setVehicleImage(formatBase64Image(user?.deliveryman?.vihicle_picture) || "");
    setLicenseFrontImage(formatBase64Image(user?.deliveryman?.license_front) || "");
    setLicenseBackImage(formatBase64Image(user?.deliveryman?.license_back) || "");
    setDocumentFrontImage(formatBase64Image(user?.deliveryman?.document_front) || "");
    setDocumentBackImage(formatBase64Image(user?.deliveryman?.document_back) || "");
    setVehicleInspectionImage(formatBase64Image(user?.deliveryman?.vihicle_inspection) || "");
    setVehicleInsuranceImage(formatBase64Image(user?.deliveryman?.vihicle_Insurance) || "");
    setProofOfAddressImage(formatBase64Image(user?.deliveryman?.Proof_of_Address) || "");
  }, [user]);

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        };
  
    
  
        // ✅ OPÇÃO 1: Enviar com objeto user completo do contexto
        const userData = await updateDeliverymanRequest(deliverymanData, user);
        
        // ✅ OPÇÃO 2: Enviar apenas o necessário
        // const userData = await updateDeliverymanRequestSimple(deliverymanData, user);
          
        Alert.alert(
          "✅ Solicitação Enviada", 
          `Suas alterações foram enviadas para aprovação administrativa. \nID da solicitação: ${userData.data.requestId}`
        );
  
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
            resizeMode="contain"
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
                {/* Informações do Veículo */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Informações do Veículo</Text>
                  
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.label}>Tipo de Veículo</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: Carro, Mota"
                        value={values.transport_type}
                        onChangeText={handleChange('transport_type')}
                        onBlur={handleBlur('transport_type')}
                      />
                    </View>

                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.label}>Preço Base (MT)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: 500"
                        keyboardType="numeric"
                        value={values.assigned_base_fee}
                        onChangeText={handleChange('assigned_base_fee')}
                        onBlur={handleBlur('assigned_base_fee')}
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.label}>Cor</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: Azul"
                        value={values.transport_color}
                        onChangeText={handleChange('transport_color')}
                        onBlur={handleBlur('transport_color')}
                      />
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
                  <ImageUpload
                    title="Foto do Veículo"
                    image={vehicleImage}
                    onPickImage={() => pickImage(setVehicleImage)}
                    onTakePhoto={() => takePhoto(setVehicleImage)}
                  />
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
                  <Text style={styles.sectionTitle}>Documentação</Text>
                  
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
                    leftTitle={`${values.document_type} (Frente)`}
                    leftImage={documentFrontImage}
                    onLeftPickImage={() => pickImage(setDocumentFrontImage)}
                    onLeftTakePhoto={() => takePhoto(setDocumentFrontImage)}
                    rightTitle={`${values.document_type} (Verso)`}
                    rightImage={documentBackImage}
                    onRightPickImage={() => pickImage(setDocumentBackImage)}
                    onRightTakePhoto={() => takePhoto(setDocumentBackImage)}
                    required
                  />
                </View>

                {/* Seguros e Inspeções - LADO A LADO COM FOTOS GRANDES */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Seguros e Inspeções</Text>
                  
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
                </View>

                {/* Comprovativo de Morada */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Comprovativo de Morada</Text>
                  
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
    backgroundColor: COLORS.gray50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  headerPlaceholder: {
    width: 40,
  },
  form: {
    padding: 16,
  },
  section: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFF",
  },
  // Estilo para campo de nome (apenas leitura)
  readOnlyInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F8F8F8",
  },
  readOnlyText: {
    fontSize: 16,
    color: "#666",
  },
  readOnlyNote: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    marginTop: 4,
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
  },
  required: {
    color: "#FF3B30",
  },
  // Estilos para upload de imagens em linha COM FOTOS GRANDES
  imageRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  imageColumn: {
    flex: 1,
  },
  imageUploadContainer: {
    marginBottom: 20,
  },
  imageUploadTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  // Container para imagens grandes
  largeImageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F8F8F8",
  },
  largePreviewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
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
    backgroundColor: "rgba(0,0,0,0.3)",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 8,
    opacity: 0,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
  noImageLargeContainer: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    borderRadius: 12,
  },
  imagePlaceholder: {
    color: "#999",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  imageActionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    gap: 6,
  },
  imageActionButtonText: {
    color: COLORS.primary,
    fontWeight: "500",
    fontSize: 14,
  },
  // Estilos para radio buttons
  radioGroup: {
    flexDirection: "row",
    gap: 16,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInnerCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  radioText: {
    fontSize: 14,
    color: "#1A1A1A",
  },
  // Botões
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 80,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
  // Modal para imagem em tela cheia
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  modalActions: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    gap: 20,
  },
  modalActionButton: {
    alignItems: "center",
    padding: 10,
  },
  modalActionText: {
    color: "#FFF",
    fontSize: 12,
    marginTop: 4,
  },
});