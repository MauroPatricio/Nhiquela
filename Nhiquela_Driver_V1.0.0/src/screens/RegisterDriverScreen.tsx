// src/screens/RegisterDriverScreen.tsx
import React, { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    Animated,
    Dimensions,
    StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../styles/colors";
import SelectField from "../components/SelectField";
import { registerDriver } from "../services/deliveryService";
import { useLoading } from '../hooks/useLoading';
import { useLoadingContext } from '../context/LoadingContext';
import * as ImageManipulator from 'expo-image-manipulator';

// Tipagem refinada
interface DriverForm {
    photo: string;
    name: string;
    phoneNumber: string;
    email: string;
    password: string;
    transport_type: string;
    transport_color: string;
    transport_registration: string;
    vihicle_picture: string;
    vihicle_inspection: string;
    vihicle_Insurance: string;
    license_front: string;
    license_back: string;
    document_type: string;
    document_front: string;
    document_back: string;
    Proof_of_Address: string;
}

interface FormErrors {
    [key: string]: string;
}

type Props = {
    navigation: any;
};

const { width } = Dimensions.get("window");

export default function RegisterDriverScreen({ navigation }: Props) {
    const [form, setForm] = useState<DriverForm>({
        photo: "",
        name: "",
        phoneNumber: "",
        email: "",
        password: "",
        transport_type: "",
        transport_color: "",
        transport_registration: "",
        vihicle_picture: "",
        vihicle_inspection: "",
        vihicle_Insurance: "",
        license_front: "",
        license_back: "",
        document_type: "",
        document_front: "",
        document_back: "",
        Proof_of_Address: "",
    });


    const colorOptions = [
        { label: "Branco", value: "branco" },
        { label: "Preto", value: "preto" },
        { label: "Prata", value: "prata" },
        { label: "Cinza", value: "cinza" },
        { label: "Azul", value: "azul" },
        { label: "Vermelho", value: "vermelho" },
        { label: "Verde", value: "verde" },
        { label: "Amarelo", value: "amarelo" },
        { label: "Laranja", value: "laranja" },
        { label: "Marrom", value: "marrom" },
        { label: "Roxo", value: "roxo" },
        { label: "Rosa", value: "rosa" },
        { label: "Dourado", value: "dourado" },
        { label: "Outra", value: "outra" },
    ];

    const documentTypeOptions = [
        { label: "Bilhete de Identidade (BI)", value: "bi" },
        { label: "Passaporte", value: "passport" }
    ];

    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [activeSection, setActiveSection] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showLoading, hideLoading, showUpload, showProcessing, isLoading } = useLoadingContext();

// ✅ FUNÇÃO PARA OTIMIZAR E CONVERTER IMAGENS
const optimizeAndConvertImage = async (uri: string): Promise<string> => {
    try {
      console.log("🖼️ Otimizando imagem:", uri);
      
      // Primeiro obtém informações da imagem original
      const imageInfo = await ImageManipulator.manipulateAsync(uri, []);
      console.log(`📐 Dimensões originais: ${imageInfo.width}x${imageInfo.height}`);
      
      // Calcula novas dimensões (máximo 600px na maior dimensão)
      let newWidth = imageInfo.width;
      let newHeight = imageInfo.height;
      
      if (imageInfo.width > 600 || imageInfo.height > 600) {
        if (imageInfo.width > imageInfo.height) {
          newWidth = 600;
          newHeight = (imageInfo.height * 600) / imageInfo.width;
        } else {
          newHeight = 600;
          newWidth = (imageInfo.width * 600) / imageInfo.height;
        }
      }
      
      console.log(`📐 Novas dimensões: ${Math.round(newWidth)}x${Math.round(newHeight)}`);
      
      // ✅ PRIMEIRA OTIMIZAÇÃO
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: Math.round(newWidth), height: Math.round(newHeight) } },
        ],
        { 
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true
        }
      );
  
      // ✅ VERIFICAÇÃO SEGURA
      if (!manipulatedImage.base64) {
        throw new Error('Falha ao gerar Base64 na primeira otimização');
      }
  
      const base64Data = manipulatedImage.base64.split(',')[1] || manipulatedImage.base64;
      const sizeInKB = Math.round(base64Data.length / 1024);
      
      console.log(`📊 Imagem otimizada: ${sizeInKB} KB`);
      
      // ⚠️ Se ainda estiver muito grande (>500KB), reduz mais
      if (sizeInKB > 500) {
        console.log("🔄 Imagem ainda muito grande, aplicando compressão extra...");
        
        try {
          const furtherCompressed = await ImageManipulator.manipulateAsync(
            uri,
            [
              { resize: { width: 400 } },
            ],
            { 
              compress: 0.3,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true
            }
          );
          
          // ✅ VERIFICAÇÃO DUPLA
          if (!furtherCompressed.base64) {
            console.warn("⚠️ Compressão extra falhou, retornando primeira versão");
            return base64Data;
          }
          
          const newBase64Data = furtherCompressed.base64.split(',')[1] || furtherCompressed.base64;
          const newSizeInKB = Math.round(newBase64Data.length / 1024);
          console.log(`📊 Imagem reotimizada: ${newSizeInKB} KB`);
          
          return newBase64Data; // ✅ Garantido que não é undefined
          
        } catch (compressionError) {
          console.error('❌ Erro na compressão extra:', compressionError);
          return base64Data; // Fallback para primeira versão
        }
      }
      
      return base64Data;
      
    } catch (error) {
      console.error('❌ Erro ao otimizar imagem:', error);
      console.log("🔄 Tentando conversão sem otimização...");
      return convertImageToBase64(uri);
    }
  };
  
  // ✅ ATUALIZE a função convertImageToBase64 existente
  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      console.log("📸 Convertendo imagem para Base64:", uri);
      
      const response = await fetch(uri);
      const blob = await response.blob();
  
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1] || base64;
          const sizeInKB = Math.round(base64Data.length / 1024);
          console.log(`📊 Imagem convertida: ${sizeInKB} KB`);
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ Erro ao converter imagem:', error);
      throw new Error('Falha ao processar imagem');
    }
  };


    // Função para preparar os dados para a API
// ✅ ATUALIZE a função prepareFormData para usar otimização
const prepareFormData = async (): Promise<any> => {
    // Lista de campos que são imagens
    const imageFields: Array<keyof DriverForm> = [
      'photo',
      'vihicle_picture',
      'vihicle_inspection',
      'vihicle_Insurance',
      'license_front',
      'license_back',
      'document_front',
      'document_back',
      'Proof_of_Address'
    ];
  
    // Objeto para armazenar os dados preparados
    const preparedData: any = { 
      ...form,
      isDeliveryMan: true
    };
  
    console.log("🔄 Iniciando otimização de imagens...");
    
    let totalSize = 0;
    
    // ✅ CONVERTE CADA IMAGEM COM OTIMIZAÇÃO
    for (const field of imageFields) {
      if (form[field]) {
        try {
          console.log(`📸 Processando ${field}...`);
          preparedData[field] = await optimizeAndConvertImage(form[field]);
          
          if (preparedData[field]) {
            const fieldSize = Math.round(preparedData[field].length / 1024);
            totalSize += fieldSize;
            console.log(`✅ ${field}: ${fieldSize} KB`);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar ${field}:`, error);
          // ⚠️ Em vez de falhar, continua sem a imagem
          preparedData[field] = null;
          console.log(`⚠️ ${field} definido como null devido a erro`);
        }
      } else {
        preparedData[field] = null;
      }
    }
  
    console.log(`📦 TOTAL de imagens: ${totalSize} KB`);
    console.log(`📦 TOTAL de dados: ${Math.round(JSON.stringify(preparedData).length / 1024)} KB`);
    
    // ⚠️ AVISO se os dados ainda estiverem muito grandes
    const totalDataSize = JSON.stringify(preparedData).length;
    if (totalDataSize > 5 * 1024 * 1024) { // 5MB
      console.warn("⚠️ AVISO: Dados ainda muito grandes (>5MB). Considere reduzir mais as imagens.");
    }
  
    return preparedData;
  };

  // ✅ FUNÇÃO PARA TESTE RÁPIDO (SEM IMAGENS)
const prepareMinimalData = (): any => {
    console.log("🧪 Usando dados MÍNIMOS para teste (sem imagens)");
    
    return {
      name: form.name,
      phoneNumber: form.phoneNumber,
      email: form.email,
      password: form.password,
      transport_type: form.transport_type,
      transport_color: form.transport_color,
      transport_registration: form.transport_registration,
      document_type: form.document_type,
      isDeliveryMan: true,
      
      // ⚠️ IMAGENS COMO null
      photo: null,
      vihicle_picture: null,
      license_front: null,
      license_back: null,
      document_front: null,
      document_back: null,
      vihicle_inspection: null,
      vihicle_Insurance: null,
      Proof_of_Address: null,
    };
  };

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleChange = <K extends keyof DriverForm>(field: K, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));

        // Remove erro quando o usuário começa a digitar
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleBlur = <K extends keyof DriverForm>(field: K) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validateField(field, form[field]);
    };

    const validateField = <K extends keyof DriverForm>(field: K, value: string): string => {
        let error = "";

        switch (field) {
            case "name":
                if (!value.trim()) error = "Nome é obrigatório";
                else if (value.trim().length < 3) error = "Nome deve ter pelo menos 3 caracteres";
                break;

            case "phoneNumber":
                if (!value.trim()) error = "Telefone é obrigatório";
                else if (!/^[\d\s\(\)\-]+$/.test(value)) error = "Telefone deve conter apenas números";
                break;

            case "email":
                if (!value.trim()) error = "Email é obrigatório";
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Email inválido";
                break;

            case "password":
                if (!value) error = "Senha é obrigatória";
                else if (value.length < 6) error = "Senha deve ter pelo menos 6 caracteres";
                break;

            case "transport_type":
                if (!value.trim()) error = "Tipo de transporte é obrigatório";
                break;

            case "transport_color":
                if (!value.trim()) error = "Cor do veículo é obrigatória";
                break;

            case "transport_registration":
                if (!value.trim()) error = "Matrícula/Placa é obrigatória";
                break;

            case "document_type":
                if (!value.trim()) error = "Tipo de documento é obrigatório";
                break;

            case "photo":
                if (!value) error = "Foto do motorista é obrigatória";
                break;

            case "vihicle_picture":
                if (!value) error = "Foto do veículo é obrigatória";
                break;

            case "license_front":
                if (!value) error = "Carta de condução (frente) é obrigatória";
                break;

            case "license_back":
                if (!value) error = "Carta de condução (verso) é obrigatória";
                break;

            case "document_front":
                if (!value) error = "Documento (frente) é obrigatório";
                break;

            case "document_back":
                if (!value) error = "Documento (verso) é obrigatório";
                break;

            default:
                break;
        }

        setErrors(prev => ({ ...prev, [field]: error }));
        return error;
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        // Campos obrigatórios
        const requiredFields: Array<keyof DriverForm> = [
            "name", "phoneNumber", "email", "password",
            "transport_type", "transport_color", "transport_registration",
            "document_type", "photo", "vihicle_picture",
            "license_front", "license_back", "document_front", "document_back"
        ];

        requiredFields.forEach(field => {
            const error = validateField(field, form[field]);
            if (error) {
                newErrors[field] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);

        // Marca todos os campos como tocados para mostrar erros
        const allTouched = requiredFields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {} as Record<string, boolean>);

        setTouched(allTouched);

        return isValid;
    };

    const pickImage = async <K extends keyof DriverForm>(field: K) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para selecionar imagens.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: false,
            // aspect: [4, 3],
        });

        if (!result.canceled) {
            handleChange(field, result.assets[0].uri);
            // Remove erro após selecionar imagem
            if (errors[field]) {
                setErrors(prev => ({ ...prev, [field]: "" }));
            }
        }
    };

    const logSubmissionData = (preparedData: any) => {
        console.log("📤 DADOS ENVIADOS PARA CADASTRO:");
        console.log("==========================================");
        
        // Dados textuais
        const textData = { ...preparedData };
        const imageFields = [
            'photo', 'vihicle_picture', 'license_front', 'license_back', 
            'document_front', 'document_back', 'vihicle_inspection', 
            'vihicle_Insurance', 'Proof_of_Address'
        ];
        
        // Substituir Base64 por informações resumidas
        imageFields.forEach(field => {
            if (textData[field]) {
                textData[field] = `[IMAGEM_BASE64 - ${textData[field].length} chars]`;
            }
        });
        
        console.log(JSON.stringify(textData, null, 2));
        console.log("==========================================");
        
        // Estatísticas
        console.log("📊 ESTATÍSTICAS:");
        imageFields.forEach(field => {
            if (preparedData[field]) {
                const sizeInKB = Math.round(preparedData[field].length / 1024);
                console.log(`   ${field}: ${sizeInKB} KB`);
            }
        });
    };
    
    // No handleSubmit:
    const handleSubmit = async () => {
        if (!validateForm()) {
            Alert.alert('Erro de Validação', 'Por favor, corrija os campos destacados em vermelho antes de enviar.');
            return;
        }
    
        setIsSubmitting(true);
        showLoading('Iniciando cadastro...');
    
        try {
              const preparedData = await prepareFormData();
            
            //   const preparedData = prepareMinimalData();

            logSubmissionData(preparedData);
            
            showProcessing('Enviando dados para o servidor...');
    
            const result = await registerDriver(preparedData);
                
            hideLoading(); // ✅ Esconde spinner no sucesso
    
           Alert.alert(
                "✅ Sucesso",
                "Cadastro do motorista enviado para validação!",
                [
                    { 
                    text: "OK", 
                    onPress: () => navigation.navigate('Login') 
                    }
                ]
);
        
    
        } catch (error: any) {
            console.log("==========================================");
            
            // ✅ CAPTURA TODOS OS DETALHES DO ERRO AXIOS
            if (error.isAxiosError) {
                console.log("🔴 Error Message:", error.message);
                
                // Log completo do erro
                console.log("🔴 Error Object:", JSON.stringify(error, null, 2));
                
            } else if (error instanceof Error) {
                console.log("🔴 ERRO NATIVO:");
                console.log("🔴 Message:", error.message);
                console.log("🔴 Stack:", error.stack);
                console.log("🔴 Name:", error.name);
            } else {
                console.log("🔴 ERRO DESCONHECIDO:", error);
            }
            
            console.log("==========================================");
            console.log("🟡 FIM - DETALHES DO ERRO");
    
            hideLoading(); // ✅ Garante que esconde o spinner
    
            // ✅ MENSAGEM DE ERRO MAIS ESPECÍFICA
            let errorMessage = "Erro ao cadastrar motorista. Tente novamente.";
            
            if (error.isAxiosError) {
                const status = error.response?.status;
                const apiMessage = error.response?.data?.message || error.response?.data?.error;
                
                switch (status) {
                    case 409:
                        errorMessage = apiMessage || "Já existe um cadastro com estes dados (email ou telefone).";
                        break;
                    case 400:
                        errorMessage = apiMessage || "Dados inválidos enviados para o servidor.";
                        break;
                    case 401:
                        errorMessage = "Não autorizado. Faça login novamente.";
                        break;
                    case 403:
                        errorMessage = "Acesso negado.";
                        break;
                    case 404:
                        errorMessage = "Serviço não encontrado. Verifique a URL.";
                        break;
                    case 413:
                        errorMessage = "Dados muito grandes. Reduza o tamanho das imagens.";
                        break;
                    case 500:
                        errorMessage = apiMessage || "Erro interno do servidor. Tente novamente mais tarde.";
                        break;
                    default:
                        errorMessage = apiMessage || `Erro ${status}: Tente novamente.`;
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
    
            Alert.alert(
                "❌ Erro no Cadastro",
                errorMessage,
                [{ text: "Entendi" }]
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const sections = [
        { title: "👤 Dados Pessoais", key: "personal" },
        { title: "🚗 Veículo", key: "vehicle" },
        { title: "📄 Documentos", key: "documents" },
    ];

    const scrollToSection = (index: number) => {
        setActiveSection(index);
        scrollViewRef.current?.scrollTo({ y: index * 500, animated: true });
    };

    // Ícones válidos do Ionicons
    const getIconName = (field: string): keyof typeof Ionicons.glyphMap => {
        const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            name: "person-outline",
            phoneNumber: "call-outline",
            email: "mail-outline",
            password: "lock-closed-outline",
            transport_type: "car-outline",
            transport_color: "color-palette-outline",
            transport_registration: "card-outline",
            document_type: "document-outline",
        };
        return iconMap[field] || "help-outline";
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.primary} />

            {/* Header Fixo */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() =>  navigation.replace('Login')
}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cadastro de Motorista</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* Navegação por Seções */}
            <View style={styles.sectionNav}>
                {sections.map((section, index) => (
                    <TouchableOpacity
                        key={section.key}
                        style={[
                            styles.sectionNavItem,
                            activeSection === index && styles.sectionNavItemActive,
                        ]}
                        onPress={() => scrollToSection(index)}
                    >
                        <Text style={[
                            styles.sectionNavText,
                            activeSection === index && styles.sectionNavTextActive,
                        ]}>
                            {section.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Conteúdo Principal */}
            <Animated.ScrollView
                ref={scrollViewRef}
                style={[styles.scrollView, { opacity: fadeAnim }]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Seção 1: Dados Pessoais */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>👤 Dados Pessoais</Text>

                    <UploadField
                        label="Foto do Motorista *"
                        field="photo"
                        value={form.photo}
                        onPick={pickImage}
                        error={errors.photo}
                        touched={touched.photo}
                    />

                    <InputField
                        label="Nome Completo *"
                        field="name"
                        value={form.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.name}
                        touched={touched.name}
                        icon={getIconName("name")}
                    />
                    <InputField
                        label="Telefone *"
                        field="phoneNumber"
                        value={form.phoneNumber}
                        onChange={(field, value) => {
                            const cleaned = value.replace(/[^0-9]/g, "");
                            if (cleaned.length <= 9) {
                                handleChange(field, cleaned);
                            }
                        }}
                        onBlur={handleBlur}
                        error={errors.phoneNumber}
                        touched={touched.phoneNumber}
                        keyboardType="phone-pad"
                        icon={getIconName("phoneNumber")}
                    />

                    <InputField
                        label="Email *"
                        field="email"
                        value={form.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.email} // ✅ Yup manda o erro
                        touched={touched.email}
                        keyboardType="email-address"
                        icon={getIconName("email")}
                    />

                    <InputField
                        label="Senha *"
                        field="password"
                        value={form.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.password}
                        touched={touched.password}
                        secure
                        icon={getIconName("password")}
                    />
                </View>

                {/* Seção 2: Dados do Veículo */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🚗 Dados do Veículo</Text>

                    <SelectField
                        label="Tipo de Transporte *"
                        field="transport_type"
                        value={form.transport_type}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.transport_type}
                        touched={touched.transport_type}
                        options={[
                            { label: "Motocicleta", value: "motocicleta" },
                            { label: "Carro", value: "carro" },
                            { label: "Caminhão", value: "caminhao" },
                            { label: "Outro", value: "outro" },
                        ]}
                    />

                    <SelectField
                        label="Cor do Veículo *"
                        field="transport_color"
                        value={form.transport_color}
                        options={colorOptions}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.transport_color}
                        touched={touched.transport_color}
                        icon="color-palette-outline"
                    />
                    <InputField
                        label="Matrícula/Placa *"
                        field="transport_registration"
                        value={form.transport_registration}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.transport_registration}
                        touched={touched.transport_registration}
                        icon={getIconName("transport_registration")}
                    />

                    <View style={styles.uploadRow}>
                        <UploadField
                            label="Foto do Veículo *"
                            field="vihicle_picture"
                            value={form.vihicle_picture}
                            onPick={pickImage}
                            error={errors.vihicle_picture}
                            touched={touched.vihicle_picture}
                            compact
                        />
                        <UploadField
                            label="Inspeção"
                            field="vihicle_inspection"
                            value={form.vihicle_inspection}
                            onPick={pickImage}
                            compact
                        />
                        <UploadField
                            label="Seguro"
                            field="vihicle_Insurance"
                            value={form.vihicle_Insurance}
                            onPick={pickImage}
                            compact
                        />
                    </View>
                </View>

                {/* Seção 3: Documentos */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📄 Documentos</Text>

                    <View style={styles.uploadRow}>
                        <UploadField
                            label="Carta Frente *"
                            field="license_front"
                            value={form.license_front}
                            onPick={pickImage}
                            error={errors.license_front}
                            touched={touched.license_front}
                            compact
                        />
                        <UploadField
                            label="Carta Verso *"
                            field="license_back"
                            value={form.license_back}
                            onPick={pickImage}
                            error={errors.license_back}
                            touched={touched.license_back}
                            compact
                        />
                    </View>

                    <SelectField
                        label="Tipo de Documento *"
                        field="document_type"
                        value={form.document_type}
                        options={documentTypeOptions}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.document_type}
                        touched={touched.document_type}
                        icon="document-outline"
                    />

                    <View style={styles.uploadRow}>
                        <UploadField
                            label="Documento Frente *"
                            field="document_front"
                            value={form.document_front}
                            onPick={pickImage}
                            error={errors.document_front}
                            touched={touched.document_front}
                            compact
                        />
                        <UploadField
                            label="Documento Verso *"
                            field="document_back"
                            value={form.document_back}
                            onPick={pickImage}
                            error={errors.document_back}
                            touched={touched.document_back}
                            compact
                        />
                    </View>

                    <UploadField
                        label="Comprovativo de Endereço"
                        field="Proof_of_Address"
                        value={form.Proof_of_Address}
                        onPick={pickImage}
                    />
                </View>

                {/* Botão de Submit */}
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitText}>Enviar Cadastro</Text>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                </TouchableOpacity>

                {/* Indicador de Campos Obrigatórios */}
                <View style={styles.requiredInfo}>
                    <Text style={styles.requiredText}>* Campos obrigatórios</Text>
                </View>
            </Animated.ScrollView>

            {/* Footer Fixo */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Seus dados estão protegidos e serão usados apenas para validação
                </Text>
            </View>
        </View>
    );
}

/* -------------------- COMPONENTES REUTILIZÁVEIS APRIMORADOS -------------------- */

type InputFieldProps<K extends keyof DriverForm> = {
    label: string;
    field: K;
    value: string;
    onChange: (field: K, value: string) => void;
    onBlur: (field: K) => void;
    error?: string;
    touched?: boolean;
    secure?: boolean;
    keyboardType?: any;
    icon?: keyof typeof Ionicons.glyphMap;
};

function InputField<K extends keyof DriverForm>({
    label,
    field,
    value,
    onChange,
    onBlur,
    error,
    touched = false,
    secure,
    keyboardType = "default",
    icon,
}: InputFieldProps<K>) {
    const showError = touched && error;

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={[
                styles.inputWrapper,
                showError && styles.inputWrapperError,
            ]}>
                {icon && (
                    <Ionicons
                        name={icon}
                        size={20}
                        color={showError ? COLORS.error : COLORS.primary}
                        style={styles.inputIcon}
                    />
                )}
                <TextInput
                    style={[
                        styles.input,
                        icon && styles.inputWithIcon,
                        showError && styles.inputError,
                    ]}
                    value={value}
                    onChangeText={(text) => onChange(field, text)}
                    onBlur={() => onBlur(field)}
                    secureTextEntry={secure}
                    keyboardType={keyboardType}
                    placeholder={`Digite ${label.toLowerCase()}`}
                    placeholderTextColor="#999"
                />
            </View>
            {showError && (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </View>
    );
}

type UploadFieldProps<K extends keyof DriverForm> = {
    label: string;
    field: K;
    value: string;
    onPick: (field: K) => void;
    error?: string;
    touched?: boolean;
    compact?: boolean;
};

function UploadField<K extends keyof DriverForm>({
    label,
    field,
    value,
    onPick,
    error,
    touched = false,
    compact = false,
}: UploadFieldProps<K>) {
    const showError = touched && error;

    return (
        <View style={compact ? styles.uploadCompactContainer : styles.uploadContainer}>
            <Text style={[
                styles.label,
                showError && styles.labelError,
            ]}>{label}</Text>
            <TouchableOpacity
                style={[
                    styles.upload,
                    compact && styles.uploadCompact,
                    showError && styles.uploadError,
                ]}
                onPress={() => onPick(field)}
            >
                {value ? (
                    <View style={styles.uploadedContainer}>
                        <Image source={{ uri: value }} style={compact ? styles.uploadedImageCompact : styles.uploadedImage} />
                        <TouchableOpacity
                            style={styles.replaceButton}
                            onPress={() => onPick(field)}
                        >
                            <Ionicons name="camera-reverse-outline" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.uploadPlaceholder}>
                        <Ionicons
                            name="cloud-upload-outline"
                            size={compact ? 20 : 24}
                            color={showError ? COLORS.error : COLORS.primary}
                        />
                        <Text style={[
                            styles.uploadText,
                            compact && styles.uploadTextCompact,
                            showError && styles.uploadTextError,
                        ]}>
                            {showError ? error : label}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
            {showError && value && (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </View>
    );
}

/* -------------------- ESTILOS PREMIUM -------------------- */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFF",
        textAlign: "center",
    },
    headerPlaceholder: {
        width: 32,
    },
    sectionNav: {
        flexDirection: "row",
        backgroundColor: "#FFF",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    sectionNavItem: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        borderRadius: 8,
        marginHorizontal: 4,
    },
    sectionNavItemActive: {
        backgroundColor: COLORS.primary + "15",
    },
    sectionNavText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#64748B",
    },
    sectionNavTextActive: {
        color: COLORS.primary,
        fontWeight: "700",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        marginBottom: 32,
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 20,
        color: "#1E293B",
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
        color: "#374151",
    },
    labelError: {
        color: COLORS.error,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        position: "relative",
    },
    inputWrapperError: {
        borderColor: COLORS.error,
    },
    inputIcon: {
        position: "absolute",
        left: 12,
        zIndex: 1,
    },
    input: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        padding: 14,
        paddingLeft: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        fontSize: 16,
        color: "#1E293B",
    },
    inputWithIcon: {
        paddingLeft: 44,
    },
    inputError: {
        borderColor: COLORS.error,
        backgroundColor: "#FEF2F2",
    },
    uploadContainer: {
        marginBottom: 16,
    },
    uploadCompactContainer: {
        flex: 1,
        margin: 4,
    },
    upload: {
        backgroundColor: "#F8FAFC",
        borderWidth: 2,
        borderColor: "#E2E8F0",
        borderStyle: "dashed",
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
        minHeight: 120,
        justifyContent: "center",
    },
    uploadCompact: {
        padding: 16,
        minHeight: 100,
    },
    uploadError: {
        borderColor: COLORS.error,
        backgroundColor: "#FEF2F2",
    },
    uploadPlaceholder: {
        alignItems: "center",
    },
    uploadText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#64748B",
        marginTop: 8,
        textAlign: "center",
    },
    uploadTextCompact: {
        fontSize: 12,
    },
    uploadTextError: {
        color: COLORS.error,
    },
    uploadedContainer: {
        position: "relative",
    },
    uploadedImage: {
        width: 120,
        height: 120,
        borderRadius: 12,
    },
    uploadedImageCompact: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    replaceButton: {
        position: "absolute",
        bottom: -4,
        right: -4,
        backgroundColor: COLORS.primary,
        padding: 6,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    uploadRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: -4,
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        paddingHorizontal: 4,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        marginLeft: 4,
        fontWeight: "500",
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        marginBottom: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitText: {
        color: "#FFF",
        fontSize: 17,
        fontWeight: "700",
        marginRight: 8,
    },
    requiredInfo: {
        alignItems: "center",
        marginBottom: 100,
        padding: 12,
    },
    requiredText: {
        color: "#64748B",
        fontSize: 12,
        fontStyle: "italic",
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#1E293B",
        padding: 16,
        alignItems: "center",
    },
    footerText: {
        color: "#94A3B8",
        fontSize: 12,
        textAlign: "center",
    },
});

// Adicione isso ao seu arquivo COLORS se não existir
// COLORS.error = "#DC2626";