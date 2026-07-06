import { showMessage } from "react-native-flash-message";
import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    Animated,
    Dimensions,
    StatusBar,
    ActivityIndicator,
    Modal
} from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
//@ts-ignore
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../styles/colors";
import SelectField from "../components/SelectField";
import { registerDriver, uploadLocalFile, getProviderSubcategories, getVehicleColors } from "../services/deliveryService";
import { API_BASE_URL } from "../api/apiConfig";
import { useLoadingContext } from '../context/LoadingContext';
import { SafeAreaView } from "react-native-safe-area-context";

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
    vihicle_picture_front: string;
    vihicle_picture_back: string;
    vihicle_inspection: string;
    vihicle_Insurance: string;
    vihicle_logbook: string;
    license_front: string;
    license_back: string;
    document_type: string;
    document_front: string;
    document_back: string;
    Proof_of_Address: string;
    assigned_base_fee?: string;
}


export default function RegisterDriverScreen({ navigation }: any) {
    const [step, setStep] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const [subcategories, setSubcategories] = useState<{ label: string, value: string, pricingMode?: string }[]>([]);
    const [colorOptions, setColorOptions] = useState<{ label: string, value: string }[]>([]);

    useEffect(() => {
        const fetchSubcategoriesAndColors = async () => {
            try {
                // Fetch subcategories
                const data = await getProviderSubcategories();
                const filtered = data.filter((item: any) => {
                    const typeName = item.providerTypeId?.name?.toLowerCase() || '';
                    const classIdName = item.providerTypeId?.classificationId?.name?.toLowerCase() || '';
                    return (typeName === 'motorista' || typeName === 'motoristas') &&
                        (classIdName.includes('serviço') || classIdName.includes('service') || classIdName.includes('serviços'));
                });
                const formatted = filtered.map((item: any) => ({
                    label: item.name,
                    value: item._id, // Usar o ID do serviço
                    pricingMode: item.pricingMode
                }));
                setSubcategories(formatted);
                
                // Fetch colors
                const colorsData = await getVehicleColors();
                const colorsFormatted = colorsData.map((color: any) => ({
                    label: color.name,
                    value: color.name.toLowerCase()
                }));
                setColorOptions(colorsFormatted);
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };
        fetchSubcategoriesAndColors();
    }, []);

    const [form, setForm] = useState<DriverForm>({
        photo: "", name: "", phoneNumber: "", email: "", password: "",
        transport_type: "", transport_color: "", transport_registration: "", vihicle_picture: "", vihicle_picture_front: "", vihicle_picture_back: "",
        vihicle_inspection: "", vihicle_Insurance: "", vihicle_logbook: "", license_front: "", license_back: "",
        document_type: "bi", document_front: "", document_back: "", Proof_of_Address: "",
    });

    const { showLoading, hideLoading, showProcessing } = useLoadingContext();
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    const handleChange = (field: keyof DriverForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = API_BASE_URL.replace('/api', '');
        return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
    };

    // 🚀 NOVO UPLOAD IMEDIATO
    const pickImage = async (field: keyof DriverForm) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showMessage({ message: 'Permissão necessária', type: "info" });
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0].uri) {
            setUploadingField(field);
            try {
                // 1. Reduzir a imagem sem perder muita qualidade usando ImageManipulator
                const manipResult = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 1200 } }], // Reduz tamanho máximo mantendo proporções
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                // 2. Verificar se excede 3MB
                const response = await fetch(manipResult.uri);
                const blob = await response.blob();
                const fileSizeMB = blob.size / (1024 * 1024);

                if (fileSizeMB > 3) {
                    showMessage({ message: 'Imagem muito grande', description: 'A imagem deve ter menos de 3MB. Tente outra foto.', type: "danger" });
                    setUploadingField(null);
                    return;
                }

                // 3. Upload direto para o backend local
                const uploadedUrl = await uploadLocalFile(manipResult.uri);
                handleChange(field, uploadedUrl);
                showMessage({ message: 'Imagem carregada com sucesso!', type: "success" });
            } catch (error) {
                showMessage({ message: 'Erro no upload', description: 'Tente novamente.', type: "danger" });
            } finally {
                setUploadingField(null);
            }
        }
    };

    const validateStep0 = () => {
        const newErrors: Record<string, string> = {};
        if (!form.photo) newErrors.photo = 'Obrigatório';
        if (!form.name) newErrors.name = 'Obrigatório';
        if (form.phoneNumber.length < 9) newErrors.phoneNumber = 'Número muito curto';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!form.email) {
            newErrors.email = 'Obrigatório';
        } else if (!emailRegex.test(form.email)) {
            newErrors.email = 'E-mail inválido';
        }
        if (form.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
        if (!confirmPassword) newErrors.confirmPassword = 'Obrigatório';
        if (form.password && confirmPassword && form.password !== confirmPassword) {
            newErrors.password = 'Senhas não coincidem';
            newErrors.confirmPassword = 'Senhas não coincidem';
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showMessage({ message: "Preencha todos os campos obrigatórios corretamente", type: "warning" });
            return false;
        }
        setErrors({});
        return true;
    };

    const validateStep1 = () => {
        const newErrors: Record<string, string> = {};
        if (!form.document_front) newErrors.document_front = 'Obrigatório';
        if (!form.document_back) newErrors.document_back = 'Obrigatório';
        if (!form.license_front) newErrors.license_front = 'Obrigatório';
        if (!form.license_back) newErrors.license_back = 'Obrigatório';
        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            showMessage({ message: "As fotos dos documentos pessoais são obrigatórias", type: "warning" });
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        const newErrors: Record<string, string> = {};
        if (!form.transport_type) newErrors.transport_type = 'Obrigatório';
        if (!form.transport_color) newErrors.transport_color = 'Obrigatório';
        if (!form.transport_registration) newErrors.transport_registration = 'Obrigatório';
        if (!form.vihicle_picture) newErrors.vihicle_picture = 'Obrigatório';
        if (!form.vihicle_picture_front) newErrors.vihicle_picture_front = 'Obrigatório';
        if (!form.vihicle_picture_back) newErrors.vihicle_picture_back = 'Obrigatório';
        if (!form.vihicle_logbook) newErrors.vihicle_logbook = 'Obrigatório';
        if (!form.vihicle_inspection) newErrors.vihicle_inspection = 'Obrigatório';
        if (!form.vihicle_Insurance) newErrors.vihicle_Insurance = 'Obrigatório';
        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            showMessage({ message: "Preencha todos os dados e documentos do veículo", type: "warning" });
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (step === 0 && !validateStep0()) return;
        if (step === 1 && !validateStep1()) return;

        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
        ]).start();

        setTimeout(() => setStep(step + 1), 200);
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
        else navigation.replace('Login');
    };

    const handleSubmit = async () => {
        if (!validateStep2()) return;

        setErrors({});
        showLoading('A submeter candidatura...');
        try {
            const finalData = { 
                ...form, 
                isDeliveryMan: true,
                providedServices: form.transport_type ? [{
                    serviceId: form.transport_type,
                    customBasePrice: form.assigned_base_fee ? parseFloat(form.assigned_base_fee) : 0
                }] : []
            };

            showProcessing('Finalizando...');
            await registerDriver(finalData);

            hideLoading();
            setShowSuccessModal(true);
        } catch (error: any) {
            hideLoading();
            let errorMessage = "Erro ao cadastrar motorista. Verifique a sua ligação e tente novamente.";
            if (error.response && error.response.data) {
                errorMessage = error.response.data.message || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }
            setApiErrorMessage(errorMessage);
            setShowErrorModal(true);
        }
    };

    const renderLabel = (text: string) => {
        if (text.includes('*')) {
            const parts = text.split('*');
            return (
                <Text style={styles.inputLabel}>
                    {parts[0]}<Text style={{ color: 'red' }}>*</Text>{parts[1]}
                </Text>
            );
        }
        return <Text style={styles.inputLabel}>{text}</Text>;
    };

    const renderInput = (label: string, field: keyof DriverForm, icon: string, props?: any) => (
        <View style={styles.inputContainer}>
            {renderLabel(label)}
            <View style={[styles.inputWrapper, errors[field] && { borderColor: '#FF0000' }]}>
                <Ionicons name={icon as any} size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    value={form[field]}
                    onChangeText={(v) => handleChange(field, v)}
                    {...props}
                />
            </View>
        </View>
    );

    const renderImageUpload = (label: string, field: keyof DriverForm, icon: string) => (
        <View style={styles.inputContainer}>
            {renderLabel(label)}
            <TouchableOpacity
                style={[styles.uploadBox, errors[field] && { borderColor: '#FF0000' }]}
                onPress={() => pickImage(field)}
                disabled={uploadingField === field}
            >
                {uploadingField === field ? (
                    <ActivityIndicator color="#7F00FF" />
                ) : form[field] ? (
                    <Image source={{ uri: getImageUrl(form[field]) }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                    <>
                        <MaterialCommunityIcons name={icon as any} size={32} color="#9CA3AF" />
                        <Text style={styles.uploadText}>Toque para adicionar foto</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderGridImageUpload = (label: string, field: keyof DriverForm, icon: string) => (
        <View style={styles.gridItem}>
            {renderLabel(label)}
            <TouchableOpacity
                style={[styles.uploadBoxSquare, errors[field] && { borderColor: '#FF0000' }]}
                onPress={() => pickImage(field)}
                disabled={uploadingField === field}
            >
                {uploadingField === field ? (
                    <ActivityIndicator color="#7F00FF" />
                ) : form[field] ? (
                    <Image source={{ uri: getImageUrl(form[field]) }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                    <>
                        <MaterialCommunityIcons name={icon as any} size={28} color="#9CA3AF" />
                        <Text style={styles.uploadTextSmall}>Toque para adicionar</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Novo Motorista</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.stepperContainer}>
                <View style={styles.stepIndicator}>
                    <View style={[styles.stepDot, step >= 0 && styles.stepDotActive]} />
                    <View style={[styles.stepLine, step >= 1 && styles.stepLineActive]} />
                    <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                    <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                    <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                </View>
                <Text style={styles.stepTitle}>
                    {step === 0 ? "Passo 1: Dados Pessoais" : step === 1 ? "Passo 2: Documentação Pessoal" : "Passo 3: A Viatura"}
                </Text>
            </View>

            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContent}
                enableOnAndroid={true}
                keyboardShouldPersistTaps="handled"
                extraScrollHeight={20}
            >
                <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>

                    {step === 0 && (
                        <View style={styles.stepContent}>
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <TouchableOpacity
                                    style={[styles.profileUpload, errors.photo && { borderColor: '#FF0000' }]}
                                    onPress={() => pickImage('photo')}
                                    disabled={uploadingField === 'photo'}
                                >
                                    {uploadingField === 'photo' ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : form.photo ? (
                                        <Image source={{ uri: getImageUrl(form.photo) }} style={styles.profileImage} />
                                    ) : (
                                        <Ionicons name="camera" size={32} color="#FFF" />
                                    )}
                                </TouchableOpacity>
                                <Text style={styles.profileText}>Foto de Perfil <Text style={{ color: 'red' }}>*</Text></Text>
                            </View>

                            {renderInput("Nome Completo *", "name", "person-outline", { placeholder: "Ex: João Silva" })}
                            {renderInput("Telefone *", "phoneNumber", "call-outline", { placeholder: "84...", keyboardType: "phone-pad", maxLength: 9 })}
                            {renderInput("Email *", "email", "mail-outline", { placeholder: "email@exemplo.com", keyboardType: "email-address", autoCapitalize: "none" })}
                            {/* Password with visibility toggle */}
                            <View style={styles.inputContainer}>
                                {renderLabel("Senha (mín 6) *")}
                                <View style={[styles.inputWrapper, errors.password && { borderColor: '#FF0000' }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={form.password}
                                        onChangeText={(v) => handleChange('password', v)}
                                        placeholder="******"
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                        <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {/* Confirm Password */}
                            <View style={styles.inputContainer}>
                                {renderLabel("Confirmar Senha *")}
                                <View style={[styles.inputWrapper, errors.confirmPassword && { borderColor: '#FF0000' }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={confirmPassword}
                                        onChangeText={(v) => { setConfirmPassword(v); if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' })) }}
                                        placeholder="******"
                                        secureTextEntry={!showPassword}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 1 && (
                        <View style={styles.stepContent}>
                            <Text style={styles.sectionTitle}>Documentos Pessoais</Text>
                            <View style={styles.gridContainer}>
                                {renderGridImageUpload("Carta de Condução (Frente) *", "license_front", "card-account-details-outline")}
                                {renderGridImageUpload("Carta de Condução (Verso) *", "license_back", "card-account-details-outline")}
                                {renderGridImageUpload("BI ou Passaporte (Frente) *", "document_front", "passport")}
                                {renderGridImageUpload("BI ou Passaporte (Verso) *", "document_back", "passport")}
                            </View>
                            <View style={{ marginTop: 10, marginBottom: 20 }}>
                                {renderImageUpload("Comprovativo de Morada (Opcional)", "Proof_of_Address", "home-map-marker")}
                            </View>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.stepContent}>
                            <Text style={styles.sectionTitle}>Detalhes da Viatura</Text>
                            <SelectField
                                label="Tipo de Transporte *"
                                field="transport_type"
                                value={form.transport_type}
                                onChange={(f, v) => handleChange('transport_type', v)}
                                options={subcategories.length > 0 ? subcategories : [
                                    { label: "Motocicleta", value: "motocicleta" },
                                    { label: "Carro", value: "carro" },
                                    { label: "Caminhão", value: "caminhao" },
                                ]}
                            />
                                {subcategories.find(s => s.value === form.transport_type)?.pricingMode === 'PROVIDER_DEFINED' && (
                                renderInput("Valor do serviço que presta (MT) *", "assigned_base_fee", "cash-outline", { keyboardType: "numeric", placeholder: "Ex: 500" })
                            )}
                            <SelectField
                                label="Cor do Veículo *"
                                field="transport_color"
                                value={form.transport_color}
                                options={colorOptions}
                                onChange={(f, v) => handleChange('transport_color', v)}
                            />
                            {renderInput("Matrícula/Placa *", "transport_registration", "car-outline", { placeholder: "AAA-111-MC", autoCapitalize: "characters" })}
                            
                            <Text style={styles.sectionTitle}>Fotografias da Viatura</Text>
                            <Text style={{fontSize: 12, color: '#6B7280', marginBottom: 10}}>Atenção: A matrícula deve estar visível em ambas as fotos.</Text>
                            <View style={styles.gridContainer}>
                                {renderGridImageUpload("Foto da Viatura *", "vihicle_picture", "car")}
                                {renderGridImageUpload("Frente (C/ Matrícula) *", "vihicle_picture_front", "car-arrow-right")}
                                {renderGridImageUpload("Trás (C/ Matrícula) *", "vihicle_picture_back", "car-arrow-left")}
                            </View>

                            <Text style={styles.sectionTitle}>Documentos da Viatura</Text>
                            <View style={styles.gridContainer}>
                                {renderGridImageUpload("Livrete *", "vihicle_logbook", "file-document-outline")}
                                {renderGridImageUpload("Inspeção *", "vihicle_inspection", "car-cog")}
                                {renderGridImageUpload("Seguros *", "vihicle_Insurance", "shield-car")}
                            </View>
                        </View>
                    )}

                </Animated.View>
            </KeyboardAwareScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.primaryButton} onPress={step === 2 ? handleSubmit : handleNext}>
                    <Text style={styles.primaryButtonText}>{step === 2 ? "Concluir Cadastro" : "Avançar"}</Text>
                    {step < 2 && <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
            </View>

            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="checkmark" size={50} color="#FFF" />
                        </View>
                        <Text style={styles.modalTitle}>Cadastro Enviado!</Text>
                        <Text style={styles.modalMessage}>
                            Os seus dados foram enviados para validação. Iremos analisar a sua submissão e entrar em contacto em breve.
                        </Text>
                        <TouchableOpacity 
                            style={styles.modalButton}
                            onPress={() => {
                                setShowSuccessModal(false);
                                navigation.replace('Login');
                            }}
                        >
                            <Text style={styles.modalButtonText}>Voltar ao Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ERROR MODAL (Premium Card) */}
            <Modal
                visible={showErrorModal}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.iconCircle, { backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }]}>
                            <Ionicons name="close" size={40} color="#FFF" />
                        </View>
                        <Text style={styles.modalTitle}>Ops, ocorreu um erro!</Text>
                        <Text style={styles.modalMessage}>
                            {apiErrorMessage}
                        </Text>
                        <TouchableOpacity 
                            style={[styles.modalButton, { backgroundColor: '#EF4444', marginTop: 10 }]}
                            onPress={() => setShowErrorModal(false)}
                        >
                            <Text style={styles.modalButtonText}>Tentar Novamente</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#FFF" },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    stepperContainer: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E5E7EB' },
    stepDotActive: { backgroundColor: '#7F00FF' },
    stepLine: { width: 60, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
    stepLineActive: { backgroundColor: '#7F00FF' },
    stepTitle: { textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#374151' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    stepContent: { flex: 1 },
    profileUpload: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: '#7F00FF' },
    profileImage: { width: '100%', height: '100%' },
    profileText: { marginTop: 8, fontSize: 14, color: '#6B7280', fontWeight: '500' },
    inputContainer: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, height: 56, paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#111827' },
    uploadBox: { height: 220, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '48%', marginBottom: 15 },
    uploadBoxSquare: { width: '100%', aspectRatio: 1, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    uploadTextSmall: { marginTop: 8, fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
    uploadText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
    previewImage: { width: '100%', height: '100%' },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFF' },
    primaryButton: { backgroundColor: '#7F00FF', borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#7F00FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    eyeButton: { marginLeft: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 12, textAlign: 'center' },
    modalMessage: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
    subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 30 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 15, marginTop: 10 },
    modalButton: { width: '100%', backgroundColor: '#7F00FF', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center' },
    modalButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

